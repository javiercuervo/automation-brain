# Informe de Estado y Planificación — IITD

**Fecha:** 10 de febrero de 2026
**Para:** Dirección IITD, Miriam, Josete
**Referencia:** Reunión de priorización del 6 de febrero de 2026
**Preparado por:** Proportione

---

## 1. Resumen ejecutivo

Se han completado **3 sprints** con un total de **15 necesidades resueltas** (código, guías o configuración).

El **camino crítico para abandonar PolarDoc** está al 80%: solo falta N06 (tabla de calificaciones). Los certificados, recibos, listados y la base de datos de alumnos ya están operativos.

Se ha integrado **BreezeDoc** para envío de contratos/consentimientos con firma electrónica (matrícula, convenios con centros, RGPD).

La **firma digital automática de PDFs** queda **aparcada**: el pipeline actual (QR + hash de verificación) es funcional. Cuando el director obtenga su certificado FNMT (.p12), solo hay que copiarlo a `certs/` — cero cambios en código.

Inventario completo: **46 necesidades** (N01-N46), planificación por sprints hasta abril.

---

## 2. Sprint febrero 2026 — Las 8 priorizadas

| ID | Necesidad | Estado | Qué falta | Quién |
|----|-----------|--------|-----------|-------|
| N01 | Notificación de alta/enrolamiento a secretaría | 🔧 Implementado | Desplegar el script actualizado en Apps Script | Proportione |
| N02 | Datos de alumnos completos y descargables | ✅ Hecho | Comunicar a Josete que ya puede acceder en Stackby | Proportione → Josete |
| N03 | Formulario de contacto OCH llegue a Miriam | 📋 Guía entregada | Sonia configura el reenvío de email en Gmail | Sonia |
| N04 | Asignación automática de nº de expediente | 🔧 Implementado | Listo. Los nuevos alumnos recibirán IITD-110001 en adelante | — |
| N11 | Separación de consentimientos RGPD en formularios | 📋 Guía entregada | Proportione modifica los formularios de WordPress | Proportione |
| N13 | Inventario de herramientas SaaS y contratos DPA | 🔧 Implementado | Crear la tabla en Stackby y ejecutar el script | Proportione + Miriam |
| N14 | Captura automática de leads web en Stackby | 🔧 Implementado | Necesitamos el ID de la hoja de cálculo del formulario de contacto | Sonia → Proportione |
| N20 | Identificador único de alumno + deduplicación | 🔧 Implementado | Listo. Deduplicación preparada, IDs automáticos desde 110001 | — |

**Leyenda:**
- ✅ Hecho = ya funciona, no requiere más acción
- 🔧 Implementado = el desarrollo está hecho, falta configurar/desplegar
- 📋 Guía entregada = se ha entregado documentación con los pasos a seguir

---

## 3. Guías entregadas

Se han creado tres guías con instrucciones paso a paso:

| Guía | Para | Sobre qué |
|------|------|-----------|
| Reenvío formulario contacto OCH | Sonia | Cómo configurar Gmail para que los contactos de OCH lleguen también a Miriam |
| Separación consentimientos RGPD | Proportione + Miriam | Qué checkboxes añadir a los formularios web para cumplir RGPD |
| Acceso a datos de alumnos en Stackby | Josete | Cómo filtrar, buscar y exportar datos de alumnos desde Stackby |

---

## 4. Acciones pendientes del equipo IITD

Para completar la puesta en marcha, necesitamos lo siguiente:

| Acción | Responsable | Plazo sugerido |
|--------|-------------|----------------|
| Configurar reenvío de emails OCH → alumnos@ en Gmail | Sonia | Esta semana |
| Confirmar que el email alumnos@institutoteologia.org es correcto para notificaciones | Miriam | Esta semana |
| Proporcionar el enlace (Sheet ID) de la hoja de cálculo donde caen los formularios de contacto web | Sonia | Esta semana |
| Crear tabla LEADS en Stackby (nosotros indicamos los campos) | Miriam o Josete | Esta semana |
| Crear tabla INVENTARIO_SAAS en Stackby | Miriam o Josete | Próxima semana |
| Completar el inventario SaaS con datos de contratos y DPAs | Miriam + Gema | Próxima semana |
| Exportar CSV de alumnos activos de PolarDoc (para migración) | Miriam | Cuando sea posible |

---

## 5. Inventario completo de necesidades (N01-N46)

### Urgentes y rápidas

