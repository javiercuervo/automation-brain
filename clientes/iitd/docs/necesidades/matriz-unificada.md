# OBSOLETO

> Este documento fue reemplazado por [`../../INVENTARIO-AUTOMATIZACIONES-IITD.md`](../../INVENTARIO-AUTOMATIZACIONES-IITD.md).
>
> Fecha de deprecación: 11 de febrero de 2026.

---

# Matriz Unificada de Necesidades IITD

**Fecha:** 2026-02-06
**Fuentes:** Josete (OCH), Miriam (PolarDoc), Actas Proportione (roadmap automatizaciones), Documento Legal RGPD-LOPDGDD v6 (Feb 2026)
**Ejes:** Origen x Urgencia x Viabilidad-Esfuerzo

---

## 1. Tabla Resumen (Matriz Cubo)

### URGENTE + SE PUEDE + RAPIDO

| ID | Necesidad | Origen |
|----|-----------|--------|
| N01 | Notificación alta/enrolamiento alumno a secretaría | Josete + Actas |
| N02 | Descarga completa de datos de alumnos | Josete + Actas |
| N03 | Formulario contacto OCH → que llegue a Miriam | Josete + Actas |
| N04 | Auto-asignación nº de expediente | Miriam + Actas |
| N40 | Footer RGPD en todos los emails automatizados | Legal RGPD |
| N42 | Páginas legales web (Privacidad, Aviso Legal, Cookies) | Legal RGPD |

### URGENTE + SE PUEDE + LENTO

| ID | Necesidad | Origen |
|----|-----------|--------|
| N05 | Listados de alumnos por curso para profesores | Josete |
| N06 | Calificaciones numéricas + gestión evaluación trabajos | Josete + Miriam |
| N07 | Expediente académico completo en base de datos | Miriam |
| N08 | Recibos/Facturas de matrículas (PDF automático) | Miriam + Actas |
| N09 | Certificados DECA automáticos | Miriam + Actas |
| N10 | Facturación Centros Asociados y otros pagos | Miriam + Actas |
| N11 | Separación consentimientos RGPD (formularios) | Actas |
| N12 | Política de conservación y borrado RGPD | Actas |
| N13 | Inventario SaaS y DPAs | Actas |
| N14 | Captura automática leads web → Stackby | Actas |
| N15 | Pipeline DECA: matrícula → docs → pago → enrolamiento | Actas |
| N16 | Dashboard operativo diario (Miriam) | Actas |
| N17 | Sync actividad LMS → Stackby (progreso, último acceso) | Actas |
| N18 | Migración Golden Soft → Holded (caduca junio) | Actas |
| N19 | KPIs DECA automáticos (solicitudes, enrolamientos) | Actas |
| N20 | ID único alumno + deduplicación | Actas |
| N21 | Validación de datos migrados | Actas |
| N41 | Cookie banner y política de cookies web | Legal RGPD |
| N43 | Portal de ejercicio de derechos ARCO+ | Legal RGPD |
| N44 | Exportación de datos para portabilidad | Legal RGPD |

### URGENTE + NO SE PUEDE HACER (depende de terceros)

| ID | Necesidad | Origen | Bloqueador |
|----|-----------|--------|------------|
| N22 | Notificación preguntas alumno → profesor | Josete | Limitación OCH |
| N23 | Minimización DNI (alternativa a escaneo completo) | Actas | Decisión legal/operativa |

### NO URGENTE + SE PUEDE + RAPIDO

| ID | Necesidad | Origen |
|----|-----------|--------|
| N24 | Contactos institucionales (tabla CRM simple) | Actas |

### NO URGENTE + SE PUEDE + LENTO

| ID | Necesidad | Origen |
|----|-----------|--------|
| N25 | Emails automáticos (recepción trabajos, notas, recordatorios) | Miriam |
| N26 | Diplomas otros planes (Sonia) + habilitar descarga OCH | Miriam |
| N27 | Notificación publicaciones Comunidad OCH | Josete + Actas |
| N28 | Grabaciones y consentimientos uso promocional | Actas |
| N29 | Flujo publicación cursos con revisión COEO | Actas |
| N30 | Bundles y pricing coherente | Actas |
| N31 | Vídeo por programa y gestión multidioma | Actas |
| N32 | Onboarding curso gratuito desde blog | Actas |
| N33 | Upsell tutorías al finalizar curso | Actas |
| N34 | Suscripción Acumbamail con consentimiento trazable | Actas |
| N35 | Respuesta a dudas con IA + escalado | Actas |
| N36 | Sync pagos Stripe → matrícula → factura Holded | Actas |
| N37 | Campañas Google Grants con disciplina | Actas |
| N38 | Gestión centros asociados (acceso datos, cesiones) | Actas |
| N45 | Audit logging y notificación de brechas | Legal RGPD |
| N46 | Caducidad y control de acceso a grabaciones | Legal RGPD |

### NO URGENTE + NO SE PUEDE HACER

| ID | Necesidad | Origen | Bloqueador |
|----|-----------|--------|------------|
| N39 | Foros/comunidad LMS con privacidad (ocultar emails) | Josete + Actas | Configuración OCH pendiente de decisión |

---

## 2. Inventario Detallado

