# INVENTARIO DE AUTOMATIZACIONES IITD

**Fecha:** 11 de febrero de 2026
**Proyecto:** Instituto Internacional de Teología a Distancia
**Total de Necesidades:** 52 (N01-N52)
**Origen:** Acta reunión 6 febrero 2026 + Automatizaciones adicionales

---

## Resumen Ejecutivo

| Estado | Descripción | Cantidad | % |
|--------|-------------|----------|---|
| ✅ | Hecho (Funcional y en uso) | 20 | 38.5% |
| 🔧 | Implementado (Código listo, pendiente deploy/config) | 3 | 5.8% |
| 📋 | Guía entregada (Documentación entregada, acción manual) | 3 | 5.8% |
| ⏳ | Pendiente (No iniciado) | 21 | 40.4% |
| 🚫 | Bloqueado (Limitaciones externas) | 5 | 9.6% |
| **TOTAL** | | **52** | **100%** |

---

## GRUPO A: Inscripciones y Captura de Datos

| Código | Necesidad | Estado | Qué hace | Cómo probarla | Archivos clave |
|--------|-----------|--------|----------|---------------|----------------|
| **N01** | Notificación alta/enrolamiento a secretaría | 🔧 | Envía email automático cuando hay inscripción DECA nueva | 1. Rellenar formulario DECA en web<br>2. Esperar 5 min (trigger Apps Script)<br>3. Verificar email recibido en alumnos@institutoteologia.org | `/integraciones/apps-script/deca/publisher.gs`<br>`/workflows/wf-001-deca-inscripcion.md` |
| **N02** | Datos de alumnos completos y descargables | ✅ | Tabla ALUMNOS en Stackby (1.585 registros) + sincronización a Google Sheet "Panel IITD" | 1. Abrir Stackby → ALUMNOS<br>2. Verificar datos completos<br>3. `node sync-sheets.mjs` para actualizar Sheet | `/integraciones/alumnos/sync-sheets.mjs`<br>`/integraciones/alumnos/alumnos-client.js` |
| **N03** | Formulario contacto OCH llegue a Miriam | 📋 | Reenvío automático de emails de OCH a Miriam | **Manual:** Configurar reenvío Gmail según guía | `/docs/guias/reenvio-contacto-och.md` |
| **N04** | Asignación automática nº expediente | ✅ | Genera ID único formato IITD-110001+ para cada alumno nuevo | 1. Crear nuevo alumno (marcar "Sí" en Sheet)<br>2. Verificar columna "Nº Expediente" en Stackby<br>3. Formato: IITD-NNNNNN (6 dígitos) | `/integraciones/apps-script/deca/publisher.gs` |
| **N14** | Captura automática de leads web en Stackby | 🔧 | Sincroniza formularios de contacto web a tabla LEADS de Stackby | Pendiente: Sheet ID del formulario web (Sonia) | `/integraciones/apps-script/leads/publisher_leads.gs` |
| **N20** | Identificador único de alumno + deduplicación | ✅ | Sistema de IDs únicos + detección de duplicados por email/DNI | 1. Intentar crear alumno duplicado (mismo email)<br>2. Verifica: sistema detecta y actualiza en vez de duplicar | `/integraciones/alumnos/import-polar.mjs` |
| **N47** | Pipeline PDFs/Scorms → FlipBooklets | 🔧 | Automatiza descarga de Drive + subida a FlipBooklets.com y SiteGround | 1. `cd scripts/pdfs-y-scorms`<br>2. `node pipeline.mjs pdfs` → `node upload.mjs`<br>3. `node pipeline.mjs scorms` → `node pipeline.mjs scorm-upload` | `/scripts/pdfs-y-scorms/pipeline.mjs`<br>`/scripts/pdfs-y-scorms/upload.mjs` |

---

## GRUPO B: Gestión de Alumnos y Expedientes

