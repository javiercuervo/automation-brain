# DECA — Flujo de pre‑matriculación (Getformly → Google Sheets → Apps Script → Pabbly → Stackby)

**Propósito:** documentar un flujo robusto y de bajo mantenimiento para gestionar **solicitudes de pre‑matriculación** en DECA, usando **Getformly** como captación, **Google Sheets** como buffer/staging, **Apps Script** como publicador controlado, **Pabbly Connect** como orquestador, y **Stackby** como **Source of Truth (SoT)**.

---

## 1) Objetivos y no‑objetivos

### Objetivos
- **Capturar** solicitudes de pre‑matriculación de forma fiable, incluso si Stackby tiene caídas o latencia.
- Garantizar **completitud** (no enviar registros “a medias”).
- Evitar **bucles** y duplicados mediante **idempotencia** (upsert por clave estable).
- Mantener la lógica **centralizada y versionable** (generada/iterada con Claude Code, ejecutada en Apps Script / Pabbly).

### No‑objetivos (por ahora)
- Modelado completo de backoffice (pagos, contratos, horarios, etc.).
- Sincronización bidireccional (Stackby → Sheets).  
  > Por defecto el flujo es **unidireccional** hacia Stackby para evitar realimentación.

---

## 2) Arquitectura general

### Diagrama lógico

1. **Getformly (formulario)**  
   ↓ (integración nativa)  
2. **Google Sheets — `raw_getformly` (append‑only)**  
   ↓ (polling por tiempo, valida completitud)  
3. **Google Apps Script (Publisher)** → **Webhook**  
   ↓  
4. **Pabbly Connect (Consumer/Orchestrator)**  
   ↓ (Search+Upsert)  
5. **Stackby — tabla SoT `Solicitudes_PreMatricula`**

**Punto crítico anti‑bucle:**  
Pabbly **no “escucha”** cambios en Sheets. Recibe eventos **solo** desde Apps Script (webhook).

---

## 3) Modelo de datos

### 3.1 Google Sheets

#### A) Hoja `raw_getformly` (entrada)
- Hoja donde llegan los envíos de Getformly.
- Se trata como **append‑only** (no editar a mano salvo excepciones controladas).

**Columnas típicas (ejemplo):**
- `submitted_at` (timestamp)
- `email`
- `nombre`
- `telefono`
- `programa` / `curso`
- `campus` / `sede`
- … (campos del formulario)

**Columnas de control (añadir al final):**
- `external_id` (string, estable) — clave idempotente
- `published_at` (datetime) — marca de publicación a Pabbly
- `publish_attempts` (int) — contador de reintentos
- `last_publish_error` (text) — último error

> **Nota:** Si Getformly cambia estructura/pestaña por cambios en el formulario, este flujo requiere confirmar que el script está leyendo la hoja correcta.

#### B) Hoja opcional `sync_log` (auditoría)
Append‑only (una fila por intento):
- `run_id`
- `external_id`
- `timestamp`
- `result` (OK/ERROR)
- `error_message`
- `stackby_action` (CREATE/UPDATE)
- `stackby_row_id` (si disponible)

> En MVP puede ser opcional, pero es muy útil para depurar “por qué no llegó”.

---

### 3.2 Stackby (SoT)

#### Tabla `Solicitudes_PreMatricula`
**Columnas mínimas recomendadas:**
- `external_id` (texto) — **clave de upsert**
- `source` (texto) — fijo: `getformly`
- `submitted_at` (fecha/hora)
- `email`
- `email_key` (texto) — `lower(trim(email))`
- `nombre`, `telefono`, `programa`, `sede`, etc.
- `ingested_at` (fecha/hora) — cuándo entró a Stackby
- `source_payload_hash` (texto) — firma del payload (opcional en MVP)

> `email_key` sirve para búsquedas/normalización; **no** sustituye a `external_id` como clave estable si el email puede cambiar.

---

## 4) Identificadores e idempotencia

### 4.1 `external_id` (obligatorio)
Debe ser **estable** y **determinista** para un envío. Opciones por orden preferido:

1) **ID del envío del formulario** (si Getformly lo expone)  
2) Si no existe: composición estable, por ejemplo:  
   - `hash(email_key + submitted_at_utc + form_id)`  
   - o `email_key + "|" + submitted_at_utc` (si no hay riesgo de colisiones)

### 4.2 `email` como ID del alumno (recomendación)
- Para una **solicitud**, el email puede ayudar a deduplicar.
- Para relaciones entre tablas (Alumnos ↔ Inscripciones), lo robusto es:
  - **Tabla Alumnos** con un `alumno_id` estable (UUID interno) y `email_key` como atributo.
  - Enlazar con columnas **Connect** mediante `row_id` del Alumno (no por texto).

> **MVP:** solo `Solicitudes_PreMatricula` por `external_id`.  
> **Fase 2:** tabla `Alumnos` + enlazado.

---

## 5) Flujo detallado (MVP: “nuevas solicitudes a Stackby”)

### 5.1 Captura (Getformly → Sheets)
- Getformly escribe una nueva fila en `raw_getformly`.

### 5.2 Publicación controlada (Apps Script)
**Ejecución:** Trigger **time‑based** (cada 1–5 min).

**Algoritmo:**
1) Obtener un **lock** (para evitar ejecuciones concurrentes).
2) Leer filas donde `published_at` está vacío.
3) Validar **completitud mínima** (ej.: `email`, `submitted_at`, `programa`).  
   - Si incompleta: no publicar aún.