### N01 — Notificación alta/enrolamiento alumno a secretaría
- **Origen:** Josete (J1, J2) + Actas (5.2)
- **Urgencia:** URGENTE — Miriam no se entera cuando un alumno se da de alta o se enrola en un curso
- **Viabilidad:** SE PUEDE, RAPIDO — Ya existe sync OCH → Stackby implementado. Falta añadir trigger de email cuando se detecta nuevo registro.
- **Estado:** PARCIAL (sync existe, notificación email no)
- **Esfuerzo estimado:** 2-4 horas
- **Dependencias:** Ninguna

### N02 — Descarga completa de datos de alumnos
- **Origen:** Josete (J3) + Actas (9.1)
- **Urgencia:** URGENTE — Hoy solo se puede descargar el email desde OCH
- **Viabilidad:** YA RESUELTO — Con la sincronización a Stackby, todos los datos del alumno ya están en la base de datos y son descargables/filtrables.
- **Estado:** HECHO
- **Esfuerzo estimado:** 0 (comunicar a Josete que ya está disponible en Stackby)
- **Dependencias:** Ninguna

### N03 — Formulario contacto OCH → que llegue a Miriam
- **Origen:** Josete (J8) + Actas (2.1)
- **Urgencia:** URGENTE — Hoy llega solo a proportione@porqueviven.org (Sonia), Miriam no lo ve
- **Viabilidad:** SE PUEDE, RAPIDO — Configurar reenvío de email o añadir destinatario en OCH.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 30 minutos (config email)
- **Dependencias:** Ninguna

### N04 — Auto-asignación nº de expediente
- **Origen:** Miriam (M1) + Actas (9.1)
- **Urgencia:** URGENTE — Hoy se asigna manualmente en PolarDoc. Bloquea el abandono de PolarDoc.
- **Viabilidad:** SE PUEDE, RAPIDO — Campo autoincremental en Stackby o generación secuencial en Apps Script al crear alumno.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-4 horas
- **Dependencias:** Requiere definir formato del nº expediente (¿continuar secuencia PolarDoc?)

### N05 — Listados de alumnos por curso para profesores
- **Origen:** Josete (J4)
- **Urgencia:** URGENTE — Los profesores no saben qué alumnos tienen matriculados en su asignatura. Josete pregunta si cada profesor podría ver SOLO sus alumnos.
- **Viabilidad:** SE PUEDE, LENTO — Necesita: (1) tabla matriculaciones en Stackby con relación alumno↔curso↔profesor, (2) vistas filtradas por profesor, (3) posiblemente compartir vistas de Stackby con profesores o crear un panel, (4) cumplimiento RGPD — filtrado estricto a datos de SU asignatura; sin datos personales de contacto ni financieros.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas (modelo de datos + vistas + permisos)
- **Dependencias:** N07 (expediente académico), N17 (sync LMS)
- **Restricción legal RGPD:** El contrato DPA de profesores limita el acceso a: nombre, DNI y datos académicos EXCLUSIVAMENTE de su asignatura. Operaciones permitidas: Registro, Consulta, Acceso. Prohibido: datos de contacto personal (email, teléfono, dirección), datos económicos, datos de otras asignaturas. Implementar filtrado estricto por profesor en vistas y API.

### N06 — Calificaciones numéricas + gestión evaluación de trabajos
- **Origen:** Josete (J5) + Miriam (M4)
- **Urgencia:** URGENTE — OCH solo permite Aprobado/Suspenso. Los trabajos aparecen mezclados de todos los cursos, sin ordenar. Hoy Miriam registra las notas manualmente desde secretaría cuando el profesor se las comunica.
- **Viabilidad:** SE PUEDE, LENTO — Necesita sistema fuera de OCH: tabla de calificaciones en Stackby, formulario/interfaz para que profesores introduzcan notas, workflow de notificación.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-4 semanas (modelo datos + interfaz profesor + notificaciones)
- **Dependencias:** N07 (expediente académico), N05 (listados por curso)

### N07 — Expediente académico completo en base de datos
- **Origen:** Miriam (M3)
- **Urgencia:** URGENTE — Es el CUELLO DE BOTELLA principal. Sin expediente digital no se pueden generar certificados ni abandonar PolarDoc. El expediente incluye: materias, convalidaciones, fecha matrícula, calificaciones.
- **Viabilidad:** SE PUEDE, LENTO — Diseño de modelo de datos en Stackby: tabla Expedientes vinculada a Alumnos, tabla Asignaturas Matriculadas con notas, convalidaciones, fechas.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas (diseño + importación datos históricos + validación)
- **Dependencias:** N04 (nº expediente), N20 (ID único alumno)
- **BLOQUEA:** N06, N09, N10 — Sin expediente no hay certificados, notas ni facturación completa.

### N08 — Recibos/Facturas de matrículas (PDF automático)
- **Origen:** Miriam (M2) + Actas (7.1)
- **Urgencia:** URGENTE — PolarDoc genera recibos y facturas automáticamente. Sin esto, el proceso de matriculación sigue manual.
- **Viabilidad:** SE PUEDE, LENTO — Plantilla Google Docs + generación PDF vía Apps Script (patrón similar al de diplomas). Incluye: datos alumno, asignaturas, importes, forma de pago, nº factura.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas (plantilla + motor generación + registro contable)
- **Dependencias:** N07 (expediente académico para datos de asignaturas), necesita input de Gema (contabilidad)

