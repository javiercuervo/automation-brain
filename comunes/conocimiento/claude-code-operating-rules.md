# Claude Code Operating Rules & Governance
**Stack**: Claude Code (VS Code) → Pabbly Connect → Stackby → Google Sheets → GitHub  
**Role**: Senior Platform Architect & AI Code Governance Specialist  
**Status**: Active System-Level Guidance for Code Generation  
**Version**: 1.0 | January 2026

---

## 0. ROL Y RESPONSABILIDADES DE CLAUDE CODE

### Qué es Claude Code en este stack

Claude Code es el **generador de reglas, scripts y mappings** que operan dentro de Pabbly Connect:
- No ejecuta código directamente: **genera código que Pabbly ejecutará**
- No edita workflows en Pabbly: **genera artefactos (scripts JS, mappings JSON)** que Pabbly consume
- No persiste datos: **orquesta la lógica** que otros componentes ejecutan
- Es el **intérprete de requisitos técnicos** y productor de código determinista

### Qué NO es Claude Code

- **NO es Pabbly**: no es responsable de reintentos, routing, persistencia o historial
- **NO es Stackby**: no maneja relaciones, índices o constraints de BD
- **NO es Google Sheets**: no es fuente de verdad; solo ingesta/egresa datos
- **NO es GitHub**: no reemplaza versionado; genera contenido que GitHub aloja
- **NO es un ejecutor de Pabbly**: genera, no ejecuta

### Qué decisiones toma Claude Code

✅ **PUEDE decidir**:
- Estructura de Envelope (meta/data/control)
- Normalización y validación de datos
- Mappings declarativos entre fuentes y destinos
- Lógica de upsert (búsqueda + decisión de acción)
- Scripts Code by Pabbly (transformaciones, routing)
- Esquemas de tabla (campos, tipos, validaciones)
- Patrones de workflow y orquestación

❌ **NUNCA decide**:
- Ejecutar código en producción sin PR de GitHub
- Modificar workflows existentes en Pabbly UI directamente
- Inventar campos sin muestras reales de datos
- Asumir persistencia de estado entre ejecuciones de Pabbly
- Usar almacenamiento local o variables globales para datos
- Saltarse validaciones por "performance"

---

## 1. PRINCIPIOS INNEGOCIABLES

### 1.1 Idempotencia

**REGLA**: Todo script Code by Pabbly debe ser idempotente. Un mismo input debe producir el mismo output, sin efectos laterales.

**Cumplimiento**:
```javascript
// ✅ IDEMPOTENTE: Genera una clave estable
const idempotencyKey = `stackby:Users:email:${input.email}`;

// ❌ NO IDEMPOTENTE: Genera timestamp diferente cada vez
const idempotencyKey = `user:${Date.now()}`;
```

**En Pabbly**:
- Pabbly reintenta hasta 5 veces con backoff
- Tu script DEBE detectar duplicados usando `idempotency_key`
- Si ya procesaste ese `idempotency_key`, retorna el mismo resultado
- No asumas que la primera ejecución es la única

**En Stackby**:
- Implementa lógica de búsqueda antes de create/update
- Usa unique keys declarados en la tabla
- Si hay duplicados, decídelo explícitamente (ERROR o SKIP)

### 1.2 Determinismo

**REGLA**: El mismo input siempre genera el mismo output, bajo las mismas condiciones de datos.

**Cumplimiento**:
```javascript
// ✅ DETERMINISTA
const normalized = {
  email: (input.email || "").toLowerCase().trim(),
  name: (input.name || "").trim(),
  status: input.status === "active" ? "Active" : "Inactive"
};

// ❌ NO DETERMINISTA: Math.random(), Date.now(), external API inconsistente
const normalized = {
  id: Math.random(), // Nunca
  timestamp: Date.now(), // Nunca para lógica de decisión
  cached: fetchFromUnreliableAPI() // Nunca sin fallback
};
```

**Implicación**: No uses:
- `Math.random()` para decisiones lógicas
- `Date.now()` como parte de lógica condicional
- APIs externas no idempotentes sin persistencia de respuesta
- Orden de arrays no garantizado

### 1.3 Reproducibilidad

**REGLA**: Un desarrollo/test/staging debe producir el mismo resultado en producción.

**Cumplimiento**:
- Todos los inputs validados antes de lógica
- Todos los defaults explícitos en código (no en Pabbly UI)
- Schemas versionados en GitHub
- Mappings declarativos (no magic strings en Pabbly)
- Ejemplos de payload en `/samples/` del repositorio

**En GitHub**:
```
/docs/knowledge/     ← Knowledge bases
/schemas/            ← Tablas/estructuras
/mappings/           ← Mappings por dominio
/scripts/            ← Code by Pabbly
/samples/            ← Ejemplos de payload (mock data)
/prompts/            ← Instrucciones para Claude Code
```

### 1.4 Versionado

**REGLA**: Todo artefacto generado incluye versión y changelog.

**Cumplimiento**:
```javascript
// Script: siempre incluye version y changlog
const config = {
  version: "1.2.1",
  changelog: {
    "1.2.1": "Fixed: null handling in email normalization",
    "1.2.0": "Added: idempotency key generation",
    "1.1.0": "Changed: normalize before validation"
  }
};
```

