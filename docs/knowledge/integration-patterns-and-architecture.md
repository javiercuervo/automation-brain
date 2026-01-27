# Integration Patterns & Data Orchestration (Pabbly + Stackby + Google Sheets + Claude Code)

**Target audience:** Claude Code (VS Code) generando JS + mappings para Pabbly Connect workflows  
**Stack:** Claude Code · Visual Studio Code · GitHub · Pabbly Connect · Stackby · Google Sheets · Webhooks/REST  
**Versión:** 1.0 — **Enero 2026**

> Este documento se apoya en los knowledge bases de Pabbly y Stackby.

---

## 0) Principios operativos (para evitar el “campo a campo”)

1. **UI mínima, lógica versionada.** Pabbly contiene “esqueletos” (workflows plantilla). La lógica vive en GitHub (mappings/reglas/scripts).
2. **Transformar una vez, reutilizar siempre.** Un único “Normalize & Validate” al inicio, reusable.
3. **Contrato único de datos (Envelope).** Todo lo que pase entre workflows (y/o servicios) mantiene el mismo esquema.
4. **Idempotencia por diseño.** Pabbly reintenta; tus writes no deben duplicar.
5. **Volumen = particionar, no “código más grande”.** Iterator + batches + workflows encadenados.
6. **Claude decide; Pabbly ejecuta.** Claude no “edita Pabbly”; genera artefactos que Pabbly consume.

---

## 1) Roles y límites por componente

### 1.1 Matriz de responsabilidades

| Componente | Qué hace mejor | Qué NO debe hacer |
|---|---|---|
| **Pabbly Connect** | Orquestar pasos, conectar apps, reintentos, routers, iterators, historial | Procesamiento pesado, estado persistente, ETL masivo sin lotes |
| **Code by Pabbly (JS)** | Normalización, validación, mapping declarativo, decisiones de ruta | Loops grandes, esperas/lógicas largas; límites de ejecución y retorno JSON |
| **Google Sheets** | Fuente/staging humano, reporting/export | Ser DB tipada/consistente sin gobernanza; búsquedas complejas/masivas |
| **Stackby** | Base de datos central, tablas/vistas, CRUD vía API | Upsert nativo; búsquedas complejas server-side garantizadas; batch nativo |
| **Claude Code (VS Code)** | Generar scripts/mappings, detectar schema, proponer patrones | Ejecutar prod sin PR; inventar campos sin muestras |
| **GitHub** | SSOT de lógica, revisión/PR, versionado, changelog | Guardar secretos; mezclar datos sensibles con ejemplos |

---

## 2) Contrato estándar de datos: Envelope

### 2.1 Envelope recomendado

```json
{
  "meta": {
    "source_system": "google_sheets|stackby|webhook|api",
    "source_ref": "sheetId/range|stackId/tableId|webhookId",
    "workflow": "WF_NAME",
    "run_id": "uuid-or-timestamp",
    "idempotency_key": "stable-key",
    "mapping_version": "semver",
    "ts_ingested": "ISO-8601"
  },
  "data": {
    "raw": {},
    "normalized": {},
    "targets": {}
  },
  "control": {
    "action": "CREATE|UPDATE|UPSERT|SKIP|ERROR",
    "reason": "string",
    "errors": []
  }
}
```

### 2.2 Reglas del contrato

- `meta.idempotency_key` **estable** (ej.: `stackby:Users:email:jane@x.com`).
- `data.raw`: input “tal cual” (si no es enorme).
- `data.normalized`: datos ya tipados/limpios.
- `data.targets`: **solo** campos destino listos para mapear.
- `control.action`: decisión explícita para Router.
- Nunca devolver `undefined` en outputs.

---

## 3) Mappings: declarativos primero

### 3.1 Formato sugerido de mapping JSON

`/mappings/<dominio>/<tabla>.mapping.json`