### N09 — Certificados DECA automáticos
- **Origen:** Miriam (M6) + Arquitectura Diplomas ya diseñada
- **Urgencia:** URGENTE — PolarDoc genera certificados de notas automáticamente. Hasta que se replique, hay que seguir usando PolarDoc.
- **Viabilidad:** SE PUEDE, LENTO — Arquitectura de 8 bloques ya diseñada (ver `Procesos/Diplomas/arquitectura_emision_diplomas_DECA.md`). Modelo 1 = certificado con tabla de notas. Modelo 2 = diploma de finalización.
- **Estado:** DISEÑADO, pendiente de implementar (Bloque 0 = plantillas como siguiente paso)
- **Esfuerzo estimado:** 4-6 semanas para primer entregable (Bloques 0+1+2+4)
- **Dependencias:** N07 (expediente con notas), N06 (calificaciones registradas)

### N10 — Facturación Centros Asociados y otros pagos
- **Origen:** Miriam (M8) + Actas (7.1)
- **Urgencia:** URGENTE — PolarDoc factura material didáctico, canon de alumnos, etc. a centros asociados (Lugo, Santander, La Habana, Lisboa, etc.)
- **Viabilidad:** SE PUEDE, LENTO — Necesita: tabla productos/precios en Stackby, plantilla factura, generación PDF, registro para contabilidad. Similar a N08 pero con lógica distinta (centros, no alumnos).
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas
- **Dependencias:** Input de Gema (contabilidad). Decisión sobre Holded vs custom.

### N11 — Separación consentimientos RGPD (formularios)
- **Origen:** Actas (1.1) + Legal RGPD v6
- **Urgencia:** URGENTE — Riesgo legal. El formulario de contacto no debe implicar suscripción automática a newsletter.
- **Viabilidad:** SE PUEDE, LENTO — El documento legal define DOS modelos de consentimiento:
  - **Alumnos (OPT-OUT / interés legítimo):** Checkbox DESMARCADO por defecto: "Me opongo a recibir comunicaciones informativas y comerciales sobre cursos, actividades y servicios del Instituto." Solo marcando se retira el consentimiento.
  - **No-alumnos / leads / contactos (OPT-IN / consentimiento expreso):** Checkbox DESMARCADO por defecto requiriendo acción afirmativa para suscribirse a comunicaciones.
  - Requiere: (1) detectar tipo de usuario (alumno vs lead/contacto), (2) formulario distinto o lógica condicional según tipo, (3) registro trazable con base legal (interés legítimo vs consentimiento expreso), (4) fecha, texto exacto y origen del consentimiento almacenados en Stackby.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas (dos flujos distintos + trazabilidad)
- **Dependencias:** N40 (footer RGPD en emails). Decisión sobre implementación en WordPress, Apps Script o ambos.

### N12 — Política de conservación y borrado RGPD
- **Origen:** Actas (1.2) + Legal RGPD v6
- **Urgencia:** URGENTE — Obligación legal. Datos de contactos resueltos, leads no convertidos deben borrarse según plazos.
- **Viabilidad:** SE PUEDE, LENTO — Plazos YA definidos por documento legal v6:
  - Datos académicos: durante relación + periodos legales (fiscal, educativa) + prescripción de responsabilidades
  - Datos marketing: indefinidamente hasta opt-out/revocación (baja de lista)
  - Consultas/solicitudes de contacto: 1 año tras cierre definitivo
  - CVs/candidatos: fin del proceso de selección (o 1 año máx si el candidato solicita conservar)
  - Contratos profesores: duración del servicio + periodos de prescripción
  - Implementar: (1) campo `fecha_caducidad` calculado por tipo de dato en cada tabla, (2) job programado semanal/mensual que identifique registros caducados, (3) borrado o anonimización automática, (4) log de auditoría de cada borrado (qué, cuándo, base legal)
- **Estado:** DESBLOQUEADO (plazos definidos por documento legal)
- **Esfuerzo estimado:** 1-2 semanas
- **Dependencias:** Ninguna (plazos ya definidos)

### N13 — Inventario SaaS y DPAs
- **Origen:** Actas (1.3) + Legal RGPD v6
- **Urgencia:** URGENTE — Para cumplimiento RGPD necesitan documentar qué SaaS usan, con qué datos, y tener los DPA firmados.
- **Viabilidad:** SE PUEDE, LENTO — El documento legal ya proporciona:
  - DPA firmado con Polaris Informática (proveedor IT)
  - DPA-tipo para profesores (encargados del tratamiento)
  - Plantilla DPA genérica para demás proveedores
  - Zoom identificado como transferencia internacional (EEUU, Cláusulas Contractuales Tipo)
  - Requisito: revisión anual de cumplimiento ("declaración responsable de seguimiento")
  - Subcontratistas: notificación escrita 7 días de antelación
  - IT: Crear tabla en Stackby con campos: Proveedor, Tipo datos tratados, DPA firmado (sí/no), Fecha firma, Transferencia internacional (sí/no), Cláusulas aplicables, Fecha próxima revisión, Estado. Configurar recordatorio anual automático para revisión.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 4 horas (tabla + campos + recordatorio) + trabajo humano de alta de proveedores
- **Dependencias:** Requiere trabajo manual del equipo para recopilar DPAs