4) Construir `external_id` (si no existe en la fila, calcular y escribirlo).
5) Construir `payload` JSON normalizado.
6) `POST` al webhook de Pabbly.
7) Si OK: escribir `published_at=now()`, `publish_attempts++`, limpiar error.
8) Si error: `publish_attempts++`, `last_publish_error=...` y dejar pendiente.

**Garantías:**
- Cada fila se publica **una vez** si `published_at` se escribe solo tras éxito.
- Reintentos automáticos si falla Pabbly/Stackby (sin perder datos).

### 5.3 Consumo y upsert (Pabbly → Stackby)
**Trigger:** Webhook “Catch Hook” (recibe el JSON).

**Pasos lógicos:**
1) (Opcional) Paso de “Code” para:
   - normalizar `email_key`
   - formatear fechas
   - calcular `payload_hash`
2) **Search** en Stackby por `external_id`.
3) Si existe:
   - **Update row** con campos del payload
4) Si no existe:
   - **Create row**
5) (Opcional) Log a `sync_log` (Sheets) o a tabla `SyncLog` (Stackby).

**Garantías:**
- Si llega dos veces el mismo evento (reintento), el **upsert** evita duplicados.

---

## 6) Evitar bucles (reglas duras)

1) **Pabbly no debe usar triggers basados en “Row updated”** en la hoja que luego se marca (`published_at`, etc.).  
2) El disparo debe venir de:
   - Webhook (desde Apps Script), o
   - Scheduler polling desde Pabbly sobre una `outbox` que Pabbly **no** actualiza (menos recomendado que webhook).
3) El estado de “procesado” debe escribirse **solo** desde el publisher (Apps Script), no desde el consumer (Pabbly), si estás usando triggers por cambios.

---

## 7) Completitud de datos (por qué antes faltaban campos)

Causas típicas:
- La fila aún no terminó de “llenarse” (campos calculados, latencia de escritura).
- Cambio de estructura del formulario → nueva pestaña/hoja y Pabbly/Script lee la anterior.
- Trigger que entrega “delta” (solo campos cambiados) en vez de fila completa.

Mitigaciones:
- Publisher por polling + validación de completitud.
- Re‑lectura de la fila justo antes de publicar (opcional).
- Validación fuerte (si falta un campo crítico, no publica).

---

## 8) Manejo de errores y reintentos

### 8.1 Categorías
- **Errores transitorios:** timeouts, 5xx, rate limits → reintentar.
- **Errores permanentes:** schema mismatch, campo obligatorio vacío → marcar y revisar.

### 8.2 Reintento
- `publish_attempts` en Sheets y backoff simple (ej.: reintentar hasta N veces).
- Registrar `last_publish_error` para diagnóstico.
- (Opcional) mover a una “dead letter” si supera N.

---

## 9) Seguridad y privacidad (PII)

- No incluir API keys en prompts ni en celdas visibles.
- Guardar secrets en:
  - `PropertiesService` (Apps Script) o
  - variables seguras en Pabbly.
- Minimizar logs con PII (si guardas logs, evita duplicar datos sensibles).

---

## 10) Plan de implementación por fases

### Fase 1 — MVP (1 tabla)
- Stackby: `Solicitudes_PreMatricula` con `external_id`.
- Sheets: `raw_getformly` + columnas de control.
- Apps Script: publisher por tiempo (webhook).
- Pabbly: webhook → search → create/update.

### Fase 2 — Normalización y control de cambios
- Añadir `payload_hash` y `source_payload_hash`.
- Solo actualizar si el hash cambia (reduce ruido y llamadas).

### Fase 3 — Modelo relacional (Alumnos)
- Tabla `Alumnos` (upsert por `email_key`).
- Tabla `Solicitudes_PreMatricula` enlaza con `Alumnos` por `row_id`.
- Preparar futuras tablas: `Inscripciones`, `Pagos`, etc.

---

## 11) Apéndice A — Payload JSON recomendado (ejemplo)

```json
{
  "external_id": "deca_8c2f...",
  "source": "getformly",
  "submitted_at": "2026-02-01T10:12:00Z",
  "email": "alumno@dominio.com",
  "email_key": "alumno@dominio.com",
  "nombre": "Nombre Apellido",
  "telefono": "+34...",
  "programa": "Programa X",
  "sede": "Lisboa",
  "ingested_at": "2026-02-01T10:13:10Z"
}
```

---

## 12) Apéndice B — Pseudocódigo del Publisher (Apps Script)

```text
sync():
  acquire lock
  rows = read raw_getformly where published_at is empty
  for row in rows up to MAX_PER_RUN:
    if !isComplete(row): continue
    if external_id empty: external_id = computeExternalId(row); write
    payload = buildPayload(row)
    resp = POST(PABBLY_WEBHOOK, payload)
    if resp ok:
      mark published_at, attempts++
    else:
      attempts++, last_publish_error = resp.error
  release lock
```

---

## 13) Criterios de éxito (MVP)
- 0 bucles (sin ejecuciones infinitas).
- 0 duplicados en Stackby (mismo `external_id` = 1 registro).
- >99% de envíos completos en Stackby.
- Reintentos automáticos tras caída de Stackby sin pérdida de datos.

---

**Fin del documento.**
