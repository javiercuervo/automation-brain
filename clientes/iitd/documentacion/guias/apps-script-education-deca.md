# Coste y límites de Apps Script para institutoteologia.org (DECA)

**Fecha de elaboración:** 1 de febrero de 2026  
**Última verificación:** 1 de febrero de 2026  
**Audiencia:** Equipo técnico DECA, Instituto Internacional de Teología a Distancia

---

## 1. Resumen Ejecutivo

- **Coste esperado de Apps Script:** €0 — Apps Script es completamente gratuito en toda edición de Google Workspace for Education [1]
- **Coste depende de:** La licencia/edición de Education (Fundamentals, Standard, Plus) que tenga institutoteologia.org, no del uso de Apps Script en sí
- **Verificación pública:** NO es posible verificar públicamente qué edición tiene el dominio; requiere acceso a Admin Console
- **Cuota de UrlFetch para Education:** 100.000 llamadas/día (vs 20.000 en consumer) — suficiente para DECA
- **Riesgo real:** Activar servicios de Google Cloud con facturación manual podría generar costes indirectos (no es automático)
- **Recomendación DECA:** Usar Sheets API con Apps Script en modo default (no Cloud estándar) y batching para minimizar cuotas
- **Checklist arquitectura:** Polling con trigger de tiempo, CacheService, LockService, exponential backoff, batching de escrituras

---

## 2. Qué incluye Education (Apps Script) y qué puede costar

### 2.1. Apps Script en las ediciones de Google Workspace for Education

Google Workspace for Education ofrece **cuatro ediciones** [1][2]:

| Edición | Coste | Apps Script incluido | Notas |
|---------|--------|-------------------|-------|
| **Fundamentals** | €0 | ✅ Sí, sin restricción | Versión gratuita base para instituciones educativas calificadas |
| **Standard** | $3–4 USD/usuario/año | ✅ Sí, sin restricción | Añade seguridad mejorada (Security Center, LDAP, auditoría) |
| **Teaching & Learning** | $48–60 USD/usuario/año (add-on) | ✅ Sí, sin restricción | Herramientas de enseñanza premium (Originality Reports, Classroom +) |
| **Plus** | $5–6 USD/usuario/año | ✅ Sí, sin restricción | Combina Standard + Teaching & Learning + funciones exclusivas |

**Conclusión:** Apps Script **está incluido en todas las ediciones sin coste adicional** [1]. El precio de la edición solo refleja características de seguridad, almacenamiento adicional y herramientas didácticas, no el acceso a Apps Script.

### 2.2. ¿Apps Script tiene algún coste variable o de uso?

**NO.** [1][3][4]

- Apps Script es un servicio sin cargo por uso/invocación
- Las cuotas diarias (ej. 100.000 llamadas UrlFetch) son límites de volumen, no triggers de facturación
- Exceder una cuota genera una excepción en el script, pero **no genera costes**
- No hay modelo "pay-as-you-go" para Apps Script; solo cuotas por usuario/día

### 2.3. Costes INDIRECTOS posibles (poco probables en Education)

Activar servicios de Google Cloud con **facturación manual** podría generar costes [5][6]:

| Servicio | Cuándo ocurre | Coste tipico | Evitar con |
|----------|---------------|-------------|-----------|
| **Cloud Sheets API** | Nunca en Apps Script; Sheets nativa es free | N/A | No necesario — Sheets Service de Apps Script es nativo |
| **Cloud Firestore** | Si se habilita Cloud Firestore como BD | $0,06 por 100K reads + escrituras | Usar Google Sheets o Stackby en su lugar |
| **Cloud Functions** | Si se crea un Cloud Function separado | $0,40 por millón invocaciones | No usar — Apps Script default es suficiente |
| **Cloud Logging / Monitoring** | Logs avanzados en Cloud Console | Mínimo ~$0,50–2/mes en Spark | No requiere en Fundamentals |
| **Cloud Storage** | Si se almacenan archivos fuera de Drive | $0,020/GB mes | Usar Google Drive nativo |

**Para DECA:** Con Architecture Getformly → Sheets → Apps Script → Pabbly → Stackby, **NO hay razón para activar servicios de Cloud con facturación**. Apps Script usa proyecto Cloud default (sin billing) [7].

