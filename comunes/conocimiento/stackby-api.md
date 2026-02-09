# Stackby Knowledge Base for API Automation & Data Synchronization
**Target Audience:** Claude Code (code generation AI) operating in JavaScript/Node.js environments  
**Version:** 1.0 | Updated: January 2026  
**Focus:** REST API, CRUD operations, Pabbly Connect orchestration, Google Sheets synchronization

---

## 1. Visión General de Stackby

### 1.1 ¿Qué es Stackby?

Stackby es una plataforma **spreadsheet-database hybrid** que combina la interfaz familiar de una hoja de cálculo con la potencia relacional y automatable de una base de datos. A nivel técnico:

- **Base de datos**: modelo relacional con soporte para linked tables, lookups, aggregations
- **Interfaz**: grid similar a Excel/Google Sheets con múltiples vistas (Kanban, Gallery, Calendar, List)
- **API-first**: arquitectura preparada para integración programática vía REST API
- **Sin código**: automatización nativa mediante UI; también soporta orquestación via Pabbly Connect, Zapier, Make.com
- **Almacenamiento**: datos en cloud; escalable hasta límites de plan

### 1.2 Diferencias clave vs. Airtable / Google Sheets

| Aspecto | Stackby | Airtable | Google Sheets |
|---------|---------|----------|----------------|
| **Tipo** | Spreadsheet-DB hybrid | DB con interfaz grid | Spreadsheet |
| **Límite de datos** | 25k-50k+ rows (plan) | Unlimited records | ~1.1M rows/sheet |
| **Tipos de columna** | 25+ tipos ricos | 20+ tipos | Limited |
| **Relacionales** | Link tables, Lookup, Aggregation | Link fields, Rollups | Muy limitado |
| **Fórmulas** | Avanzadas + Lookups condicionales | Básicas | Buenas |
| **Sincronización** | One-way sync (planes Business+) | Bidireccional via Integromat | No native |
| **Validación** | Por tipo de columna | Limited | User-dependent |
| **API** | REST Developer API + native connectors | Robust REST API | Sheets API (limitada) |
| **Estabilidad reportada** | Bugs ocasionales en fórmulas/filtros | Estable | Estable |

### 1.3 Modelo Mental Correcto

**Importante**: Stackby no es un reemplazo directo de Airtable para casos de uso heavy-data. Es optimizado para:
- Equipos pequeños-medianos (5-50 usuarios)
- Automatización de workflows no críticos
- Migración rápida desde Google Sheets
- Prototipos rápidos con datos <50k registros

**NO es ideal para**:
- Aplicaciones con >100k registros activos
- Sistemas mission-critical (reporta instabilidad)
- Upserts complejos de múltiples fuentes
- High-frequency updates (>1000 req/min)

---

## 2. Modelo de Datos Interno

### 2.1 Estructura Jerárquica

```
Workspace (cuenta)
  ├─ Stack (equivalente a un "proyecto" o "aplicación")
  │   ├─ Table (entidad/recurso principal)
  │   │   ├─ Row (registro individual)
  │   │   │   └─ Field/Cell (valor tipado)
  │   │   └─ View (filtro/presentación de la tabla)
  │   ├─ Table
  │   └─ View
  └─ Stack
```

### 2.2 Tipos de Columna Soportados

#### Texto & Contenido
- **Short Text**: Cadena única línea (~255 caracteres default)
- **Long Text**: Texto multilínea (sin límite practical)

#### Numéricos
- **Number**: Decimal con opciones de format (precision, currency, percent)
- **Auto-number**: Valor autoincrementable, read-only después de insert
- **Currency**: Number con symbol de moneda
- **Percent**: Number con % formatting

#### Fecha & Tiempo
- **Date**: Solo fecha (YYYY-MM-DD)
- **Date + Time**: Timestamp completo (ISO-8601 compatible)
- **Deadline**: Date con recordatorio (coming soon según docs)
- **Time**: Hora solamente
- **Duration**: Horas/minutos/segundos (coming soon)

#### Booleanos & Enumerations
- **Checkbox**: Boolean true/false
- **Single Select**: Enum con valores predefinidos (una sola opción)
- **Multiple Select**: Array de valores enum (múltiples opciones)

#### Relaciones & Agregaciones
- **Link to another table**: Foreign key con multiplicity (1-to-1, 1-to-many, many-to-many)
- **Lookup**: Proyecta fields desde tabla linked (con soporte para filtros condicionales)
- **Lookup Count**: Cuenta registros linked con filtro opcional
- **Aggregation**: Suma/promedio/min/max/count sobre linked records

#### Metadata & Auditoría
- **Created Time**: Timestamp de creación (auto, read-only)
- **Last Updated Time**: Timestamp de última modificación (auto, read-only)
- **Created By**: Usuario que creó (auto, read-only)
- **Updated By**: Usuario que modificó (auto, read-only)

#### Rich Media & Verificación
- **Attachments**: Files desde local, Dropbox, Google Drive, Box, Instagram, Facebook
- **Barcode/QR**: Scan directo (requiere mobile app)
- **Phone Number**: Validado contra formato
- **Email**: Validado contra RFC5322-like
- **URL**: Validado como URL válida
- **Ratings**: 1-5 stars

