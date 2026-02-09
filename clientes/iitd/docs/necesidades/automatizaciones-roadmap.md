# IITD – Automatizaciones priorizadas por bloques (roadmap concreto)
**Fecha:** 2026-02-02
**Alcance:** automatizaciones mencionadas en las actas/notas del hilo y en `stack_capacidades.md`, organizadas por bloques y vinculadas a herramientas.

---

## Convenciones
- **Prioridad**: Alta / Media / Baja (urgencia repetida + impacto operativo/riesgo).
- **Stack citado en reuniones**: WordPress (hosting SiteGround), Formly (formularios), Pabbly Connect (orquestación/integración), Stackby (base de datos), Google Workspace for Education (Drive/Sheets/Identity), OnlineCourseHost (LMS), Acumbamail (newsletter), Google Analytics, Publytics (analítica), Holded (ERP), Stripe (pagos), MultiLipi (traducción), Flipbook/visor PDF (plugin), PolarDoc (BDD anterior).
- **Formato de cada automatización**: objetivo, disparador, acciones, salida/registro.

---

## 1) RGPD, consentimientos y gobernanza de datos

### 1.1 Separación de consentimientos en formulario de contacto
- **Prioridad:** Alta
- **Stack:** WordPress (formulario contacto), Acumbamail
- **Objetivo:** que el formulario de contacto no implique suscripción automática a newsletter.
- **Disparador:** envío de formulario de contacto.
- **Acciones:**
  - Checkbox A: aceptación de política de privacidad (tratamiento para responder a la consulta).
  - Checkbox B (opcional): suscripción a comunicaciones comerciales/newsletter.
  - Solo si B está marcado: alta en Acumbamail con registro de fecha/hora, IP (si aplica) y origen.
- **Salida:** registro del consentimiento (A y B) en Stackby (tabla “Consentimientos”) y/o en el propio log de Formly/WordPress.

### 1.2 Política de conservación y borrado por tipología de dato
- **Prioridad:** Alta
- **Stack:** Google Workspace, Stackby, Formly, OnlineCourseHost
- **Objetivo:** implementar borrado programado según finalidad (contactos resueltos, leads no convertidos, tickets, etc.).
- **Disparador:** job programado (diario/semanal).
- **Acciones:**
  - Identificar registros “cerrados” (p. ej., consulta resuelta) y calcular fecha de caducidad.
  - Borrado/anonimización en: hojas Drive/Stackby + adjuntos Drive vinculados.
  - Mantener trazabilidad mínima: “evento de borrado” (qué, cuándo, quién ejecuta, base legal).
- **Salida:** log de ejecución y resumen mensual para responsable RGPD.

### 1.3 Inventario de SaaS y contratos (adhesión, privacidad, DPA)
- **Prioridad:** Alta
- **Stack:** Stackby (tabla inventario), Google Drive
- **Objetivo:** disponer de un inventario único con enlaces a políticas, DPA y cláusulas de transferencias internacionales/ubicación.
- **Disparador:** alta o cambio de herramienta.
- **Acciones:**
  - Alta/actualización de registro por herramienta (propiedad IITD vs Proportione, finalidad, datos tratados, ubicaciones, transferencias, subencargados).
  - Adjuntar enlace al documento oficial (política privacidad/terms/DPA) en Drive o URL.
- **Salida:** tabla “Inventario SaaS RGPD” con control de versiones y responsable asignado.

### 1.4 Grabaciones y uso promocional (webinar/YouTube)
- **Prioridad:** Media
- **Stack:** Google Meet/Zoom, YouTube, formularios (Formly/WordPress)
- **Objetivo:** gestionar consentimientos y minimizar identificación de alumnos en grabaciones promocionales.
- **Disparador:** creación de evento/webinar.
- **Acciones:**
  - Plantilla de aviso/consentimiento con finalidad “promocional” (distinta de la académica).
  - Configuración recomendada: preguntas por chat no público, ocultar chat en grabación publicada, o consentimiento explícito si se publica.
  - Registro del consentimiento del ponente/profesor y del organizador.
- **Salida:** check-list de cumplimiento por evento + registro en Drive.

---

## 2) Captación, leads y CRM (incluye centros asociados)

### 2.1 Captura automática de leads desde web y cursos hacia Stackby
- **Prioridad:** Alta
- **Stack:** WordPress/Formly, Pabbly Connect, Stackby
- **Objetivo:** centralizar contactos (dudas diarias, solicitudes DECA, curso gratuito) con trazabilidad.
- **Disparador:** envío de formulario (contacto / inscripción / solicitud).
- **Acciones:**
  - Normalización de campos (email, teléfono, país, programa de interés, fuente).
  - Deduplicación por email + heurística (nombre/teléfono) y creación de “Lead ID”.
  - Enriquecimiento: origen (post más visto, campaña, orgánico), UTM si existe.
  - Asignación de responsable (Miriam/Sonia/Gema) según tipología.
