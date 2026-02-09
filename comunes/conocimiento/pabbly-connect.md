# Pabbly Connect Technical Knowledge Base
## For Claude Code Training (AI Script Generation)

---

## 1. Visión General de Pabbly Connect

### Qué es y qué no es

**Pabbly Connect es:**
- Un orquestador de workflows no-code/low-code basado en eventos
- Un gestor de integraciones entre 2,000+ aplicaciones
- Un sistema de ejecución de tareas asincrónicas con reintentos automáticos
- Un normalizador de datos entre APIs REST heterogéneas
- Una plataforma UI-first con capacidad de ejecución de código JavaScript/Python limitada

**Pabbly Connect NO es:**
- Un servidor de aplicaciones: no mantiene estado persistente entre ejecuciones
- Una base de datos: aunque puede actuar como orquestador de escrituras a bases de datos
- Un motor de computación general: tiene límites estrictos de tiempo (25s) y memoria (128MB)
- Un procesador de datos masivo: diseñado para workflows de volumen medio (~500 items por iteración)
- Un reemplazo para cálculos complejos: debe delegar operaciones pesadas a APIs externas

### Cómo funciona internamente

**Flujo de ejecución:**

1. **Trigger** (0 tareas): Espera evento de aplicación (webhook, polling, schedule)
2. **Pasos internos** (0 tareas): Filtros, Routers, Formatters, Iterators, Delays
3. **Acciones externas** (1 tarea cada una): Escritura/lectura a aplicación externa
4. **Reintentos automáticos**: 5 intentos con backoff exponencial (10m, 1h, 3h, 9h)

**Persistencia de datos:**
- Los outputs de cada paso persisten y están disponibles para mapeo en pasos siguientes
- No hay estado global del workflow: solo datos de pasos anteriores
- Cada iteración de un Iterator recibe una copia aislada de los datos de entrada

**Ejecución:**
- Asincrónica: los workflows se ejecutan en background
- Determinística: el mismo input genera el mismo output (sin side effects)
- No bloqueante: los delays no "congelan" la ejecución; otros workflows continúan

### Filosofía UI-first y sus implicaciones técnicas

**Principio central**: Todo debe ser mappable visualmente en la UI

**Implicaciones para Claude Code:**
- Las salidas deben ser JSON simples (no funciones, no Promises)
- Los errores se comunican como excepciones de JavaScript (no códigos numéricos)
- No hay "chaining" de promesas: todo es ejecución síncrona dentro del timeout de 25s
- Los datos complejos deben serializarse a JSON antes de retornar

**Limitación crítica**: Si la UI no puede mapear tu output, el siguiente paso fallará silenciosamente

---

## 2. Arquitectura Técnica Relevante

### Flujo de datos interno

```
TRIGGER
  ↓
Event Payload → [datos capturados]
  ↓
STEP 1 (Filter/Router/etc)
  ↓
Input: {payload de trigger + contexto de pasos anteriores}
Output: {transformación o rama de ruta}
  ↓
STEP 2 (Acción externa o interna)
  ↓
Input: Datos mapeados del paso anterior
Output: Respuesta de la aplicación (JSON)
  ↓
STEP 3+ (Iteración si Iterator activado)
  ↓
[Para cada item del array:]
  Ejecutar todos los pasos posteriores con ese item
  Acumular resultados
  ↓
[Si falla Step N:]
  Si "Skip Step on Failure" = ON → saltar pasos dependientes
  Si "Skip Step on Failure" = OFF → detener workflow
  Auto-reexecute: reintentar el paso N en 10min, 1h, 3h, 9h
```

### Cómo se manejan inputs/outputs entre pasos

**Mapeo de datos:**
- Campo "Primer Nombre" del paso 1 → Campo "Nombre" del paso 2
- Seleccionas "Primer Nombre" de dropdown → Pabbly interpola `{{step_1.firstName}}`
- Strings entre llaves dobles `{{}}` se reemplazan en tiempo de ejecución

**Datos disponibles para mapeo:**
```json
{
  "step_N": {
    "field1": "value1",
    "field2": 123,
    "array": [{"id": 1}, {"id": 2}],
    "nested": { "deep": "value" }
  }
}
```