### N14 — Captura automática leads web → Stackby
- **Origen:** Actas (2.1)
- **Urgencia:** URGENTE — Las consultas diarias desde la web (dudas DECA, solicitudes) deben centralizarse.
- **Viabilidad:** SE PUEDE, LENTO — Plantilla publisher.gs ya existe. Adaptar para formularios web.
- **Estado:** PARCIAL (publisher DECA funciona; leads web generales no)
- **Esfuerzo estimado:** 1 semana
- **Dependencias:** Sheet IDs, mapeo de columnas

### N15 — Pipeline DECA completo
- **Origen:** Actas (4.1)
- **Urgencia:** URGENTE — Ciclo solicitud → admisión → documentación → pago → enrolamiento.
- **Viabilidad:** SE PUEDE, LENTO — Parte ya implementada (formulario → Stackby). Faltan: notificación segundo formulario, verificación docs, enrolamiento automático.
- **Estado:** PARCIAL
- **Esfuerzo estimado:** 2-3 semanas para completar
- **Dependencias:** N01 (notificaciones), N04 (expediente), N17 (sync LMS)

### N16 — Dashboard operativo diario (Miriam)
- **Origen:** Actas (5.1)
- **Urgencia:** URGENTE — Sin visión consolidada de alumnos activos, pendientes de pago, inactivos, incidencias.
- **Viabilidad:** SE PUEDE, LENTO — Vistas y panel en Stackby. Requiere que los datos estén primero (depende de N07, N17).
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas (vistas + filtros + alertas)
- **Dependencias:** N07 (expedientes), N17 (sync LMS), datos consolidados

### N17 — Sync actividad LMS → Stackby
- **Origen:** Actas (5.2)
- **Urgencia:** URGENTE — Saber qué alumnos están activos, su progreso, último acceso.
- **Viabilidad:** SE PUEDE, LENTO — Script OCH → Stackby. Ya hay implementación parcial.
- **Estado:** PARCIAL (sync enrolamiento existe; progreso y actividad no)
- **Esfuerzo estimado:** 1-2 semanas
- **Dependencias:** API OCH (disponibilidad de datos de progreso)

### N18 — Migración Golden Soft → Holded
- **Origen:** Actas (7.2)
- **Urgencia:** URGENTE — La licencia de Golden Soft caduca en junio 2026.
- **Viabilidad:** SE PUEDE, LENTO — Exportar datos, mapear, importar en Holded, validar cuadres.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 3-4 semanas
- **Dependencias:** Acceso a datos Golden Soft, coordinación con Gema

### N19 — KPIs DECA automáticos
- **Origen:** Actas (8.1)
- **Urgencia:** URGENTE — Seguimiento semanal de solicitudes, enrolamientos, tráfico, keywords.
- **Viabilidad:** SE PUEDE, LENTO — Integrar Google Analytics + Search Console → Stackby.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas
- **Dependencias:** Acceso a Analytics/Search Console

### N20 — ID único alumno + deduplicación
- **Origen:** Actas (9.1)
- **Urgencia:** URGENTE — Para relaciones consistentes entre tablas y evitar duplicados.
- **Viabilidad:** SE PUEDE, LENTO — Definir esquema ID, rutina merge, email como clave primaria.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1 semana
- **Dependencias:** Ninguna (pero bloquea N07)

### N21 — Validación de datos migrados
- **Origen:** Actas (9.2)
- **Urgencia:** URGENTE — Asegurar que PolarDoc + histórico está completo y consistente en Stackby.
- **Viabilidad:** SE PUEDE, LENTO — Reglas de calidad, informe de incidencias.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas
- **Dependencias:** N07 (expedientes en BD)

### N22 — Notificación preguntas alumno → profesor
- **Origen:** Josete (J6)
- **Urgencia:** URGENTE — Un alumno (Oriol Codola) dejó pregunta, no recibió respuesta y tuvo que llamar por teléfono. Josete sugiere pedir al profesor que revise periódicamente.
- **Viabilidad:** NO SE PUEDE (directamente) — Depende de que OCH permita configurar notificaciones por email para preguntas. Alternativa: scraping periódico de la API de OCH + envío de email, pero no es viable si OCH no expone estos datos vía API.
- **Estado:** BLOQUEADO (investigar capacidades OCH)
- **Esfuerzo estimado:** N/A o 1-2 semanas si OCH tiene API
- **Dependencias:** Investigación API OCH
- **Workaround:** Protocolo manual — pedir a profesores que revisen semanalmente

### N23 — Minimización DNI
- **Origen:** Actas (4.2) + Legal RGPD v6
- **Urgencia:** URGENTE (riesgo legal)
- **Viabilidad:** NO SE PUEDE (técnicamente) — Es una decisión operativa y legal, no técnica. Requiere definir política de qué datos de DNI se almacenan y cuáles no.
- **Estado:** BLOQUEADO (decisión humana)
- **Dependencias:** Decisión de dirección + asesor legal
- **Actualización legal:** El contrato DPA de profesores establece que solo acceden a nombre + DNI + datos académicos de su asignatura. El consentimiento de matrícula autoriza el tratamiento del DNI para gestión académica. Medidas IT a implementar cuando se desbloquee: (1) limitar acceso al DNI completo a secretaría únicamente (no profesores, no vistas compartidas), (2) documentar base legal Art. 9.2.d (datos religiosos derivados de los estudios de teología) en el sistema. Sigue BLOQUEADO para la decisión sobre almacenamiento: escaneo completo vs parcial vs hash.