#### Automación & Inteligencia
- **Formula**: Expresión computada (read-only, actual en grid)
  - Operadores: `+, -, *, /, %, ^, &&, ||, !, <, >, <=, >=, ==, !=`
  - Funciones: `IF(), SUM(), AVG(), COUNT(), MAX(), MIN(), CONCATENATE(), etc.`
  - Lookups condicionales: `LOOKUP(field, condition)`
- **API**: Conexión a 50+ servicios (YouTube, Facebook Ads, Google Analytics, MailChimp, Hunter.io, etc.)
- **Button**: Acción que gatilla SMS via Twilio/WhatsApp
- **Checklist**: Lista de tasks con asignación (assign to user, due date)
- **Signature**: Firma digital capturada

### 2.3 Representación via API (JSON)

#### Row Object Structure (inferida)
```json
{
  "id": "row_12345",
  "createdTime": "2025-01-01T10:00:00Z",
  "updatedTime": "2025-01-27T15:30:00Z",
  "fields": {
    "ColumnName": "value",
    "Email": "user@example.com",
    "Status": "Active",
    "LinkedRecords": ["link_id_1", "link_id_2"],
    "LookupField": "resolved_value",
    "DateField": "2025-01-27",
    "NumberField": 100,
    "CheckboxField": true,
    "MultiSelect": ["option1", "option2"]
  }
}
```

#### Request Body Pattern (Create/Update)
```json
{
  "fields": {
    "Name": "John Doe",
    "Email": "john@example.com",
    "Status": "Active",
    "Amount": 500,
    "DateCreated": "2025-01-27"
  }
}
```

### 2.4 Identificadores & Claves

- **Row ID**: Identificador único `row_XXXXX` generado por Stackby
- **Primary Key**: Por defecto, el primer campo; configurable en tabla
- **Link IDs**: Referencias a rows linked, almacenadas como array
- **Table ID**: Identificador único de tabla (usado en API endpoint)
- **Stack ID**: Identificador único de stack/aplicación

### 2.5 Campos Mutables vs Inmutables

**Inmutables (Read-Only)**:
- `id` (row ID)
- `createdTime`
- `updatedTime`
- `createdBy`
- `updatedBy`
- Formulas (computed fields)
- Auto-number (después del insert)

**Mutables**:
- Todos los campos de usuario (text, number, date, selects, etc.)
- Attachments
- Link relationships
- Checklist items

---

## 3. Stackby API (REST)

### 3.1 Autenticación

**Método**: API Key (bearer token)  
**Obtención**:
1. Log in to Stackby dashboard
2. Click user icon (top-right) → **Account Settings** → **API** tab
3. Generate new API key o copiar existente

**Header requerido**:
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Validación**: Key válida = 200 OK; Key inválida/expirada = 401 Unauthorized

### 3.2 Endpoints Principales

#### Base URL
```
https://stackby.com/api/betav1/
```

#### Operación: List Rows
```
GET /rowlist/{STACK_ID}/{TABLE_ID}
```
- **Query parameters**: 
  - `limit`: Máximo 100 (default unclear, assume 20-50)
  - `offset`: Número de registros a saltar (pagination)
  - Fields específicos: No documentado claramente
- **Response**: 
  ```json
  {
    "rows": [
      { "id": "row_1", "fields": {...} },
      { "id": "row_2", "fields": {...} }
    ],
    "count": 2,
    "offset": 0,
    "hasMore": false
  }
  ```
- **Timeout**: Típicamente 30 segundos

#### Operación: Create Record
```
POST /rowlist/{STACK_ID}/{TABLE_ID}
```
- **Body**:
  ```json
  {
    "fields": {
      "Name": "John",
      "Email": "john@example.com"
    }
  }
  ```
- **Response**: 
  ```json
  {
    "id": "row_NEW",
    "createdTime": "2025-01-27T...",
    "fields": {...}
  }
  ```
- **Status Code**: 201 Created o 200 OK

#### Operación: Update Record
```
PUT /rowlist/{STACK_ID}/{TABLE_ID}/{ROW_ID}
```
- **Body**:
  ```json
  {
    "fields": {
      "Name": "John Updated"
    }
  }
  ```
- **Response**: Row actualizado
- **Status Code**: 200 OK

#### Operación: Delete Record
```
DELETE /rowlist/{STACK_ID}/{TABLE_ID}/{ROW_ID}
```
- **Response**: `{ "success": true }` o status 204 No Content
- **Status Code**: 200 OK o 204 No Content

#### Operación: Search/Filter Row
```
GET /rowlist/{STACK_ID}/{TABLE_ID}?search=VALUE
```
- **Nota**: Documentación limitada. Patrón sugiere query string simple.
- No documentado: sintaxis de filtros complejos (AND/OR logic, operators)

### 3.3 Formato de Requests & Responses

#### Headers Obligatorios
```
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

#### Content-Type
- **Request**: `application/json` (MUST)
- **Response**: `application/json` (ALWAYS)

#### Status Codes Típicos
| Code | Significado | Acción |
|------|------------|--------|
| 200 | OK | Success (GET, PUT, DELETE) |
| 201 | Created | Success (POST create) |
| 204 | No Content | Success (DELETE with no body) |
| 400 | Bad Request | Malformed JSON o field validation fail |
| 401 | Unauthorized | API key missing/invalid/expired |
| 403 | Forbidden | Permission denied (user can't access resource) |
| 404 | Not Found | Stack/Table/Row no existe |
| 409 | Conflict | Duplicate key o constraint violation (inferido) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error (retry with backoff) |

#### Error Response Format (inferido)
```json
{
  "error": {
    "message": "Authentication failed",
    "code": "AUTH_ERROR",
    "details": "API key is invalid"
  }
}
```

### 3.4 Paginación, Límites & Cuotas

#### Paginación Pattern
```
Fetch 1: GET /rowlist/{STACK_ID}/{TABLE_ID}?offset=0&limit=100
Response: { "rows": [...100 items...], "hasMore": true }

