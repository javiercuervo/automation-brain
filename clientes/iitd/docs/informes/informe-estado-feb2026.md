# Informe de Estado y Planificación — IITD

**Fecha:** 9 de febrero de 2026 (actualizado 10 de febrero)
**Para:** Dirección IITD, Miriam, Josete
**Referencia:** Reunión de priorización del 6 de febrero de 2026
**Preparado por:** Proportione

---

## 1. Resumen ejecutivo

En la reunión del 6 de febrero se priorizaron **8 automatizaciones urgentes** para ejecutar en 2 semanas. A fecha de hoy, las 8 están resueltas a nivel técnico (código implementado o guía entregada).

Lo que queda para que funcionen en producción son **configuraciones manuales** y **datos que debe proporcionar el equipo IITD** (ver sección 4).

Además, se ha actualizado el inventario completo de las **46 necesidades** identificadas (N01-N46), con una propuesta de planificación por sprints hasta abril de 2026.

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
| N05 | Listados de alumnos por curso para profesores | ⏳ Pendiente |
| N06 | Calificaciones numéricas y gestión de trabajos | ⏳ Pendiente |
| N07 | Expediente académico completo en base de datos | 🔧 Importados 1.583 alumnos activos |
| N08 | Recibos y facturas de matrícula (PDF automático) | ⏳ Pendiente |
| N09 | Certificados DECA automáticos | ⏳ Pendiente |
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
| ✅ Hecho | 3 |
| 🔧 Implementado (pendiente despliegue/config) | 6 |
| 📋 Guía/textos entregados (acción del equipo) | 3 |
| ⏳ Pendiente | 28 |
| 🚫 Bloqueado | 6 |
| **Total** | **46** |

---

## 6. Planificación trimestral (febrero - abril 2026)

### Sprint 1: Fundamentos (1-9 febrero) — COMPLETADO

N01, N02, N03, N04, N11, N13, N14, N20

Las 8 automatizaciones priorizadas en la reunión del 6 de febrero. Todas resueltas.

### Sprint 2: Camino crítico PolarDoc + Legal urgente (10-23 febrero)

| ID | Necesidad | Por qué ahora |
|----|-----------|---------------|
| N07 | Expediente académico en base de datos | Es el cuello de botella principal. Sin esto no hay certificados ni se puede dejar PolarDoc |
| N15 | Pipeline DECA completo | Completar el flujo solicitud → matrícula → enrolamiento |
| N17 | Sincronización de actividad del LMS | Saber qué alumnos están activos y su progreso |
| N40 | Texto legal RGPD en emails automáticos | Obligación legal, afecta a todos los emails |
| N42 | Páginas legales en la web | Obligación legal, los textos ya están escritos |

### Sprint 3: Calificaciones y certificados (24 febrero - 9 marzo)

| ID | Necesidad | Por qué ahora |
|----|-----------|---------------|
| N06 | Calificaciones numéricas | Los profesores necesitan registrar notas. OCH solo permite Aprobado/Suspenso |
| N08 | Recibos y facturas PDF | PolarDoc los genera automáticamente. Hay que replicar esta función |
| N09 | Certificados DECA automáticos | La arquitectura ya está diseñada. Es el paso final para abandonar PolarDoc |
| N05 | Listados de alumnos por curso | Los profesores necesitan saber qué alumnos tienen |

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
5. Certificados DECA automáticos (N09)               ⏳ Pendiente
```

Los pasos 1, 2 y 3 ya están resueltos. Se han importado **1.583 alumnos activos** (con matrícula desde 2020) de PolarDoc a Stackby. Los datos históricos (28.499 registros) quedan en Google Sheets como archivo consultable.

El **siguiente paso crítico** es crear la tabla CALIFICACIONES en Stackby (N06) para registrar notas fuera de PolarDoc. Se ha entregado la guía con la estructura de tablas a crear.

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

1. **Esta semana (10-14 feb):**
   - Sonia configura reenvío de email OCH (guía entregada)
   - Proportione despliega scripts actualizados en Apps Script
   - El equipo crea tablas LEADS e INVENTARIO_SAAS en Stackby
   - Se comunica a Josete el acceso a datos de alumnos en Stackby

2. **Próxima semana (17-21 feb):**
   - Inicio del Sprint 2: diseño del expediente académico (N07)
   - Implementación del footer RGPD en emails (N40)
   - Creación de páginas legales en la web (N42)

3. **Pendiente del equipo:**
   - Miriam: exportar CSV de PolarDoc
   - Sonia: proporcionar Sheet ID formulario contacto
   - Gema: información sobre contabilidad para migración Holded

---

*Documento preparado por Proportione para la reunión de seguimiento IITD.*
*Próxima actualización: 23 de febrero de 2026.*
