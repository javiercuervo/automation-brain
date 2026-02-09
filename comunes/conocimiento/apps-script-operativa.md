# Apps Script en DECA: guía operativa
## Sheets → Webhook → Pabbly → Stackby

**Fecha:** 1 de febrero de 2026  
**Última verificación:** 1 de febrero de 2026  
**Público:** Equipos de operación, desarrollo y product de DECA  
**Versión:** 1.0

---

## Índice

1. [Resumen ejecutivo](#resumen-ejecutivo)
2. [Patrón recomendado para DECA](#patrón-recomendado-para-deca)
3. [Diseño de datos en Sheets](#diseño-de-datos-en-sheets)
4. [Implementación: Triggers, locks y fetch](#implementación-triggers-locks-y-fetch)
5. [Cuotas y cómo no romperlas](#cuotas-y-cómo-no-romperlas)
6. [Seguridad y gestión de secretos](#seguridad-y-gestión-de-secretos)
7. [Snippets y plantillas](#snippets-y-plantillas)
8. [Checklist de despliegue y operación](#checklist-de-despliegue-y-operación)
9. [Fuentes](#fuentes)

---

## Resumen ejecutivo

DECA captura eventos desde Getformly y los almacena en Google Sheets (hoja raw). Un script de **Apps Script ejecutado por trigger de tiempo** (time-driven) lee filas incompletas, valida que tengan todos los campos requeridos, y publica cada evento como JSON en un webhook de entrada de **Pabbly Connect**. Pabbly orquesta transformaciones y upsert a **Stackby** (source of truth). Stripe, Acumbamail, OnlineCourseHost, Holded, Breezedoc y Moltbot se integran en eslabones posteriores.

**Objetivo**: Documentar patrones operativos de Apps Script para evitar:
- Bucles infinitos y duplicados
- Agotamiento de cuotas
- Exposición de secrets
- Fallos no reintentos sin visibilidad

**Beneficios del patrón**:
- ✅ Triggers time-driven = más previsible que onEdit (evita cascadas)
- ✅ Columnas de control = auditoría y reversibilidad
- ✅ LockService = evita race conditions
- ✅ Reintentos con exponential backoff = resilencia sin bucles
- ✅ Dead-letter handling = no hay eventos perdidos

---

## Patrón recomendado para DECA

### Por qué time-driven triggers, no onEdit/onChange

| Aspecto | onEdit/onChange | Time-driven | Recomendación |
|--------|-----------------|-------------|---------------|
| **Predictibilidad** | Dispara al menor cambio, cascadas posibles | Una ejecución cada intervalo fijo | ✅ Time-driven |
| **Concurrencia** | Múltiples ediciones = múltiples disparos | Control de slots | ✅ Time-driven |
| **Testing** | Difícil de reproducir | Se ejecuta en schedule fijo | ✅ Time-driven |
| **Cuota diaria** | Contabiliza contra runtime diario | Previsible y acotada | ✅ Time-driven |
| **Detección de cambios** | Reacciona a cualquier cambio | Polling intencional | ✅ Time-driven para lógica publisher |

**Conclusión**: Para un *publisher* (lectura + POST webhook), los time-driven triggers con **polling intencional** son el estándar. Cada N minutos, el script consulta qué filas NO se han publicado (`published_at IS NULL`) y procesa lotes.

### Arquitectura conceptual

```
┌─────────────────┐
│   Getformly     │  (captura de eventos)
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────┐
│   Google Sheets (hoja "raw")            │  
│   Columnas de control: published_at,    │
│   publish_attempts, last_publish_error  │
└────────┬────────────────────────────────┘
         │
         v
┌────────────────────────────────────────────────┐
│ Apps Script (time-driven trigger cada 5 min)   │
│ Función: sync()                                │
│ - Acquire lock (LockService)                   │
│ - Leer filas sin published_at                  │
│ - Validar completitud (isComplete)             │
│ - Calcular external_id (determinista)          │
│ - POST JSON a webhook de Pabbly                │
│ - Marcar published_at + contar intentos        │
│ - Release lock                                 │
└────────┬───────────────────────────────────────┘
         │
         v
┌────────────────────────────────────────┐
│  Pabbly Connect (webhook de entrada)   │
│  - Transformar JSON                    │
│  - Validar contra Stackby              │
│  - Upsert (external_id = clave)        │
└────────┬───────────────────────────────┘
         │
         v
┌────────────────────────────────────────┐
│  Stackby (source of truth)             │
│  - Eventos normalizados                │
│  - PII redactado                       │
└────────────────────────────────────────┘
```

### Filosofía: idempotencia y reconciliación

1. **External ID determinista**: `SHA-256(email + phone + timestamp)` garantiza que el mismo evento sea idempotente (dos POSTs del mismo evento → upsert, no duplicado).
2. **Columnas de control**: `published_at`, `publish_attempts`, `last_publish_error` permiten:
   - Retry selectivo (solo si `publish_attempts < MAX` y `last_publish_error IS NOT NULL`)
   - Auditoría (saber qué, cuándo y por qué se publicó)
   - Dead-letter: si `publish_attempts >= MAX`, el evento se marca manualmente para revisión
3. **No hay polling a Stackby**: Pabbly es la "fuente de verdad" de si fue publicado. Sheets es solo el buffer temporal.

---

## Diseño de datos en Sheets

### Estructura de la hoja "raw"

La hoja contiene filas de eventos brutos capturados por Getformly. Incluye columnas de datos + columnas de control.

#### Columnas de datos (ejemplo DECA)

| Columna | Tipo | Obligatorio | Notas |
|---------|------|-------------|-------|
| `timestamp` | datetime | ✅ | Cuándo ocurrió el evento (formato ISO 8601) |
| `email` | string | ✅ | Email del usuario |
| `phone` | string | ✅ | Teléfono (formato E.164 si es posible) |
| `event_type` | string | ✅ | p.ej. "contact_form_submit", "trial_signup" |
| `course_id` | string | ⚠️ | Si es del tipo "course_*" |
| `payment_amount` | number | ⚠️ | Si es transacción |
| `source_url` | string | ✅ | URL de origen (auditoría) |
| `user_agent` | string | ❌ | User-Agent del navegador |
| `ip_address` | string | ⚠️ | PII: evitar loguear en Sheets, almacenar en Holded/tercero |

#### Columnas de control (CRÍTICAS)

| Columna | Tipo | Obligatorio | Inicialización | Propósito |
|---------|------|-------------|---|----------|
| `external_id` | string | ⚠️ | NULL al ingesta | `HASH(email + phone + timestamp)` genera Apps Script → identificador único determinista |
| `published_at` | datetime | ❌ | NULL | NULL = no publicado; fecha+hora = publicado OK; Pabbly lo confirma |
| `publish_attempts` | number | ✅ | 0 | Contador de intentos (reintentos exponencial si < 3) |
| `last_publish_error` | string | ❌ | NULL | Último error HTTP de Pabbly (p.ej. "400: Bad Request") |
| `last_publish_attempt_at` | datetime | ❌ | NULL | Cuándo fue el último intento (para no publicar > 1 vez en corto plazo) |
| `dead_letter` | boolean | ❌ | FALSE | TRUE = retirado de publicación automática, requiere revisión manual |

#### Ejemplo de fila

```
timestamp                | email              | phone      | event_type     | ... | external_id | published_at        | publish_attempts | last_publish_error | dead_letter
2026-02-01T10:30:00Z    | user@example.com   | +34612345  | contact_form   | ... | a7f3e...    | 2026-02-01T10:31:00 | 1                | NULL               | FALSE
2026-02-01T10:35:00Z    | otro@mail.es       | +34677890  | trial_signup   | ... | b2d8c...    | NULL                | 0                | NULL               | FALSE
2026-02-01T10:40:00Z    | test@mail.pt       | +351912345 | payment_success| ... | c9e1b...    | NULL                | 2                | "500: Server Error" | FALSE
```

### Reglas de validez (definir en `isComplete()`)

Una fila es "publicable" si:

1. `dead_letter = FALSE`
2. `published_at IS NULL` (aún no publicada)
3. `timestamp IS NOT NULL` Y es válido (ISO 8601)
4. `email` está presente Y válida (regex básico: `/.+@.+\..+/`)
5. `phone` está presente (mínimo 5 caracteres; idealmente E.164)
6. `event_type` está en lista blanca predefinida
7. Si `event_type = "payment_*"`: `payment_amount > 0`
8. Si `event_type = "course_*"`: `course_id IS NOT NULL`
9. `publish_attempts < 3` (máximo 3 reintentos)
10. Si `publish_attempts > 0`: `last_publish_attempt_at + 300s < NOW()` (cooldown de 5 min entre reintentos)

---

## Implementación: Triggers, locks y fetch

### 1. Crear el trigger time-driven en el editor

1. En Google Apps Script editor (script.google.com):
   - Clic en **"Triggers"** (reloj icon, izquierda)
   - Clic en **"Create new trigger"**
   - Configuración:
     - **Choose which function to run**: `sync`
     - **Select deployment**: `Head`
     - **Select event source**: `Time-driven`
     - **Select type of time based trigger**: `Minutes` → `Every 5 minutes`
     - **Failure notification settings**: `Notify me immediately`
   - Clic en **"Save"**

**Intervalo recomendado**: 5 minutos para casos normales (< 500 eventos/día). Si es más alto, considerar 10 min.

### 2. Función `sync()` pseudocódigo

```pseudocode
FUNCTION sync():
  lock = LockService.getScriptLock()
  
  IF NOT lock.tryLock(timeout=30s):
    LOG "Lock acquire timeout, exiting"
    RETURN
  
  TRY:
    config = loadConfig()  // PropertiesService
    
    sheet = SpreadsheetApp.getActive().getSheetByName("raw")
    allData = sheet.getDataRange().getValues()
    
    rowsToPublish = []
    FOR EACH row IN allData[1..]:  // skip header
      IF isComplete(row):
        rowsToPublish.APPEND(row)
    
    FOR EACH row IN rowsToPublish:
      IF row.published_at IS NULL:
        external_id = computeExternalId(row)
        row.external_id = external_id
        
        payload = {
          external_id: external_id,
          timestamp: row.timestamp,
          email: redact(row.email),        // CRÍTICO: PII
          phone: redact(row.phone),        // CRÍTICO: PII
          event_type: row.event_type,
          // ... otros campos
          source: "DECA-Sheets"
        }
        
        TRY:
          response = POST_with_retry(
            url=config.WEBHOOK_URL,
            json=payload,
            maxRetries=3,
            initialBackoff=1s
          )
          
          IF response.status IN [200, 201]:
            markPublished(row, external_id, success=TRUE)
          ELSE:
            markPublished(row, external_id, success=FALSE, error=response.status)
        
        CATCH error:
          LOG "HTTP error for row " + row.index + ": " + error
          markPublished(row, external_id, success=FALSE, error=error.message)
  
  FINALLY:
    lock.releaseLock()
```

### 3. Snippet real: función `sync()`

```javascript
function sync() {
  const lock = LockService.getScriptLock();
  
  if (!lock.tryLock(30000)) {
    Logger.log('⏱️ Lock timeout, exiting');
    return;
  }
  
  try {
    const config = loadConfig();
    const sheet = SpreadsheetApp.getActive().getSheetByName('raw');
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    // Mapear encabezados a índices
    const colIndex = {};
    headers.forEach((h, i) => { colIndex[h] = i; });
    
    let publishCount = 0;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Saltar si ya publicado o en dead-letter
      if (row[colIndex.published_at] || row[colIndex.dead_letter]) {
        continue;
      }
      
      // Validar completitud
      if (!isComplete(row, colIndex)) {
        Logger.log(`❌ Row ${i} incomplete, skipping`);
        continue;
      }
      
      // Throttle: máximo 10 filas por ejecución (evitar timeout)
      if (publishCount >= 10) {
        Logger.log(`⚠️ Reached batch limit (10), will retry in next trigger`);
        break;
      }
      
      const externalId = computeExternalId(row, colIndex);
      
      const payload = {
        external_id: externalId,
        timestamp: row[colIndex.timestamp],
        email: maskEmail(row[colIndex.email]),
        phone: maskPhone(row[colIndex.phone]),
        event_type: row[colIndex.event_type],
        source_url: row[colIndex.source_url],
        source: 'DECA-Sheets',
        batch_id: Utilities.getUuid()
      };
      
      try {
        const response = fetchWithRetry(
          config.WEBHOOK_URL,
          {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
          },
          3,        // maxRetries
          1000      // initialBackoffMs
        );
        
        if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
          markPublished(sheet, i, externalId, null);
          publishCount++;
          Logger.log(`✅ Row ${i} published (ID: ${externalId})`);
        } else {
          const errorMsg = `HTTP ${response.getResponseCode()}`;
          markPublished(sheet, i, externalId, errorMsg, false);
          Logger.log(`⚠️ Row ${i} failed: ${errorMsg}`);
        }
      } catch (err) {
        markPublished(sheet, i, externalId, err.message, false);
        Logger.log(`❌ Row ${i} error: ${err.message}`);
      }
    }
    
    Logger.log(`✅ Sync completed: ${publishCount} rows published`);
    
  } catch (err) {
    Logger.log(`❌ CRITICAL ERROR: ${err.message}`);
    // Intentar notificar a Slack/email (agregar luego)
  } finally {
    lock.releaseLock();
  }
}
```

### 4. LockService: evitar race conditions

```javascript
// ✅ CORRECTO: tryLock con timeout
const lock = LockService.getScriptLock();
if (lock.tryLock(30000)) {  // 30 segundos max
  try {
    // Código crítico: lectura + escritura en Sheets
    // ...
  } finally {
    lock.releaseLock();
  }
} else {
  Logger.log('⚠️ Lock no adquirido, otro script está ejecutando');
}

// ❌ INCORRECTO: getScript sin timeout (puede colgar)
// const lock = LockService.getScriptLock();
// lock.waitLock(30000);  // MAL: espera indefinida
```

**Tipos de locks disponibles**:
- `LockService.getScriptLock()` → global por script (recomendado para DECA)
- `LockService.getUserLock()` → por usuario (no aplica aquí)
- `LockService.getDocumentLock()` → por documento (no aplica aquí)

### 5. UrlFetchApp: POST con retry y exponential backoff

```javascript
/**
 * POST a webhook con reintentos exponencial.
 * @param {string} url - URL destino
 * @param {object} options - opciones de UrlFetchApp
 * @param {number} maxRetries - máximo de intentos (3 recomendado)
 * @param {number} initialBackoffMs - delay inicial en ms (1000 recomendado)
 * @returns {object} response de UrlFetchApp
 */
function fetchWithRetry(url, options, maxRetries = 3, initialBackoffMs = 1000) {
  let backoffMs = initialBackoffMs;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = UrlFetchApp.fetch(url, options);
      
      // Si es exitoso, retornar
      if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
        return response;
      }
      
      // Si es 429 (rate limit) o 5xx, retry
      const status = response.getResponseCode();
      if ((status === 429 || status >= 500) && attempt < maxRetries) {
        Logger.log(`⚠️ Attempt ${attempt + 1}: HTTP ${status}, retrying in ${backoffMs}ms`);
        Utilities.sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, 32000);  // cap en 32s
        continue;
      }
      
      // Si es 4xx no-429 (400, 403, 404), no reintentar
      if (status >= 400 && status < 500) {
        Logger.log(`❌ Attempt ${attempt + 1}: HTTP ${status} (client error, no retry)`);
        return response;
      }
      
      return response;
      
    } catch (err) {
      // Error de red (timeout, no connectivity)
      if (attempt < maxRetries) {
        Logger.log(`⚠️ Attempt ${attempt + 1}: ${err.message}, retrying in ${backoffMs}ms`);
        Utilities.sleep(backoffMs);
        backoffMs = Math.min(backoffMs * 2, 32000);
      } else {
        Logger.log(`❌ Max retries exhausted: ${err.message}`);
        throw err;
      }
    }
  }
  
  throw new Error(`UrlFetch failed after ${maxRetries} retries`);
}
```

**Cuándo reintentar** (Google Sheets API recomendación):
- ✅ `429 Too Many Requests` (rate limit temporal)
- ✅ `500+` (server error temporal)
- ❌ `400` (bad request) → PII problema, no reintentar
- ❌ `403` (forbidden) → credenciales, no reintentar
- ❌ `404` (not found) → URL mal, no reintentar

### 6. Manejo de errores: `markPublished()`

```javascript
/**
 * Marcar fila como publicada o fallida.
 */
function markPublished(sheet, rowIndex, externalId, error = null, success = true) {
  const colIndex = getColumnIndex(sheet, 'external_id');
  const colPubAt = getColumnIndex(sheet, 'published_at');
  const colAttempts = getColumnIndex(sheet, 'publish_attempts');
  const colError = getColumnIndex(sheet, 'last_publish_error');
  const colLastAttempt = getColumnIndex(sheet, 'last_publish_attempt_at');
  
  const now = new Date().toISOString();
  
  if (success) {
    sheet.getRange(rowIndex + 1, colIndex + 1).setValue(externalId);
    sheet.getRange(rowIndex + 1, colPubAt + 1).setValue(now);
    sheet.getRange(rowIndex + 1, colAttempts + 1).setValue(1);
    sheet.getRange(rowIndex + 1, colError + 1).clearContent();
  } else {
    const attempts = sheet.getRange(rowIndex + 1, colAttempts + 1).getValue() || 0;
    
    sheet.getRange(rowIndex + 1, colIndex + 1).setValue(externalId);
    sheet.getRange(rowIndex + 1, colAttempts + 1).setValue(attempts + 1);
    sheet.getRange(rowIndex + 1, colError + 1).setValue(error || 'Unknown error');
    sheet.getRange(rowIndex + 1, colLastAttempt + 1).setValue(now);
    
    // Si alcanzó máximo, marcar como dead-letter
    if (attempts + 1 >= 3) {
      const colDeadLetter = getColumnIndex(sheet, 'dead_letter');
      sheet.getRange(rowIndex + 1, colDeadLetter + 1).setValue(TRUE);
      Logger.log(`⚠️ Row ${rowIndex} moved to dead-letter after 3 failures`);
    }
  }
}

function getColumnIndex(sheet, columnName) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(columnName);
}
```

---

## Cuotas y cómo no romperlas

### Cuotas de Apps Script (por usuario, por día)

**Fuente**: [Google Apps Script Quotas](https://developers.google.com/apps-script/guides/services/quotas)

| Recurso | Consumer (gmail.com) | Google Workspace | Implicación DECA |
|---------|-------|----------|-----------|
| **Script runtime (máx/ejecución)** | 6 min | 6 min | Procesar máx 10 filas/ejecución |
| **Triggers total runtime (máx/día)** | 90 min | 6 hr | Si corre c/5 min = 288 ejecuciones/día = 1,500 min max utilizable (muy suelto) |
| **URL Fetch calls** | 20,000/día | 100,000/día | Bajo si NO hay webhooks fallidos con retry |
| **Properties read/write** | 50,000/día | 500,000/día | Alto para config + logging |
| **Spreadsheets (lectura/escritura)** | Implícito en "runtime" | Implícito | Batch reads (`getValues()`) > múltiples `getValue()` |

### Cuotas de Google Sheets API (por proyecto/usuario)

**Fuente**: [Google Sheets API Limits](https://developers.google.com/workspace/sheets/api/limits)

| Recurso | Límite | Implicación |
|---------|--------|-----------|
| **Read requests per minute per project** | 300 | Apps Script corre c/5 min → máx 60 read/5min = está OK |
| **Write requests per minute per project** | 300 | Escritura de control columns = mínima |
| **Request timeout** | 180 segundos | Apps Script límite es 6 min = OK |
| **Payload recomendado** | ≤ 2 MB | Filas individuales << 2 MB |

### Estrategia: batching y throttle

#### Problema: 500 eventos/día → 100 filas en Sheets → runtime timeout

Si cada fila tarda ~2s en validar, fetch y marcar = 200s / 6 min trigger = SE PUEDE

Pero si hay fallos HTTP (retry), puede crecer a 10s/fila = 1,000s / 6 min = TIMEOUT

#### Solución: throttle en función sync()

```javascript
const MAX_ROWS_PER_EXECUTION = 10;  // batches de 10

for (let i = 1; i < data.length; i++) {
  if (!isComplete(row, colIndex)) continue;
  if (publishCount >= MAX_ROWS_PER_EXECUTION) {
    Logger.log(`Batch limit reached, next trigger will continue`);
    break;  // ← CRÍTICO: salir, no timeout
  }
  publishCount++;
  // ... procesar row
}
```

#### Strategy: "fast path" para validación

```javascript
function isComplete(row, colIndex) {
  // Checks rápidos primero (short-circuit)
  if (!row[colIndex.timestamp]) return false;
  if (!row[colIndex.email] || !isValidEmail(row[colIndex.email])) return false;
  if (!row[colIndex.phone] || row[colIndex.phone].length < 5) return false;
  if (!row[colIndex.event_type]) return false;
  
  // Checks contextuales (lentos)
  const eventType = row[colIndex.event_type];
  if (eventType.startsWith('course_')) {
    if (!row[colIndex.course_id]) return false;
  }
  if (eventType.startsWith('payment_')) {
    if (!row[colIndex.payment_amount] || row[colIndex.payment_amount] <= 0) return false;
  }
  
  return true;
}
```

### Límites prácticos DECA

**Escenario conservador** (Consumer account):
- 288 ejecuciones/día (c/5 min)
- 10 filas máx/ejecución = 2,880 filas/día posibles
- Realidad: 500-1,000 eventos/día ✅ Está OK

**Escenario pesado** (Workspace account):
- 288 ejecuciones/día c/5 min
- 20 filas máx/ejecución = 5,760 filas/día posibles
- Realidad: hasta 5,000 eventos/día ✅ Está OK

**Si se acerca a límite**:
1. Aumentar intervalo trigger a 10 min (reduce ejecuciones a 144)
2. Aumentar MAX_ROWS_PER_EXECUTION a 20-30 (si no causa timeout)
3. Optimizar `isComplete()` para skipear filas rápidamente
4. Mover logica pesada (enriquecimiento PII) a Pabbly/Stackby

---

## Seguridad y gestión de secretos

### ❌ NUNCA hardcodear secrets

```javascript
// ❌ INCORRECTO
const WEBHOOK_URL = 'https://api.pabbly.com/webhook/xxxxxxxxxxxxxxxxxxxxx';
const API_KEY = 'sk_live_xxxxxxxxxxxxx';

function sync() {
  UrlFetchApp.fetch(WEBHOOK_URL, { headers: { 'Authorization': 'Bearer ' + API_KEY } });
}
```

**Por qué es malo**:
- El código fuente está en Google Cloud (visible en version history)
- Shareando el script = se comparte el secret
- Si alguien revisa el deploy, ve la API key

### ✅ CORRECTO: PropertiesService

```javascript
/**
 * Configuración guardada en propiedades del script.
 * Accesible solo desde DENTRO del script, no en código fuente visible.
 */
function loadConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    WEBHOOK_URL: props.getProperty('WEBHOOK_URL'),
    MAX_RETRIES: parseInt(props.getProperty('MAX_RETRIES') || '3'),
    RETRY_BACKOFF_MS: parseInt(props.getProperty('RETRY_BACKOFF_MS') || '1000'),
    REQUIRED_FIELDS: (props.getProperty('REQUIRED_FIELDS') || 'timestamp,email,phone').split(','),
    MASKED_FIELDS: (props.getProperty('MASKED_FIELDS') || 'email,phone,ip_address').split(',')
  };
}

function setConfig(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
  Logger.log(`✅ Config updated: ${key}`);
}

// Uso en despliegue:
// En Script Editor, ejecutar una vez: setConfig('WEBHOOK_URL', 'https://...');
// Luego, en sync(): const config = loadConfig();
```

**Ventajas**:
- Guardado en Google's encrypted store
- No visible en el código
- Editable sin redeployar script
- Auditable (log de cambios)

### Manejo de PII (datos personales)

DECA maneja: **email, teléfono, IP address** → PII.

#### Principios

1. **Mínimum redacción en Sheets**: Guardar datos completos en Sheets (captura raw), pero:
   - Logging = NUNCA loguear email/phone en plaintext a browser console o logs públicos
   - Webhook = redactar antes de enviar a Pabbly

2. **Función de enmascaramiento**:

```javascript
function maskEmail(email) {
  if (!email || email.length < 5) return 'INVALID';
  const [local, domain] = email.split('@');
  return local.substring(0, 2) + '***@' + domain;
  // user@example.com → us***@example.com
}

function maskPhone(phone) {
  if (!phone || phone.length < 5) return 'INVALID';
  return phone.substring(0, 3) + '****' + phone.substring(phone.length - 2);
  // +34612345678 → +34****78
}

function maskIPAddress(ip) {
  if (!ip) return 'INVALID';
  const parts = ip.split('.');
  if (parts.length === 4) {
    return parts[0] + '.' + parts[1] + '.***.***.';
  }
  return 'INVALID';
}

const payload = {
  external_id: externalId,
  email: maskEmail(row.email),          // ← Redactado en payload
  phone: maskPhone(row.phone),          // ← Redactado en payload
  event_type: row.event_type,
  timestamp: row.timestamp,
  // ip_address: NO enviar a Pabbly, guardarlo solo en Holded/ERP
};
```

#### Logging seguro

```javascript
// ❌ NUNCA
Logger.log(`Procesando email: ${email}`);

// ✅ CORRECTO
Logger.log(`Procesando fila con email ${maskEmail(email)}`);

// ✅ O si es debug, usar nivel más alto
const DEBUG = false;
if (DEBUG) {
  Logger.log(`DEBUG: Full email = ${email}`); // solo visible en logs internos
}
```

### Auditoría básica

Guardar en una hoja "audit_log" o external:

```javascript
function auditLog(action, rowIndex, result, details = '') {
  const auditSheet = SpreadsheetApp.getActive().getSheetByName('audit_log');
  if (!auditSheet) return;
  
  const timestamp = new Date().toISOString();
  const user = Session.getActiveUser().getEmail() || 'system-trigger';
  
  auditSheet.appendRow([
    timestamp,
    user,
    action,            // "publish_success", "publish_failure", "config_update"
    rowIndex,
    result,            // "OK", "ERROR: 500", "RETRY: 429"
    details.substring(0, 200)  // truncar para no ser too verbose
  ]);
}

// En sync():
auditLog('publish_attempt', i, response.getResponseCode(), response.getContentText().substring(0, 100));
```

---

## Snippets y plantillas

### Plantilla 1: `computeExternalId()` determinista

```javascript
/**
 * Generar external_id único y determinista basado en datos del evento.
 * Mismo input = mismo ID (idempotencia).
 * Usa SHA-256 del tuple (email + phone + timestamp).
 */
function computeExternalId(row, colIndex) {
  const email = row[colIndex.email] || '';
  const phone = row[colIndex.phone] || '';
  const timestamp = row[colIndex.timestamp] || '';
  
  const key = `${email}|${phone}|${timestamp}`;
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, key);
  
  // Convertir a hex string (primeros 16 caracteres)
  let hashHex = '';
  for (let i = 0; i < 8; i++) {  // 8 bytes = 16 hex chars
    const byte = hash[i] + 256;  // unsigned
    hashHex += ('0' + byte.toString(16)).slice(-2);
  }
  
  return `evt_${hashHex.substring(0, 16)}`;  // evt_a7f3e9d2c1b5...
}

// Prueba:
// const row = ['2026-02-01T10:30Z', 'user@example.com', '+34612345', ...];
// const id1 = computeExternalId(row, colIndex);
// const id2 = computeExternalId(row, colIndex);
// console.log(id1 === id2);  // true
```

### Plantilla 2: `isComplete()` validación

```javascript
function isComplete(row, colIndex) {
  // Campos requeridos
  const required = ['timestamp', 'email', 'phone', 'event_type', 'source_url'];
  for (const field of required) {
    if (!(colIndex[field] >= 0) || !row[colIndex[field]]) {
      return false;
    }
  }
  
  // Validar formato
  if (!isValidEmail(row[colIndex.email])) return false;
  if (!isValidPhone(row[colIndex.phone])) return false;
  if (!isValidTimestamp(row[colIndex.timestamp])) return false;
  
  // Validar event_type contra whitelist
  const validTypes = ['contact_form', 'trial_signup', 'payment_success', 'course_enrolled', 'support_ticket'];
  if (!validTypes.includes(row[colIndex.event_type])) {
    return false;
  }
  
  // Validar campos contextuales
  if (row[colIndex.event_type].startsWith('payment_')) {
    const amount = parseFloat(row[colIndex.payment_amount]);
    if (isNaN(amount) || amount <= 0) return false;
  }
  
  if (row[colIndex.event_type].startsWith('course_')) {
    if (!row[colIndex.course_id]) return false;
  }
  
  // Validar estado: no duplicado, no en cooldown, no dead-letter
  if (row[colIndex.dead_letter]) return false;
  if (row[colIndex.published_at]) return false;
  
  const attempts = parseInt(row[colIndex.publish_attempts]) || 0;
  if (attempts >= 3) return false;
  
  // Cooldown: si falló antes, esperar 5 min entre reintentos
  if (attempts > 0 && row[colIndex.last_publish_attempt_at]) {
    const lastAttempt = new Date(row[colIndex.last_publish_attempt_at]);
    const now = new Date();
    const cooldownMs = 5 * 60 * 1000;  // 5 minutos
    if (now - lastAttempt < cooldownMs) {
      return false;  // Aún en cooldown
    }
  }
  
  return true;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  // Mínimo 5 caracteres, solo dígitos + caracteres de formato
  return phone && /^[\d\s\-\+\(\)]{5,}$/.test(phone);
}

function isValidTimestamp(ts) {
  try {
    const date = new Date(ts);
    return date instanceof Date && !isNaN(date.getTime());
  } catch {
    return false;
  }
}
```

### Plantilla 3: Estructura de configuración (PropertiesService)

```javascript
/**
 * Inicializar configuración por defecto.
 * Ejecutar una sola vez en el script.
 */
function initConfig() {
  const props = PropertiesService.getScriptProperties();
  
  // Webhook
  props.setProperty('WEBHOOK_URL', 'https://your-pabbly-webhook-url-here');
  
  // Parámetros de reintentos
  props.setProperty('MAX_RETRIES', '3');
  props.setProperty('RETRY_BACKOFF_MS', '1000');  // 1 segundo inicial
  props.setProperty('MAX_BACKOFF_MS', '32000');   // 32 segundos máximo
  
  // Batching
  props.setProperty('MAX_ROWS_PER_EXECUTION', '10');
  props.setProperty('TRIGGER_INTERVAL_MIN', '5');
  
  // Campos
  props.setProperty('REQUIRED_FIELDS', 'timestamp,email,phone,event_type,source_url');
  props.setProperty('MASKED_FIELDS', 'email,phone,ip_address');
  
  // Whitelist de event_type
  props.setProperty('VALID_EVENT_TYPES', 'contact_form,trial_signup,payment_success,course_enrolled,support_ticket');
  
  // Cooldown en minutos entre reintentos
  props.setProperty('RETRY_COOLDOWN_MIN', '5');
  
  // Límite de intentos antes de dead-letter
  props.setProperty('MAX_PUBLISH_ATTEMPTS', '3');
  
  // Debug
  props.setProperty('DEBUG_MODE', 'false');
  
  Logger.log('✅ Config initialized');
}
```

### Plantilla 4: Test en local

```javascript
// Para testing en Script Editor:

function testIsComplete() {
  const colIndex = {
    timestamp: 0,
    email: 1,
    phone: 2,
    event_type: 3,
    source_url: 4,
    published_at: 5,
    publish_attempts: 6,
    dead_letter: 7,
    payment_amount: 8,
    course_id: 9,
    last_publish_attempt_at: 10
  };
  
  // Test case 1: válido
  const row1 = [
    '2026-02-01T10:30Z',
    'user@example.com',
    '+34612345678',
    'contact_form',
    'https://deca.pt/',
    null,
    0,
    false
  ];
  console.log('Test 1 (valid):', isComplete(row1, colIndex));  // true
  
  // Test case 2: email inválido
  const row2 = [
    '2026-02-01T10:30Z',
    'invalid_email',
    '+34612345678',
    'contact_form',
    'https://deca.pt/',
    null,
    0,
    false
  ];
  console.log('Test 2 (invalid email):', isComplete(row2, colIndex));  // false
  
  // Test case 3: ya publicado
  const row3 = [
    '2026-02-01T10:30Z',
    'user@example.com',
    '+34612345678',
    'contact_form',
    'https://deca.pt/',
    '2026-02-01T10:31Z',  // ← published_at NO ES NULL
    1,
    false
  ];
  console.log('Test 3 (already published):', isComplete(row3, colIndex));  // false
}

function testComputeExternalId() {
  const colIndex = { timestamp: 0, email: 1, phone: 2 };
  const row = ['2026-02-01T10:30Z', 'user@example.com', '+34612345678'];
  
  const id1 = computeExternalId(row, colIndex);
  const id2 = computeExternalId(row, colIndex);
  
  console.log('ID 1:', id1);
  console.log('ID 2:', id2);
  console.log('Match:', id1 === id2);  // true → determinista ✅
}

function testFetchWithRetry() {
  // Mock test (sin vraiment llamar al webhook)
  const testUrl = 'https://httpbin.org/status/429';  // Simula rate limit
  
  try {
    const response = fetchWithRetry(testUrl, { method: 'get' }, 2, 500);
    console.log('Response code:', response.getResponseCode());
  } catch (err) {
    console.log('Expected error:', err.message);
  }
}
```

---

## Checklist de despliegue y operación

### Fase 1: Preparación (antes de activar trigger)

- [ ] Crear hoja "raw" en Spreadsheet con columnas de datos + control
- [ ] Crear hoja "audit_log" para tracking
- [ ] Crear Google Apps Script (nuevo proyecto o dentro del Spreadsheet)
- [ ] Copiar código de `sync()`, `fetchWithRetry()`, funciones helper
- [ ] Crear hoja de control temporalmente en Sheets (o usar Properties Service)
- [ ] Ejecutar `initConfig()` una vez para llenar PropertiesService
- [ ] Verificar `WEBHOOK_URL` es correcto (testear manualmente)
- [ ] Verificar que PropertiesService.getScriptProperties() retorna valores

### Fase 2: Testing (sin trigger, ejecuciones manuales)

- [ ] Insertar 3-5 filas de test en Sheets (diversas event_types)
- [ ] Ejecutar `sync()` manualmente en Script Editor (Ejecutar)
- [ ] Revisar logs: ¿se validaron filas? ¿se enviaron al webhook?
- [ ] En Pabbly/Stackby: ¿se recibieron los eventos?
- [ ] Verificar que `external_id`, `published_at`, `publish_attempts` se actualizaron
- [ ] Simular error en Pabbly: cambiar webhook a URL inválida, ejecutar sync(), verificar que se marca error + retry
- [ ] Verificar que `last_publish_attempt_at` se actualiza en intentos fallidos
- [ ] Revisar `audit_log`: ¿hay registros de éxito/error?
- [ ] Ejecutar `testIsComplete()`, `testComputeExternalId()` → todos green

### Fase 3: Activación del trigger

- [ ] Restaurar `WEBHOOK_URL` a URL correcta
- [ ] En Script Editor, click en **Triggers** → **Create new trigger**
- [ ] Configurar: función=`sync`, event=`Time-driven`, tipo=`Minutes`, intervalo=`Every 5 minutes`
- [ ] Activar **Failure notifications**: `Notify me immediately`
- [ ] Click en **Save**
- [ ] Esperar 5 minutos a que se ejecute automáticamente
- [ ] Revisar logs: ¿se ejecutó? ¿qué resultado?

### Fase 4: Operación continua

**Daily**:
- [ ] Revisar Sheets: ¿todas las nuevas filas fueron publicadas?
- [ ] Revisar `audit_log`: ¿hay errores?
- [ ] Revisar Pabbly logs: ¿algo fallado?
- [ ] Si hay dead-letters (filas con `publish_attempts >= 3`), investigar manualmente

**Weekly**:
- [ ] Revisar PropertiesService storage: ¿hay espacio? (límite 500KB)
- [ ] Revisar cuotas en Script Editor: **Quotas** en info del proyecto
- [ ] Revisar Sheets tamaño: ¿acercándose a límites?

**Monthly**:
- [ ] Limpiar `audit_log` (archivar mensajes antiguos)
- [ ] Revisar dead-letter log: ¿patrones de error?
- [ ] Actualizar whitelists de event_type si hay nuevos tipos

### Fase 5: Troubleshooting

| Problema | Causa probable | Solución |
|----------|---|----------|
| "Lock acquire timeout" en logs | Otra ejecución está en progreso | Esperar o aumentar `tryLock()` timeout a 60s |
| "Service using too much computer time" | Timeout en ejecución (> 6 min) | Reducir MAX_ROWS_PER_EXECUTION a 5 |
| "Service invoked too many times: urlfetch" | Agotada cuota daily de UrlFetch | Reducir reintentos o esperar 24h |
| Webhook recibe payloads duplicados | `external_id` cálculo es no-determinista | Revisar `computeExternalId()` usa same fields |
| Algunos eventos no se publican | Fila incompleta + no loggeado | Revisar `isComplete()`, añadir logs |
| "429 Too Many Requests" de Pabbly | Rate limit en webhook Pabbly | Aumentar `MAX_BACKOFF_MS` a 60s, reducir batch |
| PropertiesService quota exceeded | Demasiados `setProperty()` | Consolidar en una única propiedad JSON |

---

## Fuentes

### Google Apps Script (oficial)

1. **Quotas and Limits**  
   https://developers.google.com/apps-script/guides/services/quotas  
   *Referenciado para: runtime máx (6 min), triggers total runtime (90 min/día o 6 hr), URL Fetch calls (20K/día consumer, 100K workspace)*

2. **Lock Service Documentation**  
   https://developers.google.com/apps-script/reference/lock  
   *Referenciado para: LockService.getScriptLock(), tryLock(), releaseLock()*

3. **Properties Service**  
   https://developers.google.com/apps-script/reference/properties  
   *Referenciado para: storage seguro de secrets, 500KB límite total*

4. **UrlFetchApp**  
   https://developers.google.com/apps-script/reference/url-fetch  
   *Referenciado para: fetch(), fetchAll(), muteHttpExceptions, timeout behavior*

5. **Utilities (Digest, sleep)**  
   https://developers.google.com/apps-script/reference/utilities  
   *Referenciado para: computeDigest(), sleep(), getUuid()*

### Google Sheets API (oficial)

6. **Google Sheets API Limits**  
   https://developers.google.com/workspace/sheets/api/limits  
   *Referenciado para: read/write quotas (300 req/min), timeout (180s), exponential backoff recomendado*

7. **Sheets API Batch Requests**  
   https://developers.google.com/sheets/api/samples/batch  
   *Referenciado para: batchUpdate, maxBatchSize*

### Error Handling & Retry Patterns

8. **Google Cloud Exponential Backoff**  
   https://docs.cloud.google.com/application-integration/docs/error-handling-strategy  
   *Referenciado para: exponential backoff fórmula, jitter, máximo delay (32-64s)*

9. **Sheets API Error Handling (Exponential Backoff Algorithm)**  
   https://developers.google.com/workspace/sheets/api/limits#resolve_time-based_quota_errors  
   *Referenciado para: delay = min(((2^n) + random_ms), max_backoff), continue retrying hasta max*

### Comunidad & Best Practices

10. **Google Apps Script OAuth2 Library (LockService usage)**  
    https://github.com/googleworkspace/apps-script-oauth2  
    *Referenciado para: pattern de LockService con PropertiesService*

11. **UrlFetchApp: The Unofficial Documentation** (Justin Poehnelt)  
    https://justin.poehnelt.com/posts/definitive-guide-to-urlfetchapp/  
    *Referenciado para: fetchAll() async behavior, muteHttpExceptions best practice*

### DECA Context (Herramientas mencionadas)

- **Pabbly Connect**: https://www.pabbly.com/ (orquestación, webhook handler)
- **Stackby**: https://stackby.com/ (base de datos relacional, source of truth)
- **Getformly**: Captura de formularios (upstream)

---

## Apéndice: Matriz de decisión para reintentos

```
Código HTTP → ¿Reintentar?

2xx (200, 201, 202)
  → ✅ SÍ, ÉXITO, continuar

3xx (301, 302, 308)
  → ❌ NO, redirección, revisar URL

4xx
  400 Bad Request
    → ❌ NO, error de cliente, revisar payload/schema
  401 Unauthorized
    → ❌ NO, credenciales, revisar API key
  403 Forbidden
    → ❌ NO, permisos, revisar autenticación
  404 Not Found
    → ❌ NO, URL no existe
  429 Too Many Requests
    → ✅ SÍ, rate limit, esperar y reintentar con backoff exponencial

5xx (500, 502, 503, 504)
  → ✅ SÍ, error temporal del servidor, reintentar con backoff

Timeout de red (no response)
  → ✅ SÍ, error temporal, reintentar
```

---

## Apéndice: Script de monitoreo (opcional)

```javascript
/**
 * Función para monitores diarios (ejecutar vía trigger aparte, p.ej. a las 8am).
 * Envía reporte de salud del sistema a Slack o email.
 */
function healthCheck() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('raw');
  const data = sheet.getDataRange().getValues();
  
  let totalRows = data.length - 1;  // minus header
  let publishedCount = 0;
  let failedCount = 0;
  let deadLetterCount = 0;
  
  const colIndex = getColumnIndexMap(sheet);
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (row[colIndex.published_at]) publishedCount++;
    if (row[colIndex.publish_attempts] > 0 && !row[colIndex.published_at]) failedCount++;
    if (row[colIndex.dead_letter]) deadLetterCount++;
  }
  
  const report = `
    📊 **DECA Health Check** (${new Date().toISOString()})
    
    Total rows: ${totalRows}
    ✅ Published: ${publishedCount} (${((publishedCount / totalRows) * 100).toFixed(1)}%)
    ⚠️  Failed (pending retry): ${failedCount}
    🔴 Dead-letter: ${deadLetterCount}
    
    Runtime quota used today: ${getCurrentExecutionStats()}
    URL Fetch quota used: ${getCurrentUrlFetchStats()}
  `;
  
  // Enviar a Slack (si está configurado)
  const slackWebhook = PropertiesService.getScriptProperties().getProperty('SLACK_WEBHOOK');
  if (slackWebhook) {
    UrlFetchApp.fetch(slackWebhook, {
      method: 'post',
      payload: JSON.stringify({ text: report })
    });
  }
  
  Logger.log(report);
}

function getColumnIndexMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => { map[h] = i; });
  return map;
}
```

---

**Documento preparado por**: Arquitectura de Sistemas DECA  
**Última actualización**: 1 de febrero de 2026  
**Estado**: Producción v1.0