Fetch 2: GET /rowlist/{STACK_ID}/{TABLE_ID}?offset=100&limit=100
Response: { "rows": [...100 items...], "hasMore": false }
```

**Límite de Registros por Request**: 100 (inferido de patrones API comunes)

#### Cuotas & Límites por Plan
| Plan | Rows/Stack | Stacks/Workspace | Storage | Sync Tables |
|------|-----------|-----------------|---------|------------|
| **Free** | 25,000 | Unlimited | - | None |
| **Economy** | 50,000 | Unlimited | - | None |
| **Personal** | 25,000 | Unlimited | - | None |
| **Business (annual)** | 50,000 | Unlimited | - | Up to 10 |

**Importante**: Estos son límites *por stack*, no por workspace. Cuando se alcanza el límite, el stack deja de aceptar nuevos registros.

#### Rate Limits (No Documentado Claramente)
- Inferencia: Típicamente 1000-5000 requests/day para free tier
- Límite por segundo: No documentado
- **Recomendación**: Implementar exponential backoff en caso de 429

#### Límites de Tamaño
- **Attachment**: No especificado; asumir <100MB por archivo
- **Cell value**: ~65k caracteres (standard)
- **Request body**: Asumir <10MB

### 3.5 Errores Comunes & Manejo

#### 401 Unauthorized
**Causa**: API key inválida, expirada, o no enviada  
**Solución**: Regenerar key desde Account Settings, verificar header `Authorization`

#### 400 Bad Request
**Causas comunes**:
- JSON malformado
- Field name no existe en tabla
- Tipo de dato incompatible (ej. string en Number field)
- Falta campo requerido
**Solución**: Validar schema de table antes de request; loguear response body

#### 404 Not Found
**Causa**: Stack/Table/Row ID incorrecto  
**Solución**: Verificar IDs contra Stackby dashboard

#### 409 Conflict
**Causa**: Posible duplicate unique key (inferido)  
**Solución**: Implementar lógica de upsert (search primero, luego update o insert)

#### 429 Too Many Requests
**Causa**: Rate limit excedido  
**Solución**: Implementar backoff exponencial con jitter; separar requests en tiempo

---

## 4. Operaciones Clave para Automatización

### 4.1 Crear Registros

```javascript
// Pattern A: Simple insert
const createRecord = async (apiKey, stackId, tableId, fields) => {
  const response = await fetch(
    `https://stackby.com/api/betav1/rowlist/${stackId}/${tableId}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    }
  );
  return response.json();
};

// Uso
const newRow = await createRecord(
  'YOUR_API_KEY',
  'stack_abc123',
  'table_xyz789',
  {
    'Name': 'John Doe',
    'Email': 'john@example.com',
    'Status': 'Active'
  }
);
console.log(`Created row: ${newRow.id}`);
```

**Validaciones Previas**:
- Verificar que todos los required fields estén presentes
- Validar tipos de datos (string, number, boolean, etc.)
- Para select fields, verificar que value esté en lista de opciones

### 4.2 Actualizar Registros

```javascript
// Pattern: Update single row
const updateRecord = async (apiKey, stackId, tableId, rowId, fields) => {
  const response = await fetch(
    `https://stackby.com/api/betav1/rowlist/${stackId}/${tableId}/${rowId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields })
    }
  );
  return response.json();
};

// Uso
await updateRecord(
  apiKey,
  stackId,
  tableId,
  'row_123',
  { 'Status': 'Completed', 'UpdatedDate': '2025-01-27' }
);
```

**Comportamiento**: 
- PATCH/PUT sobre campos específicos (no reemplaza row completo)
- Campos no incluidos no se modifican
- Read-only fields ignorados (no causan error)

### 4.3 Upsert (Simular - No es Nativo)

**Desafío**: Stackby API no tiene endpoint UPSERT nativo. Solución: implementar lógicamente.

```javascript
const upsertRecord = async (
  apiKey, stackId, tableId, 
  uniqueFieldName, uniqueFieldValue, 
  updateFields
) => {
  // Step 1: Search for existing record
  const listResponse = await fetch(
    `https://stackby.com/api/betav1/rowlist/${stackId}/${tableId}?search=${encodeURIComponent(uniqueFieldValue)}`,
    {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}` }
    }
  );
  
  const { rows } = await listResponse.json();
  
  // Step 2: If found, update; else create
  if (rows && rows.length > 0) {
    const existingRowId = rows[0].id;
    return await updateRecord(apiKey, stackId, tableId, existingRowId, updateFields);
  } else {
    const allFields = { [uniqueFieldName]: uniqueFieldValue, ...updateFields };
    return await createRecord(apiKey, stackId, tableId, allFields);
  }
};
```

**Advertencia**: Pattern `search` no está documentado oficialmente. Alternativa más robusta:

```javascript
// Alternativa: Filter by primary key si es conocido
const upsertByPrimaryKey = async (apiKey, stackId, tableId, primaryKeyValue, updateFields) => {
  // Asumir que tabla tiene unique constraint en primary key
  // Obtener todos los registros y filtrar en memoria (costoso para >1000 registros)
  
  const listResponse = await fetch(
    `https://stackby.com/api/betav1/rowlist/${stackId}/${tableId}?limit=100`,
    {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    }
  );
  
  const { rows } = await listResponse.json();
  const existing = rows.find(r => r.fields.PrimaryKeyField === primaryKeyValue);
  
  if (existing) {
    return await updateRecord(apiKey, stackId, tableId, existing.id, updateFields);
  } else {
    return await createRecord(apiKey, stackId, tableId, { 
      'PrimaryKeyField': primaryKeyValue, 
      ...updateFields 
    });
  }
};
```

**Problema Crítico**: Sin endpoint de búsqueda robusto, los upserts en datasets grandes (>10k) son ineficientes.

### 4.4 Búsqueda por Campo Clave

**Documentado**: Parcialmente. El endpoint sugiere soporte para `search` query param.

```javascript
// Patrón 1: Simple search (implementación inferida)
const searchRecords = async (apiKey, stackId, tableId, searchTerm) => {
  const response = await fetch(
    `https://stackby.com/api/betav1/rowlist/${stackId}/${tableId}?search=${encodeURIComponent(searchTerm)}`,
    {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    }
  );
  return (await response.json()).rows;
};