**En mappings**:
```json
{
  "mapping_version": "2.1.0",
  "changelog": {
    "2.1.0": "Added: support for MultiSelect fields",
    "2.0.0": "Changed: envelope structure"
  },
  "field_map": {}
}
```

**Regla de versionado**:
- MAJOR: Cambio en estructura de Envelope o ruptura de contrato
- MINOR: Nuevo campo, nueva validación, nuevo tipo
- PATCH: Bug fix, mejora de performance sin cambio de comportamiento

### 1.5 Separación Lógica / Ejecución

**REGLA**: La lógica vive en GitHub (código, mappings, schemas). La ejecución es Pabbly.

**Cumplimiento**:
- Claude genera → GitHub aloja → Pabbly referencia
- Nunca hardcodear reglas en Pabbly UI
- Nunca mapear "campo a campo" en Pabbly; usar mappings.json
- Pabbly contiene "esqueletos" (workflows plantilla); lógica en código

**Patrón correcto**:
```
Pabbly Workflow:
  1. Trigger (webhook/schedule)
  2. Code by Pabbly:
     - Carga schema desde GitHub
     - Carga mappings desde GitHub
     - Aplica transformación
     - Retorna Envelope normalizado
  3. Router (basado en control.action)
  4. Persist (Stackby API o Google Sheets)
  5. Audit (DLQ si error)
```

---

## 2. REGLAS OBLIGATORIAS DE GENERACIÓN DE SCRIPTS

### 2.1 Estructura estándar de scripts Code by Pabbly

```javascript
/**
 * @name Normalize & Enrich User Data
 * @version 1.2.0
 * @author Claude Code
 * @description Transforma entrada heterogénea en Envelope normalizado
 * @inputs input (objeto JSON)
 * @outputs Envelope {meta, data, control}
 */

const SCRIPT_VERSION = "1.2.0";
const SCRIPT_NAME = "normalize-user-data";

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
  idempotency_key_fields: ["email"], // Qué campos generan la clave estable
  required_fields: ["email", "name"],
  defaults: {
    status: "Pending",
    is_premium: false
  }
};

// ============================================================================
// 2. VALIDATION FUNCTIONS
// ============================================================================

function validateEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateRequired(data, fields) {
  const errors = [];
  for (const field of fields) {
    const value = data[field];
    if (value === null || value === undefined || value === "") {
      errors.push(`Required field missing: ${field}`);
    }
  }
  return errors;
}

// ============================================================================
// 3. NORMALIZATION FUNCTIONS
// ============================================================================

function normalizeEmail(email) {
  return email ? email.toLowerCase().trim() : null;
}

function normalizeName(name) {
  if (!name) return null;
  const normalized = name.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStatus(status) {
  const allowed = ["Active", "Inactive", "Pending"];
  return allowed.includes(status) ? status : CONFIG.defaults.status;
}

// ============================================================================
// 4. IDEMPOTENCY KEY GENERATION
// ============================================================================

function generateIdempotencyKey(data) {
  const keyParts = CONFIG.idempotency_key_fields
    .map(field => `${field}:${data[field] || "null"}`)
    .join("|");
  return `${SCRIPT_NAME}:${keyParts}`;
}

// ============================================================================
// 5. MAIN LOGIC
// ============================================================================

try {
  // Parse input
  const rawData = typeof input === "string" ? JSON.parse(input) : input;
  
  // Generate idempotency key early
  const idempotencyKey = generateIdempotencyKey(rawData);
  
  // Normalize
  const normalized = {
    email: normalizeEmail(rawData.email),
    name: normalizeName(rawData.name),
    status: normalizeStatus(rawData.status || CONFIG.defaults.status),
    signup_date: rawData.signup_date || null,
    is_premium: rawData.is_premium === true ? true : false
  };
  
  // Validate required
  const validationErrors = validateRequired(normalized, CONFIG.required_fields);
  
  // Determine action
  let action, reason, errors = [];
  if (validationErrors.length > 0) {
    action = "ERROR";
    reason = "Validation failed";
    errors = validationErrors;
  } else {
    action = "UPSERT"; // Could be CREATE, UPDATE, SKIP, ERROR
    reason = "Valid and ready to persist";
  }
  
  // Return Envelope
  return {
    meta: {
      source_system: "unknown", // Será sobrescrito por Pabbly si es webhook
      source_ref: idempotencyKey,
      workflow: "WF_USER_IMPORT",
      run_id: `run:${idempotencyKey}:${Date.now()}`, // Para correlación
      idempotency_key: idempotencyKey,
      mapping_version: "1.2.0",
      ts_ingested: new Date().toISOString()
    },
    data: {
      raw: rawData,
      normalized: normalized,
      targets: {
        Email: normalized.email,
        Name: normalized.name,
        Status: normalized.status,
        SignupDate: normalized.signup_date,
        IsPremium: normalized.is_premium
      }
    },
    control: {
      action: action,
      reason: reason,
      errors: errors
    }
  };
  
} catch (e) {
  return {
    meta: {
      source_system: "unknown",
      source_ref: "error:parse",
      workflow: "WF_USER_IMPORT",
      run_id: `error:${Date.now()}`,
      idempotency_key: `error:${Date.now()}`,
      mapping_version: "1.2.0",
      ts_ingested: new Date().toISOString()
    },
    data: {
      raw: input,
      normalized: {},
      targets: {}
    },
    control: {
      action: "ERROR",
      reason: `Exception: ${e.message}`,
      errors: [e.message]
    }
  };
}
```