| Código | Necesidad | Estado | Qué hace | Cómo probarla | Archivos clave |
|--------|-----------|--------|----------|---------------|----------------|
| **N05** | Listados de alumnos por curso para profesores | ✅ | Google Sheet "Panel IITD" con pestañas por programa + listados CSV | 1. Abrir Sheet "Panel IITD"<br>2. Ver pestañas por programa<br>3. `node listados.mjs --programa DECA --csv` | `/integraciones/alumnos/sync-sheets.mjs`<br>`/integraciones/alumnos/listados.mjs` |
| **N06** | Calificaciones numéricas y gestión de notas | ✅ | Tabla CALIFICACIONES en Stackby (11 columnas) + sync bidireccional con Sheet "Calificaciones IITD" (3.573 filas) | 1. `node sync-calificaciones.mjs --dry-run`<br>2. `node calificaciones-client.mjs find alumno@email.com`<br>3. `node sync-calificaciones.mjs` (Sheet → Stackby) | `/integraciones/alumnos/calificaciones-client.mjs`<br>`/integraciones/alumnos/sync-calificaciones.mjs` |
| **N07** | Expediente académico completo en base de datos | ✅ | 1.583 alumnos activos importados de PolarDoc a Stackby | 1. Verificar Stackby tabla ALUMNOS<br>2. Total registros: 1.583+<br>3. Filtro: matriculados desde 2020 | `/integraciones/alumnos/import-polar.mjs` |
| **N21** | Validación de datos migrados | ✅ | Auditoría automática: emails, duplicados, estados, campos vacíos | 1. `node validar-datos.mjs`<br>2. `node validar-datos.mjs --sheet` (escribe pestaña Validación)<br>3. `node validar-datos.mjs --csv` | `/integraciones/alumnos/validar-datos.mjs` |
| **N50** | Panel IITD Multi-Pestaña | ✅ | Dashboard con 9+ pestañas (programas, resumen, recibos, certificados, dashboard, KPIs, validación) | 1. Abrir Sheet "Panel IITD"<br>2. Navegar pestañas<br>3. `node sync-sheets.mjs` para actualizar | `/integraciones/alumnos/sync-sheets.mjs` |
| **N51** | Sistema de Recibos PDF | ✅ | Genera recibos de matrícula en PDF + sube a Drive + registra en Sheet | 1. `node recibo-pdf.mjs --email alumno@email.com --upload`<br>2. Verificar PDF en Drive carpeta "Recibos IITD"<br>3. Ver registro en Sheet pestaña "Recibos" | `/integraciones/alumnos/recibo-pdf.mjs` |
| **N52** | Deduplicación Avanzada | ✅ | Prevención de duplicados con detección por email, DNI, nombres | Integrado en import-polar.mjs y publisher.gs | Implementado en múltiples scripts |

---

## GRUPO C: Certificados y Documentos

| Código | Necesidad | Estado | Qué hace | Cómo probarla | Archivos clave |
|--------|-----------|--------|----------|---------------|----------------|
| **N08** | Recibos y facturas de matrícula (PDF automático) | ✅ | Genera recibos PDF con datos IITD + sube a Drive | Ver N51 (mismo sistema) | `/integraciones/alumnos/recibo-pdf.mjs` |
| **N09** | Certificados DECA automáticos | ✅ | Genera certificados académicos y diplomas con QR + hash de verificación + upload a SiteGround | 1. `node certificado-pdf.mjs --email alumno@email.com --upload`<br>2. Verificar PDF generado<br>3. URL: diplomas.institutoteologia.org/{expediente}.pdf<br>4. Escanear QR → descarga PDF | `/integraciones/alumnos/certificado-pdf.mjs`<br>`/integraciones/alumnos/siteground-upload.mjs` |
| **N11** | Separación de consentimientos RGPD en formularios | 📋 | Guía de checkboxes separados para consentimientos en formularios web | **Manual:** Modificar formularios WordPress según guía | `/docs/guias/rgpd-formularios.md` |
| **N15** | Firma electrónica de contratos (BreezeDoc) | 🔧 | Envío de contratos de matrícula, convenio y RGPD para e-signature | 1. `node breezedoc-enrollment.mjs --email alumno@email.com --template matricula`<br>2. Alumno recibe email con documento<br>3. Templates: matricula, convenio, rgpd | `/integraciones/alumnos/breezedoc-enrollment.mjs`<br>`/integraciones/alumnos/breezedoc-client.mjs` |
| **N48** | Infraestructura Hosting Diplomas | ✅ | Subdominio diplomas.institutoteologia.org para hosting certificados | SSH/rsync a SiteGround | `/integraciones/alumnos/siteground-upload.mjs` |
| **N49** | Sistema QR Codes Dinámicos | ✅ | QR codes con pxl.to para verificación de diplomas | Integrado en certificado-pdf.mjs | `/integraciones/alumnos/pxl-client.mjs` |

---

## GRUPO D: Sincronizaciones y LMS

| Código | Necesidad | Estado | Qué hace | Cómo probarla | Archivos clave |
|--------|-----------|--------|----------|---------------|----------------|
| **N16** | Panel de control operativo diario para Miriam | ✅ | Dashboard: pipeline alumnos, alertas (>7d solicitud, >14d sin pago), actividad reciente | 1. `node dashboard.mjs --dry-run`<br>2. `node dashboard.mjs` (escribe pestaña Dashboard) | `/integraciones/alumnos/dashboard.mjs` |
| **N17** | Sincronización de actividad del LMS con Stackby | 🚫 | Sincroniza matrículas y progreso desde OnlineCourseHost a Stackby | **Bloqueado:** API OCH limitada (solo 2 endpoints), sin token disponible | `/integraciones/och-sync/` |
| **N19** | KPIs DECA automáticos | ✅ | Funnel DECA, tasas conversión, split por variante, histórico | 1. `node kpis-deca.mjs --dry-run`<br>2. `node kpis-deca.mjs` (escribe pestaña KPIs DECA) | `/integraciones/alumnos/kpis-deca.mjs` |
| **N22** | Notificación de preguntas de alumno al profesor | 🚫 | Alertas cuando alumno hace pregunta en foro LMS | **Bloqueado:** OCH no soporta webhooks de foros | (Limitación OCH) |