// Patrón 2: Fetch all y filter en memoria (garantizado funcionar)
const findRecordByField = async (apiKey, stackId, tableId, fieldName, fieldValue) => {
  const allRows = [];
  let offset = 0;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `https://stackby.com/api/betav1/rowlist/${stackId}/${tableId}?offset=${offset}&limit=100`,
      {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      }
    );
    
    const { rows, hasMore: more } = await response.json();
    allRows.push(...rows);
    hasMore = more;
    offset += 100;
  }
  
  return allRows.filter(row => row.fields[fieldName] === fieldValue);
};
```

**Nota**: La búsqueda server-side no está documentada claramente. Usar filtrado en memoria para datos <10k.

### 4.5 Operaciones Masivas (Batching)

**Desafío**: No hay endpoint de batch insert/update. Solución: secuencial con concurrencia controlada.

```javascript
// Batch create con rate limiting
const batchCreateRecords = async (
  apiKey, stackId, tableId, 
  recordsArray, 
  concurrency = 5
) => {
  const results = [];
  const errors = [];
  
  for (let i = 0; i < recordsArray.length; i += concurrency) {
    const batch = recordsArray.slice(i, i + concurrency);
    const batchPromises = batch.map(fields => 
      createRecord(apiKey, stackId, tableId, fields)
        .then(row => results.push(row))
        .catch(err => errors.push({ fields, error: err }))
    );
    
    await Promise.all(batchPromises);
    
    // Exponential backoff between batches
    if (i + concurrency < recordsArray.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  return { results, errors };
};

// Uso
const records = [
  { 'Name': 'User1', 'Email': 'user1@example.com' },
  { 'Name': 'User2', 'Email': 'user2@example.com' },
  { 'Name': 'User3', 'Email': 'user3@example.com' }
];

const { results, errors } = await batchCreateRecords(apiKey, stackId, tableId, records, 3);
console.log(`Created: ${results.length}, Errors: ${errors.length}`);
```

**Límites de Concurrencia**: 
- Asumir máximo 5 requests simultáneos para free tier
- Rate limit ~1000 req/day → máximo ~40 req/hora → ~1 req/90 segundos para ser seguro

---

## 5. Integración con Orquestadores (Pabbly / Zapier)

### 5.1 Patrones de Uso Típicos

#### Pattern 1: Google Form → Stackby (Entrada Manual)
```
Google Forms (trigger: new submission)
  → Extract fields
  → Pabbly Connect
  → Map fields to Stackby columns
  → Stackby (action: create record)
```

**Implementación en Pabbly**:
1. Trigger: Google Forms → "New Form Response"
2. Action: Stackby → "Create Record"
3. Configuration:
   - API Key: (from Account Settings)
   - Workspace: (dropdown select)
   - Stack: (dropdown select)
   - Table: (dropdown select)
   - Field Mapping: Form field → Stackby column
4. Test webhook, activate

#### Pattern 2: Stackby → Google Sheets (Exportación)
```
Stackby (trigger: new row)
  → Pabbly Connect listens
  → Transform (if needed)
  → Google Sheets (action: append row)
```

**Ventaja**: Sincronización en tiempo real sin escribir código.

#### Pattern 3: Stackby ↔ Google Sheets Bidirectional (con Stackby Sync)
```
Primary Table (Stackby)
  → Sync feature (one-way, automatic)
  → Destination Table (Stackby)
```
**Limitación**: Solo en Business plans. No bidireccional aún.

### 5.2 Problemas Típicos & Soluciones

| Problema | Causa | Solución |
|----------|-------|----------|
| "API key invalid" | Key expirada o copiada incorrectamente | Regenerar en Account Settings |
| Records no aparecen en Stackby | Rate limit o timeout | Reducir concurrencia, aumentar timeout |
| Field mapping falla | Nombre de columna no coincide | Verificar exact spelling, case-sensitive |
| Duplicados creados | Upsert logic no implementado | Agregar search-first step en workflow |
| Sync no actualiza | Plan inferior a Business | Upgrade o usar Zapier/Pabbly instead |

### 5.3 Qué se Puede Hacer Bien

✅ **Bien Soportado**:
- Crear registros desde formularios externos
- Actualizar registros basado en eventos externos
- Exportar datos a Google Sheets/Airtable
- Desencadenar acciones SMS/Slack basadas en cambios en Stackby
- Sincronización one-way entre stacks (Business plan)

❌ **No Bien Soportado**:
- Búsqueda compleja en API (AND/OR, regex, date ranges)
- Batch updates (requiere loops)
- Bi-directional sync (coming soon)
- Transactions/atomic operations
- Complex upsert logic sin fetching previo

---

## 6. Stackby como Destino de Datos No-Tipados

### 6.1 Problemas Habituales (Google Sheets → Stackby)

#### Problema 1: Type Mismatch
**Escenario**: Google Sheets tiene columna "Age" como texto; Stackby espera Number.

```
Sheet Data: "25", "thirty", "35"
↓
Stackby Sync/Import: Falla en "thirty" → type conversion error
```

**Solución**:
```javascript
// Validar y transformar antes de enviar
const transformGoogleSheetRow = (sheetRow) => {
  return {
    'Age': parseInt(sheetRow['Age']) || 0,  // Default to 0 if invalid
    'Name': String(sheetRow['Name']).trim(),
    'IsActive': sheetRow['IsActive'] === 'TRUE' || sheetRow['IsActive'] === 'Yes'
  };
};
```

#### Problema 2: Date Format Inconsistency
**Escenario**: Google Sheets mezcla formatos: "2025-01-27", "27/01/2025", "Jan 27, 2025"

**Solución**:
```javascript
const normalizeDate = (dateString) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];  // YYYY-MM-DD
};
```

#### Problema 3: Espacios & Caracteres Especiales
**Escenario**: Emails tienen espacios: "john @example.com"

**Solución**:
```javascript
const sanitizeEmail = (email) => {
  return String(email).trim().toLowerCase();
};