### 2.2 Regla: Siempre devuelve JSON serializable

**NUNCA hagas esto:**
```javascript
// ❌ NUNCA: Retorna Promise
return fetch(...).then(r => r.json());

// ❌ NUNCA: Retorna función
return () => { /* logic */ };

// ❌ NUNCA: Retorna undefined
return undefined;

// ❌ NUNCA: Retorna con propiedades undefined
return { status: "ok", data: undefined }; // 'data' es undefined
```

**SIEMPRE haz esto:**
```javascript
// ✅ SIEMPRE: Retorna objeto JSON simple
return {
  status: "ok",
  data: { id: 123 },
  errors: []
};

// ✅ SIEMPRE: Usa null, no undefined
return { 
  status: "ok", 
  data: null,  // null es serializable, undefined no
  errors: [] 
};

// ✅ SIEMPRE: Payload completo antes de retornar
const result = await fetch(...);
const parsed = await result.json();
return { data: parsed, status: "ok" };
```

### 2.3 Regla: Valida inputs antes de procesar

```javascript
// ✅ BUENO: Validación defensiva
function processInput(input) {
  // Type check
  if (typeof input !== 'object' || input === null) {
    return { error: "Input must be object", input: String(input).slice(0, 100) };
  }
  
  // Exist check
  const email = input?.email || null;
  const name = input?.name || null;
  
  if (!email || !name) {
    return { error: "Missing required fields: email, name" };
  }
  
  // Type & format check
  if (typeof email !== 'string' || !validateEmail(email)) {
    return { error: "Invalid email format" };
  }
  
  // Process
  return { success: true, email, name };
}

// ❌ MALO: Asume que todo existe
function processInput(input) {
  const email = input.email;
  const name = input.name.trim(); // Falla si input.name es undefined
  return { email, name };
}
```

### 2.4 Regla: Respeta timeouts (25 segundos máximo)

**Pabbly Script Timeout: 25 segundos**

```javascript
// ✅ BUENO: Fetch rápido (< 5s)
const response = await fetch('https://fast-api.com/endpoint', {
  method: 'POST',
  timeout: 5000 // Opcional, pero explícito
});
const data = await response.json();
return { data: data, status: "ok" };

// ❌ MALO: Fetch lento consume todo el presupuesto
const response = await fetch('https://slow-api.com/endpoint', {
  timeout: 20000 // Te quedan 5s para procesar
});

// ❌ MALO: Loop sin salida
while (true) {
  // Timeout a los 25 segundos → fallo
}
```

**Si necesitas > 5 segundos**:
- Divide en workflows encadenados (Webhook → Enrich Async → Persist)
- Usa tabla de control (`last_processed_ts`) para polling

### 2.5 Regla: No uses variables globales para persistencia

```javascript
// ❌ NUNCA: Variables globales persistentes
global.counter = 0;
global.counter++;
return { count: global.counter }; // En próxima ejecución = undefined

// ✅ SIEMPRE: Retorna todo en el output
const previousCount = input.previous_count || 0;
return { 
  count: previousCount + 1,
  timestamp: Date.now() 
};
```

### 2.6 Regla: Normaliza datos antes de validar

```javascript
// ✅ BUENO: Normaliza primero, luego valida
const normalized = {
  email: (input.email || "").toLowerCase().trim(),
  name: (input.name || "").trim(),
  amount: parseInt(input.amount, 10) || 0
};

const errors = [];
if (!validateEmail(normalized.email)) {
  errors.push("Invalid email after normalization");
}

// ❌ MALO: Valida datos sin normalizar
if (!validateEmail(input.email)) { // Puede fallar por espacios/mayúsculas
  errors.push("Invalid email");
}
```

### 2.7 Regla: Manejo de errores robusto

```javascript
// ✅ BUENO: Try-catch con fallback
try {
  const parsed = JSON.parse(input);
  return { data: parsed, status: "ok" };
} catch (e) {
  return {
    data: null,
    status: "error",
    error: e.message,
    input_sample: typeof input === 'string' ? input.slice(0, 100) : null
  };
}

// ✅ BUENO: Logging para debugging
console.log(`Processing input: ${JSON.stringify(input).slice(0, 500)}`);
console.log(`Normalized: ${JSON.stringify(normalized).slice(0, 500)}`);
// Los logs aparecen en Task History de Pabbly

// ❌ MALO: No captura excepciones
const parsed = JSON.parse(input); // Falla sin catch
```

---

## 3. ESTRUCTURA DE SCRIPTS Y MAPPINGS

### 3.1 Envelope canónico (contrato de datos)

**TODO output de Code by Pabbly debe retornar este Envelope:**