- **Salida:** registro en Stackby “Leads/Interesados” + actividad (“evento”) asociada.

### 2.2 Registro estructurado de contactos institucionales (DG Educación, Ministerio, Cáritas)
- **Prioridad:** Media
- **Stack:** Stackby (CRM), Google Workspace (Drive)
- **Objetivo:** documentar relaciones para futura labor comercial en España.
- **Disparador:** nuevo contacto o reunión.
- **Acciones:**
  - Alta de entidad + persona + contexto (tema, interés detectado, próximo paso).
  - Enlace a acta/email relevante en Drive.
- **Salida:** pipeline simple en Stackby (estado: identificado → contactado → reunión → propuesta → cerrado).

### 2.3 Gestión de centros asociados: acceso a datos y cesiones controladas
- **Prioridad:** Media
- **Stack:** Google Workspace (cuentas), Stackby (centros), Drive (carpetas)
- **Objetivo:** controlar qué ve cada centro y bajo qué relación (encargado/corresponsable) cuando aplique.
- **Disparador:** alta de centro o necesidad de acceso.
- **Acciones:**
  - Crear cuenta genérica del centro (si procede) y carpeta Drive con permisos mínimos.
  - Vincular alumnos al centro en Stackby (cuando exista esa relación).
  - Registrar “base legal” y documento contractual asociado.
- **Salida:** auditoría de accesos (quién tiene qué permisos) y registro en Stackby.

---

## 3) Catálogo de cursos y publicación

### 3.1 Flujo de publicación de cursos con revisión COEO antes de sacar a producción
- **Prioridad:** Alta
- **Stack:** Google Docs/Drive, Stackby, OnlineCourseHost, WordPress
- **Objetivo:** publicar bloques de cursos (tronco común, biblia, etc.) sin perder control de SEO y consistencia.
- **Disparador:** “contenido listo” (estado en Stackby).
- **Acciones:**
  - Estados: borrador → revisión COEO → validado → publicado.
  - Checklist COEO: título, URL, descripción, keywords, enlazado interno, CTA a curso gratuito/DECA.
  - Publicación coordinada “activar todos a la vez” cuando se decida.
- **Salida:** registro “Curso” en Stackby con fecha de publicación y URLs (LMS + landing).

### 3.2 Generación/gestión de bundles (módulos 19,90–20€ y packs)
- **Prioridad:** Media
- **Stack:** Stackby, OnlineCourseHost, Stripe, Holded
- **Objetivo:** automatizar coherencia de precios y creación de bundles (precio pack < suma).
- **Disparador:** alta/actualización de módulo.
- **Acciones:**
  - Regla de pricing por tipo de producto (módulo, pack, tutoría).
  - Crear/actualizar producto bundle en LMS y/o pasarela.
- **Salida:** catálogo consistente con IDs de producto cruzados (Stackby ↔ LMS ↔ pagos).

### 3.3 Vídeo por programa y gestión multidioma (MultiLipi)
- **Prioridad:** Media
- **Stack:** producción vídeo, WordPress + MultiLipi, OnlineCourseHost
- **Objetivo:** vídeo corto por curso (p. ej., 1 minuto) y/o vídeo bienvenida con subtítulos bien mostrados por idioma.
- **Disparador:** curso publicado o campaña.
- **Acciones:**
  - Control de versiones del vídeo y subtítulos (ES/EN/PT) y cómo se incrustan en páginas traducidas.
- **Salida:** enlace por idioma en Stackby (tabla “Medios del curso”).

---

## 4) Matrícula, onboarding y documentación (DECA y resto)

### 4.1 Pipeline completo de solicitud → admisión → documentación → enrolamiento (DECA)
- **Prioridad:** Alta
- **Stack:** Formly, Pabbly Connect, Google Drive/Sheets, OnlineCourseHost, Stackby
- **Objetivo:** sostener ritmo de 1+ inscripción/día en DECA sin fricción operativa.
- **Disparador:** envío del formulario DECA.
- **Acciones:**
  - Crear registro “Solicitud” en Stackby y carpeta Drive por alumno.
  - Notificación a Miriam/Sonia con resumen + enlace.
  - Si “admitido”: enviar automáticamente el segundo formulario de subida de documentos/pago.
  - Tras verificación: creación/activación de usuario en LMS (SSO Google si aplica) y enrolamiento en DECA.
- **Salida:** estado de cada alumno (solicitud → admitido → docs OK → pagado → enrolado) con timestamps.