**Restricción crítica**: Si mapeass un campo NULL directamente, Pabbly genera error de mapeo. Soluciones:
- Usar formatter condicionalmente antes
- Aplicar filter que valide existencia
- Usar placeholder `{{blank}}` para omitir campos vacíos

### Qué persiste y qué no

**Persiste:**
- Salida de cada step durante la ejecución del workflow
- Datos en el "Task History" (visible en UI post-ejecución)
- Configuración de workflow (pasos, mappings, filtros)

**NO persiste:**
- Variables locales dentro de un script Code by Pabbly
- Estado de sesión HTTP
- Contexto de ejecución anterior (cada trigger es ejecución nueva)
- Logs internos del script (solo outputs finales quedan registrados)

### Ejecución síncrona vs asincrónica

**Dentro de un workflow:**
- Ejecución de pasos: SÍNCRONA (paso A espera a paso B)
- Reintentos fallidos: ASINCRÓNICA (se reintentan en background después de esperas)
- Entre workflows diferentes: ASINCRÓNICA (no se bloquean mutuamente)

**En Code by Pabbly:**
- JavaScript ejecutado de forma SÍNCRONA
- Timeouts/Delays: No se pueden usar para "esperar": harían timeout del script
- Fetch: No esperes respuestas lentas (>20s); usará 20s del presupuesto de 25s
- Callbacks: No funciona; todo debe ser promise-less

---

## 3. Code by Pabbly (CRÍTICO)

### Entorno de ejecución JavaScript

**Runtime:**
- Node.js 18.x
- AWS SDK v3 (modular; requiere imports específicos)
- Soporta ES6+ (const, arrow functions, destructuring, etc.)
- CommonJS y ESM funcionales

**Variables globales disponibles:**
- `fetch`: Disponible sin importar
- `console`: console.log() para debugging (visible en task history bajo "logs")
- `JSON`: JSON.stringify(), JSON.parse()
- `Math`, `Date`, `String`: Librerías estándar
- `AWS SDK v3`: `@aws-sdk/client-[service]`

**NO disponible:**
- Módulos npm externos (no se pueden instalar)
- Async/await que requiera esperar respuestas externas >24s
- Acceso a filesystem
- Variables de sesión persistentes

### APIs disponibles

**Input (cómo recibir datos del step anterior):**
```javascript
// El dato entra como parámetro (varía por plataforma)
// Consulta documentación de la aplicación trigger específica
// Ejemplo genérico (basado en observaciones):
const inputData = input; // o steps.previous, o event.payload (varía)
```

**Output (cómo devolver datos al siguiente step):**
```javascript
// Retorna SIEMPRE un objeto JSON serializable
return {
  status: "success",
  message: "Datos procesados",
  count: 42,
  data: { id: 1, name: "Test" },
  array: [1, 2, 3]
};

// NO retornes:
return Promise.resolve(...); // Error: Promise no serializable
return () => {}; // Error: función no serializable
return undefined; // Error: undefined no puede ser mapeado
```

**fetch API (para requests a APIs externas):**
```javascript
const response = await fetch('https://api.example.com/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: 'value' })
});

const data = await response.json();
return data; // Retorna la respuesta parseada
```

**CRÍTICO**: El fetch cuenta contra el timeout de 25 segundos. Si el servidor tarda 20s, solo tienes 5s para procesar la respuesta.

### Límites conocidos

| Límite | Valor | Impacto |
|--------|-------|--------|
| Timeout de ejecución | 25 segundos | Fetch lento + procesamiento = fallo |
| Memoria | 128 MB | Loops grandes que acumulan datos fallan |
| Tamaño de string | No documentado | Evitar strings >10MB |
| Llamadas a fetch | No documentado | Cada fetch resta del timeout |
| Variables en closure | Cuentan contra 128MB | Limpiar referencias después de uso |

**Comportamiento en timeout:**
- Script se mata sin grace period
- Output parcial NO se retorna
- Workflow avanza al siguiente step (pero sin datos mapeables)
- Siguiente step falla: "Cannot map undefined field"

### Buenas prácticas

#### Transformaciones complejas