---

## GRUPO E: Cumplimiento RGPD

| Código | Necesidad | Estado | Qué hace | Cómo probarla | Archivos clave |
|--------|-----------|--------|----------|---------------|----------------|
| **N12** | Política de conservación y borrado de datos RGPD | ✅ | Informe retención + anonimización automática según plazos RGPD (baja 5a, solicitud 1a, fiscal 4a) | 1. `node rgpd-retencion.mjs` (informe consola)<br>2. `node rgpd-retencion.mjs --sheet` (pestaña Panel IITD)<br>3. `node rgpd-retencion.mjs --purge --dry-run` (preview)<br>4. `node rgpd-retencion.mjs --purge --confirm` (ejecutar) | `/integraciones/alumnos/rgpd-retencion.mjs` |
| **N13** | Inventario de herramientas SaaS y contratos DPA | ✅ | Tabla INVENTARIO_SAAS en Stackby: 14 columnas, 12 herramientas pre-pobladas (Stackby, OCH, Google, Stripe, BreezeDoc, pxl.to, Acumbamail, FlipBooklets, SiteGround, Holded, Pabbly, WordPress) | 1. Abrir Stackby → INVENTARIO_SAAS<br>2. Verificar 12 herramientas<br>3. Completar: Coste, Fecha DPA, Renovación | Tabla Stackby `tbx3UGrWC0XTA5Rd2e` |
| **N23** | Minimización del uso del DNI | 🚫 | Reducir campos DNI en formularios/registros | **Bloqueado:** Requiere decisión dirección + asesor legal | (Decisión estratégica pendiente) |
| **N40** | Incluir texto legal RGPD en todos los emails automáticos | ✅ | Footer automático con aviso legal RGPD en emails | Integrado en templates de email de los scripts | Implementado en scripts de email |
| **N41** | Banner de cookies en la web | ⏳ | Banner consentimiento cookies en institutoteologia.org | **Pendiente Sprint 5** | (Por implementar) |
| **N42** | Páginas legales en la web (Privacidad, Aviso Legal, Cookies) | 📋 | Textos legales entregados para publicación web | **Manual:** Publicar en WordPress | `/docs/legal/politica-privacidad.md`<br>`/docs/legal/aviso-legal.md`<br>`/docs/legal/politica-cookies.md` |
| **N43** | Portal para ejercicio de derechos RGPD (ARCO+) | ⏳ | Formulario web para ejercer derechos RGPD | **Pendiente Sprint 5** | (Por implementar) |
| **N44** | Exportación de datos de alumno (portabilidad RGPD) | ✅ | Exporta datos ALUMNOS + CALIFICACIONES en JSON y/o CSV (Art. 20 RGPD) | 1. `node exportar-alumno.mjs --email alumno@email.com` (JSON)<br>2. `node exportar-alumno.mjs --email alumno@email.com --csv`<br>3. `node exportar-alumno.mjs --email alumno@email.com --all` (archivos) | `/integraciones/alumnos/exportar-alumno.mjs` |
| **N45** | Registro de auditoría y notificación de brechas de seguridad | ⏳ | Sistema de logging + alertas de brechas | **Pendiente** | (Por implementar) |
| **N46** | Caducidad y control de acceso a grabaciones | ⏳ | Gestión automática de acceso temporal a grabaciones | **Pendiente** | (Por implementar) |

---

## GRUPO F: Pagos y Facturación

| Código | Necesidad | Estado | Qué hace | Cómo probarla | Archivos clave |
|--------|-----------|--------|----------|---------------|----------------|
| **N10** | Facturación a centros asociados | ⏳ | Generación automática de facturas para centros | **Pendiente** | (Por implementar) |
| **N18** | Migración Golden Soft → Holded (caduca junio 2026) | ⏳ | Migrar contabilidad de Golden Soft a Holded | **Pospuesto:** Gema no disponible<br>**Urgente:** Caduca junio 2026 | (Sprint futuro) |
| **N36** | Pago Stripe → matrícula → factura Holded (pipeline completo) | ✅ | Webhook Stripe en Cloud Run: recibe eventos checkout.session.completed, invoice.paid, payment_intent.succeeded → actualiza Stackby | 1. GET `https://iitd-stripe-webhook-621601343355.europe-west1.run.app/health`<br>2. Verificar Stripe Dashboard → Webhooks<br>3. `stripe trigger checkout.session.completed` | `/integraciones/stripe-webhook/`<br>Cloud Run: `iitd-stripe-webhook` |