### N24 — Contactos institucionales (tabla CRM simple)
- **Origen:** Actas (2.2)
- **Urgencia:** NO URGENTE — Para futura labor comercial en España
- **Viabilidad:** SE PUEDE, RAPIDO — Crear tabla en Stackby con pipeline simple.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 30 minutos
- **Dependencias:** Ninguna

### N25 — Emails automáticos (recepción trabajos, notas, recordatorios)
- **Origen:** Miriam (M5)
- **Urgencia:** NO URGENTE — Mejora futura, no bloquea abandono de PolarDoc
- **Viabilidad:** SE PUEDE, LENTO — Triggers en Apps Script + plantillas email.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas
- **Dependencias:** N06 (calificaciones), N07 (expediente)

### N26 — Diplomas otros planes + descarga en OCH
- **Origen:** Miriam (M7)
- **Urgencia:** NO URGENTE — Sonia los hace manual. Mejorable pero no bloquea nada.
- **Viabilidad:** SE PUEDE, LENTO — Reutilizar sistema de diplomas (N09) para otros planes + habilitar descarga en OCH.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas (tras tener N09 funcionando)
- **Dependencias:** N09 (certificados DECA)

### N27 — Notificación publicaciones Comunidad OCH
- **Origen:** Josete (J7) + Actas (5.4)
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE (si OCH lo permite) o NO SE PUEDE — Misma situación que N22.
- **Estado:** BLOQUEADO (investigar OCH)
- **Dependencias:** Investigación API OCH

### N28 — Grabaciones y consentimientos uso promocional
- **Origen:** Actas (1.4) + Legal RGPD v6
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — El documento legal establece requisitos concretos:
  - Grabaciones EXCLUSIVAMENTE para fines académicos/formativos + control de calidad docente
  - Acceso SOLO a alumnos matriculados + profesorado correspondiente
  - Tiempo limitado ("estrictamente necesario") — implementar caducidad automática
  - Uso promocional requiere consentimiento SEPARADO y EXPRESO (formulario distinto del académico)
  - IT: (1) sistema de almacenamiento con control de acceso por curso, (2) fecha de caducidad/borrado automático, (3) formulario consentimiento promocional con registro trazable, (4) flag por grabación: `uso_promocional_autorizado` con referencia al consentimiento
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas (control acceso + caducidad + consentimiento separado)
- **Dependencias:** N05 (listados por curso, para control de acceso a grabaciones), N46 (sistema caducidad grabaciones)

### N29 — Flujo publicación cursos con revisión COEO
- **Origen:** Actas (3.1)
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — Estados en Stackby + checklist SEO + coordinación.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas
- **Dependencias:** Ninguna

### N30 — Bundles y pricing coherente
- **Origen:** Actas (3.2)
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — Tabla de productos + reglas de pricing.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1 semana
- **Dependencias:** Ninguna

### N31 — Vídeo por programa y gestión multidioma
- **Origen:** Actas (3.3)
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — Control de versiones vídeo + subtítulos.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas
- **Dependencias:** Producción de vídeo (externa)

### N32 — Onboarding curso gratuito desde blog
- **Origen:** Actas (4.3)
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — UTM tagging + alta automática + secuencia nurturing.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas
- **Dependencias:** N14 (leads web), IDs curso gratuito

### N33 — Upsell tutorías al finalizar curso
- **Origen:** Actas (5.3)
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — Email trigger al completar curso.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1 semana
- **Dependencias:** N17 (sync LMS para saber cuándo termina)

### N34 — Suscripción Acumbamail con consentimiento trazable
- **Origen:** Actas (6.1) + Legal RGPD v6
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — Implementación debe reflejar modelo dual de consentimiento:
  - Alumnos: alta automática basada en interés legítimo (opt-out disponible)
  - No-alumnos: alta SOLO con consentimiento expreso (opt-in verificado)
  - Cada registro en Acumbamail debe incluir: `base_legal` (interés legítimo | consentimiento expreso), `fecha_consentimiento`, `texto_consentimiento`, `origen` (formulario_X, matrícula, etc.)
  - Script existente necesita: (1) parámetro `tipo_usuario`, (2) campos adicionales de trazabilidad, (3) registro en Stackby con referencia al consentimiento original
- **Estado:** PARCIAL (script Acumbamail existe, falta trazabilidad consentimiento y modelo dual)
- **Esfuerzo estimado:** 1 semana
- **Dependencias:** N11 (modelo dual consentimientos), N40 (footer RGPD en emails enviados)

### N35 — Respuesta a dudas con IA + escalado
- **Origen:** Actas (6.2)
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — Tabla tickets + categorización + IA primer nivel.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 3-4 semanas
- **Dependencias:** Decisión sobre herramienta IA

### N36 — Sync pagos Stripe → matrícula → factura Holded
- **Origen:** Actas (7.1)
- **Urgencia:** NO URGENTE (ya hay webhook Stripe implementado parcial)
- **Viabilidad:** SE PUEDE, LENTO — Pipeline completo pago → estado → factura.
- **Estado:** PARCIAL (webhook Stripe implementado)
- **Esfuerzo estimado:** 2-3 semanas para completar
- **Dependencias:** N18 (Holded operativo), N08 (facturación)