**Patrón de entrada/salida limpio:**
```javascript
// BUENO: Recibe datos, procesa, retorna JSON
function transformarContacto(input) {
  const parsed = JSON.parse(input); // Si entra como string
  return {
    firstName: (parsed.nombre || "").split(" ")[0],
    lastName: (parsed.nombre || "").split(" ")[1] || "",
    email: parsed.email.toLowerCase(),
    isVIP: parsed.monto > 1000
  };
}
```

**Procesamiento seguro:**
```javascript
// BUENO: Manejo de errores, defaults seguros
try {
  const data = JSON.parse(input);
  const result = {
    id: data.id || null,
    status: data.estado === "A" ? "active" : "inactive"
  };
  return result;
} catch (e) {
  return { error: e.message, input: input }; // Retorna error serializable
}
```

#### Normalización de datos

**Standarizar formatos:**
```javascript
// Normaliza números de teléfono
function normalizarTelefono(tel) {
  if (!tel) return null;
  const nums = tel.replace(/\D/g, '');
  return nums.length >= 10 ? '+1' + nums.slice(-10) : null;
}

// Normaliza URLs
function normalizarURL(url) {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    return u.href;
  } catch {
    return null;
  }
}

// Normaliza emails
function normalizarEmail(email) {
  return email ? email.toLowerCase().trim() : null;
}

return {
  phone: normalizarTelefono(input.phone),
  website: normalizarURL(input.sitio),
  email: normalizarEmail(input.correo)
};
```

#### Manejo de errores robusto

**NO HAGAS ESTO:**
```javascript
// MALO: Asume que los datos siempre existen
const id = input.user.profile.id; // Falla si input.user es undefined
return { id: id };
```

**HAZ ESTO:**
```javascript
// BUENO: Validación defensiva
const id = input?.user?.profile?.id || null;
const nombre = (input?.nombre || "").toString().trim();
const edad = parseInt(input?.edad, 10) || 0;

return {
  id,
  nombre,
  edad,
  valido: id !== null && nombre.length > 0
};
```

#### Operaciones batch/loop

**Para arrays pequeños (<500 items):**
```javascript
// Iterator debe manejar esto, pero código puede procesar un item
const item = input; // Iterator pasa 1 item por vez
return {
  processed: true,
  original: item,
  transformed: transformarItem(item)
};
```

**Para arrays grandes (>500 items):**
- **NO** intentes procesar todo en un script
- Usa Iterator en la UI para dividir en chunks
- Cada chunk se procesa por separado con su propio script

### Anti-patrones claros

**Anti-patrón 1: Esperar respuestas lentas**
```javascript
// MALO: API externa que tarda 30 segundos
const response = await fetch('https://slow-api.com', { timeout: 30000 });
// Timeout de script a los 25 segundos → fallo
```

**Solución:**
- Usa un webhook desde la API externa para notificar resultado
- O divide en dos workflows: primero lanza async, luego chequea status

**Anti-patrón 2: Acumular datos sin límite**
```javascript
// MALO: Loop que crece indefinidamente
let results = [];
for (let i = 0; i < 10000; i++) {
  results.push({ id: i, data: "x".repeat(10000) });
}
return results; // 128MB fácilmente excedido
```

**Solución:**
- Procesar de a 100-200 items máximo
- Acumular en external storage, no en memory
- Usar Iterator para repartir carga

**Anti-patrón 3: Confiar en side effects**
```javascript
// MALO: Esperar que la variable persista en próximo step
global.counter = 0;
global.counter++;
return { count: global.counter };
// En próximo step: global.counter siempre será undefined
```

**Solución:**
- Retornar todo lo necesario en el JSON de salida
- No usar variables globales para persistencia

**Anti-patrón 4: Olvidar la serialización**
```javascript
// MALO: Retornar objeto con métodos
const date = new Date();
return {
  timestamp: date, // No serializable directamente
  formatted: date.toString() // OK, es string
};

// MEJOR:
return {
  timestamp: new Date().toISOString(),
  unix: Date.now()
};
```

---

## 4. Webhooks y APIs REST

### Cómo funcionan los Webhooks en Pabbly

**Flujo completo:**