const sanitizeText = (text) => {
  return String(text).trim().replace(/\s+/g, ' ');  // Collapse whitespace
};
```

#### Problema 4: Missing Values & Nulls
**Escenario**: Google Sheets tiene celdas vacías; Stackby field es required.

**Solución**:
```javascript
const validateRequiredFields = (row, requiredFields) => {
  for (const field of requiredFields) {
    if (!row[field] || row[field].toString().trim() === '') {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  return true;
};
```

### 6.2 Normalización Recomendada

#### Pre-Sync Transformation Pipeline
```javascript
const normalizeSyncData = (googleSheetRows) => {
  return googleSheetRows
    .filter(row => {
      // Skip empty rows
      return Object.values(row).some(v => v && v.toString().trim() !== '');
    })
    .map(row => ({
      'Email': sanitizeEmail(row['Email']),
      'Name': sanitizeText(row['Name']),
      'DOB': normalizeDate(row['DOB']),
      'Amount': parseFloat(row['Amount']) || 0,
      'Status': row['Status']?.toUpperCase() || 'PENDING',
      'IsPremium': row['IsPremium'] === 'TRUE' || row['IsPremium'] === 'Yes',
      'Tags': (row['Tags'] || '').split(',').map(t => t.trim()).filter(t => t)
    }))
    .filter(row => validateRequiredFields(row, ['Email', 'Name']));
};
```

### 6.3 Manejo de Tipos Específicos

#### Boolean
| Entrada (Google Sheets) | Normalización | Salida (Stackby) |
|-------------------------|---------------|------------------|
| "TRUE" | value === 'TRUE' | true |
| "False" | value === 'TRUE' | false |
| "1" | value === '1' | true |
| "" (empty) | false | false |

#### Enum/Select
```javascript
const VALID_STATUSES = ['Active', 'Inactive', 'Pending'];

const normalizeStatus = (value) => {
  const normalized = String(value).trim().capitalize();
  if (!VALID_STATUSES.includes(normalized)) {
    throw new Error(`Invalid status: ${value}. Valid: ${VALID_STATUSES.join(', ')}`);
  }
  return normalized;
};
```

#### Linked Records
```javascript
// Si Google Sheets tiene IDs de records relacionados
const normalizeLinkField = (idString) => {
  if (!idString) return [];
  return idString.split(',').map(id => id.trim()).filter(id => id);
};
```

#### Dates (ISO-8601 for API)
```javascript
const normalizeDateForApi = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split('T')[0];  // "2025-01-27"
};

const normalizeDateTimeForApi = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();  // "2025-01-27T15:30:00.000Z"
};
```

---

## 7. Limitaciones Reales & Gotchas

### 7.1 Límites de la API

| Límite | Valor | Nota |
|--------|-------|------|
| Registros por stack | 25k-50k | Depende del plan; hard limit |
| Campos por tabla | ~100 | No documentado; límite práctico |
| Rows por request GET | 100 | Inferido; requiere paginación |
| Request timeout | ~30s | Inferido |
| Rate limit (free) | ~1000/día | No documentado; inferido |
| Concurrent requests | ~5 | Recomendado para free tier |
| Attachment size | ? | No documentado; asumir <100MB |
| Cell value length | ~65k chars | Standard web DB |

### 7.2 Operaciones Lentas o Costosas

❌ **Evitar**:
- Fetch completo de tabla grande (>10k rows) en un request → Paginar siempre
- Upsert sin búsqueda previa → Causa duplicados
- Crear registros sin validación → Causa sync errors
- Búsquedas en memoria de datasets grandes → OOM risk

✅ **Mejor Práctica**:
- Paginar desde el inicio: `?offset=0&limit=100`
- Implementar search con campo único (email, ID externo)
- Batch en concurrencia limitada (3-5 simultáneos)
- Caché de tabla metadata (schema) para validación

### 7.3 Cosas No Documentadas Claramente

| Aspecto | Documentación | Status |
|---------|---------------|--------|
| Filtros complejos (AND/OR) | None | **No documentado** |
| Sorting en API | None | **No documentado** |
| Transacciones multi-row | None | **No soportado** |
| Webhooks outbound | Parcial | Solo native triggers |
| API rate limits exactos | None | **No documentado** |
| Batch endpoint | None | **No existe** |
| Error response schema | None | **Inferido** |
| Timestamp timezone | None | Asumir UTC |

### 7.4 Comportamientos Observados en Producción

**Basado en reportes de usuarios**:

1. **Auto-save kicks out durante typing** 
   - Si pausas >2s en una celda, se guarda y pierde focus
   - Workaround: usar API para updates en lugar de UI manual

2. **Fórmulas & filtros ocasionalmente rompen**
   - Después de cambios en schema o datos
   - Solución: recrear formula o filtro

3. **Sincronización one-way tiene lag**
   - Puede tomar 10-30s entre cambio en source y actualización en destino
   - No usar para operaciones time-critical

4. **Deduplicación no es automática**
   - Requiere Deduplication Powerup manual o lógica de upsert en código
   - Riesgo de duplicados si no hay validación en entrada

5. **Linked records a veces no syncan correctamente**
   - Especialmente cuando renombrando tables o campos relacionados
   - Workaround: re-establish link relationships

6. **Tipo de dato cambia silenciosamente en algunos casos**
   - Ej. email guardado como texto en lugar de Email field validado
   - Solución: siempre especificar tipo de campo en tabla design

---

## 8. Guía Directa para Claude Code

### 8.1 Asunciones Correctas sobre Stackby

✅ **ASUMIR SIEMPRE**:

1. **API Key siempre necesario** en Authorization header; sin él, 401
2. **Paginación requerida** para datasets >100 registros; usar offset/limit
3. **No hay batch endpoint** → implementar bucles con rate limiting
4. **No hay upsert nativo** → buscar primero (search o fetch all), después update/insert
5. **Status codes HTTP estándar** → 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found
6. **JSON siempre en request/response** → parsear como JSON, nunca asumir texto plano
7. **Read-only fields pueden aparecer en response** → ignorar en updates; no causarán error
8. **Field names case-sensitive** → "Email" ≠ "email"
9. **Row IDs inmutables** → una vez asignado, nunca cambia
10. **Timestamps en ISO-8601** → "2025-01-27T15:30:00Z"

### 8.2 NUNCA Asumir

❌ **NUNCA ASUMIR**:

1. **Que endpoint de búsqueda funciona** sin probar primero
2. **Que batches de 1000+ requests pasan sin throttle** → siempre 100 máximo
3. **Que campo puede ser null sin validar schema** → algunos son required
4. **Que select values son case-insensitive** → pueden ser case-sensitive
5. **Que linked records se popula automáticamente** → pueden llegar como IDs solamente
6. **Que formulas se actualizan en tiempo real** → puede tomar delay
7. **Que deleted rows desaparecen inmediatamente** → puede haber soft-delete
8. **Que timestamps son UTC sin verificar** → siempre convertir a zona consistente
9. **Que el mismo field name existe en dos tablas** → verificar schema antes
10. **Que API key vuelve a funcionar si fue revocado** → requiere regenerar en UI

### 8.3 Estructura de Payloads de Escritura

#### Create Record - Formato Correcto
```javascript
{
  "fields": {
    "FieldName1": "value1",
    "FieldName2": 123,
    "FieldName3": true,
    "FieldName4": ["option1", "option2"],  // Multiple select
    "FieldName5": "2025-01-27",  // Date YYYY-MM-DD
    "FieldName6": "2025-01-27T15:30:00Z"  // DateTime ISO-8601
  }
}
```

#### Update Record - Formato Correcto
```javascript
{
  "fields": {
    "Status": "Completed",
    "UpdatedDate": "2025-01-27"
    // Solo incluir fields a actualizar; otros no se tocan
  }
}
```

#### Validaciones Antes de Escribir
```javascript
const validateBeforeWrite = (fields, schema) => {
  const errors = [];
  
  for (const [fieldName, fieldType] of Object.entries(schema)) {
    const value = fields[fieldName];
    
    // Check type compatibility
    switch (fieldType) {
      case 'text':
        if (value !== null && typeof value !== 'string') {
          errors.push(`${fieldName} must be string, got ${typeof value}`);
        }
        break;
      case 'number':
        if (value !== null && typeof value !== 'number') {
          errors.push(`${fieldName} must be number, got ${typeof value}`);
        }
        break;
      case 'date':
        if (value && !isValidDate(value)) {
          errors.push(`${fieldName} must be YYYY-MM-DD format`);
        }
        break;
      case 'select':
        if (value && !schema.options[fieldName].includes(value)) {
          errors.push(`${fieldName} must be one of: ${schema.options[fieldName].join(', ')}`);
        }
        break;
    }
  }
  
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
};
```

### 8.4 Diseñar Lógica de Upsert Segura

```javascript
const safeUpsert = async (apiKey, stackId, tableId, uniqueKeyField, record) => {
  // Step 1: Validate input
  if (!record[uniqueKeyField]) {
    throw new Error(`Missing unique key field: ${uniqueKeyField}`);
  }
  
  // Step 2: Search for existing
  const existingRecords = await findRecordByField(
    apiKey, stackId, tableId, 
    uniqueKeyField, record[uniqueKeyField]
  );
  
  // Step 3: Decide action
  if (existingRecords.length === 0) {
    // Insert
    return await createRecord(apiKey, stackId, tableId, record);
  } else if (existingRecords.length === 1) {
    // Update
    return await updateRecord(
      apiKey, stackId, tableId, 
      existingRecords[0].id, 
      record
    );
  } else {
    // Conflict: multiple records with same key
    throw new Error(
      `Duplicate key conflict: ${existingRecords.length} records found with ${uniqueKeyField}=${record[uniqueKeyField]}`
    );
  }
};
```

**Precondiciones**:
- `uniqueKeyField` debe ser unique en tabla (índice recomendado)
- No usar este patrón en bucles sin rate limiting

### 8.5 Qué Validar Antes de Escribir

```javascript
const preWriteValidation = (record, tableSchema) => {
  const checks = {
    // 1. Required fields
    requiredFields: tableSchema.required.every(f => {
      const value = record[f];
      return value !== null && value !== undefined && value !== '';
    }),
    
    // 2. Type compatibility
    types: Object.entries(record).every(([field, value]) => {
      const expectedType = tableSchema.fields[field]?.type;
      if (!expectedType) return false;  // Field doesn't exist in schema
      
      return isTypeCompatible(value, expectedType);
    }),
    
    // 3. Select field values
    selectValues: Object.entries(record).every(([field, value]) => {
      if (tableSchema.fields[field]?.type !== 'select') return true;
      
      const allowedValues = tableSchema.fields[field].options;
      return allowedValues.includes(value);
    }),
    
    // 4. Unique field constraints
    uniqueFields: async () => {
      for (const field of tableSchema.unique) {
        const count = await countRecordsByField(
          apiKey, stackId, tableId, 
          field, record[field]
        );
        if (count > 0) return false;
      }
      return true;
    },
    
    // 5. Email format if Email field
    emails: Object.entries(record).every(([field, value]) => {
      if (tableSchema.fields[field]?.type !== 'email') return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    })
  };
  
  return Object.entries(checks).every(([check, result]) => {
    if (!result) console.warn(`Validation failed: ${check}`);
    return result;
  });
};
```

---

## 9. Ejemplos Conceptuales

### 9.1 Esquemas de Tablas en Texto

#### Tabla 1: Users
```
TableID: table_users_001
Fields:
  - Email (type: Email, unique, required)
  - Name (type: Text, required)
  - Status (type: Select, options: [Active, Inactive, Pending], default: Pending)
  - SignupDate (type: Date)
  - IsPremium (type: Checkbox, default: false)
  - Tags (type: MultiSelect, options: [Enterprise, SMB, Startup])
  - ProfilePicture (type: Attachment)
  - CreatedTime (type: CreatedTime, read-only)
  - UpdatedTime (type: UpdatedTime, read-only)