```javascript
{
  "meta": {
    "source_system": "string",        // google_sheets, stackby, webhook, api, etc
    "source_ref": "string",            // sheetId:range o stackId:tableId o webhookId
    "workflow": "string",              // Nombre del workflow WF_XXX
    "run_id": "string",                // uuid-like, para correlación
    "idempotency_key": "string",       // Estable, usado para dedup
    "mapping_version": "semver",       // 1.2.0
    "ts_ingested": "ISO-8601"          // 2026-01-27T10:40:00Z
  },
  "data": {
    "raw": {},                         // Datos entrada (tal cual) si caben
    "normalized": {},                  // Datos ya limpios/tipados
    "targets": {}                      // SOLO campos listos para mapear a destino
  },
  "control": {
    "action": "CREATE|UPDATE|UPSERT|SKIP|ERROR",
    "reason": "human readable",
    "errors": []                       // Array de strings
  }
}
```

**Reglas**:
- `meta.idempotency_key` **ESTABLE**: mismo input → mismo key (no timestamps aleatorios)
- `data.raw` puede ser null si es muy grande
- `data.targets` es el ÚNICO que se mapea en Pabbly UI a la tabla destino
- `control.action` determina el router siguiente
- `errors` nunca null; usar `[]` si no hay errores

### 3.2 Mappings declarativos (estructura)

**Archivo**: `/mappings/<dominio>/<tabla>.mapping.json`

```json
{
  "mapping_version": "1.2.0",
  "mapping_name": "Users Sync",
  "unique_key": {
    "field": "Email",
    "source_path": "data.normalized.email",
    "description": "Used for upsert detection"
  },
  "field_map": {
    "Email": "data.targets.email",
    "Name": "data.targets.name",
    "Status": "data.targets.status",
    "SignupDate": "data.targets.signup_date",
    "IsPremium": "data.targets.is_premium"
  },
  "defaults": {
    "Status": "Pending",
    "IsPremium": false
  },
  "required_for_create": ["Email", "Name"],
  "required_for_update": ["Email"],
  "transforms": [
    {
      "op": "trim",
      "path": "data.targets.name",
      "description": "Remove leading/trailing whitespace"
    },
    {
      "op": "lower",
      "path": "data.targets.email",
      "description": "Normalize email to lowercase"
    }
  ],
  "validation": {
    "Email": {
      "type": "email",
      "required": true,
      "regex": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
    },
    "Name": {
      "type": "text",
      "required": true,
      "min_length": 2
    },
    "Status": {
      "type": "select",
      "allowed_values": ["Active", "Inactive", "Pending"],
      "default": "Pending"
    }
  },
  "changelog": {
    "1.2.0": "Added IsPremium field",
    "1.1.0": "Added SignupDate field",
    "1.0.0": "Initial version"
  }
}
```

**Cómo usarlo en Pabbly**:
1. Code by Pabbly carga este mapping
2. Aplica transformations
3. Retorna `data.targets` con campos lista para mapear
4. En siguiente step, mapea `data.targets.Email` → campo Email en Stackby

### 3.3 Schemas de tabla (estructura)

**Archivo**: `/schemas/<tabla>.schema.json`

```json
{
  "table_name": "Users",
  "table_id": "table_users_001",
  "schema_version": "1.2.0",
  "description": "User accounts and profile data",
  "fields": {
    "Email": {
      "type": "email",
      "required": true,
      "unique": true,
      "description": "User email address"
    },
    "Name": {
      "type": "text",
      "required": true,
      "description": "Full name"
    },
    "Status": {
      "type": "select",
      "options": ["Active", "Inactive", "Pending"],
      "default": "Pending",
      "required": false
    },
    "SignupDate": {
      "type": "date",
      "format": "YYYY-MM-DD",
      "required": false
    },
    "IsPremium": {
      "type": "checkbox",
      "default": false,
      "required": false
    },
    "CreatedTime": {
      "type": "created_time",
      "read_only": true
    }
  },
  "unique_keys": ["Email"],
  "changelog": {
    "1.2.0": "Added IsPremium checkbox",
    "1.1.0": "Changed Status to required"
  }
}
```

---

## 4. CONVENCIONES DE NAMING

### 4.1 Variables en scripts

```javascript
// ✅ BUENO: Snake_case para variables de datos
const user_email = "john@example.com";
const first_name = "John";
const is_premium = true;

// ✅ BUENO: camelCase para funciones y variables de lógica
function validateEmail(email) {}
function normalizeInput(data) {}
const normalizationRules = { /* */ };

// ❌ MALO: Inconsistente
const UserEmail = "john@example.com"; // Capital sin razón
const isActivated_status = true; // Mezcla camelCase y snake_case
```

### 4.2 Funciones en scripts

```javascript
// ✅ BUENO: Verbo + sustantivo, claro
function validateEmail(email) {}
function normalizePhoneNumber(phone) {}
function generateIdempotencyKey(data) {}
function calculateTotalAmount(items) {}

// ❌ MALO: Ambiguo o muy corto
function process(data) {} // Qué procesa?
function x(a) {} // Ilegible

// ✅ BUENO: Para predicados, comenzar con "is" o "validate"
function isValidEmail(email) {}
function validateRequired(data, fields) {}
function hasValue(obj, field) {}
```

### 4.3 Mappings y archivos

