# IITD — Instituto Internacional de Teología a Distancia

Automatización de procesos académicos y administrativos del IITD.

**Cliente:** Proportione → IITD
**Contactos:** Miriam (secretaría), Josete (campus virtual/OCH)
**Inicio:** Febrero 2026

## Estado del proyecto

**19 de 46 necesidades resueltas** (Sprints 1-4 completados).
Camino crítico PolarDoc: **cerrado** (5/5 pasos).

Ver estado detallado en [`docs/informes/informe-estado-feb2026.md`](docs/informes/informe-estado-feb2026.md).

## Estructura

| Carpeta | Contenido |
|---------|-----------|
| `docs/informes/` | Informes de estado y libro RGPD |
| `docs/guias/` | Guías operativas para el equipo IITD |
| `docs/legal/` | Textos legales para la web (privacidad, cookies, aviso legal) |
| `docs/necesidades/` | Matriz de necesidades N01-N46, roadmap |
| `docs/templates-breezedoc/` | Plantillas de contratos para firma electrónica |
| `docs/manuales/` | Manuales de usuario y guía de APIs |
| `integraciones/alumnos/` | Scripts principales: calificaciones, recibos, certificados, dashboard, KPIs |
| `integraciones/apps-script/` | Google Apps Script (DECA, leads, prematrícula) |
| `integraciones/och-sync/` | Integración OnlineCourseHost (bloqueada por API limitada) |
| `integraciones/stripe-webhook/` | Webhook Stripe para pagos |
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
| `certificado-pdf.mjs` | N09 | Certificados DECA con QR + upload SiteGround |
| `calificaciones-client.mjs` | N06 | CRUD Stackby tabla CALIFICACIONES |
| `sync-calificaciones.mjs` | N06 | Sync bidireccional Sheet ↔ Stackby |
| `dashboard.mjs` | N16 | Dashboard operativo diario |
| `kpis-deca.mjs` | N19 | Funnel DECA + tasas conversión + histórico |
| `listados.mjs` | N05 | Listados por programa, filtros, CSV |
| `breezedoc-enrollment.mjs` | — | Envío contratos/consentimientos e-signature |
| `google-auth.mjs` | — | Auth compartido (Service Account + ADC fallback) |
| `pxl-client.mjs` | — | Short links + QR (pxl.to) |
| `siteground-upload.mjs` | — | Upload SSH a diplomas.institutoteologia.org |

## Accesos

| Servicio | Credencial | Ubicación |
|----------|------------|-----------|
| Stackby API | API Key | `integraciones/alumnos/.env` |
| Google Drive/Sheets | Service Account | `integraciones/alumnos/service-account.json` |
| pxl.to | JWT Bearer | `.env` |
| BreezeDoc | OAuth2 | `.env` |
| SiteGround SSH | Key | `~/.ssh/id_siteground` |
| Holded | API Key | Pendiente configurar en `.env` |
