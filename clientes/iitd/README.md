# IITD — Instituto Internacional de Teología a Distancia

Automatización de procesos académicos y administrativos del IITD.

**Cliente:** Proportione → IITD
**Contactos:** Miriam (secretaría), Josete (campus virtual/OCH)
**Inicio:** Febrero 2026

## Estado del proyecto

**23 de 52 necesidades resueltas (44.2%)** — Sprints 1-6 completados.
Camino crítico PolarDoc: **cerrado** (5/5 pasos).

Ver inventario completo en [`INVENTARIO-AUTOMATIZACIONES-IITD.md`](INVENTARIO-AUTOMATIZACIONES-IITD.md).

## Estructura

| Carpeta | Contenido |
|---------|-----------|
| `docs/informes/` | Informes de estado y libro RGPD |
| `docs/guias/` | Guías operativas para el equipo IITD |
| `docs/legal/` | Textos legales para la web (privacidad, cookies, aviso legal) |
| `docs/necesidades/` | Matriz de necesidades N01-N52 (docs antiguos, ver INVENTARIO) |
| `docs/templates-breezedoc/` | Plantillas de contratos para firma electrónica |
| `docs/manuales/` | Manuales de usuario y guía de APIs |
| `integraciones/alumnos/` | Scripts principales: calificaciones, recibos, certificados, dashboard, KPIs |
| `integraciones/apps-script/` | Google Apps Script (DECA, leads, prematrícula) |
| `integraciones/och-sync/` | Integración OnlineCourseHost (bloqueada por API limitada) |
| `integraciones/stripe-webhook/` | Webhook Stripe para pagos (Cloud Run desplegado) |
| `scripts/pdfs-y-scorms/` | Pipeline de subida de materiales educativos |
| `scripts/pabbly/` | Scripts del workflow Pabbly Connect |
| `datos/` | Exports PolarDoc, CSVs |
| `assets/` | Logos e identidad corporativa |

## Scripts principales (`integraciones/alumnos/`)

| Script | Necesidad | Función |
|--------|-----------|---------|
| `sync-sheets.mjs` | N02, N05 | Stackby ALUMNOS → Google Sheet por programa |
| `import-polar.mjs` | N07 | Importar PolarDoc xlsx → Stackby |
| `validar-datos.mjs` | N21 | Auditoría de datos: emails, duplicados, estados |
| `recibo-pdf.mjs` | N08 | Recibos PDF + Drive + Sheet |
| `certificado-pdf.mjs` | N09, N26 | Certificados multi-programa con QR + upload SiteGround |
| `calificaciones-client.mjs` | N06 | CRUD Stackby tabla CALIFICACIONES |
| `sync-calificaciones.mjs` | N06 | Sync bidireccional Sheet ↔ Stackby |
| `dashboard.mjs` | N16 | Dashboard operativo diario |
| `kpis-deca.mjs` | N19 | Funnel DECA + tasas conversión + histórico |
| `listados.mjs` | N05 | Listados por programa, filtros, CSV |
| `exportar-alumno.mjs` | N44 | Exportar datos alumno RGPD Art. 20 (JSON/CSV) |
| `rgpd-retencion.mjs` | N12 | Retención + anonimización RGPD |
| `breezedoc-enrollment.mjs` | — | Envío contratos/consentimientos e-signature |
| `google-auth.mjs` | — | Auth compartido (Service Account + ADC fallback) |
| `pxl-client.mjs` | — | Short links + QR (pxl.to) |
| `siteground-upload.mjs` | — | Upload SSH a diplomas.institutoteologia.org |
| `email-sender.mjs` | N25 | Email transaccional con templates (pendiente SMTP) |
| `contactos-client.mjs` | N24 | CRUD Stackby tabla CONTACTOS |

## Accesos

| Servicio | Credencial | Ubicación |
|----------|------------|-----------|
| Stackby API | API Key | `integraciones/alumnos/.env` |
| Google Drive/Sheets | Service Account | `integraciones/alumnos/service-account.json` |
| pxl.to | JWT Bearer | `.env` |
| BreezeDoc | OAuth2 | `.env` |
| SiteGround SSH | Key | `~/.ssh/id_siteground` |
| Stripe | API Key + Webhook Secret | GCP Secret Manager |
| Stripe Cloud Run | — | `https://iitd-stripe-webhook-621601343355.europe-west1.run.app` |
| Holded | API Key | Pendiente configurar en `.env` |
