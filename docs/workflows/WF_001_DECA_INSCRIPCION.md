# WF_001: DECA Inscripción → Stackby

**Automatización**: WF_001_DECA_INSCRIPCION
**Versión**: 1.2.0
**Fecha**: Enero 2026
**Autor**: Claude Code

---

## Resumen

Sincroniza formularios de inscripción DECA desde Google Sheets a Stackby, aplicando:
- Normalización de tipos (fechas, emails, teléfonos, DNI)
- Mapeo declarativo de columnas (Sheet → Stackby)
- **Upsert idempotente con clave compuesta**: `email + submitted_on`
- Routing a DLQ en caso de error

---

## Arquitectura

```
┌─────────────────────┐
│   Google Sheets     │
│  "DECA Inscripción" │
└─────────┬───────────┘
          │ Trigger (Schedule/Manual)
          ▼
┌─────────────────────┐
│   Pabbly Connect    │
│   Get Rows (all)    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│     Iterator        │
│  (1 row per cycle)  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Code by Pabbly    │
│ normalize_and_map.js│
│   Returns Envelope  │
│ (action=UPSERT)     │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│      Router #1      │
│ control.action ==   │
├───────┬───────┬─────┤
│UPSERT │ SKIP  │ERROR│
└───┬───┴───┬───┴──┬──┘
    │       │      │
    ▼       ▼      ▼
┌───────┐ (fin) ┌─────┐
│Stackby│       │ DLQ │
│Search │       │Sheet│
│by Email       └─────┘
└───┬───┘
    │ (puede retornar 0, 1 o N resultados)
    ▼
┌─────────────────────┐
│   Code by Pabbly    │
│ filter_and_decide.js│  ◄─── NUEVO: Filtra por Submitted On
│   Compara clave     │       y decide CREATE o UPDATE
│   compuesta         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│     Router #2       │
│  control.action ==  │
├─────────┬───────────┤
│ UPDATE  │  CREATE   │
└────┬────┴─────┬─────┘
     │          │
     ▼          ▼
┌─────────┐ ┌─────────┐
│ Update  │ │ Create  │
│ Record  │ │ Record  │
└─────────┘ └─────────┘
```

---

## Clave Compuesta e Idempotencia

### ¿Por qué clave compuesta?

- **Email solo NO es suficiente**: Un alumno puede enviar múltiples solicitudes
- **Clave única**: `email + submitted_on` identifica unívocamente cada envío
- **Idempotency Key**: `stackby:SOLICITUDES_DECA:{email}:{submitted_on_iso}`

### Cómo funciona el upsert

1. **normalize_and_map.js**: Genera idempotency_key y marca `action=UPSERT`
2. **Stackby Search**: Busca por email (retorna todos los registros de ese email)
3. **filter_and_decide.js**: Filtra resultados por `Submitted On (UTC)` exacto
   - Si encuentra match → `action=UPDATE` + `_stackby_row_id`
   - Si no encuentra → `action=CREATE`
4. **Router #2**: Ejecuta Update o Create según la decisión

---

## Configuración Paso a Paso

### PASO 1: Trigger (Schedule o Manual)

**Tipo**: Schedule Trigger
**Frecuencia recomendada**: Cada 1 hora o según volumen

**Configuración**:
- Trigger: `Schedule`
- Frequency: `Hourly` (o `Daily` si bajo volumen)
- Timezone: `Europe/Madrid`

---

### PASO 2: Google Sheets - Get Spreadsheet Rows

**Action**: `Google Sheets → Get Spreadsheet Rows`

**Configuración**:
| Campo | Valor |
|-------|-------|
| Spreadsheet | `DECA Inscripción` (ID: 1FK0TPur-qCYyVGM0bRuHMa6I8Q7vp_TpFWz3_2M56DQ) |
| Sheet Name | `DECA Inscripción` |
| Range | `A2:W1000` (desde fila 2 para saltar headers) |
| Return Values | ☑ Checked |

---

### PASO 3: Iterator

**Action**: `Iterator`

**Configuración**:
- Array to iterate: `{{step_2.rows}}`
- Operation: Split into individual items

---

### PASO 4: Code by Pabbly - Normalize & Map

**Action**: `Code by Pabbly (JavaScript)`

**Código**: `/scripts/pabbly/wf_001_deca_inscripcion/normalize_and_map.js`

**Input mapping**:
```
input = {{current_item}}
```

**Output**: Envelope con `control.action = UPSERT` (si válido)

---

### PASO 5: Router #1 (por control.action inicial)

**Action**: `Router`

**Rutas**:

| Ruta | Condición | Destino |
|------|-----------|---------|
| **UPSERT** | `{{step_4.control.action}}` equals `UPSERT` | Paso 6 |
| **SKIP** | `{{step_4.control.action}}` equals `SKIP` | Fin |
| **ERROR** | `{{step_4.control.action}}` equals `ERROR` | Paso DLQ |

