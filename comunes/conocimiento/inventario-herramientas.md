# Instituto Teología (DECA) — Inventario de herramientas y procesos operativos

**Fecha:** 2026-02-01  
**Alcance:** Inventario de software y procesos del día a día según lo acordado en conversación (con foco en el flujo de pre-matriculación DECA y herramientas conectadas).

---

## 1) Resumen ejecutivo

- **Captación**: Getformly → Google Sheets (buffer/staging).
- **Orquestación/Integración**: Apps Script (publisher controlado) + Pabbly Connect (consumer/orchestrator).
- **SoT**: Stackby como base consolidada y punto de verdad.
- **Docencia**: OnlineCourseHost.
- **Email marketing**: Acumbamail.
- **Pagos**: Stripe.
- **Soporte**: Moltbot (previsto/probable).
- **ERP**: Holded (próximamente).
- **Firma de contratos**: Breezedoc (posible).
- **Dev/IA**: Visual Studio Code + Claude Code (Max) + Perplexity (para research/documentación).

---

## 2) Inventario de herramientas (software)

### 2.1 Captación y entrada de datos
- **Getformly**
  - Rol: Formularios de pre-matrícula / solicitud de matrícula.
  - Salida principal: Google Sheets (respuestas).

### 2.2 Buffer / staging / operaciones
- **Google Sheets**
  - Rol: Buffer de entrada (“raw”) y staging (normalización, control de estado, “outbox”).
  - Objetivo: Resiliencia (no perder envíos ante caídas) + control de idempotencia (marcas de procesado).

### 2.3 Lógica y publicación controlada
- **Google Apps Script**
  - Rol: Publicador (polling por tiempo) que valida completitud, genera `external_id`, publica a webhook y marca estado (sin bucles).

### 2.4 Orquestación e integraciones
- **Pabbly Connect**
  - Rol: Consumidor de webhook, transformaciones, y **upsert** hacia Stackby.

### 2.5 Sistema de registro (Source of Truth)
- **Stackby**
  - Rol: Consolidación de solicitudes y, a futuro, entidades como Alumnos/Inscripciones/Pagos (según modelado).

### 2.6 Docencia y entrega
- **OnlineCourseHost**
  - Rol: Plataforma de docencia/curso online (gestión de alumnos y acceso a contenidos).

### 2.7 Comunicación y marketing
- **Acumbamail**
  - Rol: Email marketing (campañas, newsletters, automatizaciones de email).

### 2.8 Pagos
- **Stripe**
  - Rol: Cobro de matrículas/pagos online, eventos de pago, conciliación básica.

### 2.9 Soporte
- **Moltbot** (probable)
  - Rol: Canal de soporte (bot/atención), registro y clasificación de consultas.

### 2.10 ERP / administración
- **Holded** (próximamente)
  - Rol: ERP (facturación, contabilidad, clientes, etc.), dependiendo de configuración.

### 2.11 Firma y contratos
- **Breezedoc** (posible)
  - Rol: Firma de contratos/documentos vinculados a matrícula o consentimiento.

### 2.12 Desarrollo y productividad (equipo interno)
- **Visual Studio Code**
  - Rol: Entorno de trabajo (workspaces por proyectos; repositorio “Stackby” multi-proyecto).
- **Claude Code (Max)**
  - Rol: Generación de código (Apps Script), transformaciones, plantillas, documentación y corpus.
- **Perplexity**
  - Rol: Investigación con fuentes y generación de documentos Markdown para el corpus.

---

## 3) Mapa rápido del stack DECA (pre-matrícula)

**Flujo base (unidireccional para evitar bucles):**

1. **Getformly** → escribe envíos en → **Google Sheets** (raw/staging)  
2. **Apps Script** (polling + validación) → publica evento a → **Webhook Pabbly**  
3. **Pabbly Connect** → transforma y hace **upsert** → **Stackby (SoT)**

**Principio operativo:** Pabbly no debe “escuchar” actualizaciones de la misma hoja que luego se modifica para marcar estado (evita bucles).

---

## 4) Procesos del día a día (operación)

### 4.1 Pre-matrícula / solicitudes de matrícula (DECA)
- Captura de solicitud (Getformly).
- Aterrizaje en Sheets (raw).
- Validación mínima (Apps Script): email, fecha/hora, programa/curso, etc.
- Generación de `external_id` (idempotencia) y publicación webhook.
- Upsert en Stackby (crear o actualizar por `external_id`).
- Registro de estado (publicado/sincronizado/error) y reintentos.

### 4.2 Email marketing (captación y nurturing)
- Segmentación (desde Stackby o export puntual) → listas/campañas en Acumbamail.
- Envío de secuencias: confirmación de interés, recordatorios, próximas convocatorias.
- Métricas: aperturas, clics, bajas (retroalimentación para segmentación).

### 4.3 Pagos (matrícula / reservas / cuotas)
- Pago en Stripe.
- Recepción de eventos (webhooks) o consulta/export (según diseño).
- Actualización en Stackby: estado de pago, importe, fecha, referencia.
- Gestión de incidencias (pago fallido, reintento, devolución).

### 4.4 Alta en docencia (OnlineCourseHost)
- Condición de alta (en Stackby): “apto para acceso” (ej. pago confirmado, contrato firmado).
- Creación/activación de alumno en OnlineCourseHost.
- Comunicación de acceso (posible vía Acumbamail).

### 4.5 Soporte (Moltbot)
- Entrada por bot: FAQ, derivación a humano.
- Registro: email, tema, prioridad, estado.
- Enlace con Stackby para contexto (lead/alumno + estado).

### 4.6 Firma de documentos (Breezedoc)
- Envío de documento a firmar.
- Recogida de firma y estado.
- Registro en Stackby (estado + referencia del documento).

### 4.7 Administración/ERP (Holded)
- Creación de cliente/registro contable desde alumno/pago.
- Emisión de factura/recibo.
- Conciliación con Stripe (importes, fechas, devoluciones).

---

## 5) Procesos internos de mantenimiento (para que el sistema no se rompa)

- Gestión de cambios del formulario (Getformly): revisar mapping cuando cambien preguntas/columnas.
- Control de esquema y mapeos: mantener diccionario de datos por proyecto.
- Reintentos y cola: reintentar sin duplicar (upsert).
- Reconciliación programada: detectar “huecos” (Sheets que no llegaron a Stackby).
- Observabilidad: logs mínimos (sync_log) para diagnóstico.

---

## 6) Backlog de decisiones (recomendado cerrar pronto)

1) Identificador del alumno  
   - MVP: `external_id` por envío (solicitud).  
   - Fase 2: `student_id` interno estable + `email_key`.

2) Dónde vive cada “verdad”  
   - Operaciones (SoT): Stackby  
   - Marketing: Acumbamail  
   - Pagos: Stripe  
   - Contabilidad/facturación: Holded  
   - Docencia: OnlineCourseHost  
   - Soporte: Moltbot (+ tabla “Tickets” en Stackby si escala)  
   - Contratos: Breezedoc

3) Direccionalidad  
   - Evitar bidireccionalidad salvo necesidad clara (reduce bucles y deuda).

---

## 7) Anexo — Estructura de repositorio sugerida (para Claude Code)

- `generico/`  
  - `corpus/` → documentación reutilizable  
  - `plantillas/` → esqueletos (scripts, payloads, docs)  
  - `utilidades/` → scripts/herramientas

- `IITD/`  
  - `docs/` → especificaciones y decisiones del proyecto  
  - `integraciones/` → Apps Script / Pabbly / conectores  
  - `datos/` → mapeos, muestras anonimizadas, diccionario de datos

---

**Fin del documento.**