```json
{
  "mapping_version": "1.2.0",
  "unique_key": { "field": "Email", "source_path": "data.normalized.email" },
  "field_map": {
    "Email": "data.normalized.email",
    "Name": "data.normalized.full_name",
    "Status": "data.normalized.status",
    "SignupDate": "data.normalized.signup_date"
  },
  "defaults": { "Status": "Pending" },
  "transforms": [
    { "op": "trim", "path": "data.normalized.full_name" },
    { "op": "lower", "path": "data.normalized.email" }
  ],
  "validation": {
    "required": ["data.normalized.email", "data.normalized.full_name"]
  }
}
```

---

## 4) Workflows plantilla en Pabbly

### 4.1 Plantilla 1: Ingest → Normalize → Decide → Persist

1. Trigger: Webhook / Schedule / App  
2. Code: produce Envelope + `control.action`  
3. Router: `CREATE/UPDATE/UPSERT` → persist; `SKIP` → fin; `ERROR` → DLQ  
4. Persist: Stackby Create/Update (o API by Pabbly)  
5. Audit (opcional): Stackby “Audit” o Sheet “Runs”

### 4.2 Plantilla 2: Pipeline modular con Data Forwarder

- WF1: Ingest & Normalize  
- WF2: Enrich / Dedupe / Decide  
- WF3: Persist & Audit  

Entre workflows viaja el Envelope.

---

## 5) Patrones end-to-end (canónicos)

### Patrón A — Importación masiva inicial: Sheets → Stackby
Rangos acotados + Iterator + mapping declarativo + upsert simulado.

### Patrón B — Sync incremental con watermark
Guardar `last_success_ts` (Stackby Config o Sheet de control) y procesar solo cambios desde ese cursor.

### Patrón C — Event-driven: Webhook → Pabbly → Stackby
Idempotency key + persist idempotente + DLQ.

### Patrón D — Upsert en Stackby (no nativo)
- Search por unique key → Update/Create
- Si escala: **tabla índice** (`unique_key` → `row_id`) para evitar búsquedas costosas.

### Patrón E — Stackby → Sheets (reporting)
Export batch por schedule desde vistas.

### Patrón F — Bidireccional (evitar por defecto)
Si es imprescindible: source of truth + política de conflicto + tabla de conflictos.

---

## 6) ¿Cuándo Code by Pabbly vs runner externo?

**Code by Pabbly**: transformaciones cortas, 1 item por iterator, pocas HTTP calls.  
**Runner externo**: lotes grandes, librerías, jobs largos, caché/colas, rate limit avanzado.  
Mantén el Envelope en ambos.

---

## 7) Fiabilidad

- **Idempotencia**: `idempotency_key` estable + registro de procesados.
- **Reintentos**: asumir retries; evitar duplicados.
- **DLQ**: Stackby/Sheet `Errors` con run_id, entity_key, step, error, payload truncado.
- **Observabilidad**: run_id + correlation_id por entidad.

---

## 8) Estructura de repositorio recomendada (GitHub)

```
/docs/knowledge
  pabbly-connect-knowledge-base.md
  stackby-knowledge-base.md
  google-sheets-knowledge-base.md
  integration-patterns-and-architecture.md

/mappings
/scripts
/schemas
/samples
/prompts
```

---

## 9) Directivas para Claude Code (imperativo)

1. No dependas de estado persistente en Pabbly.
2. Devuelve JSON serializable (sin `undefined`).
3. Respeta el Envelope.
4. Valida required antes de persistir.
5. No asumas upsert en Stackby; usa índice si hay duplicados/escala.
6. Asume datos no tipados en Sheets; normaliza.
7. Divide workflows cuando crezca la complejidad.
8. Prioriza simplicidad → idempotencia → auditabilidad.

---

## 10) Checklist

- Origen/destino
- Clave única
- Reintentos (idempotencia)
- Tamaño de lote
- Watermark (si incremental)
- Índice (si upsert a escala)
- Audit + DLQ
- Mapping versionado