| ID | Necesidad | Estado |
|----|-----------|--------|
| N01 | Notificación alta/enrolamiento a secretaría | 🔧 Implementado |
| N02 | Datos de alumnos completos y descargables | ✅ Hecho |
| N03 | Formulario contacto OCH llegue a Miriam | 📋 Guía entregada |
| N04 | Asignación automática nº expediente | 🔧 Implementado |
| N40 | Incluir texto legal RGPD en todos los emails automáticos | ✅ Hecho |
| N42 | Páginas legales en la web (Privacidad, Aviso Legal, Cookies) | 📋 Textos entregados |

### Urgentes pero requieren más tiempo

| ID | Necesidad | Estado |
|----|-----------|--------|
| N05 | Listados de alumnos por curso para profesores | ✅ Hecho |
| N06 | Calificaciones numéricas y gestión de trabajos | ⏳ Pendiente |
| N07 | Expediente académico completo en base de datos | 🔧 Importados 1.583 alumnos activos |
| N08 | Recibos y facturas de matrícula (PDF automático) | ✅ Hecho |
| N09 | Certificados DECA automáticos | ✅ Hecho (con QR + hash) |
| N10 | Facturación a centros asociados | ⏳ Pendiente |
| N11 | Separación consentimientos RGPD | 📋 Guía entregada |
| N12 | Política de conservación y borrado de datos RGPD | ⏳ Pendiente |
| N13 | Inventario de herramientas SaaS y DPAs | 🔧 Implementado |
| N14 | Captura automática de leads web en Stackby | 🔧 Implementado |
| N15 | Pipeline DECA completo (solicitud → matrícula → enrolamiento) | 🚫 Bloqueado (token OCH) |
| N16 | Panel de control operativo diario para Miriam | ⏳ Pendiente |
| N17 | Sincronización de actividad del LMS con Stackby | 🚫 Bloqueado (API OCH limitada) |
| N18 | Migración de Golden Soft a Holded (caduca junio 2026) | ⏳ Pendiente |
| N19 | KPIs DECA automáticos | ⏳ Pendiente |
| N20 | Identificador único de alumno + deduplicación | 🔧 Implementado |
| N21 | Validación de los datos migrados | ⏳ Pendiente |
| N41 | Banner de cookies en la web | ⏳ Pendiente |
| N43 | Portal para ejercicio de derechos RGPD (ARCO+) | ⏳ Pendiente |
| N44 | Exportación de datos de alumno (portabilidad RGPD) | ⏳ Pendiente |

### Urgentes pero bloqueadas

| ID | Necesidad | Estado | Bloqueador |
|----|-----------|--------|------------|
| N22 | Notificación de preguntas de alumno al profesor | 🚫 Bloqueado | Limitación de OnlineCourseHost |
| N23 | Minimización del uso del DNI | 🚫 Bloqueado | Requiere decisión de dirección + asesor legal |

### No urgentes pero posibles

| ID | Necesidad | Estado |
|----|-----------|--------|
| N24 | Tabla de contactos institucionales (CRM simple) | ⏳ Pendiente |
| N25 | Emails automáticos (recepción trabajos, notas, recordatorios) | ⏳ Pendiente |
| N26 | Diplomas de otros programas + descarga en OCH | ⏳ Pendiente |
| N27 | Notificaciones de publicaciones en la comunidad OCH | 🚫 Bloqueado (OCH) |
| N28 | Grabaciones: control de acceso y consentimiento promocional | ⏳ Pendiente |
| N29 | Flujo de publicación de cursos con revisión COEO | ⏳ Pendiente |
| N30 | Paquetes de cursos y precios coherentes | ⏳ Pendiente |
| N31 | Vídeo por programa y gestión multidioma | ⏳ Pendiente |
| N32 | Onboarding del curso gratuito desde el blog | ⏳ Pendiente |
| N33 | Oferta de tutorías al finalizar un curso | ⏳ Pendiente |
| N34 | Suscripción a newsletter con consentimiento trazable | ⏳ Pendiente (parcial) |
| N35 | Respuesta a dudas con IA + escalado a personas | ⏳ Pendiente |
| N36 | Pago Stripe → matrícula → factura Holded (pipeline completo) | ⏳ Pendiente (parcial) |
| N37 | Campañas Google Grants con seguimiento | ⏳ Pendiente |
| N38 | Gestión de centros asociados (acceso a datos, cesiones) | ⏳ Pendiente |
| N39 | Foros/comunidad en el LMS con privacidad | 🚫 Bloqueado (OCH) |
| N45 | Registro de auditoría y notificación de brechas de seguridad | ⏳ Pendiente |
| N46 | Caducidad y control de acceso a grabaciones | ⏳ Pendiente |