### N37 — Campañas Google Grants con disciplina
- **Origen:** Actas (8.2)
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — Importar métricas + comparar con matrículas reales.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas
- **Dependencias:** N19 (KPIs DECA)

### N38 — Gestión centros asociados (acceso datos, cesiones)
- **Origen:** Actas (2.3) + Legal RGPD v6
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — Cuentas, carpetas Drive, permisos mínimos.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas
- **Dependencias:** N13 (inventario SaaS, bases legales)
- **Restricción legal RGPD:** Datos compartidos con centros asociados exclusivamente para gestión académica (prácticas). Requiere: (1) cláusula de privacidad en convenios/acuerdos (texto ya proporcionado por abogada), (2) datos tratados confidencialmente, (3) prohibición de cesión a terceros. IT: implementar exportaciones limitadas a datos estrictamente necesarios (no exportar emails, teléfonos, DNI completo a centros). Vistas Stackby compartidas con centros deben excluir campos sensibles.

### N39 — Foros/comunidad LMS con privacidad
- **Origen:** Josete (J7 implícito) + Actas (5.4)
- **Urgencia:** NO URGENTE
- **Viabilidad:** NO SE PUEDE (directamente) — Depende de configuración OCH. Pendiente de decisión del instituto sobre si activar foros.
- **Estado:** BLOQUEADO (decisión instituto + capacidad OCH)
- **Dependencias:** Decisión de dirección

### N40 — Footer RGPD en todos los emails automatizados
- **Origen:** Documento Legal RGPD v6
- **Urgencia:** URGENTE — Obligación legal. TODOS los emails del IITD deben incluir texto de privacidad.
- **Viabilidad:** SE PUEDE, RAPIDO — Crear constante/plantilla reutilizable con el texto legal y añadir a todos los emails automatizados existentes y futuros.
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-4 horas (auditar todos los puntos de envío de email + insertar footer)
- **Dependencias:** Ninguna
- **Impacto transversal:** Afecta a N01 (notificaciones), N09 (certificados), N25 (emails automáticos), N34 (marketing Acumbamail), y cualquier otro email automatizado.
- **Texto requerido:** El documento legal proporciona el texto exacto del pie de email: confidencialidad + información RGPD + derechos + enlace Política de Privacidad web.

### N41 — Cookie banner y política de cookies web
- **Origen:** Documento Legal RGPD v6
- **Urgencia:** URGENTE — Obligación legal para www.iitdistancia.org
- **Viabilidad:** SE PUEDE, LENTO — Implementar banner de cookies conforme a requisitos legales:
  - Tres opciones: ACEPTAR / RECHAZAR / OTRAS OPCIONES (misma prominencia visual, sin trucos de color/contraste)
  - Selección granular por categorías: técnicas (obligatorias), analíticas, publicitarias, personalización, redes sociales
  - NO preseleccionar cookies no esenciales
  - Botón RECHAZAR igual de visible que ACEPTAR
  - Registro del consentimiento de cookies por usuario
  - Plugin WordPress tipo Complianz/CookieBot o desarrollo custom
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas (selección herramienta + configuración + integración Analytics)
- **Dependencias:** N42 (páginas legales web donde enlazar política de cookies)

### N42 — Páginas legales web (Privacidad, Aviso Legal, Cookies)
- **Origen:** Documento Legal RGPD v6
- **Urgencia:** URGENTE — Obligación legal. Textos ya proporcionados por abogada.
- **Viabilidad:** SE PUEDE, RAPIDO — Crear/actualizar 3 páginas en WordPress:
  - `/Legal/Privacidad` — Política de privacidad (texto completo proporcionado)
  - `/Legal/AvisoLegal` — Aviso legal (texto completo proporcionado)
  - `/Legal/Cookies` — Política de cookies (plantilla proporcionada, completar con lista de cookies reales del sitio)
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 4-6 horas (crear páginas + insertar textos + completar campos pendientes + enlazar desde footer web)
- **Dependencias:** N41 (banner cookies, para completar la lista de cookies reales en la política)

### N43 — Portal de ejercicio de derechos ARCO+
- **Origen:** Documento Legal RGPD v6
- **Urgencia:** URGENTE — Obligación legal. 7 derechos deben ser ejercitables por los interesados.
- **Viabilidad:** SE PUEDE, LENTO — Implementar:
  - 7 formularios web (o 1 formulario con selector de derecho): Acceso, Rectificación, Oposición, Supresión, Limitación, Portabilidad, Decisiones automatizadas
  - Verificación de identidad (subida copia DNI)
  - Registro en Stackby: tabla SOLICITUDES_DERECHOS con campos: tipo_derecho, fecha_solicitud, solicitante, DNI_verificado, estado, fecha_respuesta, resolución
  - SLA: respuesta en 1 mes (ampliable a 3 en casos complejos)
  - Notificación automática a responsable cuando se recibe solicitud
  - Workflow de respuesta con plantillas
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas (formularios + tabla + workflow + notificaciones)
- **Dependencias:** N42 (páginas legales donde enlazar), N40 (footer RGPD menciona derechos)