```

#### Tabla 2: Orders
```
TableID: table_orders_001
Fields:
  - OrderID (type: AutoNumber, unique, read-only)
  - UserEmail (type: Email, required) → Link to Users.Email
  - Amount (type: Number, required)
  - Currency (type: Select, options: [USD, EUR, GBP])
  - OrderDate (type: DateTime)
  - Status (type: Select, options: [Pending, Processing, Completed, Cancelled])
  - Items (type: MultiSelect)
  - Total (type: Formula, expression: Amount * 1.1)  // With tax
```

### 9.2 Ejemplos de Payload JSON

#### Create User
```json
{
  "fields": {
    "Email": "john.doe@example.com",
    "Name": "John Doe",
    "Status": "Active",
    "SignupDate": "2025-01-27",
    "IsPremium": false,
    "Tags": ["Enterprise", "SMB"]
  }
}
```

#### Response (201 Created)
```json
{
  "id": "row_user_12345",
  "createdTime": "2025-01-27T10:00:00Z",
  "updatedTime": "2025-01-27T10:00:00Z",
  "fields": {
    "Email": "john.doe@example.com",
    "Name": "John Doe",
    "Status": "Active",
    "SignupDate": "2025-01-27",
    "IsPremium": false,
    "Tags": ["Enterprise", "SMB"],
    "ProfilePicture": null,
    "CreatedTime": "2025-01-27T10:00:00Z",
    "UpdatedTime": "2025-01-27T10:00:00Z"
  }
}
```

#### Update User Status
```json
{
  "fields": {
    "Status": "Inactive"
  }
}
```

#### Create Order with Link
```json
{
  "fields": {
    "UserEmail": "john.doe@example.com",
    "Amount": 100,
    "Currency": "USD",
    "OrderDate": "2025-01-27T15:30:00Z",
    "Status": "Pending",
    "Items": ["Item1", "Item2"]
  }
}
```

### 9.3 Pseudocódigo de Sync Sheet → Stackby

```
FUNCTION SyncGoogleSheetToStackby(sheetId, sheetRange, apiKey, stackId, tableId):
  
  // Step 1: Fetch data from Google Sheets
  sheetData = GoogleSheetsAPI.values.get(sheetId, sheetRange)
  headers = sheetData[0]  // First row
  rows = sheetData[1:]    // Remaining rows
  
  // Step 2: Transform & normalize
  records = []
  FOR EACH row IN rows:
    IF row is empty THEN continue
    
    record = {}
    FOR i FROM 0 TO headers.length:
      fieldName = headers[i]
      rawValue = row[i]
      normalizedValue = NormalizeValue(rawValue, fieldName)
      record[fieldName] = normalizedValue
    
    // Step 3: Validate
    IF NOT ValidateRecord(record, SCHEMA):
      LogError("Validation failed for row", row)
      continue
    
    records.append(record)
  
  // Step 4: Sync to Stackby (upsert pattern)
  successCount = 0
  errorCount = 0
  
  FOR EACH record IN records:
    uniqueKey = record['Email']  // Assuming Email is unique
    
    TRY:
      existingRecords = FindRecordByField(apiKey, stackId, tableId, 'Email', uniqueKey)
      
      IF existingRecords.length == 0:
        CreateRecord(apiKey, stackId, tableId, record)
      ELSE IF existingRecords.length == 1:
        UpdateRecord(apiKey, stackId, tableId, existingRecords[0].id, record)
      ELSE:
        LogError("Duplicate key found", uniqueKey)
        errorCount++
        continue
      
      successCount++
    
    CATCH error:
      LogError("Sync failed", record, error)
      errorCount++
  
  // Step 5: Report results
  RETURN {
    synced: successCount,
    failed: errorCount,
    total: records.length
  }

