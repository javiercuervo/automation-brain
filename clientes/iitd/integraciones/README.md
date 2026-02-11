# Integraciones IITD

Instituto Internacional de Teología a Distancia

**Estado:** 20 de 52 necesidades completadas (38.5%) — Sprints 1-5.

---

## Estructura

```
integraciones/
├── alumnos/             # Motor principal: 20+ scripts Node.js (ESM)
│   ├── alumnos-client.js          # CRUD Stackby ALUMNOS (CJS)
│   ├── calificaciones-client.mjs  # CRUD Stackby CALIFICACIONES
│   ├── google-auth.mjs            # Auth Google (SA + ADC fallback)
│   ├── sync-sheets.mjs            # Stackby → Google Sheet multi-pestaña
│   ├── sync-calificaciones.mjs    # Sheet ↔ Stackby bidireccional
│   ├── import-polar.mjs           # Importar PolarDoc xlsx → Stackby
│   ├── validar-datos.mjs          # Auditoría datos: emails, duplicados
│   ├── recibo-pdf.mjs             # Recibos PDF + Drive + Sheet
│   ├── certificado-pdf.mjs        # Certificados DECA (QR + upload SiteGround)
│   ├── dashboard.mjs              # Dashboard operativo diario
│   ├── kpis-deca.mjs              # Funnel DECA + tasas conversión
│   ├── listados.mjs               # Listados por programa, CSV
│   ├── exportar-alumno.mjs        # Portabilidad RGPD (Art. 20)
│   ├── rgpd-retencion.mjs         # Retención + anonimización RGPD
│   ├── breezedoc-enrollment.mjs   # E-signature (matrícula, convenio, RGPD)
│   ├── breezedoc-client.mjs       # Cliente BreezeDoc API
│   ├── pxl-client.mjs             # Short links + QR (pxl.to)
│   ├── siteground-upload.mjs      # Upload SSH diplomas.institutoteologia.org
│   ├── pdf-signer.mjs             # Firma digital PKCS#12 (aparcada)
│   ├── dedup-alumnos.mjs          # Deduplicación por email/DNI
│   └── assign-ids.mjs             # Asignación expedientes IITD-NNNNNN
│
├── apps-script/         # Google Apps Script
│   ├── deca/            # Publisher DECA (Sheets → Stackby + notificaciones)
│   ├── leads/           # Formulario web → Stackby (pendiente Sheet ID)
│   └── prematricula/    # Flujo prematrícula
│
├── och-sync/            # OnlineCourseHost (bloqueado — API limitada)
│   ├── och-client.js
│   ├── stackby-client.js
│   └── sync-enrollments.js
│
└── stripe-webhook/      # Cloud Run — webhook Stripe para pagos
    ├── stripe-webhook-handler.js  # Handler 4 eventos Stripe
    ├── server.js                  # Express (port 8080)
    ├── Dockerfile                 # node:18-alpine
    └── cloudbuild.yaml            # Deploy docs + secrets
```

## Flujos activos en Pabbly Connect

No duplicar:

| Flujo | Función |
|-------|---------|
| 04 email a alumnos@ | Email tras registro DECA |
| 01 DECA - correo alumno aceptado | Email al aceptar alumno |
| 09 Formulario web a Acumba y correo | Formulario → Acumbamail + email |
| 07 Nuevo estudiante OCH a Acumba | Estudiante OCH → Acumbamail |
| 08 Lead en OCH a Acumba | Lead OCH → Acumbamail |

## Servicios desplegados

| Servicio | URL | Región |
|----------|-----|--------|
| Stripe Webhook | `https://iitd-stripe-webhook-621601343355.europe-west1.run.app` | europe-west1 |

## Credenciales

Todas en `alumnos/.env` (no versionado). Ver `stripe-webhook/.env.example` para el webhook.