### N44 — Exportación de datos para portabilidad (derecho RGPD)
- **Origen:** Documento Legal RGPD v6
- **Urgencia:** URGENTE — Obligación legal Art. 20 RGPD (derecho a la portabilidad)
- **Viabilidad:** SE PUEDE, LENTO — Implementar:
  - Script/función que, dado un email/DNI de alumno, exporte TODOS sus datos en formato máquina (JSON o CSV): datos personales, expediente académico, calificaciones, matrículas, pagos, consentimientos, comunicaciones
  - Debe cubrir todas las tablas de Stackby donde aparezca el alumno
  - Formato estructurado y legible por máquina
  - Registro de cada exportación realizada (auditoría)
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 1-2 semanas
- **Dependencias:** N07 (expediente académico en BD), N20 (ID único para buscar en todas las tablas)

### N45 — Audit logging y capacidad de notificación de brechas
- **Origen:** Documento Legal RGPD v6
- **Urgencia:** NO URGENTE (pero crítico en caso de incidente — SLA 24h)
- **Viabilidad:** SE PUEDE, LENTO — Implementar:
  - Log de acceso/modificación/borrado de datos personales en Stackby (tabla AUDIT_LOG)
  - Campos: quién, cuándo, qué tabla, qué registro, qué operación, IP/origen
  - Capacidad de detectar accesos anómalos
  - Procedimiento de notificación: SLA 24h al IITD ante cualquier brecha detectada, 72h para AEPD
  - Plantilla de notificación a AEPD y a interesados
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas
- **Dependencias:** Ninguna (puede implementarse incrementalmente)

### N46 — Caducidad y control de acceso a grabaciones
- **Origen:** Documento Legal RGPD v6 (refuerza N28 con requisitos técnicos concretos)
- **Urgencia:** NO URGENTE
- **Viabilidad:** SE PUEDE, LENTO — Implementar:
  - Sistema de almacenamiento con permisos por curso (solo alumnos matriculados + profesor)
  - Fecha de caducidad por grabación (borrado automático tras periodo definido)
  - Tabla en Stackby: GRABACIONES con campos: curso, fecha, url, fecha_caducidad, consentimiento_promocional, estado
  - Job de borrado/archivado automático al expirar
- **Estado:** PENDIENTE
- **Esfuerzo estimado:** 2-3 semanas
- **Dependencias:** N05 (listados por curso/profesor), N28 (consentimientos grabaciones)

---

## 3. Solapamientos Multi-Origen

Items mencionados por más de una fuente (mayor consenso = mayor prioridad real):

| Necesidad | Josete | Miriam | Actas | Legal RGPD | Refs |
|-----------|:------:|:------:|:-----:|:----------:|------|
| N01 Notif. alta/enrolamiento | X | | X | | J1, J2, 5.2 |
| N02 Datos alumno completos | X | | X | | J3, 9.1 |
| N03 Contacto → Miriam | X | | X | | J8, 2.1 |
| N04 Nº expediente auto | | X | X | | M1, 9.1 |
| N06 Calificaciones numéricas | X | X | | | J5, M4 |
| N08 Recibos/Facturas matrículas | | X | X | | M2, 7.1 |
| N09 Certificados DECA | | X | X | | M6, Diplomas arq. |
| N10 Facturación centros | | X | X | | M8, 7.1 |
| N11 Consentimientos RGPD | | | X | X | 1.1, Legal v6 |
| N12 Conservación y borrado | | | X | X | 1.2, Legal v6 |
| N13 Inventario SaaS/DPAs | | | X | X | 1.3, Legal v6 |
| N27 Notif. comunidad | X | | X | | J7, 5.4 |
| N28 Grabaciones promocional | | | X | X | 1.4, Legal v6 |
| N34 Acumbamail trazable | | | X | X | 6.1, Legal v6 |
| N38 Centros asociados | | | X | X | 2.3, Legal v6 |
| N39 Foros privacidad | X | | X | | J7, 5.4 |

**Conclusión:** Los items con doble o triple origen son los de mayor prioridad percibida por el equipo. Los items con origen Legal RGPD tienen además obligación de cumplimiento normativo.

---

## 4. Cadenas de Dependencias

```
N20 (ID único alumno)
 └── N04 (Nº expediente auto)
      └── N07 (Expediente académico BD)  ← CUELLO DE BOTELLA
           ├── N06 (Calificaciones)
           │    ├── N05 (Listados por curso/profesor) [RESTRICCIÓN RGPD: filtrado estricto]
           │    └── N25 (Emails auto notas)
           ├── N09 (Certificados DECA)
           │    └── N26 (Diplomas otros planes)
           ├── N08 (Recibos/Facturas matrículas)
           │    └── N36 (Stripe → factura Holded)
           ├── N10 (Facturación centros)
           ├── N16 (Dashboard operativo)
           ├── N21 (Validación datos migrados)
           └── N44 (Exportación portabilidad RGPD)  ← NUEVO

N01 (Notif. alta/enrolamiento) → independiente [+ N40 footer]
N03 (Contacto → Miriam) → independiente

--- Cadena RGPD ---
N11 (RGPD consentimientos duales) → N34 (Acumbamail trazable)
N40 (Footer RGPD emails) → impacta N01, N09, N25, N34
N42 (Páginas legales web) ↔ N41 (Cookie banner)
N43 (Portal derechos ARCO+) → depende de N42, N40
N44 (Exportación portabilidad) → depende de N07, N20
N45 (Audit logging) → independiente
N46 (Caducidad grabaciones) → depende de N05, N28

--- Otras ---
N17 (Sync LMS) → N16 (Dashboard), N33 (Upsell tutorías)
N18 (Migración Holded) → N36 (Stripe → Holded)
N13 (Inventario SaaS + DPAs) → N38 (Centros asociados) [+ revisión anual]
```