---

### PASO 6: Stackby - Search by Email

**Action**: `Stackby → Search Record`

**Configuración**:
| Campo | Valor |
|-------|-------|
| Stack | `IITD Matriculación` |
| Table | `SOLICITUDES_DECA` |
| Search Column | `Correo electrónico` |
| Search Value | `{{step_4.data.targets.Correo electrónico}}` |

**Output**: Array de registros que coinciden con ese email (puede ser 0, 1 o varios)

**Nota**: Este paso retorna TODOS los registros del mismo email. El siguiente paso filtra por `Submitted On`.

---

### PASO 6b: Code by Pabbly - Filter & Decide (NUEVO)

**Action**: `Code by Pabbly (JavaScript)`

**Código**: `/scripts/pabbly/wf_001_deca_inscripcion/filter_and_decide.js`

**Input mapping**:
```javascript
input = {
  envelope: {{step_4}},           // Envelope completo del paso 4
  search_results: {{step_6.data}} // Resultados de Stackby Search
}
```

**Lógica**:
1. Recibe el Envelope original y los resultados de búsqueda
2. Filtra los resultados buscando coincidencia exacta de `Submitted On (UTC)`
3. Si encuentra match: `control.action = UPDATE`, añade `data._stackby_row_id`
4. Si no encuentra: `control.action = CREATE`

**Output**: Envelope actualizado con decisión final

---

### PASO 7: Router #2 (CREATE vs UPDATE)

**Action**: `Router`

**Rutas**:

| Ruta | Condición | Destino |
|------|-----------|---------|
| **UPDATE** | `{{step_6b.control.action}}` equals `UPDATE` | Paso 8a |
| **CREATE** | `{{step_6b.control.action}}` equals `CREATE` | Paso 8b |

---

### PASO 8a: Stackby - Update Record

**Action**: `Stackby → Update a Row`

**Configuración**:
| Campo | Valor |
|-------|-------|
| Stack | `IITD Matriculación` |
| Table | `SOLICITUDES_DECA` |
| Row ID | `{{step_6b.data._stackby_row_id}}` |

**Field Mapping** (desde `step_6b.data.targets`):
```
Submitted On (UTC)              → {{step_6b.data.targets.Submitted On (UTC)}}
¿En qué se desea matricular?    → {{step_6b.data.targets.¿En qué se desea matricular?}}
Selección de módulos            → {{step_6b.data.targets.Selección de módulos}}
Título civil                    → {{step_6b.data.targets.Título civil}}
Especificar otro título         → {{step_6b.data.targets.Especificar otro título}}
Nombre                          → {{step_6b.data.targets.Nombre}}
Apellidos                       → {{step_6b.data.targets.Apellidos}}
Calle (vía)                     → {{step_6b.data.targets.Calle (vía)}}
Número, piso, puerta            → {{step_6b.data.targets.Número, piso, puerta}}
Centro asociado al que pertenece→ {{step_6b.data.targets.Centro asociado al que pertenece}}
Indique el nombre del centro    → {{step_6b.data.targets.Indique el nombre del centro}}
Población                       → {{step_6b.data.targets.Población}}
Código postal                   → {{step_6b.data.targets.Código postal}}
Provincia                       → {{step_6b.data.targets.Provincia}}
DNI / Pasaporte / NIE           → {{step_6b.data.targets.DNI / Pasaporte / NIE}}
Fecha de nacimiento             → {{step_6b.data.targets.Fecha de nacimiento}}
Estado civil                    → {{step_6b.data.targets.Estado civil}}
Sexo                            → {{step_6b.data.targets.Sexo}}
Teléfono de contacto            → {{step_6b.data.targets.Teléfono de contacto}}
Correo electrónico              → {{step_6b.data.targets.Correo electrónico}}
Firma del solicitante           → {{step_6b.data.targets.Firma del solicitante}}
ACEPTADO EN                     → {{step_6b.data.targets.ACEPTADO EN}}
Thank You Screen                → {{step_6b.data.targets.Thank You Screen}}
```

---

### PASO 8b: Stackby - Create Record

**Action**: `Stackby → Create a Row`

**Configuración**: Igual que Paso 8a, pero sin Row ID.

| Campo | Valor |
|-------|-------|
| Stack | `IITD Matriculación` |
| Table | `SOLICITUDES_DECA` |

**Field Mapping**: Mismo que Paso 8a, usando `{{step_6b.data.targets.*}}`

---

### PASO DLQ: Google Sheets - Append Error Row

**Action**: `Google Sheets → Add New Row`

**Configuración**:
| Campo | Valor |
|-------|-------|
| Spreadsheet | (crear sheet "DLQ_Errors" o usar existente) |
| Sheet Name | `Errors` |