### 4.2 Minimización de DNI: alternativa a almacenar escaneo completo
- **Prioridad:** Alta
- **Stack:** Formly, Drive, Stackby
- **Objetivo:** reducir riesgo de suplantación evitando almacenar copias completas si no es imprescindible.
- **Disparador:** carga de documentación.
- **Acciones (técnicamente implementables):**
  - Campo obligatorio: número de documento.
  - Evidencia alternativa: verificación visual en proceso (si se define) o documento con datos tachados salvo los necesarios.
  - Regla operativa: si se almacena, aplicar caducidad y borrado automático cuando deje de ser necesario.
- **Salida:** política operativa + flags en Stackby (“DNI almacenado: sí/no”, “fecha borrado prevista”).

### 4.3 Onboarding al curso gratuito desde posts más vistos
- **Prioridad:** Media
- **Stack:** WordPress, OnlineCourseHost, Google Analytics/Publytics, Stackby
- **Objetivo:** captación y trazabilidad desde blog hacia curso gratuito y luego hacia DECA.
- **Disparador:** clic/alta en curso gratuito.
- **Acciones:**
  - UTM tagging desde posts.
  - Alta automática en Stackby con fuente exacta (post/campaña).
  - Secuencia de nurturing posterior (ver 6.2).
- **Salida:** métricas por fuente y conversión (post → curso gratuito → DECA).

---

## 5) Operaciones de alumnos y producción académica

### 5.1 Dashboard operativo diario (Miriam disponible cada día)
- **Prioridad:** Alta
- **Stack:** Stackby (vista/panel), Google Sheets (si aplica)
- **Objetivo:** control diario de alumnos activos y cuellos de botella (docs, pagos, progreso, dudas).
- **Disparador:** actualización diaria (automática) + revisión humana.
- **Acciones:**
  - Panel por cohortes: nuevos hoy, pendientes de documentación, pendientes de pago, inactivos X días, incidencias.
  - Alertas a responsables por umbrales (p. ej., inactividad 7 días).
- **Salida:** listado diario para Miriam + resumen semanal.

### 5.2 Control de actividad en LMS y sincronización a Stackby
- **Prioridad:** Alta
- **Stack:** OnlineCourseHost, Pabbly Connect, Stackby
- **Objetivo:** detectar alumnos que “entran” y reflejarlo en la base de datos (automatización ya iniciada).
- **Disparador:** evento de enrolamiento / login / progreso (según disponibilidad del LMS).
- **Acciones:**
  - Sincronizar: enrolamiento, porcentaje de avance, finalización.
  - Registrar “último acceso” y “módulo actual”.
- **Salida:** historial de actividad por alumno en Stackby.

### 5.3 Tutorías como producto separado y trigger al finalizar curso
- **Prioridad:** Media
- **Stack:** OnlineCourseHost (venta coaching), Stripe, Stackby, email
- **Objetivo:** upsell de tutoría al acabar curso (mensaje de 2 líneas solicitado al instituto).
- **Disparador:** finalización de curso/módulo.
- **Acciones:**
  - Envío de mensaje + CTA a comprar tutoría.
  - Registro de conversión (si compra) en Stackby.
- **Salida:** métricas de adopción de tutorías.

### 5.4 Foros/comunidad en LMS con privacidad por diseño
- **Prioridad:** Baja (pendiente de decisión del instituto)
- **Stack:** OnlineCourseHost
- **Objetivo:** habilitar foros sin exponer emails personales entre alumnos.
- **Disparador:** decisión de activar foros.
- **Acciones:**
  - Configurar visibilidad: mostrar solo nombre/alias, no email.
  - Opcional: política de perfiles (foto y campos voluntarios) y valores por defecto restrictivos.
- **Salida:** configuración documentada + test como alumno.

---

## 6) Newsletter, comunicaciones y atención al alumno

### 6.1 Suscripción a Acumbamail con registro de consentimiento y baja trazable
- **Prioridad:** Alta
- **Stack:** WordPress/Formly, Acumbamail, Stackby
- **Objetivo:** cumplimiento y trazabilidad del marketing consentido.
- **Disparador:** checkbox de suscripción marcado.
- **Acciones:**
  - Alta en lista adecuada (interés DECA / catálogo / general).
  - Guardar evidencia de consentimiento y origen.
  - Sincronizar bajas desde Acumbamail hacia Stackby (estado “no contactar”).
- **Salida:** estado de marketing por contacto en Stackby.