**El camino crítico para abandonar PolarDoc sigue siendo:**
`N20 → N04 → N07 → N06 → N09`
(ID único → expediente → calificaciones → certificados)

Sin resolver esta cadena, PolarDoc NO se puede apagar.

**Nueva cadena crítica RGPD (obligación legal):**
`N40 (footer) + N11 (consentimientos) + N42 (páginas legales) + N41 (cookies) + N43 (portal derechos)`

Estas son obligaciones legales independientes de PolarDoc.

---

## 5. Resumen Ejecutivo

### HACER YA (Urgente + Rápido) — 6 items
| ID | Necesidad | Esfuerzo | Origen |
|----|-----------|----------|--------|
| N01 | Notif. alta/enrolamiento → secretaría | 2-4h | Josete+Actas |
| N02 | Datos alumno completos | 0 (YA HECHO) | Josete+Actas |
| N03 | Contacto OCH → Miriam | 30 min | Josete+Actas |
| N04 | Auto nº expediente | 2-4h | Miriam+Actas |
| N40 | Footer RGPD en emails automatizados | 2-4h | Legal RGPD |
| N42 | Páginas legales web (textos ya escritos) | 4-6h | Legal RGPD |

### PLANIFICAR INMEDIATAMENTE (Urgente + Lento) — 20 items
Ordenados por dependencias (hacer primero los que desbloquean más):

| Prioridad | ID | Necesidad | Esfuerzo | Desbloquea |
|-----------|----|-----------|----------|------------|
| 1 | N20 | ID único alumno | 1 sem | N04, N07 |
| 2 | N07 | Expediente académico en BD | 2-3 sem | N06, N08, N09, N10, N16, N21, N44 |
| 3 | N06 | Calificaciones (profesores) | 2-4 sem | N09, N25 |
| 4 | N09 | Certificados DECA | 4-6 sem | N26 |
| 5 | N08 | Recibos/Facturas matrículas | 2-3 sem | N36 |
| 6 | N10 | Facturación centros asociados | 2-3 sem | — |
| 7 | N17 | Sync actividad LMS | 1-2 sem | N16, N33 |
| 8 | N05 | Listados alumnos por curso | 1-2 sem | N46 |
| 9 | N16 | Dashboard operativo | 1-2 sem | — |
| 10 | N18 | Migración Golden Soft → Holded | 3-4 sem | N36 |
| 11 | N14 | Leads web → Stackby | 1 sem | N32 |
| 12 | N15 | Pipeline DECA completo | 2-3 sem | — |
| 13 | N11 | RGPD consentimientos duales | 1-2 sem | N34 |
| 14 | N12 | RGPD borrado (DESBLOQUEADO) | 1-2 sem | — |
| 15 | N13 | Inventario SaaS + DPAs | 4h + manual | N38 |
| 16 | N19 | KPIs DECA | 1-2 sem | N37 |
| 17 | N21 | Validación migración | 1-2 sem | — |
| 18 | N41 | Cookie banner web | 1-2 sem | N42 |
| 19 | N43 | Portal derechos ARCO+ | 2-3 sem | — |
| 20 | N44 | Exportación portabilidad RGPD | 1-2 sem | — |

### ESCALAR / DECIDIR (Urgente + No se puede) — 2 items
| ID | Necesidad | Acción requerida |
|----|-----------|-----------------|
| N22 | Notif. preguntas → profesor | Investigar API OCH. Si no: protocolo manual para profesores |
| N23 | Minimización DNI | Decisión dirección + asesor legal |

### BACKLOG (No urgente) — 18 items
N24–N39 + N45–N46: se abordarán tras resolver los urgentes. Destacan N25 (emails auto) y N26 (diplomas otros planes) que dependen de la cadena crítica. N45 (audit logging) y N46 (caducidad grabaciones) son requisitos RGPD no urgentes pero recomendables.

---

## 6. Estado Global

| Categoría | Items | Completados | En progreso | Pendientes | Bloqueados |
|-----------|-------|-------------|-------------|------------|------------|
| Urgente + Rápido | 6 | 1 (N02) | 0 | 5 | 0 |
| Urgente + Lento | 20 | 0 | 3 parciales | 17 | 0 |
| Urgente + No se puede | 2 | 0 | 0 | 0 | 2 |
| No urgente + Rápido | 1 | 0 | 0 | 1 | 0 |
| No urgente + Lento | 16 | 0 | 2 parciales | 14 | 0 |
| No urgente + No se puede | 1 | 0 | 0 | 0 | 1 |
| **TOTAL** | **46** | **1** | **5** | **37** | **3** |

---

*Documento generado a partir de: Josete.pdf, Miriam.pdf, 2026-02-02_automatizaciones_iitd.md, Libro Registro Clausulas RGPD-LOPDGDD v6*
*Fecha: 2026-02-06*