```
/mappings/
  /user/
    users.mapping.json          ← Singular tabla
    users-contacts.mapping.json ← Relación compuesta
  /order/
    orders.mapping.json
    order-items.mapping.json

/schemas/
  users.schema.json
  orders.schema.json

/scripts/
  normalize-user-data.js
  enrich-order-info.js
  validate-and-route.js
```

### 4.4 Campos en Stackby/Sheets

```
// ✅ BUENO: PascalCase en nombres de campo (equivalente a Airtable/Excel)
Email
FirstName
LastName
CreatedTime
UpdatedTime
IsPremium
OrderStatus

// ❌ MALO: Inconsistente
email        // Minúscula
first_name   // snake_case
FirstName vs firstName (mezcla)
```

---

## 5. USO CORRECTO DE KNOWLEDGE BASES

### 5.1 Pabbly Connect Knowledge Base

**Usa para**:
- Límites de ejecución (25s timeout, 128MB memory)
- Estructura de Pabbly (triggers, pasos, routers, iterators)
- Code by Pabbly API (inputs, outputs, fetch)
- Anti-patrones conocidos en Pabbly
- Comportamiento de reintentos (5 intentos, backoff exponencial)

**NUNCA asumas**:
- Que tu script persista estado entre ejecuciones
- Que `global` variables funcionan para almacenar datos
- Que fetch puede esperar > 20 segundos
- Que la UI de Pabbly mapea automáticamente campos profundos

**Exemplo de uso en script**:
```javascript
// Sabiendo que Pabbly reintenta hasta 5 veces
// y que solo persisten outputs, usamos idempotency_key:
return {
  meta: { idempotency_key: generateStableKey(input) },
  data: { /* normalizados */ },
  control: { action: "UPSERT" }
};
```

### 5.2 Stackby Knowledge Base

**Usa para**:
- Tipos de columna soportados (Email, Link, Lookup, MultiSelect, etc)
- API REST endpoints y formatos de payload
- Limites de datos (25k-50k rows según plan)
- Estructura de response (row object, fields, id)
- Validaciones por tipo de columna
- Patterns de linked tables y lookups

**NUNCA asumas**:
- Que Stackby soporta upsert nativo (busca + decide explícitamente)
- Que un campo puede ser null sin validar schema
- Que queries "complejas" server-side funcionan (usa búsqueda simple)
- Que linked records se populan automáticamente (pueden ser solo IDs)

**Ejemplo de uso en script**:
```javascript
// Sabiendo que Stackby no tiene upsert nativo:
const existingUsers = await findRecordByField(apiKey, stackId, tableId, "Email", email);
if (existingUsers.length === 0) {
  // Create
} else {
  // Update
}
```

### 5.3 Integration Patterns Knowledge Base

**Usa para**:
- Envelope canónico (meta/data/control)
- Patrones end-to-end (Sheets → Stackby, Webhook → Pabbly → Stackby)
- Matriz de responsabilidades (qué hace Pabbly, qué Code, qué Stackby)
- Principios operativos (UI mínima, lógica versionada)
- Estructura de repositorio GitHub

**Nunca asumas**:
- Que puedes hacer transformaciones complejas directamente en Pabbly UI
- Que bidireccional (Sheets ↔ Stackby) es fácil
- Que no necesitas versionado de mappings

---

## 6. ANTI-PATRONES: QUÉ NUNCA GENERAR

### 6.1 En Code by Pabbly

```javascript
// ❌ NUNCA: Async/await que espera respuesta lenta
async function process(input) {
  const response = await fetch('https://slow-api.com', { timeout: 30000 });
  return response.json(); // Timeout a los 25 segundos
}

// ❌ NUNCA: Loops infinitos o muy grandes
let results = [];
for (let i = 0; i < 1000000; i++) {
  results.push({ id: i, data: "large string" });
}
// Memory exceeded

// ❌ NUNCA: Confiar en variables globales
global.processedCount = 0;
global.processedCount++;
return { count: global.processedCount }; // Siempre 1 en próxima ejecución

// ❌ NUNCA: Retornar promises o funciones
return new Promise(resolve => resolve(data)); // Error: Promise no serializable
return () => { /* logic */ }; // Error: función no serializable

// ❌ NUNCA: Usar undefined en outputs
return { status: "ok", data: undefined }; // Pabbly no mapea undefined

// ❌ NUNCA: Side effects sin logging
// ...cambiar archivo, enviar email, etc sin documentar en logs
console.log("Sent email to user"); // LOG para tracking
```

### 6.2 En mappings Pabbly

```javascript
// ❌ NUNCA: Mapeo campo a campo directo sin normalización
// Email → Email_destino (sin validación/trim)

// ❌ NUNCA: Asumir que NULL mapea correctamente
// Si Pabbly mapeaa "null" → campo vacío, puede fallar

// ❌ NUNCA: Olvidar defaults
// Status no mapeado → null → error en Stackby

// ✅ SIEMPRE: Normalizar en Code by Pabbly
// Luego mapear en Pabbly UI desde data.targets
```

### 6.3 En estructura de Stackby upserts