### 6.2 Respuesta a dudas con IA (primer nivel) y escalado a Miriam
- **Prioridad:** Media
- **Stack:** correo (info@), Stackby (tickets), IA (pendiente de implementar), Pabbly Connect
- **Objetivo:** absorber volumen de dudas diarias y estandarizar respuestas.
- **Disparador:** llegada de email o formulario de soporte.
- **Acciones:**
  - Crear ticket en Stackby con categoría.
  - IA propone respuesta si es FAQ; si no, asigna a Miriam.
  - Política de retención: tickets fungibles con borrado programado.
- **Salida:** métricas de auto-resolución y tiempos de respuesta.

---

## 7) Pagos, facturación y ERP (Holded)

### 7.1 Sincronización pagos Stripe ↔ matrícula ↔ factura Holded
- **Prioridad:** Media
- **Stack:** Stripe, Holded, Stackby, Pabbly Connect
- **Objetivo:** trazabilidad financiera por alumno/curso y evitar tareas manuales.
- **Disparador:** pago confirmado en Stripe.
- **Acciones:**
  - Marcar matrícula como pagada en Stackby.
  - Crear factura/recibo en Holded con referencia a alumno y producto.
  - Notificar a administración (Gema) de excepciones (pago fallido, discrepancia).
- **Salida:** conciliación mensual y listado de incidencias.

### 7.2 Plan de migración Golden Soft → Holded (caducidad junio)
- **Prioridad:** Alta
- **Stack:** Golden Soft (salida), Holded (entrada), Stackby
- **Objetivo:** llegar a junio sin renovar y con datos migrados.
- **Disparador:** hito de proyecto.
- **Acciones:**
  - Exportación de datos mínimos (clientes, facturas, productos) y mapeo.
  - Validación (cuadres) y checklist de “listo para operar”.
- **Salida:** informe de migración y fecha de corte.

---

## 8) Analítica, SEO y campañas (Google Grants)

### 8.1 Seguimiento automático de KPI DECA (solicitudes, enrolamientos, keyword)
- **Prioridad:** Alta
- **Stack:** Google Analytics, Publytics, Search Console (si aplica), Stackby
- **Objetivo:** seguimiento semanal de la palanca principal (DECA) y del curso gratuito.
- **Disparador:** job semanal.
- **Acciones:**
  - Volcar métricas clave a Stackby: solicitudes DECA/día, enrolamientos DECA, enrolamientos curso gratuito, tráfico orgánico, posición keyword “DECA”, métricas móvil/rebote.
  - Generar resumen para reunión semanal.
- **Salida:** panel y reporte semanal.

### 8.2 Control de campañas Google Grants (sin “lanzar campanas al vuelo”)
- **Prioridad:** Media
- **Stack:** Google Grants/Ads, Analytics, Stackby
- **Objetivo:** operar campañas con disciplina (conversión, coste oportunidad, calidad de lead).
- **Disparador:** ciclo semanal.
- **Acciones:**
  - Importar métricas (clics, conversiones) y compararlas con matrículas reales.
  - Alertas por anomalías (picos sin conversión, tráfico no cualificado).
- **Salida:** informe semanal de campaña.

---

## 9) Datos maestros y migración de bases de datos

### 9.1 Identificador único de alumno (resuelve import PolarDoc)
- **Prioridad:** Alta
- **Stack:** Stackby
- **Objetivo:** que todos los alumnos tengan un ID único (los centros asociados ya lo tienen) para deduplicación y relaciones.
- **Disparador:** importación/migración + altas diarias.
- **Acciones:**
  - Definir esquema de ID (UUID o autoincremental) y regla de deduplicación (email como clave primaria cuando exista).
  - Rutina de “merge” de duplicados con log (qué se fusiona, por qué).
  - Enlaces: alumno ↔ matrículas ↔ pagos ↔ certificaciones ↔ centro asociado.
- **Salida:** integridad referencial y métricas fiables.

### 9.2 Validación de migración y control de calidad de datos
- **Prioridad:** Alta
- **Stack:** Stackby, Google Sheets (validación), Drive
- **Objetivo:** asegurar que lo migrado (PolarDoc + histórico) está completo y consistente.
- **Disparador:** cada lote de migración.
- **Acciones:**
  - Reglas de calidad: campos obligatorios, formatos, duplicados, enlaces rotos.
  - Informe de incidencias para corrección (por Miriam/Gema según el dato).
- **Salida:** informe de control de calidad por versión/lote.

---

## Resumen de prioridades (para planificación)
- **Alta (operación y riesgo):** 1.1, 1.2, 1.3, 4.1, 4.2, 5.1, 5.2, 7.2, 8.1, 9.1, 9.2.
- **Media (crecimiento y eficiencia):** 2.1, 2.2, 3.2, 3.3, 4.3, 5.3, 6.2, 7.1, 8.2.
- **Baja (pendiente de decisión/iteración):** 5.4.