1. Pabbly genera URL única: `https://webhook.pabbly.com/...`
2. Configura esa URL en la app origen (Pabbly Form Builder, Zapier, etc.)
3. App origen envía HTTP POST cuando evento dispara
4. Pabbly recibe payload, extrae campos, dispara workflow
5. Workflow comienza en primer step (puede ser Filter, Iterator, etc.)

**Captura de webhook (en UI):**
- Botón "Capture Webhook Response" espera hasta 5 min por primer evento
- Cuando llega, Pabbly extrae estructura JSON
- Muestra "Simple" y "Advanced" response options
- Simple: campos aplainados
- Advanced: estructura JSON completa con arrays

### Formatos esperados

**Entrada (qué espera Pabbly):**
```json
{
  "field1": "value1",
  "field2": 123,
  "field3": true,
  "nested": {
    "deep": "value"
  },
  "array": [1, 2, 3]
}
```

**Salida (qué retorna Pabbly si necesitas feedback):**
```json
{
  "status": "success",
  "message": "Procesado correctamente",
  "id": 12345
}
```

**Headers recomendados en webhook origen:**
```
Content-Type: application/json
User-Agent: Pabbly-Integration/1.0
X-Webhook-ID: [opcional, para tracking]
```

### Uso típico como ingesta masiva

**Patrón: Webhook + Iterator + Google Sheets**

```
Webhook trigger (form submission)
  ↓ payload: { lineItems: [ {id: 1, qty: 5}, {id: 2, qty: 10} ] }
  ↓
Code by Pabbly (normalizar estructura)
  ↓
Iterator (una vez por lineItem)
  ↓
Google Sheets (append row)
  ↓
[3 rows creadas en Sheets, 1 task contabilizado]
```

**Patrón: Webhook masivo (múltiples disparos)**
- Cada webhook dispara workflow independiente
- Pabbly procesa en paralelo
- Reintentos automáticos si fallan

**Optimización para alta carga:**
```
1. Webhook recibe datos
2. Pabbly almacena en Queue interna (automático)
3. Procesa en cola con delays entre items
4. Evita rate limiting de apps destino
```

### Consideraciones de seguridad y fiabilidad

**Seguridad:**
- Webhook URL es pública pero impredecible (token aleatorio)
- Sin autenticación nativa en Pabbly (confía en URL opacity)
- Usa HTTPS siempre; Pabbly no acepta HTTP
- Valida origen si es posible (verificar IP/header)

**Fiabilidad:**
- Webhook se auto-reinventa si falla (HTTP 5xx/timeout)
- Reintentos automáticos de Pabbly: 5 intentos, backoff exponencial
- **Idempotencia crítica**: Webhook podría reintentarse múltiples veces
- **Implementa**: Lookup/upsert para evitar duplicados

**Patrón idempotente:**
```javascript
// Paso 1: Lookup si ya existe
// Si existe → Skip o Update
// Si no existe → Create
```

---

## 5. Integraciones Comunes (Enfocado a Datos)

### Google Sheets

#### Lectura

**Acción: "Get Spreadsheet Rows"**
- Retorna todos los rows de un rango específico
- Máximo ~100 rows práctico (sin Iterator)
- Incluye headers por defecto

**Acción: "Lookup Spreadsheet Row"**
- Busca coincidencia en columna específica
- **LÍMITE**: Retorna hasta 3 resultados documentados
- Busca solo en primeras 100 filas
- Usa para validaciones rápidas, no para búsquedas complejas

**Acción: "Lookup Spreadsheet Rows"** (plural)
- Variante: busca múltiples coincidencias
- Retorna array si hay varios matches
- Combina con Iterator para procesar cada match

#### Escritura

**Acción: "Add New Row"**
- Append a fila nueva
- Requiere mapeo de todos los campos
- Usa `{{blank}}` para omitir campos
- Cuenta como 1 task

**Acción: "Update Row"**
- Requiere Row Index (obtenido de Lookup)
- Actualiza fields específicos
- Otros fields permanecen sin cambios
- Cuenta como 1 task

**Acción: "Append Values"**
- Similar a Add New Row
- Más flexible con headers

#### Límites y problemas típicos