END FUNCTION
```

---

## 10. Recursos & Referencias

### Documentación Oficial
- [Postman Public Workspace](https://www.postman.com/lively-equinox-180638/stackby-s-public-workspace/)
- [Stackby Help Center](https://help.stackby.com)
- [Stackby API Overview](https://help.stackby.com/en/articles/29-developer-api)

### Integraciones Probadas
- [Pabbly Connect](https://www.pabbly.com/connect/integrations/stackby/)
- [Make.com](https://apps.make.com/stackby)
- [n8n](https://n8n.io/integrations/stackby/)
- [Zapier](https://zapier.com/apps/stackby)
- [Coupler.io](https://coupler.io) - Para Google Sheets sync

### Patrones de Uso
- [Contact Form 7 → Stackby via Pabbly](https://www.pabbly.com/automate-stackby-record-creation-with-pabbly-connect-and-contact-form-7/)
- [Stackby → Google Sheets](https://blog.coupler.io/stackby-to-google-sheets/)
- [Stackby Automation & API](https://www.youtube.com/watch?v=gtpQm08qqdg)

---

## Notas Finales para Claude Code

Este documento proporciona la base técnica necesaria para:
1. **Generar código de sincronización** Sheet → Stackby sin errores
2. **Implementar lógica de upsert** segura
3. **Manejar errores y validaciones** antes de escribir datos
4. **Diseñar workflows** en Pabbly Connect o similar
5. **Escalar operaciones** con rate limiting y batching

**Siempre recuerda**:
- Validar antes de escribir
- Paginar para grandes datasets
- Implementar retry logic con exponential backoff
- Loguear errores con contexto completo
- Testear con pequeños datasets primero

**Última actualización**: Febrero 2026

---

## Apéndice: Hallazgos Prácticos de Campo

> Consolidado desde la investigación directa de API (febrero 2026).
> Contexto: Integración DECA Publisher (Apps Script → Stackby).

### Formato correcto confirmado

La clave es `field` (singular), NO `fields` (plural). Este detalle no está en ninguna documentación oficial.

```json
{"records": [{"field": {"Nombre": "Test", "Email": "test@example.com"}}]}
```

### Resumen de formatos por operación

| Operación | Método | Formato del payload |
|-----------|--------|---------------------|
| Crear | POST `/rowcreate` | `{"records": [{"field": {...}}]}` |
| Actualizar | PATCH `/rowupdate` | `{"records": [{"id": "rowId", "field": {...}}]}` |
| Eliminar | DELETE `/rowdelete` | Query params: `?rowIds[]=id1&rowIds[]=id2` |
| Listar | GET `/rowlist` | Sin body |

### Bugs conocidos

1. **Columnas con espacios finales causan HTTP 501**: Si el nombre de columna termina en espacio (ej: `"ACEPTADO EN "`), la API devuelve HTTP 501. Solución: omitir ese campo.

2. **`rowupdate` inestable**: HTTP 500 en algunos contextos. Workaround: delete + create.

3. **Linked records con arrays de 1 elemento**: Falla. Workaround: duplicar el ID `["id1", "id1"]`.

4. **Select fields**: Solo aceptan valores previamente configurados en la UI. Valores nuevos se descartan silenciosamente.

### URLs de la API

- Base URL: `https://stackby.com/api/betav1/`
- `api.stackby.com` NO existe (DNS error)
- `/api/v1/` devuelve 404
- Header: `api-key: {API_KEY}` (no Bearer)

### Limitaciones de la API

- No puede crear columnas, cambiar tipos ni configurar vistas (solo UI)
- Batch máximo: 10 filas por request
- Delete: IDs como query params, máximo 10