```javascript
// ❌ NUNCA: Asumir que dos búsquedas retornan el mismo resultado
// Si duplicados existen, segunda búsqueda falla silenciosamente

// ❌ NUNCA: Ignorar linked records duplicados
// Si un usuario_id está linkedado 2 veces a una orden, qué ocurre?

// ❌ NUNCA: Hacer queries complejas en Stackby API
// Server-side filters limitados; mejor traer datos y filtrar client-side

// ✅ SIEMPRE: Implementar índice si > 1000 searches por día
// Tabla separada: unique_key → row_id
```

### 6.4 En Pabbly workflows

```
// ❌ NUNCA: Depender de reintentos para "lógica correcta"
// Si Step 1 falla, Step 2 se intenta de nuevo con datos stale

// ❌ NUNCA: Asumir que un error en Step N no afecta Step N+1
// Si "Skip Step on Failure" = OFF → workflow se detiene

// ❌ NUNCA: No usar iterators para arrays
// Procesar array completo en 1 paso → timeout o memory exceeded

// ✅ SIEMPRE: Usar Iterator + batch procesamiento
```

---

## 7. CHECKLIST PREVIO A ENTREGAR CÓDIGO

### Pre-generation Analysis

- [ ] **Origen identificado**: ¿De dónde vienen los datos? (webhook, sheet, api, stackby)
- [ ] **Destino identificado**: ¿A dónde van? (stackby, sheets, otro workflow)
- [ ] **Clave única definida**: ¿Cuál es el campo que identifica un record de forma única?
- [ ] **Volumen estimado**: ¿Cuántos records por ejecución? (< 500 es seguro)
- [ ] **Reintentos considerados**: ¿Qué ocurre si Pabbly reintenta?
- [ ] **Watermark (si sync incremental)**: ¿Hay `last_success_ts` guardado?

### Code Generation Validation

- [ ] **Envelope completo**: ¿Script retorna {meta, data, control}?
- [ ] **Idempotency key estable**: ¿Mismo input → mismo key?
- [ ] **JSON serializable**: ¿No hay Promises, funciones, undefined?
- [ ] **Validación defensiva**: ¿Null checks antes de acceso profundo?
- [ ] **Normalización primero**: ¿Datos limpios antes de validar?
- [ ] **Manejo de errores**: ¿Try-catch con fallback?
- [ ] **Timeouts respetados**: ¿Fetch < 5s, script < 25s?
- [ ] **No variables globales**: ¿Persistencia vía outputs, no globals?
- [ ] **Logging**: ¿Console.log() para debugging en Task History?
- [ ] **Versión incluida**: ¿SCRIPT_VERSION o mapping_version en payload?

### Mapping & Schema Validation

- [ ] **Mapping versionado**: ¿version, changelog, unique_key?
- [ ] **field_map completo**: ¿Todos los campos mapeados?
- [ ] **Defaults explícitos**: ¿Qué ocurre si campo vacío?
- [ ] **required_fields**: ¿Qué campos son obligatorios en create vs update?
- [ ] **Schema coherente**: ¿Tipos coinciden entre mapping y Stackby?
- [ ] **Transformaciones documentadas**: ¿Op + descripción?

### Workflow Orchestration

- [ ] **Plantilla clara**: ¿Sigue patrón Ingest → Normalize → Decide → Persist?
- [ ] **Triggers identificados**: ¿Webhook, schedule, o trigger de app?
- [ ] **Routers correcto**: ¿Router basado en control.action?
- [ ] **Iterator si batch**: ¿Array → Iterator → procesamiento de 1 item?
- [ ] **DLQ configurado**: ¿Errores van a tabla Errors?
- [ ] **Audit trail**: ¿Hay tabla de Runs o logs?

### GitHub Integration

- [ ] **Repositorio estructura**: ¿/scripts/, /mappings/, /schemas/, /samples/?
- [ ] **Ejemplos payload**: ¿/samples/ tiene mock data realista?
- [ ] **README actualizado**: ¿Documentación de cómo usar?
- [ ] **Changelog**: ¿Versiones y cambios documentados?
- [ ] **No secretos**: ¿API keys, passwords en .gitignore?
- [ ] **PR preparado**: ¿Código listo para review antes de prod?

### Security & Compliance

- [ ] **Validación de inputs**: ¿Regex para email, phone, etc?
- [ ] **Escape de datos**: ¿Si retornas datos a SQL/JSON, escapados?
- [ ] **Rate limiting considerado**: ¿Batch limitado si API vulnerable?
- [ ] **Data retention**: ¿Logs no contienen PII innecesariamente?
- [ ] **API keys seguros**: ¿Se leen de environment variables, no hardcoded?

### Performance & Reliability

- [ ] **Timeout presupuesto**: ¿Fetch + processing < 25s?
- [ ] **Memory budgeted**: ¿Array acumulativo no excede 128MB?
- [ ] **Batch size realistic**: ¿Iterator maneja 1 item por vez o pocos?
- [ ] **Idempotencia testeada**: ¿Mismo payload 3 veces = mismo resultado?
- [ ] **Error recovery**: ¿Script retorna Envelope incluso en error?

---

## 8. PATRONES CANÓNICOS POR CASO DE USO

### Patrón A: Importación masiva inicial (Sheets → Stackby)