| Límite | Valor | Workaround |
|--------|-------|-----------|
| API Rate | 60 writes/100s per user | Delay 1+ min entre batches |
| Lookup matches | 3 resultados prácticos | Usa Get Rows + Iterator |
| Searchable rows | Primeras 100 filas | Ordena data crítica arriba |
| Empty field error | Null values causan fallo | Usa {{blank}} o Filter |
| Lookup latency | Algunas veces lenta | Habilita "Send on Event" en sheet |

**Problem: Authorization Required**
- Causa: Múltiples Google accounts en mismo navegador
- Solución: Usar incognito window o logout de otras accounts

**Problem: Lookup returns empty**
- Causa: Lookup no encuentra en primeras 100 rows
- Solución: Usar Get Rows con rango específico (A2:Z1000) + Iterator

### Stackby

#### Lectura/Escritura vía API nativa

**Configuración:**
- Requiere API Key (obtén de Stackby account settings)
- Soporta Create, Read, Update, Delete, Search

**Acción típica: "Create a Row"**
```
Stack: [selecciona tu base]
Table: [tabla destino]
Campos: Map dinámicamente
```

**Acción: "Search Record"**
- Busca en columna específica
- Retorna matching rows

**Acción: "Update Record"**
- Requiere Row ID
- Actualiza fields

#### Upserts

**Patrón recomendado:**
```
1. Search si existe (por email, ID, etc.)
2. Router: Si existe → Update, Si no → Create
```

**Code by Pabbly + Stackby API:**
```javascript
// Recibe data del trigger
// Si quieres lógica compleja (múltiples campos, duplicación inteligente)
const payload = input;

// Lógica de transformación
const rowData = {
  email: (payload.email || "").toLowerCase().trim(),
  name: payload.nombre || "",
  timestamp: new Date().toISOString()
};

return rowData; // Retorna para que Pabbly mapee a Stackby
```

### APIs externas genéricas

**Acción: "API by Pabbly"**
- GET, POST, PUT, PATCH, DELETE
- Headers personalizados
- Mapeo de body JSON

**Ejemplo:**
```
Method: POST
URL: https://api.example.com/contacts
Headers:
  Authorization: Bearer {{api_key}}
  Content-Type: application/json

Body (JSON):
{
  "email": "{{step_1.email}}",
  "name": "{{step_1.name}}"
}
```

**Output:**
- Retorna respuesta JSON del servidor
- Disponible para mapeo en siguiente step
- Si API falla (4xx/5xx), Pabbly reintentar automáticamente

---

## 6. Patrones de Automatización Recomendados

### Importaciones masivas

**Patrón 1: Schedule + Google Sheets + Iterator**
```
Trigger: Schedule (cada hora)
  ↓
Google Sheets: Get Rows (rango A2:Z1000)
  ↓
Iterator: Procesa cada fila
  ↓
API by Pabbly: POST cada row a Stackby
  ↓
Delay 3 seg entre items (evita rate limit)
```

**Task count:**
- 1 task por fila (no por workflow execution)
- 100 filas = 100 tasks
- Óptimo para bulks <1000 items

**Patrón 2: Webhook masivo + Cola interna**
```
Webhook: Recibe array de items
  ↓
Code by Pabbly: Valida + normaliza
  ↓
Iterator: Divide en chunks
  ↓
Stackby: Create row
```

### Sincronización incremental

**Patrón: Timestamp + Lookup**
```
Trigger: Schedule (cada 30 min)
  ↓
External API: Fetch items desde `lastTimestamp`
  ↓
Iterator: Por cada item
  ↓
Google Sheets: Lookup si existe (por external_id)
  ↓
Router:
  - Si existe → Update (1 task)
  - Si no → Create (1 task)
  ↓
Update workflow timestamp para próxima ejecución
```

**Ventaja**: Solo sincroniza cambios, no todo cada vez

### Upsert por claves

**Patrón genérico:**
```
1. Google Sheets Lookup por email
2. Si 0 resultados → Router branch: Create
3. Si 1+ resultados → Router branch: Update
4. Update path: Get row index, usar Update Row action
5. Create path: Use Add New Row action
```

**Con Code by Pabbly para lógica compleja:**
```javascript
const incoming = input;
const existing = input.lookupResult; // Del paso anterior

if (!existing || existing.length === 0) {
  return { action: "CREATE", data: incoming };
} else if (existing[0].lastModified < incoming.lastModified) {
  return { action: "UPDATE", id: existing[0].id, data: incoming };
} else {
  return { action: "SKIP", reason: "No newer data" };
}
```