**Field Mapping**:
```
Timestamp           → {{step_4.meta.ts_ingested}}
Workflow            → WF_001_DECA_INSCRIPCION
Idempotency Key     → {{step_4.meta.idempotency_key}}
Error Reason        → {{step_4.control.reason}}
Errors              → {{step_4.control.errors}}
Raw Data (truncated)→ {{step_4.data.raw}}
```

---

## Diagrama de Pasos en Pabbly

```
[1] Schedule Trigger
      ↓
[2] Google Sheets: Get Rows
      ↓
[3] Iterator (over rows)
      ↓
[4] Code by Pabbly: normalize_and_map.js
      ↓
[5] Router #1: UPSERT / SKIP / ERROR
      ├── UPSERT → [6]
      ├── SKIP   → (fin)
      └── ERROR  → [DLQ]
            ↓
[6] Stackby: Search by Email (retorna N resultados)
      ↓
[6b] Code by Pabbly: filter_and_decide.js    ◄─── NUEVO
      │  Filtra por Submitted On (UTC)
      │  Decide: CREATE o UPDATE
      ↓
[7] Router #2: UPDATE / CREATE
      ├── UPDATE → [8a] Update Record (con row_id)
      └── CREATE → [8b] Create Record
```

---

## Notas Importantes

### Idempotencia con Clave Compuesta
- **Clave**: `email + submitted_on`
- **Idempotency Key**: `stackby:SOLICITUDES_DECA:{email}:{submitted_on_iso}`
- Pabbly puede reintentar hasta 5 veces; siempre actualiza el mismo registro

### Límites
- **Pabbly Code timeout**: 25 segundos (scripts optimizados para < 5s)
- **Stackby Search**: Puede retornar múltiples resultados por email
- **Google Sheets rate**: 300 req/min

### Campos Especiales
- `Selección de módulos`: Multiselect, el script lo convierte a array
- `Sexo`: Normaliza "Hombre"→"Masculino", "Mujer"→"Femenino"
- `Fecha de nacimiento`: Parsea "Date: 07 Jul, 2004" → "2004-07-07"

### Campo "ACEPTADO EN" (Gestionado Internamente)

**Tipo**: Single Select
**Opciones**: `PENDIENTE`, `UNO`, `DOS`, `TRES`, `COMPLETO`, `CONVALIDACIÓN`

**Regla de negocio**:
- **NO se importa desde Google Sheets** (el campo "ADMITIDO EN" del formulario se ignora)
- **CREATE**: Se inicializa automáticamente con `"PENDIENTE"`
- **UPDATE**: Se preserva el valor existente (no se sobrescribe)
- **Excepción UPDATE**: Si el valor actual está vacío, se establece `"PENDIENTE"`

**Propósito**: Permite al personal administrativo gestionar el estado de aceptación sin que las re-sincronizaciones lo sobrescriban.

---

## Scripts del Workflow

| Script | Ubicación | Propósito |
|--------|-----------|-----------|
| `normalize_and_map.js` | `/scripts/pabbly/wf_001_deca_inscripcion/` | Normaliza, valida, genera Envelope |
| `filter_and_decide.js` | `/scripts/pabbly/wf_001_deca_inscripcion/` | Filtra por clave compuesta, decide CREATE/UPDATE |

---

## Checklist Pre-Activación

- [ ] API Key de Stackby configurada en Pabbly
- [ ] Conexión Google Sheets autorizada
- [ ] Sheet DLQ creado para errores
- [ ] Script `normalize_and_map.js` copiado en Code by Pabbly (Paso 4)
- [ ] Script `filter_and_decide.js` copiado en Code by Pabbly (Paso 6b)
- [ ] Verificado nombre exacto de campo "ACEPTADO EN" (con o sin trailing space)
- [ ] Probado con 5 filas de muestra
- [ ] Verificado mapping de campos en Update/Create

---

## Troubleshooting

| Problema | Causa Probable | Solución |
|----------|----------------|----------|
| Duplicados con mismo email | filter_and_decide no recibe search_results | Verificar input mapping en paso 6b |
| "Field not found" en Stackby | Nombre de columna no coincide | Verificar mayúsculas/minúsculas y trailing spaces |
| Timeout en Code | Script muy lento | Revisar logs, optimizar |
| Fechas incorrectas | Formato no parseado | Verificar parseDate() en script |
| Error 401 Stackby | API Key inválida | Regenerar en Account Settings |
| UPDATE ejecuta pero no encuentra row | `_stackby_row_id` no se pasó | Verificar que step_6b retorna data._stackby_row_id |

---

## Changelog

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.2.0 | Ene 2026 | "ACEPTADO EN" gestionado internamente (no se importa del Sheet) |
| 1.1.0 | Ene 2026 | Añadido paso 6b (filter_and_decide.js) para clave compuesta |
| 1.0.0 | Ene 2026 | Versión inicial |