```
1. Trigger: Schedule diario (e.g., 2am)
2. Code: 
   - Lee range de Sheets (via Pabbly action "Get Rows")
   - Normaliza payload
   - Retorna Envelope
3. Iterator: Para cada row
4. Code (en iterator):
   - Búsqueda por unique key en Stackby
   - Retorna {action: "CREATE|UPDATE", data: targets}
5. Conditionals:
   - Si action == CREATE → Create record
   - Si action == UPDATE → Update record
6. Audit: Appends result a tabla "Runs"
```

**Script para paso 2**:
```javascript
// Input: {values: [[email, name, status], ...]}
const rows = input.values;
return {
  meta: { source_system: "google_sheets", ... },
  data: {
    raw: { rows },
    normalized: rows.map(r => ({
      email: (r[0] || "").toLowerCase(),
      name: r[1] || "",
      status: r[2] || "Pending"
    })),
    targets: null // Se normaliza por cada item en Iterator
  },
  control: { action: "ITERATE", reason: `${rows.length} rows to process` }
};
```

### Patrón B: Sync incremental con watermark

```
1. Trigger: Schedule cada 1 hora
2. Code:
   - Lee last_success_ts desde tabla "Config"
   - Retorna {ts_from: last_ts, ts_to: now}
3. Stackby Lookup: Busca records donde UpdatedTime > ts_from
4. Iterator: Para cada record modificado
5. Code:
   - Aplica transformaciones
   - Calcula si CREATE/UPDATE/SKIP
6. Persist en destino
7. Update Config: last_success_ts = now
```

**Script para paso 2**:
```javascript
const lastTimestamp = input.last_success_ts || new Date(0).toISOString();
return {
  meta: { ... },
  data: {
    raw: {},
    normalized: { last_ts: lastTimestamp, now: new Date().toISOString() },
    targets: { last_ts: lastTimestamp }
  },
  control: { action: "LOOKUP", reason: "Find records modified since " + lastTimestamp }
};
```

### Patrón C: Event-driven (Webhook → Pabbly → Stackby)

```
1. Trigger: Webhook (e.g., Pabbly Form submit)
2. Code:
   - Normaliza webhook payload
   - Genera idempotency_key
   - Retorna Envelope
3. Router: Si action == ERROR → DLQ; else → Stackby
4. Stackby Lookup: Búsqueda por unique key
5. Conditionals: CREATE vs UPDATE
6. Persist
7. Opcional: Webhook response confirmando éxito
```

**Script para paso 2**:
```javascript
const input = typeof input === 'string' ? JSON.parse(input) : input;
const idempotencyKey = `webhook:form:${input.email}:${input.timestamp || Date.now()}`;

try {
  const normalized = {
    email: (input.email || "").toLowerCase().trim(),
    name: input.name || "",
    phone: input.phone || ""
  };
  
  const errors = [];
  if (!validateEmail(normalized.email)) errors.push("Invalid email");
  if (!normalized.name) errors.push("Name required");
  
  return {
    meta: { 
      source_system: "webhook",
      idempotency_key: idempotencyKey,
      ... 
    },
    data: { raw: input, normalized, targets: normalized },
    control: {
      action: errors.length ? "ERROR" : "UPSERT",
      reason: errors.length ? errors.join("; ") : "Valid webhook",
      errors: errors
    }
  };
} catch (e) {
  return {
    meta: { source_system: "webhook", idempotency_key, ... },
    data: { raw: input, normalized: {}, targets: {} },
    control: { action: "ERROR", reason: e.message, errors: [e.message] }
  };
}
```

### Patrón D: Upsert simulado en Stackby

```
// Nota: Stackby NO tiene upsert nativo

1. Code: Genera unique key
2. Stackby Lookup: Busca por ese key
3. Conditionals:
   - Si 0 resultados → Create
   - Si 1 resultado → Update
   - Si > 1 resultados → Error (duplicate conflict)
4. Create/Update ejecuta
5. Return resultado
```

**Script para paso 2 (Lookup decision)**:
```javascript
const envelope = input; // Del paso anterior
const uniqueKey = envelope.meta.idempotency_key;
const searchField = "Email"; // Configurable
const searchValue = envelope.data.normalized.email;

// Pabbly ejecutará Lookup automáticamente
// Este script decide qué hacer con el resultado

return {
  meta: { ...envelope.meta, decision_at: Date.now() },
  data: {
    ...envelope.data,
    targets: {
      ...envelope.data.targets,
      _lookup_field: searchField,
      _lookup_value: searchValue
    }
  },
  control: {
    action: input.lookup_results?.length === 0 ? "CREATE" : "UPDATE",
    reason: `Found ${input.lookup_results?.length || 0} existing records`
  }
};
```

---

## 9. DECISIONES CRÍTICAS (DECISION MATRIX)

### Cuándo usar Code by Pabbly vs runner externo

| Aspecto | Code by Pabbly | Runner Externo |
|---------|---|---|
| **Transformación simple** | ✅ | ❌ Overkill |
| **Validación & routing** | ✅ | ❌ |
| **Batch < 500 items** | ✅ | ❌ |
| **Latencia < 5s** | ✅ | ❌ (overhead) |
| **Batch > 5000 items** | ❌ | ✅ |
| **Librería específica** | ❌ | ✅ (npm) |
| **Job > 30 min** | ❌ | ✅ (cron real) |
| **Procesamiento intensivo** | ❌ | ✅ (CPU) |
| **Estado persistente** | ❌ | ✅ (DB/Redis) |