### Workflows plantilla reutilizables

**Anatomía de un workflow reutilizable:**

```
TRIGGER (Universal)
  ├─ Webhook (generic)
  └─ Or Schedule
    ↓
VALIDATION (Code by Pabbly)
  ├─ Schema validation
  └─ Normalization
    ↓
ROUTING (Router)
  ├─ Branch A: Happy path
  └─ Branch B: Error/Skip
    ↓
ACTION (External)
  └─ Write to Google Sheets / Stackby / API
```

**Ventaja**: Un workflow, múltiples app-origins (solo cambian el Webhook URL)

### Separación lógica vs ejecución

**PRINCIPIO CRÍTICO**: Divide problemas en workflows separados

**Patrón anti-monolítico:**
```
Workflow 1: "Ingest & Validate"
  Input: Webhook
  Output: Normalized JSON
  Action: Forward to Workflow 2 via Data Forwarder

Workflow 2: "Enrich & Transform"
  Input: Forward from Workflow 1
  Output: Enriched data
  Action: Forward to Workflow 3

Workflow 3: "Persist"
  Input: Forward from Workflow 2
  Output: Success/Failure
  Action: Write to Google Sheets
```

**Ventajas:**
- Cada workflow <5 pasos (fácil debugging)
- Reutilizable: Workflow 2 puede usarse desde otros triggers
- Escalable: Agregar Step N solo requiere nuevo workflow

**Implementación con Data Forwarder:**
```
Step N+1: Data Forwarder
  Action Event: Forward Custom Data
  Webhook URL: [URL de Workflow 2 trigger]
  Payload: {{step_N_output}}
```

---

## 7. Limitaciones Reales de Pabbly Connect

### Qué NO se puede automatizar vía API

- **Operaciones que requieren UI interaction**: Clicks, form filling en navegador
- **Cálculos que tarden >25 segundos**: Machine learning, heavy processing
- **Acceso a sistemas locales**: Filesystem, COM ports, aplicaciones desktop
- **State persistente entre ejecuciones**: Code by Pabbly no puede guardar variables globales
- **Polling con esperas indefinidas**: No puedes hacer un sleep(300) de 5 minutos en código
- **Manejo de binary files**: Solo JSON/text; binarios deben ser base64 o URLs

### Qué requiere setup manual

- **Autenticación OAuth primera vez**: Buttons "Sign in with Google" etc. requieren click manual
- **Webhook URL instalación**: Debes copiar y pegar URL en app origen
- **API keys**: No se auto-obtienen; tienes que darlas manualmente
- **Row index para updates**: No hay "find and update silently"; necesitas conocer row index

### Límites operativos que Claude debe respetar

| Límite | Valor | Implicación |
|--------|-------|------------|
| Ejecución de código | 25 seg | Optimizar para velocidad; no esperar respuestas lentas |
| Memoria | 128 MB | No acumular arrays >50k items en memoria |
| Iteraciones por ciclo | 500 items | Dividir datasets grandes |
| Lookup resultados | 3 documentados | No confiar en lookup para búsquedas complejas |
| Pasos por workflow | No documentado | Recomendado <10 (debugging); >20 inestable |
| Google Sheets rate | 60 writes/100s | Insertar Delay entre batches |
| Bytes de payload | ~2 MB | Dividir si >2 MB |
| Timeout API remota | 15 seg documentado | Fetch debe completar en 10-12 seg máximo |

---

## 8. Guía para Generación de Scripts con IA

**Esta sección está escrita para Claude Code.**

### Qué asumir siempre sobre el entorno

1. **Tienes 25 segundos de CPU**: No más. Cada ms cuenta.
2. **Tienes 128 MB de RAM**: Strings grandes, loops anidados y closures comen memory rápido.
3. **No hay imports de npm**: No intentes `require("lodash")` ni instalar packages.
4. **JavaScript ES6+**: Usa arrow functions, const/let, destructuring, template strings.
5. **Fetch está disponible**: Es la única forma de hacer HTTP calls. No hay axios.
6. **Retorna siempre JSON serializable**: `{}`, `[]`, strings, números, booleans, null. Nada de Promises, funciones, Dates directas.
7. **Los datos entrantes podrían ser incompletos**: Valida con optional chaining `?.` y nullish coalescing `??`.
8. **El siguiente step depende de tu output**: Si retornas undefined o campos faltantes, el siguiente step fallará silenciosamente.