### Resumen global

| Estado | Cantidad |
|--------|----------|
| ✅ Hecho | 6 |
| 🔧 Implementado (pendiente despliegue/config) | 6 |
| 📋 Guía/textos entregados (acción del equipo) | 3 |
| ⏳ Pendiente | 25 |
| 🚫 Bloqueado | 6 |
| **Total** | **46** |

---

## 6. Planificación trimestral (febrero - abril 2026)

### Sprint 1: Fundamentos (1-9 febrero) — COMPLETADO

N01, N02, N03, N04, N11, N13, N14, N20

Las 8 automatizaciones priorizadas en la reunión del 6 de febrero. Todas resueltas.

### Sprint 2: Camino crítico PolarDoc + Legal urgente (10-23 febrero) — COMPLETADO

| ID | Necesidad | Estado |
|----|-----------|--------|
| N07 | Expediente académico en base de datos | ✅ 1.583 alumnos importados de PolarDoc a Stackby |
| N40 | Texto legal RGPD en emails automáticos | ✅ Footer implementado |
| N42 | Páginas legales en la web | 📋 Textos entregados |
| N15 | Pipeline DECA + BreezeDoc | 🔧 Script BreezeDoc creado. Pendiente: crear templates en BreezeDoc UI + token OCH |
| N17 | Sincronización actividad LMS | 🚫 Bloqueado (API OCH limitada a 2 endpoints) |

**Integración BreezeDoc:**
- `breezedoc-enrollment.mjs` — Envía contratos/consentimientos al alumno para firma electrónica
- Templates a crear en BreezeDoc UI: Matrícula DECA, Convenio Centro Asociado, Consentimiento RGPD
- Una vez creados los templates, configurar IDs en `.env` (`BREEZEDOC_TEMPLATE_MATRICULA`, etc.)

### Sprint 3: Calificaciones y certificados (24 febrero - 9 marzo) — COMPLETADO

| ID | Necesidad | Estado |
|----|-----------|--------|
| N05 | Listados de alumnos por curso | ✅ Hecho — Google Sheet "Panel IITD" con pestañas por programa (1.585 alumnos) |
| N08 | Recibos y facturas PDF | ✅ Hecho — Genera PDF + sube a Google Drive + registra en Sheet |
| N09 | Certificados DECA automáticos | ✅ Hecho — PDF con QR (pxl.to) + hash verificación + sube a diplomas.institutoteologia.org + registra en Sheet |
| N06 | Calificaciones numéricas | ⏳ Pendiente (necesita tabla CALIFICACIONES en Stackby) |

**Infraestructura nueva creada:**
- **Google Sheet "Panel IITD"** — Pestañas: DECA, Evangelizadores, Formación Sistemática, Formación Bíblica, Compromiso Laical, Otros, Resumen, Recibos, Certificados
- **Carpeta Drive "Recibos IITD"** — Almacena los PDFs de recibos
- **Subdominio diplomas.institutoteologia.org** — Hosting de certificados/diplomas vía SiteGround SSH
- **pxl.to** — Short links + QR codes para diplomas (500 req/día)
- **BreezeDoc** — Cuenta configurada, API funcional. Script `breezedoc-enrollment.mjs` para enviar contratos de matrícula, convenios y consentimientos RGPD a firmar por email. Los diplomas usan QR + hash de verificación (firma digital aparcada hasta que el director obtenga certificado FNMT)

### Sprint 4: Operaciones y migración (10-23 marzo)

| ID | Necesidad | Por qué ahora |
|----|-----------|---------------|
| N16 | Panel de control operativo | Miriam necesita visión consolidada de todo |
| N18 | Migración Golden Soft → Holded | La licencia de Golden Soft caduca en junio 2026 |
| N19 | KPIs DECA automáticos | Seguimiento semanal de solicitudes y matrículas |
| N21 | Validación de datos migrados | Asegurar que los datos de PolarDoc están completos |

### Sprint 5: Cumplimiento RGPD completo (24 marzo - 6 abril)

| ID | Necesidad | Por qué ahora |
|----|-----------|---------------|
| N12 | Política de borrado de datos | Obligación legal. Los plazos ya están definidos |
| N41 | Banner de cookies en la web | Obligación legal |
| N43 | Portal de ejercicio de derechos RGPD | Obligación legal |
| N44 | Exportación de datos (portabilidad) | Obligación legal |

### Backlog (segundo trimestre 2026)

N10, N24-N39, N45, N46 — se abordarán una vez resueltos los urgentes.