### Cuándo usar Google Sheets vs Stackby

| Aspecto | Google Sheets | Stackby |
|---------|---|---|
| **Dados < 10k rows** | ✅ | ✅ |
| **Datos 10k-50k rows** | ⚠️ Performance | ✅ Optimizado |
| **Datos > 50k** | ❌ Lento | ⚠️ Plan Business+ |
| **Entrada humana (staging)** | ✅ Familiar | ❌ Menos familiar |
| **Linked records** | ❌ Muy básico | ✅ Nativo |
| **API CRUD** | ⚠️ Limited | ✅ REST completo |
| **Cálculos complejos** | ⚠️ Fórmulas limitadas | ✅ Lookups/Aggregations |
| **Reporting visual** | ✅ Dashboards | ⚠️ Vistas básicas |

### Cuándo versionar scripts vs mappings

| Cambio | Versionable | Ejemplo |
|--------|---|---|
| **Nuevo campo en output** | Mapping MINOR | Agregué `is_premium` |
| **Cambio estructura Envelope** | Script MAJOR | Renombré `meta.user_id` → `meta.entity_key` |
| **Bug fix en normalización** | Script PATCH | Arreglé trim() de email |
| **Nuevo valor en select** | Mapping MINOR | Agregué status "OnHold" |
| **Cambio de lógica condicional** | Script MINOR | Cambié `if (status == "pending")` |

---

## 10. REGLAS FINALES (NO NEGOCIABLES)

1. **SIEMPRE retorna Envelope**: meta + data + control. Nunca raw JSON.
2. **NUNCA uses variables globales** para persistencia entre ejecuciones.
3. **SIEMPRE valida inputs** antes de procesar: null checks, type checks, format checks.
4. **NUNCA asumasúltipleso reintentos cambiarán la lógica**: idempotencia por diseño.
5. **SIEMPRE usa `idempotency_key` estable**: hash de datos únicos, no timestamps aleatorios.
6. **NUNCA generes código sin PR**: Git es SSOT.
7. **SIEMPRE normaliza antes de validar**: trim, lowercase, format primero.
8. **NUNCA mapees "campo a campo"** en Pabbly UI: usa mappings.json y Code by Pabbly.
9. **SIEMPRE documenta versionado**: changelog en script/mapping.
10. **NUNCA ignores timeouts**: 25s máximo en Pabbly, presupuesto para fetch + processing.
11. **SIEMPRE usa `data.targets`** para mapeos en Pabbly; `data.raw` y `data.normalized` para debugging.
12. **NUNCA asumas que Stackby tiene upsert nativo**: búsqueda explícita + decisión.
13. **SIEMPRE loguea en console.log()**: visible en Task History para debugging.
14. **NUNCA olvides el `reason` en `control`**: explica decisiones para auditoria.
15. **SIEMPRE respeta la arquitectura**: Claude genera → GitHub aloja → Pabbly ejecuta.
16. **NUNCA incluyas PII real en commits**: emails, DNIs, teléfonos, direcciones, firmas, URLs de firma deben ser anonimizados. Usar placeholders: `student+001@example.com`, `00000000T`, `+34600000000`, `REDACTED_URL`. Si se detecta PII en archivos generados, eliminarla o añadir a `.gitignore` antes del commit.

---

## APÉNDICE: EJEMPLOS RÁPIDOS

### Envelope mínimo (validación fallida)
```javascript
return {
  meta: { 
    source_system: "webhook",
    workflow: "WF_USER_IMPORT",
    idempotency_key: `user:${input.email}`,
    ts_ingested: new Date().toISOString()
  },
  data: { raw: input, normalized: {}, targets: {} },
  control: { 
    action: "ERROR", 
    reason: "Email validation failed",
    errors: ["Invalid email format"] 
  }
};
```

### Script con Lookup result handling
```javascript
// Input contiene: {envelope_anterior, lookup_results: [{id: "row_123", ...}]}
const envelope = input.envelope_anterior;
const lookupResults = input.lookup_results || [];

if (lookupResults.length === 0) {
  envelope.control.action = "CREATE";
  envelope.meta.idempotency_key += ":create";
} else if (lookupResults.length === 1) {
  envelope.control.action = "UPDATE";
  envelope.data.targets.row_id = lookupResults[0].id;
  envelope.meta.idempotency_key += ":update";
} else {
  envelope.control.action = "ERROR";
  envelope.control.reason = `Duplicate conflict: ${lookupResults.length} records`;
}

return envelope;
```

### Mapping para Stackby Users table
```json
{
  "mapping_version": "1.0.0",
  "unique_key": { "field": "Email", "source_path": "data.targets.email" },
  "field_map": {
    "Email": "data.targets.email",
    "Name": "data.targets.name",
    "Status": "data.targets.status"
  },
  "defaults": { "Status": "Pending" },
  "validation": {
    "Email": { "type": "email", "required": true }
  }
}
```

---

**END OF OPERATING RULES**

Este documento es la guía canónica para Claude Code. Actualizar cuando nuevos patrones emerjan o límites cambien.