### Qué evitar generar

- ❌ `async/await` esperando respuestas >20 segundos
- ❌ Loops que acumulan arrays >100k items sin liberar memory
- ❌ Código que depende de variables globales para persistencia
- ❌ Imports de módulos npm (`require("crypto")` except built-in)
- ❌ Promesas anidadas (toda concurrencia debe ser ultra-rápida)
- ❌ Regular expressions complejas que podrían ser "catastrophic backtracking"
- ❌ Recursión profunda (stack overflow en 128MB)
- ❌ setTimeout/setInterval (no hay loop de eventos entre steps)
- ❌ Closures que capturan grandes estructuras de datos

### Cómo estructurar scripts JS

**Template recomendado:**
```javascript
/**
 * Transforma datos de entrada según schema esperado.
 * Input: objeto del paso anterior (webhook, Google Sheets, etc.)
 * Output: objeto JSON mappeable al siguiente step
 */

// 1. RECIBIR Y VALIDAR
const input = input || {}; // Placeholder; el entorno inyecta datos
if (!input.email) {
  return { error: "Missing email field", valid: false };
}

// 2. NORMALIZAR
const normalized = {
  id: input.id || null,
  email: (input.email || "").toLowerCase().trim(),
  nombre: (input.nombre || "").substring(0, 100),
  edad: parseInt(input.edad, 10) || 0,
  timestamp: new Date().toISOString()
};

// 3. VALIDAR DESPUÉS DE NORMALIZACIÓN
const isValid = normalized.email.includes("@") && normalized.edad >= 0;

// 4. RETORNAR JSON
return {
  valid: isValid,
  data: normalized,
  errors: isValid ? [] : ["Invalid email or age"]
};
```

**Estructura por complejidad:**

- **Simple (1-5 líneas)**: Transformación directa, no requiere validación compleja
- **Medio (5-15 líneas)**: Validación, normalización, branching simple
- **Complejo (>15 líneas)**: Validación multinivel, múltiples APIs, parsing JSON anidado

**Guía de complejidad:**
- Si tu script va a >30 líneas → Divídelo en 2 workflows (separación de concerns)
- Si va a >50 líneas → Definitivamente divide; cada workflow <10-15 pasos es ideal

### Cómo devolver outputs compatibles con Pabbly

**Output correcto:**
```javascript
return {
  firstName: "John",
  age: 30,
  isActive: true,
  tags: ["vip", "early-adopter"],
  metadata: {
    processedAt: "2025-01-27T10:30:00Z",
    version: 1
  }
};
```

**Output incorrecto:**
```javascript
// Retorna function → Error
return () => { console.log("test"); };

// Retorna Promise → Error
return fetch(...).then(r => r.json());

// Retorna undefined → siguiente step falla
if (error) return;
return result; // Si error, retorna undefined

// Retorna Infinity/NaN → Serialización inconsistente
return { value: 1/0 };
```

**Patrón safe para edge cases:**
```javascript
// Si la función podría fallar, captura y retorna error serializable
function procesarDatos(input) {
  try {
    const resultado = JSON.parse(input);
    return {
      success: true,
      data: resultado
    };
  } catch (e) {
    return {
      success: false,
      error: e.message,
      input: input.substring(0, 100) // Trunca para debugging
    };
  }
}

return procesarDatos(input);
```

---

## 9. Ejemplos Conceptuales

### Pseudocódigo

**Ejemplo 1: Validación antes de crear**
```
IF webhook_email NOT exist_in_sheets THEN
  create_row(webhook_data)
  status = "CREATED"
ELSE
  skip_workflow
  status = "DUPLICATE"
END

RETURN {status, id}
```

**Ejemplo 2: Enriquecer datos de múltiples fuentes**
```
input_data = webhook_payload

external_api_response = fetch("https://enrich-api.com", {
  POST, 
  body: input_data.email
})

enriched_data = merge(input_data, external_api_response)

return {
  enriched: enriched_data,
  sources: ["webhook", "enrich_api"]
}
```