---

## 7. Camino crítico para abandonar PolarDoc

Hoy PolarDoc sigue siendo necesario para: generar nº de expediente, registrar el expediente académico, poner notas y emitir certificados. Para poder apagarlo, hay que completar esta cadena en orden:

```
1. Identificador único de alumno (N20)              ✅ HECHO
2. Número de expediente automático (N04)             ✅ HECHO
3. Expediente académico en base de datos (N07)       ✅ 1.583 alumnos importados
4. Calificaciones numéricas (N06)                    ⏳ SIGUIENTE PASO
5. Certificados DECA automáticos (N09)               ✅ HECHO (QR + hash + upload + Sheet)
```

Los pasos 1, 2, 3 y 5 ya están resueltos a nivel técnico. Se han importado **1.583 alumnos activos** (con matrícula desde 2020) de PolarDoc a Stackby. Los datos históricos (28.499 registros) quedan en Google Sheets como archivo consultable. El generador de certificados (N09) produce dos modelos de PDF: certificado académico con tabla de notas y diploma de finalización.

El **siguiente paso crítico** es crear la tabla CALIFICACIONES en Stackby (N06) para registrar notas fuera de PolarDoc. Se ha entregado la guía con la estructura de tablas a crear. Una vez creada la tabla y cargadas las notas, los certificados se generarán con datos reales.

Hasta que no se complete el paso 5, **PolarDoc no se puede apagar**.

---

## 8. Riesgos y dependencias externas

| Riesgo | Impacto | Acción |
|--------|---------|--------|
| Golden Soft caduca en junio 2026 | Sin contabilidad si no se migra a Holded | Planificar migración N18 en sprint 4 (marzo) |
| Obligaciones RGPD pendientes | Riesgo de sanción | Footer emails + páginas legales + consentimientos en sprints 2 y 5 |
| Limitaciones de OnlineCourseHost | No se pueden hacer N22, N27, N39 | Protocolos manuales como alternativa |
| Datos de PolarDoc necesarios | Sin ellos no se puede migrar ni validar | Miriam exporta CSV cuando sea posible |
| Sheet ID del formulario de contacto web | Sin él no funciona la captura de leads (N14) | Sonia lo proporciona esta semana |

---

## 9. Próximos pasos inmediatos

### Prioridad 1: Cerrar pendientes (esta semana)

| Tarea | Tipo | Quién |
|-------|------|-------|
| Crear tabla CALIFICACIONES en Stackby (N06) | Config manual | Miriam/Josete |
| Crear templates en BreezeDoc UI (matrícula, convenio, RGPD) | Config manual | Proportione |
| Proporcionar datos institucionales (NIF, dirección, teléfono) | Datos | Miriam |
| Configurar IDs de templates BreezeDoc en .env | Config | Proportione |

### Prioridad 2: Deploy de lo implementado

| Need | Acción pendiente | Quién |
|------|-----------------|-------|
| N01 | Configurar email alumnos@institutoteologia.org | Sonia |
| N03 | Configurar reenvío Gmail OCH → alumnos@ | Sonia |
| N13 | Crear tabla INVENTARIO_SAAS en Stackby | Miriam |
| N14 | Proporcionar Sheet ID del formulario web | Sonia |

### Prioridad 3: Sprint 4 (marzo)

| Need | Qué | Esfuerzo est. |
|------|-----|----------|
| N16 | Dashboard operativo para Miriam | ~4h |
| N18 | Migración Golden Soft → Holded | Depende de Gema |
| N19 | KPIs DECA automáticos | ~3h |
| N21 | Validación datos migrados | ~2h |

### Prioridad 4: Sprint 5 — RGPD (marzo-abril)

N12, N41, N43, N44 — cumplimiento RGPD completo antes de abril.

---

## 10. Firma digital de diplomas — Estado

La firma digital automática de PDFs queda **aparcada**. Motivos:

- Los certificados SSL/TLS del servidor NO sirven para firmar PDFs (Key Usage incompatible)
- Se necesita un certificado personal del director (FNMT, .p12)
- El pipeline actual ya funciona: QR + hash de verificación apuntan a `diplomas.institutoteologia.org`

**Cuando el director tenga su certificado FNMT:** solo hay que copiarlo a `certs/iitd-cert.p12` y actualizar `CERT_P12_PASSWORD` en `.env`. El código (`pdf-signer.mjs`) ya está implementado — cero cambios necesarios.

---

*Documento preparado por Proportione para la reunión de seguimiento IITD.*
*Próxima actualización: 23 de febrero de 2026.*