---

## GRUPO G: Marketing y Comunicación

| Código | Necesidad | Estado | Qué hace | Cómo probarla | Archivos clave |
|--------|-----------|--------|----------|---------------|----------------|
| **N24** | Tabla de contactos institucionales (CRM simple) | ⏳ | Tabla Stackby para gestionar contactos externos | **Pendiente** | (Por implementar) |
| **N25** | Emails automáticos (recepción trabajos, notas, recordatorios) | ⏳ | Sistema de notificaciones automáticas a alumnos | **Pendiente** | (Por implementar) |
| **N26** | Diplomas de otros programas + descarga en OCH | ⏳ | Extender generador de certificados a otros programas | **Pendiente** | (Usar base de certificado-pdf.mjs) |
| **N27** | Notificaciones de publicaciones en la comunidad OCH | 🚫 | Alertas nuevas publicaciones en comunidad LMS | **Bloqueado:** OCH no soporta webhooks de comunidad | (Limitación OCH) |
| **N28** | Grabaciones: control de acceso y consentimiento promocional | ⏳ | Gestión de permisos de grabaciones | **Pendiente** | (Por implementar) |
| **N29** | Flujo de publicación de cursos con revisión COEO | ⏳ | Workflow aprobación contenidos antes de publicar | **Pendiente** | (Por implementar) |
| **N30** | Paquetes de cursos y precios coherentes | ⏳ | Sistema de bundles y pricing dinámico | **Pendiente** | (Por implementar) |
| **N31** | Vídeo por programa y gestión multidioma | ⏳ | Biblioteca de vídeos organizados por idioma | **Pendiente** | (Por implementar) |
| **N32** | Onboarding del curso gratuito desde el blog | ⏳ | Funnel automático blog → curso gratuito | **Pendiente** | (Por implementar) |
| **N33** | Oferta de tutorías al finalizar un curso | ⏳ | Email automático ofreciendo tutorías post-curso | **Pendiente** | (Por implementar) |
| **N34** | Suscripción a newsletter con consentimiento trazable | ⏳ | Sistema de suscripción newsletter con doble opt-in | **Pendiente** | (Por implementar) |
| **N35** | Respuesta a dudas con IA + escalado a personas | ⏳ | Chatbot IA + derivación a humano si necesario | **Pendiente** | (Por implementar) |
| **N37** | Campañas Google Grants con seguimiento | ⏳ | Automatización campañas Google Ads + métricas | **Pendiente** | (Por implementar) |
| **N38** | Gestión de centros asociados (acceso a datos, cesiones) | ⏳ | Portal para centros con datos de sus alumnos | **Pendiente** | (Por implementar) |
| **N39** | Foros/comunidad en el LMS con privacidad | 🚫 | Gestión de privacidad en foros de OCH | **Bloqueado:** OCH no permite configuración avanzada | (Limitación OCH) |

---

## Desglose Detallado por Estado

### ✅ Completados (20)
N02, N04, N05, N06, N07, N08, N09, N12, N13, N16, N19, N20, N21, N36, N40, N44, N48, N49, N50, N51, N52

### 🔧 Implementados, pendiente deploy/config (3)
N01, N14, N15, N47

### 📋 Guías entregadas (3)
N03, N11, N42

### ⏳ Pendientes (21)
N10, N18, N24-N35, N37-N38, N41, N43, N45-N46

### 🚫 Bloqueados (5)
N17, N22, N23, N27, N39

---

## Notas Finales

**Automatizaciones adicionales (N47-N52):** 6 automatizaciones implementadas que no estaban en el acta original (N01-N46) pero son fundamentales para el proyecto.

**Camino crítico PolarDoc: CERRADO (100%).** Los 5 pasos completados: ID único (N20) → Expediente (N04) → BD alumnos (N07) → Calificaciones (N06) → Certificados (N09). PolarDoc ya no es necesario.

**Sprint 5 (feb 2026):** N36 (Stripe webhook Cloud Run), N44 (portabilidad RGPD), N12 (retención RGPD), N13 (inventario SaaS).

**Próximo Sprint (marzo 2026):** Enfocado en N18 (migración Holded — urgente, caduca junio) y cumplimiento RGPD restante (N41, N43, N45).

---

*Documento actualizado: 11 de febrero de 2026*
*Proyecto: Automatización IITD — Proportione*
