# Estado del Proyecto IITD - 14 Febrero 2026

**Fecha snapshot:** 14 febrero 2026
**Responsable:** Javier Cuervo / Proportione
**Versión:** 2.0

---

## Resumen Ejecutivo

| Métrica | Valor | Cambio vs 13 Feb |
|---------|-------|-------------------|
| **Automatizaciones completadas** | 26/52 (50%) | Sin cambio |
| **En implementación** | 5 (9.6%) | Sin cambio |
| **Guías entregadas** | 2 (3.8%) | Sin cambio |
| **Pendientes** | 14 (26.9%) | Sin cambio |
| **Bloqueadas** | 5 (9.6%) | Sin cambio |
| **Issues QA resueltos** | 11/12 (92%) | +2 (#10, #11) |
| **Tests pasados** | 50/50 | Sin cambio |
| **Alumnos en Stackby** | 1.585 | Sin cambio |

---

## Trabajo realizado 14 Feb 2026

### Issue #10: Columnas Nombre/Apellidos en CALIFICACIONES
- Columnas "Nombre" y "Apellidos" (Short Text) creadas en Stackby via Playwright UI
- `calificaciones-client.mjs`: parseFields() + toStackbyFields() actualizados
- `sync-calificaciones.mjs`: syncToStackby() ahora envía nombre/apellidos
- Filas existentes pobladas con datos de ALUMNOS (API rowupdate)
- Sync reverso ejecutado: Sheet "Calificaciones IITD" actualizado

### Issue #11: Documentación columnas Stackby
- Sección 2.2 (Sheet Calificaciones): corregido a 10 columnas reales
- Sección 3.3 (Stackby CALIFICACIONES): documentado 13 columnas reales
- Sección 4.3 (Diploma): programas falsos → programas reales
- Guía validación actualizada a v2.1

### Commit
- `7d27b9c` — fix(iitd): resolve QA issues #10 and #11

---

## Estado de las 52 Necesidades (N01-N52)

### GRUPO A: Inscripciones y Captura de Datos (7)

| N | Necesidad | Estado | Detalle |
|---|-----------|--------|---------|
| N01 | Notificación alta alumno → secretaría | 🔧 | Apps Script publisher.gs listo. Falta: deploy final + config email |
| N02 | Datos alumnos completos y descargables | ✅ | Stackby ALUMNOS (1.585 reg) + sync-sheets.mjs |
| N03 | Formulario contacto OCH → Miriam | 📋 | Guía reenvío Gmail entregada |
| N04 | Asignación automática nº expediente | ✅ | Formato IITD-NNNNNN en publisher.gs |
| N14 | Captura leads web → Stackby | 🔧 | Código listo. Falta: Sheet ID del formulario (Sonia) |
| N20 | ID único alumno + deduplicación | ✅ | Detección por email/DNI en import-polar.mjs |
| N47 | Pipeline PDFs/Scorms → FlipBooklets | 🔧 | Operativo. Última ejecución: 12 feb (51 items) |

### GRUPO B: Gestión de Alumnos y Expedientes (7)

| N | Necesidad | Estado | Detalle |
|---|-----------|--------|---------|
| N05 | Listados por curso para profesores | ✅ | Panel IITD multi-pestaña + listados.mjs |
| N06 | Calificaciones y gestión notas | ✅ | 13 cols Stackby + sync bidireccional + Sheets profesores (3) |
| N07 | Expediente completo en BD | ✅ | 1.583 alumnos importados de PolarDoc |
| N21 | Validación datos migrados | ✅ | validar-datos.mjs (auditoría automática) |
| N50 | Panel IITD Multi-Pestaña | ✅ | 14 pestañas: 6 programas + 3 datos + 5 operativas |
| N51 | Sistema Recibos PDF | ✅ | recibo-pdf.mjs + upload Drive (Apps Script proxy) |
| N52 | Deduplicación avanzada | ✅ | Integrado en import-polar.mjs y publisher.gs |

### GRUPO C: Certificados y Documentos (6)

| N | Necesidad | Estado | Detalle |
|---|-----------|--------|---------|
| N08 | Recibos/facturas matrícula PDF | ✅ | recibo-pdf.mjs (= N51) |
| N09 | Certificados DECA automáticos | ✅ | certificado-pdf.mjs + QR + hash + SiteGround |
| N11 | Consentimientos RGPD separados | 📋 | Guía formularios entregada |
| N15 | Firma electrónica BreezeDoc | 🔧 | 3 templates (matrícula/convenio/RGPD). Falta: pipeline completo |
| N48 | Hosting diplomas SiteGround | ✅ | diplomas.institutoteologia.org |
| N49 | QR Codes dinámicos pxl.to | ✅ | Integrado en certificado-pdf.mjs |

### GRUPO D: Sincronizaciones y LMS (4)

| N | Necesidad | Estado | Detalle |
|---|-----------|--------|---------|
| N16 | Dashboard operativo Miriam | ✅ | dashboard.mjs (pipeline + alertas + actividad) |
| N17 | Sync actividad LMS → Stackby | 🚫 | **Bloqueado:** OCH API limitada (2 endpoints, sin progreso) |
| N19 | KPIs DECA automáticos | ✅ | kpis-deca.mjs (funnel + conversión + split) |
| N22 | Notificación preguntas alumno → profesor | 🚫 | **Bloqueado:** OCH sin webhooks foro |

### GRUPO E: Cumplimiento RGPD (10)

| N | Necesidad | Estado | Detalle |
|---|-----------|--------|---------|
| N12 | Retención y borrado datos RGPD | ✅ | rgpd-retencion.mjs (plazos: baja 5a, solicitud 1a, fiscal 4a) |
| N13 | Inventario SaaS + contratos DPA | ✅ | Stackby INVENTARIO_SAAS (14 cols, 12 herramientas) |
| N23 | Minimización DNI | 🚫 | **Bloqueado:** decisión legal/estratégica pendiente |
| N40 | Footer RGPD en emails | ✅ | Integrado en templates email |
| N41 | Banner cookies web | ✅ | Complianz plugin WordPress |
| N42 | Páginas legales web | ✅ | Aviso Legal + Privacidad + Cookies (actualizadas) |
| N43 | Portal ARCO+ derechos RGPD | ✅ | /ejercicio-derechos-rgpd/ (page 1219) |
| N44 | Exportación datos (portabilidad) | ✅ | exportar-alumno.mjs (JSON/CSV, Art. 20 RGPD) |
| N45 | Audit logging + notificación brechas | ⏳ | Tabla AUDIT_LOG + detección anomalías + plantilla AEPD |
| N46 | Caducidad grabaciones + control acceso | ⏳ | Permisos por curso + expiración automática |

### GRUPO F: Pagos y Facturación (3)

| N | Necesidad | Estado | Detalle |
|---|-----------|--------|---------|
| N10 | Facturación centros asociados | ⏳ | Facturas PDF + tabla productos (requiere Gema) |
| N18 | Migración Golden Soft → Holded | ⏳ | **URGENTE:** caduca junio 2026. Requiere Gema |
| N36 | Stripe webhook → Stackby | ✅ | Cloud Run europe-west1 (checkout + invoice + payment) |

### GRUPO G: Marketing y Comunicación (12)

| N | Necesidad | Estado | Detalle |
|---|-----------|--------|---------|
| N24 | Tabla contactos CRM | ✅ | Stackby CONTACTOS (8 cols) + contactos-client.mjs |
| N25 | Emails automáticos transaccionales | 🔧 | email-sender.mjs + 4 plantillas. SMTP en .env, probar envío real |
| N26 | Diplomas multi-programa | ✅ | certificado-pdf.mjs (DECA IP/ESO + genérico) |
| N27 | Notificaciones comunidad OCH | 🚫 | **Bloqueado:** OCH sin webhooks comunidad |
| N28 | Grabaciones: acceso + consentimiento | ⏳ | Almacenamiento + control acceso + consentimiento promocional |
| N29 | Flujo publicación cursos + revisión COEO | ⏳ | Workflow Stackby + checklist SEO |
| N30 | Bundles y pricing coherente | ⏳ | Tabla productos Stackby + reglas precios |
| N31 | Vídeo por programa + multidioma | ⏳ | Gestión subtítulos + versiones por idioma |
| N32 | Onboarding curso gratuito desde blog | ⏳ | UTM + auto-enrollment + email nurturing |
| N33 | Upsell tutorías al finalizar curso | ⏳ | Email trigger post-curso (depende N17) |
| N34 | Suscripción Acumbamail + consentimiento | ⏳ | Doble opt-in + trazabilidad (parcial existente) |
| N35 | Respuesta dudas con IA + escalado | ⏳ | Ticket Stackby + IA first-level + escalado humano |
| N37 | Campañas Google Grants | ⏳ | Import métricas Ads → correlación matrículas |
| N38 | Gestión centros asociados (datos) | ⏳ | Accesos limitados + cláusulas confidencialidad |
| N39 | Foros/comunidad LMS privacidad | 🚫 | **Bloqueado:** decisión dirección + limitaciones OCH |

---

## Totales por estado

| Estado | Cant. | % | Necesidades |
|--------|-------|---|-------------|
| ✅ Hecho | 26 | 50.0% | N02,N04,N05,N06,N07,N08,N09,N12,N13,N16,N19,N20,N21,N24,N26,N36,N40,N41,N42,N43,N44,N48,N49,N50,N51,N52 |
| 🔧 Implementado | 5 | 9.6% | N01, N14, N15, N25, N47 |
| 📋 Guía entregada | 2 | 3.8% | N03, N11 |
| ⏳ Pendiente | 14 | 26.9% | N10, N18, N28, N29, N30, N31, N32, N33, N34, N35, N37, N38, N45, N46 |
| 🚫 Bloqueado | 5 | 9.6% | N17, N22, N23, N27, N39 |

---

## Issues QA Mayte — 11/12 resueltos (92%)

| # | Título | Estado |
|---|--------|--------|
| 1 | Accesos Mayte | ✅ 13 feb |
| 2 | Dashboard y KPIs DECA | ✅ 13 feb |
| 3 | Enlaces Recibos/Certificados | ✅ 13 feb |
| 4 | BreezeDoc templates | ✅ 13 feb |
| 5 | PDFs ejemplo | ✅ 13 feb |
| 6 | Formulario ARCO+ | ✅ 13 feb |
| 7 | ARCO+ responsive | ✅ 13 feb |
| 8 | Cookies formato | ✅ 13 feb |
| 9 | DNS diplomas | ✅ 13 feb |
| 10 | Columnas Nombre/Apellidos | ✅ 14 feb |
| 11 | Docs columnas Stackby | ✅ 14 feb |
| 12 | Migración Holded | ⬚ Pendiente (mayo 2026) |

---

## Infraestructura desplegada

| Componente | URL / Ubicación | Estado |
|------------|-----------------|--------|
| Web IITD | institutoteologia.org | ✅ Producción |
| Stripe Webhook | iitd-stripe-webhook-*.europe-west1.run.app | ✅ Producción |
| Diplomas | diplomas.institutoteologia.org | ✅ DNS + HTTPS OK |
| Short URLs | a.institutoteologia.org (pxl.to) | ✅ Producción |
| PDFs online | pdf.proportione.com (FlipBooklets) | ✅ Producción |
| SCORMs | scorm.institutoteologia.org (SiteGround) | ✅ Producción |
| Panel IITD | Google Sheet (14 pestañas) | ✅ Compartido |
| Calificaciones | Google Sheet (sync bidireccional) | ✅ Compartido |
| 3 Sheets Profesores | Avelino, Javier S., Antonio | ✅ Compartidos |
| Stackby | 10 tablas (ALUMNOS, CALIFICACIONES, etc.) | ✅ Producción |
| Drive Upload Proxy | Apps Script como administracion@ | ✅ Producción |
| GCP Project | automation-brain (621601343355) | ✅ Activo |

---

## Accesos clave

| Recurso | Credenciales | Ubicación |
|---------|-------------|-----------|
| Stackby API | API Key en .env | STACKBY_API_KEY |
| Google APIs | Service Account (service-account.json) | SA + fallback ADC |
| SSH SiteGround | ~/.ssh/id_siteground | Sin passphrase |
| FlipBooklets | javier.cuervo@proportione.com | En .env |
| WordPress Admin | institutoteologia.org/proportione/ | En .env |
| SMTP | notificaciones@institutoteologia.org | App Password en .env |
| Stripe | Webhook secret en GCP Secret Manager | whsec_* |
| BreezeDoc | OAuth2 (javier.cuervo@proportione.com) | En .env |
| pxl.to | Bearer JWT | PXL_API_TOKEN en .env |

---

## Estructura del repositorio (reorganizado 13 feb)

```
clientes/iitd/integraciones/alumnos/
├── .env                          # Variables de entorno
├── compartido/                   # Clientes y utils
│   ├── google-auth.mjs           # Auth SA + fallback ADC
│   ├── alumnos-client.js         # CRUD Stackby ALUMNOS
│   ├── calificaciones-client.mjs # CRUD Stackby CALIFICACIONES (13 cols)
│   ├── contactos-client.mjs      # CRUD Stackby CONTACTOS
│   ├── breezedoc-client.mjs      # BreezeDoc e-signature API
│   ├── pxl-client.mjs            # pxl.to short links + QR
│   ├── email-sender.mjs          # Email transaccional + plantillas
│   └── siteground-upload.mjs     # Upload SSH/rsync
├── sincronizacion/               # Sync scripts
│   ├── sync-sheets.mjs           # Stackby → Panel IITD (14 tabs)
│   ├── sync-calificaciones.mjs   # Sheet ↔ Stackby grades
│   └── sheets-profesores.mjs     # Sheets individuales profesores
├── generacion/                   # PDF generation
│   ├── recibo-pdf.mjs            # Recibos + upload Drive
│   ├── certificado-pdf.mjs       # Certificados + QR + SiteGround
│   ├── pdf-signer.mjs            # Firma digital (APARCADA)
│   └── breezedoc-enrollment.mjs  # Envío contratos e-signature
├── datos/                        # Import/export/audit
│   ├── import-polar.mjs          # Import PolarDoc → Stackby
│   ├── listados.mjs              # Listados CSV
│   ├── dedup-alumnos.mjs         # Deduplicación
│   ├── assign-ids.mjs            # Asignación expedientes
│   ├── validar-datos.mjs         # Auditoría datos
│   └── exportar-alumno.mjs       # RGPD Art. 20 export
└── operaciones/                  # Admin/dashboard
    ├── dashboard.mjs             # Dashboard operativo
    ├── kpis-deca.mjs             # Funnel DECA
    ├── rgpd-retencion.mjs        # Retención + anonimización
    └── reorganizar-drive.mjs     # Organización carpetas
```

---

## Próximos pasos

### Inmediato (14 feb)
1. **N25**: Probar envío email real (SMTP ya configurado)
2. **N29**: Implementar flujo publicación cursos con revisión COEO

### Corto plazo (feb-mar)
3. N30: Bundles y pricing
4. N34: Suscripción Acumbamail con consentimiento
5. N32: Onboarding curso gratuito

### Urgente (antes mayo 2026)
6. **N18**: Migración Golden Soft → Holded (coordinar Gema)

### Bloqueados (esperando OCH / decisiones)
- N17, N22, N27, N39: Limitaciones API OCH
- N23: Decisión legal DNI

---

**Generado por:** Javier Cuervo / Proportione
**Fecha:** 14 febrero 2026
**Próxima actualización:** 21 febrero 2026