### Flujos descritos en texto

**Flujo: Lead Capture → Normalize → Deduplicate → Store**

1. **Trigger**: Pabbly Form (nombre, email, teléfono)
2. **Step 2 (Code by Pabbly)**: Normaliza email y teléfono; valida formato
3. **Step 3 (Google Sheets Lookup)**: Busca email existente
4. **Step 4 (Router)**:
   - Branch A: Si encontrado → Skip (email existe)
   - Branch B: Si no encontrado → Continuar
5. **Step 5 (Google Sheets Add Row)**: Agrega fila con datos normalizados

**Flujo: Batch Import desde Schedule**

1. **Trigger**: Schedule (cada hora a las 10:30 AM)
2. **Step 2 (Google Sheets Get Rows)**: Lee A2:E1000 (pendientes procesar)
3. **Step 3 (Code by Pabbly)**: Filtra solo rows sin marcador de "procesado"
4. **Step 4 (Iterator)**: Por cada fila no procesada
5. **Step 5 (Stackby Create)**: Crea record en Stackby
6. **Step 6 (Delay)**: Espera 2 segundos (rate limit)
7. **Step 7 (Google Sheets Update)**: Marca fila como "procesado"

### Ejemplos de mappings JSON

**Mapping simple (field-to-field):**
```json
{
  "firstName": "{{step_1.nombre_pila}}",
  "lastName": "{{step_1.apellido}}",
  "email": "{{step_2_code_output.email_normalizado}}"
}
```

**Mapping con formatters:**
```json
{
  "phone": "{{step_3_formatter_phone_output}}",
  "currency": "{{step_4_formatter_number_output}}",
  "uppercase_name": "{{step_5_formatter_text_output}}"
}
```

**Mapping de arrays (con Iterator):**
```json
{
  "item_id": "{{current_item.id}}",
  "quantity": "{{current_item.qty}}",
  "parent_order": "{{step_1.order_id}}"
}
```

**Mapping condicional (con Router):**
- **Route A** (si edad > 18): Mapea a lista "adultos"
- **Route B** (si edad <= 18): Mapea a lista "menores"

Cada route tiene su propio mapping:
```json
[Route A]
{
  "segment": "ADULT",
  "email": "{{step_1.email}}"
}

[Route B]
{
  "segment": "MINOR",
  "parent_email": "{{step_1.parent_email}}"
}
```

---

## Apéndice: Comportamiento Observado & No Documentado

### Observaciones de la comunidad

- **Iterator con 500+ items**: Algunos usuarios reportan ralentización; recomendado <200 por iteración
- **Lookup con strings largos**: Búsquedas en campos >1000 caracteres pueden ser lentas
- **Auto-reexecution latency**: Primer reintento (10 min) es confiable; retries posteriores pueden variar
- **Webhook timeout para captura**: "Waiting for Webhook Response" a veces timeout después de 4-5 min, no 5 min exacto
- **JSON con caracteres especiales**: Unicode (emojis, caracteres acentuados) maneja correctamente en 99% de casos
- **Empty arrays en Iterator**: Retorna vacío sin error; siguiente step recibe 0 iteraciones

### Edge cases documentados débilmente

1. **Null en Google Sheets**: Causa error en mapeo; usar Filter o formatter para evitar
2. **Spaces en nombres de sheets**: Pabbly maneja; pero requiere entrecomillado en algunas APIs
3. **Límite de routers anidados**: No documentado; >10 niveles profundos se vuelve impractico
4. **Decimal vs Integer**: Pabbly detecta automáticamente; pero número formatter requiere decisión explícita

---

## Referencias Rápidas

**Contacto Pabbly Support**: support@pabbly.com  
**Foro Comunitario**: forum.pabbly.com  
**API Docs Oficial**: apidocs.pabbly.com  
**YouTube Channel Oficial**: @Pabbly  

---

**Documento generado**: Enero 2026  
**Versión**: 1.0 (Pabbly Connect, Node.js 18.x, AWS SDK v3)  
**Audiencia**: Ingenieros de IA entrenados para generar scripts JavaScript para Pabbly Connect