### 2.4. Cita clave sobre costes

> _"All use of the Google Sheets API is available at no additional cost. Exceeding the quota request limits doesn't incur extra charges and your account is not billed."_ [8]

---

## 3. Qué se puede saber del dominio institutoteologia.org y cómo verificarlo

### 3.1. ¿Se puede verificar públicamente?

**NO.** [9][10]

Las siguientes información NO está visible públicamente:
- Edición de Google Workspace for Education (Fundamentals, Standard, Plus)
- Número de licencias activas
- Historial de suscripción
- Configuración de Admin Console

El dominio institutoteologia.org existe y usa Google Workspace (visible en MX records), pero la edición específica requiere:

### 3.2. Cómo verificar INTERNAMENTE (pasos concretos)

**Requisito:** Acceso de administrador del dominio a Google Admin Console

**Pasos:**

1. Accede a [admin.google.com](https://admin.google.com) con una cuenta administrador de institutoteologia.org
2. Selecciona **Menú → Cuenta → Suscripciones y planes** (Subscriptions & Plans)
3. En la sección "Google Workspace for Education" verás:
   - Edición actual (ej. "Education Plus")
   - Número de licencias activas
   - Fecha de renovación
   - Estado de facturación
4. Si hay duda, contacta a tu revendedor autorizado de Google Workspace for Education o a Google for Education directamente [2]

**Alternativa (sin Admin Console):**
- Solicitar a un administrador del dominio que comparta una captura de pantalla de Admin → Subscriptions
- O contactar al departamento de TI/Administración del instituto

### 3.3. Cambios recientes (2025–2026)

A partir de **1 de octubre de 2025**, Google cambió el modelo de licencias de Education Standard/Plus a una "single-license" unificada [1][11]:

- Antes: Licencias separadas para estudiantes y personal
- Ahora: Una única licencia cubre a estudiantes y personal
- Requisito mínimo: 50 licencias O licencias por (estudiantes + personal) total, lo que sea mayor

**Implicación para DECA:** Si institutoteologia.org renovó su suscripción después de octubre 2025, usa el modelo nuevo. Si renovará antes de febrero 2026, puede usar el modelo antiguo (si eligió).

---

## 4. Cuotas y límites que importan para DECA

### 4.1. Cuotas de Apps Script en Education

La edición Education (Fundamentals, Standard, Plus) asigna las cuotas "Workspace" [12]:

| Cuota | Workspace (Education) | Consumer | Relevancia DECA |
|-------|-----------|----------|-----------------|
| **UrlFetch calls/day** | 100.000 | 20.000 | ✅ Alto — Pabbly webhook |
| **Trigger runtime/day** | 6 horas | 90 minutos | ✅ Crítico — Publisher recurrente |
| **SpreadsheetApp calls** | Sin límite explícito (cuota de tiempo) | Igual | ✅ Alto — Lectura/escritura buffer |
| **Email sends/day** | Limitado por trigger, no cuota fija | Igual | Media — Notificaciones |
| **Spreadsheets created/day** | 3.200 | 250 | Bajo |
| **Single execution timeout** | 6 minutos | 6 minutos | ✅ Alto — Webhook puede tardar |

### 4.2. Cuota de Google Sheets API (si se usa directamente)

Si DECA usa **Sheets API** en lugar de Sheets Service de Apps Script [8]:

| Límite | Valor | Reset |
|--------|-------|-------|
| **Read requests/min/project** | 300 | Cada minuto |
| **Write requests/min/project** | 300 | Cada minuto |
| **Read requests/min/user** | 60 | Cada minuto |
| **Write requests/min/user** | 60 | Cada minuto |
| **Daily limit** | Sin límite (solo por minuto) | — |

**Para DECA:** Si usas Apps Script `SpreadsheetApp.getActiveSheet().appendRow()`, no afecta Sheets API. Estos límites solo aplican si llamas `Sheets API` directamente.

### 4.3. Cuota Pabbly Connect (orquestación)

Pabbly es el nexo entre Apps Script y Stackby. **Cuotas Pabbly** (no Google) [referencia: documentación Pabbly]:

- **Free plan:** 5 flujos, 5.000 acciones/mes
- **Starter:** 10 flujos, 50.000 acciones/mes (~€6/mes)
- **Professional:** 100+ flujos, 500.000+ acciones/mes (~€30/mes)

**Para DECA:** Determinar si 5.000 ó 50.000 acciones/mes es suficiente para el volumen de inscritos DECA. Esto es independiente de Google.

### 4.4. Arquitectura de flujo DECA y cuotas aplicables

```
Getformly (form response)
    ↓ [webhook payload]
Google Sheets (buffer storage) ← Apps Script reads here (SpreadsheetApp)
    ↓ [onChange trigger or scheduled]
Apps Script Publisher
    ├─ Reads Sheets buffer (SpreadsheetApp) — QUOTA: Trigger runtime (6h/día)
    ├─ Calls Pabbly webhook via UrlFetchApp — QUOTA: UrlFetch (100.000/día)
    └─ Mark row as processed
        ↓ [batch JSON payload]
Pabbly Connect (orquestación + upsert logic)
    ├─ Transforma datos
    └─ Upsert a Stackby — QUOTA: Pabbly API (plan-dependent)
        ↓
Stackby (Source of Truth)
    └─ Registra usuario/datos finales
```

**Cuotas críticas por paso:**

| Paso | Servicio | Cuota | Uso tipico DECA | % consumo |
|------|----------|-------|-----------------|-----------|
| 1. Form response buffer | Sheets | — | 1–10/día | Negligible |
| 2. Apps Script onEdit/onChange | Apps Script | 6h trigger runtime | 1 exec/min = 60–600 seg = <1% | Bajo |
| 3. UrlFetch a Pabbly | Apps Script | 100.000/día | 10–100 calls/día | <0,1% |
| 4. Pabbly upsert | Pabbly | Plan limit | Depende plan | Depende |
| 5. Stackby ingest | Stackby | Stackby quota | 1–10 rec/min | Depende |

### 4.5. Límites técnicos a considerar en Apps Script

| Límite | Valor | Impacto DECA |
|--------|-------|-------------|
| **Single function execution timeout** | 6 minutos | Si Pabbly tarda >6min en responder, error. Usar async/webhook mejor |
| **UrlFetch timeout** | 60 segundos | Pabbly debe responder en <60 seg, típicamente lo hace |
| **URL length** | 2 KB | Payload JSON a Pabbly típicamente <1 KB — OK |
| **Simultaneous executions/user** | 30 | Si 30+ usuarios ejecutan trigger simultaneously, cola. Aceptable |
| **Simultaneous executions/script** | 1.000 | Script DECA solo <100 típicamente — OK |

---

## 5. Recomendación de arquitectura para DECA

### 5.1. Diseño del Publisher en Apps Script (minimizar cuotas)

**Objetivo:** Procesar cambios de Sheets buffer → Pabbly → Stackby, optimizando cuotas y evitando bucles infinitos.

#### Opción A: onEdit + Webhook Inmediato (Recomendado)

```javascript
// Script de Apps Script en Sheets DECA
function onEdit(e) {
  if (!e.value) return; // Ignorar celdas vacías
  
  // Usar LockService para evitar race conditions
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    console.log('Lock timeout — otro proceso ejecutándose');
    return;
  }
  
  try {
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    
    // Si el cambio es en la columna "Status" y es nueva entrada (no procesada)
    if (e.range.getColumn() === 6 && sheet.getRange(row, 8).getValue() !== 'SENT') {
      const payload = {
        name: sheet.getRange(row, 2).getValue(),
        email: sheet.getRange(row, 3).getValue(),
        phone: sheet.getRange(row, 4).getValue(),
        timestamp: new Date().toISOString()
      };
      
      // Llamada a webhook Pabbly (UrlFetch)
      const options = {
        method: 'post',
        payload: JSON.stringify(payload),
        contentType: 'application/json',
        muteHttpExceptions: true,
        timeout: 30 // segundos
      };
      
      const response = UrlFetchApp.fetch('https://api.pabbly.com/your-webhook-url', options);
      
      if (response.getResponseCode() === 200) {
        sheet.getRange(row, 8).setValue('SENT');
      } else {
        sheet.getRange(row, 8).setValue('FAILED: ' + response.getResponseCode());
      }
    }
  } finally {
    lock.releaseLock();
  }
}
```

**Ventajas:**
- Bajo latency (real-time)
- Escala con volumen (cada onEdit independiente, <1 seg)
- Evita polling/triggers recurrentes

**Cuota consumida:**
- UrlFetch: 1 call/entrada = ~100–1.000/día (bien dentro de 100.000)
- Trigger runtime: <1 seg/ejecución = ~0.1% del límite 6h/día

#### Opción B: Trigger de Tiempo Recurrente (Batch)

```javascript
// Ejecutar cada 10 minutos
function publishBatchToStackby() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('DECA_Buffer');
  const data = sheet.getDataRange().getValues();
  const cache = CacheService.getScriptCache();
  
  // Usar CacheService para evitar procesar dos veces
  const lastRow = cache.get('lastProcessedRow') || 1;
  
  const newRows = data.slice(lastRow);
  if (newRows.length === 0) return;
  
  // Batch: agrupar en JSON array
  const batch = newRows.map(row => ({
    name: row[1],
    email: row[2],
    phone: row[3],
    status: 'pending'
  }));
  
  // Una sola llamada UrlFetch con array
  const options = {
    method: 'post',
    payload: JSON.stringify({ records: batch }),
    contentType: 'application/json',
    muteHttpExceptions: true,
    timeout: 45
  };
  
  const response = UrlFetchApp.fetch('https://api.pabbly.com/bulk-webhook', options);
  
  if (response.getResponseCode() === 200) {
    cache.put('lastProcessedRow', data.length, 600); // Cachear 10 min
    sheet.getRange(lastRow + 1, 8, newRows.length, 1)
      .setValue('SENT');
  }
}

// Crear trigger manualmente: Extensions → Apps Script → Triggers → onTime, every 10 minutes
```

**Ventajas:**
- Más eficiente (batch reduce UrlFetch calls)
- Mayor control sobre timing

**Cuota consumida:**
- UrlFetch: 1 call/10 min = ~144/día (negligible)
- Trigger runtime: ~2–5 seg/ejecución = ~0.2–0.4% del límite 6h/día

#### Opción C: Hybrid (Recomendado para escala DECA)

- **onEdit** para alertar "hay cambio nuevo" (mark flag)
- **Trigger cada 30 min** para batch real envío a Pabbly (evita webhook sobrecarga)

### 5.2. Buenas prácticas para DECA

| Práctica | Implementación | Benefit |
|----------|----------------|---------| 
| **Batching** | Agrupar 5–50 registros en un JSON array antes de UrlFetch | Reduce UrlFetch calls 5–10x |
| **CacheService** | Cachear `lastProcessedRow` o `lastSyncTime` | Evita replicación, mejora velocidad |
| **LockService** | Bloqueo en onEdit para race conditions | Evita duplicación en procesamiento concurrente |
| **Exponential backoff** | Si Pabbly falla (timeout/5xx), retry con delay 2s→4s→8s | Mejora resiliencia sin exceder runtime |
| **Logging minimalista** | Solo errores a Logger.log() | Evita overhead de log búsqueda |
| **Webhook fallback** | Marcar "FAILED" si UrlFetch error, revisar manualmente | Trazabilidad |

### 5.3. Checklist de implementación

- [ ] Verificar en Admin Console qué edición es institutoteologia.org (Fundamentals/Standard/Plus)
- [ ] Crear Apps Script en Sheets DECA con onEdit o trigger tiempo
- [ ] Implementar LockService en función de publisher
- [ ] Implementar CacheService para `lastProcessedRow` o timestamp
- [ ] Copiar URL webhook Pabbly a Apps Script
- [ ] Test: Añadir 5 registros, verificar envío a Pabbly en <30 seg
- [ ] Test: Verificar que Stackby recibe datos correctos (upsert funciona)
- [ ] Configurar Pabbly plan (Free 5k/mes o Starter 50k/mes) según volumen DECA esperado
- [ ] Documentar flujo en README: Sheets buffer → Apps Script → Pabbly → Stackby
- [ ] Monitorear errores: Logger.log() en función, revisar semanal
- [ ] Alertas: Si rate de error >5%, parar automation y revisar Pabbly/Stackby status

---

## 6. Conclusión: Coste esperado para DECA

| Componente | Coste | Notas |
|------------|-------|-------|
| **Google Workspace Education (edición actual)** | €0–150/año aprox | Depende edición; Apps Script incluido |
| **Apps Script** | €0 | Siempre gratuito |
| **Google Sheets API** | €0 | Sheets Service de Apps Script es nativo, sin charges |
| **Pabbly Connect** | €0–30/mes | Depende plan (Free 5k/mes, Starter ~€6, Pro ~€30) |
| **Stackby** | €0–? | Depende plan Stackby (verificar pricing público) |
| **Google Cloud Billing** | €0 (si se evita proyectos custom) | No se activa automáticamente; default project es free |
| **TOTAL esperado** | **€0 (Google) + Pabbly + Stackby** | Google gratuito; costes en terceros (Pabbly, Stackby) |

**Recomendación operativa final:**

1. **Coste = 0€ en lado Google.** Apps Script es libre en todas ediciones Education.
2. **Verificar internamente** via Admin → Subscriptions para saber edición actual.
3. **Usar batching + LockService + CacheService** en Apps Script para minimizar cuotas y evitar overhead.
4. **Monitorear Pabbly/Stackby costes** (terceros), no Google.
5. **Diseñar con webhook/onEdit** en lugar de polling pesado para mejor latency y cuota efficiency.

---

## 7. Fuentes

[1] Google. (2024). *Google Workspace for Education pricing and licensing.* support.google.com. https://support.google.com/a/answer/14206754?hl=en

[2] Google. (2025). *Comparar ediciones de Google Workspace for Education.* edu.google.com. https://edu.google.com/intl/es-419_ALL/workspace-for-education/editions/compare-editions/

[3] Google. (2025). *Usage limits | Google Sheets API.* developers.google.com. https://developers.google.com/workspace/sheets/api/limits

[4] Google. (2025). *Quotas for Google Services | Apps Script.* developers.google.com. https://developers.google.com/apps-script/guides/services/quotas

[5] Google Cloud. (2026). *Cloud Billing overview.* cloud.google.com. https://docs.cloud.google.com/billing/docs/concepts

[6] Firebase/Google Cloud. (2026). *Firebase Pricing.* firebase.google.com. https://firebase.google.com/pricing

[7] Google. (2025). *Google Cloud projects | Apps Script.* developers.google.com. https://developers.google.com/apps-script/guides/cloud-platform-projects

[8] Google. (2025). *All use of the Google Sheets API is available at no additional cost.* developers.google.com. https://developers.google.com/workspace/sheets/api/limits

[9] Support Google. (2026). *Cambiar el dominio principal de Google Workspace.* support.google.com. https://support.google.com/a/answer/7009324?hl=es-419

[10] Google Admin Console Documentation. (2025). *Manage subscriptions and plans.* support.google.com (Admin topic — requiere acceso interno).

[11] Trafera. (2025). *2025 Google Workspace for Education Pricing and Licensing Updates.* trafera.com. https://www.trafera.com/blog/2025-google-workspace-for-education-pricing-and-licensing-updates/

[12] Justin Poehnelt. (2025). *UrlFetchApp: The Unofficial Documentation.* justin.poehnelt.com. https://justin.poehnelt.com/posts/definitive-guide-to-urlfetchapp/

[13] Google. (2025). *Best Practices | Apps Script.* developers.google.com. https://developers.google.com/apps-script/guides/support/best-practices

[14] Moldstud. (2025). *Optimize Google Apps Script performance with Google Sheets API: Tips and best practices.* moldstud.com. https://moldstud.com/articles/p-optimize-google-apps-script-performance-with-google-sheets-api-tips-and-best-practices

[15] Pabbly. (2025). *How to Set-Up Webhook Inside Google Sheets Using Pabbly Connect.* pabbly.com. https://www.pabbly.com/how-to-set-up-webhook-inside-google-sheets-using-pabbly-connect/

[16] Justin Poehnelt. (2025). *Apps Script CacheService: Unofficial Documentation and Limits.* justin.poehnelt.com. https://justin.poehnelt.com/posts/exploring-apps-script-cacheservice-limits/

---

**Documento preparado para:** Corpus de Claude Code / Equipo técnico DECA  
**Licencia:** Libre para distribución interna institutoteologia.org  
**Contacto para actualizaciones:** [TI institutoteologia.org]
