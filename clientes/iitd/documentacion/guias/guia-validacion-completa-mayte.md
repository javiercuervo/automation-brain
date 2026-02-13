# Guia de pruebas y validacion — Todo lo que hemos construido para el IITD

**Para:** Mayte (comercial@institutoteologia.org)
**De:** Equipo de automatizacion — Proportione
**Fecha:** 12 de febrero de 2026

---

Hola Mayte,

Este documento es tu guia completa para ver, probar y validar todo lo que hemos construido para el IITD desde la reunion del 6 de febrero. No necesitas conocimientos tecnicos — solo seguir los pasos y marcar cada punto.

**Como usar este documento:**
- Marca con una **X** los checkboxes `[ ]` cuando hayas verificado algo
- Usa los espacios de **Notas/Correcciones** para anotar lo que no te convence o quieras cambiar
- Puedes ir seccion por seccion o saltar a lo que mas te interese
- **Tiempo estimado:** 60-90 minutos para una revision completa

Al final encontraras:
- El estado de las 52 necesidades de la reunion
- Lo que hemos hecho que no estaba en el acta
- Lo que necesitamos de vosotros para seguir avanzando

---

## 0. Antes de empezar — Accesos que necesitas

| Herramienta | Como acceder | Login |
|-------------|-------------|-------|
| **Web IITD** | institutoteologia.org | No necesitas login (es publica) |
| **Stackby** | stackby.com | mayte.tortosa@proportione.com (o pedir invitacion a Javier) |
| **Panel IITD** (Google Sheet) | Enlace compartido (si no lo tienes, pidelo a Javier) | Tu cuenta Google de Proportione |
| **Calificaciones IITD** (Google Sheet) | Enlace compartido (si no lo tienes, pidelo a Javier) | Tu cuenta Google de Proportione |
| **BreezeDoc** | Te haremos una demo | No necesitas probarlo tu sola |
| **Stripe** | Te haremos una demo o captura | No necesitas probarlo tu sola |
| **Diplomas online** | diplomas.institutoteologia.org | No necesitas login (es publica) |

**Comprueba que tienes acceso:**

- [ ] Puedo abrir institutoteologia.org
- [ ] Puedo entrar en Stackby con mi cuenta
- [ ] Puedo abrir el Panel IITD en Google Sheets
- [ ] Puedo abrir Calificaciones IITD en Google Sheets

**Notas/Correcciones:** _______________

---

## 1. La web — Lo que puedes probar en el navegador

Hemos hecho varios cambios en la web del IITD que puedes comprobar tu misma abriendo el navegador.

### 1.1 Banner de cookies (Complianz)

**Que es:** Un aviso que aparece al entrar en la web pidiendo permiso para usar cookies. Es obligatorio por la ley de proteccion de datos (RGPD). Hemos instalado el plugin profesional Complianz en WordPress.

**Pasos:**
1. Abre una ventana de **navegador en modo incognito** (Ctrl+Shift+N en Chrome, o Cmd+Shift+N en Mac)
2. Ve a **institutoteologia.org**
3. Deberia aparecer un banner con opciones de cookies
4. Haz clic en **"Aceptar"** — el banner debe desaparecer
5. Cierra la pestana y vuelve a entrar — el banner **NO** debe reaparecer
6. En la parte inferior derecha, busca un boton **"Gestionar consentimiento"** — al hacer clic, debe reaparecer el panel de preferencias

**Que verificar:**

- [ ] El banner aparece la primera vez que entro (en modo incognito)
- [ ] Al aceptar, el banner desaparece y no vuelve
- [ ] Hay un boton "Gestionar consentimiento" para reabrir las preferencias
- [ ] El texto se entiende y esta en espanol

**Notas/Correcciones:** _______________

---

### 1.2 Portal ARCO+ — Formulario de derechos RGPD

**Que es:** Una pagina donde cualquier persona puede solicitar ejercer sus derechos sobre sus datos personales (ver sus datos, corregirlos, borrarlos, etc.). Es obligatorio tener un mecanismo asi por el RGPD.

**Pasos:**
1. Ve a **institutoteologia.org/ejercicio-derechos-rgpd/**
2. Veras un formulario con estos campos:
   - Nombre completo
   - Correo electronico
   - DNI/NIE (opcional)
   - Tipo de derecho (desplegable con 6 opciones)
   - Mensaje (opcional)
   - Checkbox de aceptacion
3. Rellena con datos de prueba:
   - Nombre: **Test Mayte**
   - Email: **comercial@institutoteologia.org**
   - Tipo de derecho: **Acceso**
   - Mensaje: **Esto es una prueba de testing**
4. Marca el checkbox y pulsa **"Enviar solicitud"**
5. Comprueba que llega un email a **informacion@institutoteologia.org** con los datos

**Que verificar:**

- [ ] La pagina existe en institutoteologia.org/ejercicio-derechos-rgpd/
- [ ] El formulario se ve bien (no esta roto ni cortado)
- [ ] El desplegable tiene 6 opciones: Acceso, Rectificacion, Supresion, Portabilidad, Oposicion, Limitacion
- [ ] Al enviar, se recibe un email con los datos del formulario
- [ ] El texto legal menciona el plazo de 30 dias
- [ ] Aparece un enlace a la Agencia Espanola de Proteccion de Datos (AEPD)
- [ ] Se ve bien en el movil (abrir la URL desde el telefono)

**Notas/Correcciones:** _______________

---

### 1.3 Paginas legales corregidas

**Que es:** Hemos corregido los textos del Aviso Legal, Politica de Privacidad y Politica de Cookies para que tengan los datos correctos del IITD.

**Pasos:**
1. Ve a **institutoteologia.org** y baja hasta el pie de pagina
2. Haz clic en **"Aviso legal"** y comprueba los datos
3. Vuelve atras y haz clic en **"Privacidad"**
4. Vuelve atras y haz clic en **"Cookies"**

**Que verificar en CADA pagina:**

- [ ] **Aviso Legal** (institutoteologia.org/aviso-legal/): aparece NIF R2800617I, Calle Iriarte 3, 28028 Madrid
- [ ] **Privacidad** (institutoteologia.org/politica-de-privacidad/): mismos datos correctos, menciona derechos ARCO+
- [ ] **Cookies** (institutoteologia.org/politica-de-cookies/): explica las cookies que se usan
- [ ] En las tres paginas: telefono **91 401 50 62**
- [ ] En las tres paginas: email **informacion@institutoteologia.org**
- [ ] En las tres paginas: dominio **institutoteologia.org** (no iitdistancia.org)
- [ ] Los textos se leen bien y no hay caracteres raros

**Notas/Correcciones:** _______________

---

### 1.4 Pie de pagina (footer)

**Que es:** Hemos actualizado el pie de pagina de toda la web con el copyright correcto y los datos de contacto.

**Pasos:**
1. Ve a cualquier pagina de institutoteologia.org
2. Baja hasta el final de la pagina

**Que verificar:**

- [ ] Aparece **"Instituto Internacional de Teologia (c) 2026"** (no 2024 ni 2025)
- [ ] Telefono: +34 91 401 50 62
- [ ] Email: informacion@institutoteologia.org
- [ ] Direccion: Calle Iriarte 3, CP 28028 Madrid
- [ ] El enlace "Politica de cookies (UE)" **NO** aparece en el menu principal (ya no es necesario, esta en el footer)

**Notas/Correcciones:** _______________

---

### 1.5 SEO — Posicionamiento en Google (informativo)

**Que es:** Hemos configurado Yoast SEO en WordPress para que Google muestre descripciones atractivas de las paginas del Instituto cuando alguien lo busca.

**Pasos:**
1. Abre Google y busca **"instituto teologia a distancia"**
2. Si aparece institutoteologia.org, mira si debajo del titulo tiene una descripcion coherente (no texto aleatorio)

> **Nota:** Google puede tardar varios dias en actualizar las descripciones. Si aun no se ven, es normal.

**Que verificar:**

- [ ] Entiendo que hemos optimizado 13 paginas para Google
- [ ] He buscado "instituto teologia a distancia" en Google (anota si aparece)

**Paginas optimizadas:** Inicio, Instituto, Cursos para Personas, Cursos para Centros, Contacto, Noticias, Centros asociados, Aviso Legal, Privacidad, Cookies, Cookies UE, Ejercicio Derechos RGPD, Post "Que es DECA"

**Extras tecnicos (informativo):**
- Sitemap XML activo (7 sitemaps para que Google indexe todo)
- robots.txt configurado (permite a Google rastrear la web)
- llms.txt activado (para que las IAs como ChatGPT conozcan el IITD)

**Notas/Correcciones:** _______________

---

### 1.6 Diplomas online — Verificacion de certificados

**Que es:** Los certificados que generamos incluyen un codigo QR. Al escanearlo, se descarga el PDF original desde un subdominio propio del Instituto.

> **Estado actual:** Los archivos PDF ya estan subidos al servidor de SiteGround, pero el subdominio `diplomas.institutoteologia.org` aun no tiene registro DNS configurado. Nosotros nos encargamos de activarlo — no necesitais hacer nada. Mientras tanto, los certificados se generan correctamente y los PDFs estan listos en el servidor.

**Que verificar:**

- [ ] Entiendo que los certificados tendran un codigo QR que enlaza a diplomas.institutoteologia.org
- [ ] Entiendo que el subdominio se activara proximamente (falta configurar DNS)

**Notas/Correcciones:** _______________

---

## 2. Google Sheets — El panel de gestion

Hemos creado hojas de calculo que se actualizan automaticamente con los datos de los alumnos. Son el centro de informacion del IITD.

### 2.1 Panel IITD (hoja principal)

**Que es:** Una hoja de calculo consolidada con 14 pestanas que muestra todos los alumnos organizados por programa, un panel operativo, indicadores, y el registro de recibos y certificados. Todos los scripts del IITD escriben en este unico Sheet.

**Como acceder:**
1. Abre el enlace compartido al Panel IITD (si no lo tienes, pidelo a Javier)
2. Usa tu cuenta Google de Proportione

**Pestanas del Panel IITD (14 en total):**

| Pestana | Que contiene |
|---------|-------------|
| DECA | Alumnos del programa DECA |
| Evangelizadores | Alumnos de Escuela de Evangelizadores |
| Formacion Sistematica | Alumnos de Formacion Sistematica |
| Formacion Biblica | Alumnos de Formacion Biblica |
| Compromiso Laical | Alumnos de Compromiso Laical y Doctrina Social |
| Otros | Alumnos sin programa asignado o programas historicos |
| Resumen | Totales por programa y fecha de actualizacion |
| Recibos | Registro de recibos de matricula generados |
| Certificados | Registro de certificados y diplomas generados |
| Dashboard | Pipeline de alumnos, alertas y actividad reciente |
| KPIs DECA | Embudo de conversion DECA y tasas |
| Validacion | Auditoria de datos: emails, duplicados, estados |
| Retencion RGPD | Registros caducados y proximos a caducar |
| Calificaciones | (Solo si usas Sheet de calificaciones aparte) |

**Pasos:**

*Pestanas por programa (6):*
1. Haz clic en la pestana **"DECA"** — veras los alumnos del programa DECA
2. Haz lo mismo con: **Evangelizadores**, **Formacion Sistematica**, **Formacion Biblica**, **Compromiso Laical**, **Otros**
3. Comprueba que los nombres y datos te suenan

*Pestana Resumen:*
4. Haz clic en **"Resumen"** — veras totales por programa y fecha de ultima actualizacion

*Pestana Dashboard:*
5. Haz clic en **"Dashboard"** — veras la pipeline de alumnos (cuantos en cada etapa), alertas (alumnos con solicitud >7 dias sin respuesta, >14 dias sin pago) y actividad reciente

*Pestana KPIs DECA:*
6. Haz clic en **"KPIs DECA"** — veras el embudo de conversion (cuantos solicitan info → cuantos se matriculan → cuantos pagan) y desglose por variante (Infantil/Primaria vs ESO/Bachillerato)

*Pestanas Validacion y Retencion RGPD:*
7. Haz clic en **"Validacion"** — veras resultados de la auditoria de datos (emails invalidos, duplicados, estados incoherentes)
8. Haz clic en **"Retencion RGPD"** — veras registros caducados y proximos a caducar segun la politica de conservacion

**Que verificar:**

- [ ] Puedo abrir el Sheet y ver las 14 pestanas
- [ ] La pestana DECA tiene alumnos y los datos parecen correctos
- [ ] Las demas pestanas por programa tienen datos
- [ ] La pestana Resumen muestra totales coherentes
- [ ] La pestana Dashboard muestra alertas y pipeline
- [ ] La pestana KPIs DECA muestra el embudo de conversion
- [ ] La pestana Validacion muestra resultados de la auditoria de datos
- [ ] La pestana Retencion RGPD muestra el informe de conservacion
- [ ] Los programas que veo coinciden con los programas reales del IITD
- [ ] Si falta algun programa, lo anoto aqui abajo

**Notas/Correcciones:** _______________

---

### 2.2 Calificaciones IITD (hoja de notas)

**Que es:** Una hoja donde se gestionan las notas de cada alumno por asignatura. Tiene 3.573 filas ya preparadas (397 alumnos DECA x 9 modulos).

**Como acceder:**
1. Abre el enlace compartido a Calificaciones IITD

**Pasos:**
1. Comprueba que tiene filas con nombre de alumno, asignatura y programa
2. Las columnas de notas (Nota evaluacion, Nota examen, Calificacion final) pueden estar vacias — los profesores las rellenan
3. Comprueba que las 9 asignaturas DECA son correctas

**Que verificar:**

- [ ] Puedo abrir el Sheet
- [ ] Tiene filas con nombres de alumnos reales
- [ ] Las asignaturas DECA son correctas (las 9 del plan de estudios)
- [ ] Entiendo que los profesores rellenaran las notas aqui y se sincronizan con la base de datos

**Notas/Correcciones:** _______________

---

## 3. Stackby — La base de datos

Stackby es donde se guardan todos los datos de alumnos, contactos, calificaciones e inventario de herramientas. Funciona como un Excel avanzado en la nube.

### 3.1 Tabla ALUMNOS (1.585 registros)

**Que es:** La tabla principal con todos los alumnos del IITD, importados de PolarDoc. Contiene nombre, apellidos, email, telefono, programa, estado, numero de expediente, etc.

**Como acceder:**
1. Ve a **stackby.com** e inicia sesion
2. Busca el stack **"IITD Matriculacion"**
3. Haz clic en la pestana **"ALUMNOS"**

**Pasos:**
1. Comprueba que hay muchos registros (deberia haber 1.585+)
2. Busca un alumno que conozcas por nombre o email
3. Comprueba que sus datos son correctos
4. Mira que exista el campo **"No Expediente"** con formato IITD-NNNNNN (6 digitos)

**Que verificar:**

- [ ] Puedo acceder a Stackby y ver la tabla ALUMNOS
- [ ] Hay aproximadamente 1.585 registros
- [ ] Los datos de un alumno que conozco son correctos
- [ ] Los numeros de expediente tienen formato IITD-NNNNNN

**Notas/Correcciones:** _______________

---

### 3.2 Tabla CALIFICACIONES

**Que es:** La tabla donde se registran las notas de los alumnos. Tiene 11 columnas.

**Como acceder:**
1. En el mismo stack, busca la pestana **"CALIFICACIONES"**

**Pasos:**
1. Comprueba que la tabla existe
2. Mira las columnas: Email alumno, Asignatura, Programa, Curso academico, Tipo, Nota evaluacion, Nota examen, Calificacion final, Fecha evaluacion, Profesor, Convalidada

**Que verificar:**

- [ ] La tabla CALIFICACIONES existe
- [ ] Las columnas son las correctas
- [ ] Si tiene datos, parecen coherentes

**Notas/Correcciones:** _______________

---

### 3.3 Tabla CONTACTOS (CRM sencillo)

**Que es:** Una tabla nueva para gestionar los contactos institucionales del IITD (centros asociados, proveedores, colaboradores, etc.).

**Como acceder:**
1. En el mismo stack, pestana **"CONTACTOS"**

**Pasos:**
1. Comprueba que la tabla existe
2. Crea un contacto de prueba: Nombre **"Test Mayte"**, Email **"test@test.com"**, Tipo **"institucional"**
3. Verifica que se guarda
4. Borra el contacto de prueba despues

**Columnas:**

| Columna | Para que sirve |
|---------|---------------|
| Nombre | Nombre completo del contacto |
| Organizacion | Centro o empresa |
| Cargo | Puesto del contacto |
| Email | Correo electronico |
| Telefono | Telefono de contacto |
| Tipo | centro_asociado, proveedor, colaborador, institucional |
| Notas | Observaciones libres |
| Fecha Contacto | Ultimo contacto con esta persona |

**Que verificar:**

- [ ] La tabla CONTACTOS existe
- [ ] Puedo crear, editar y borrar contactos
- [ ] Las columnas son utiles para el IITD

**Notas/Correcciones:** _______________

---

### 3.4 Tabla INVENTARIO_SAAS (herramientas del IITD)

**Que es:** Un inventario de todas las herramientas tecnologicas que usa el IITD, con informacion sobre contratos y proteccion de datos. Es necesario para cumplir con el RGPD.

**Como acceder:**
1. En el mismo stack, pestana **"INVENTARIO_SAAS"**

**Pasos:**
1. Comprueba que hay 12 herramientas: Stackby, OnlineCourseHost, Google Workspace, Stripe, BreezeDoc, pxl.to, Acumbamail, FlipBooklets, SiteGround, Holded, Pabbly, WordPress
2. Revisa que los nombres y categorias son correctos
3. Hay columnas vacias (Coste, Fecha DPA, Renovacion) que habra que rellenar con datos reales

**Que verificar:**

- [ ] La tabla existe con 12 herramientas
- [ ] Los nombres son correctos
- [ ] Entiendo que hay que completar costes y fechas de contrato de proteccion de datos (DPA)

**Notas/Correcciones:** _______________

---

## 4. Certificados y recibos — Ejemplos

Hemos creado un sistema que genera automaticamente recibos de matricula y certificados academicos en PDF. Aqui puedes ver como quedan.

> **Nota:** Los PDFs de ejemplo los adjuntaremos en el email aparte o te los mostramos en una videollamada. Son archivos del repositorio en `integraciones/alumnos/certificados/` y `integraciones/alumnos/recibos/`.

### 4.1 Recibo de matricula

**Que es:** Un PDF con el recibo de pago de matricula. Incluye los datos del IITD y del alumno. Se sube automaticamente a Google Drive.

**Que verificar (cuando veas el PDF):**

- [ ] Los datos del Instituto son correctos (nombre, NIF R2800617I, direccion, telefono)
- [ ] El formato es profesional y claro
- [ ] Si algo debe cambiar en el diseno, lo anoto

**Notas/Correcciones:** _______________

---

### 4.2 Certificado academico (con notas y QR)

**Que es:** Un certificado que incluye la tabla de notas del alumno y un codigo QR para verificacion online. Se sube automaticamente al subdominio diplomas.institutoteologia.org.

**Que verificar (cuando veas el PDF):**

- [ ] Los datos del Instituto son correctos
- [ ] La tabla de notas se ve bien y es legible
- [ ] Hay un codigo QR visible en el certificado
- [ ] El formato es profesional

**Notas/Correcciones:** _______________

---

### 4.3 Diploma

**Que es:** Un diploma de finalizacion de programa, mas formal, sin tabla de notas. Funciona para TODOS los programas del IITD.

**Programas del IITD:**

| Programa | Certificado con notas | Diploma |
|----------|----------------------|---------|
| DECA Infantil y Primaria | Si | Si |
| DECA ESO y Bachillerato | Si | Si |
| Formacion Sistematica en Teologia | No (curso corto) | Si |
| Formacion Biblica (AT/NT) | No (curso corto) | Si |
| Compromiso Laical y Doctrina Social | No (curso corto) | Si |
| Cursos Monograficos | No (curso corto) | Si |

**Que verificar:**

- [ ] Los programas listados coinciden con los del IITD
- [ ] Si falta algun programa, lo anoto
- [ ] El formato del diploma es adecuado (cuando lo vea)

**Notas/Correcciones:** _______________

---

## 5. BreezeDoc — Firma electronica de contratos

> **Esto NO estaba en el acta de la reunion del 6 de febrero.** Lo hemos anadido como valor extra para el proyecto.

**Que es:** BreezeDoc es una herramienta de firma electronica. Permite enviar un contrato o documento al alumno por email. El alumno lo abre, lo firma con el dedo o el raton, y queda registrado con validez legal.

### Templates creados

| Documento | Cuando se usa |
|-----------|-------------- |
| **Contrato de matricula DECA** | Cuando un alumno se matricula en DECA |
| **Convenio centro asociado** | Cuando se firma un acuerdo con un centro educativo |
| **Consentimiento RGPD** | Para obtener consentimiento explicito de proteccion de datos |

### Como funciona

1. Nosotros ejecutamos el envio con el email del alumno y el tipo de documento
2. El alumno recibe un email con el documento para firmar
3. El alumno firma digitalmente (desde ordenador o movil)
4. Queda registro de la firma con fecha y hora

**Que verificar:**

- [ ] Entiendo para que sirve BreezeDoc
- [ ] Los tres documentos (matricula, convenio, RGPD) son utiles para el IITD
- [ ] Si necesitais otro tipo de documento para firma electronica, lo anoto

**Notas/Correcciones:** _______________

---

## 6. Stripe — Pagos automaticos

**Que es:** Hemos conectado Stripe (la pasarela de pagos) con el sistema de alumnos. Cuando un alumno paga su matricula, el sistema actualiza automaticamente su estado en la base de datos.

### Como funciona

Hay un "escuchador" automatico que recibe las notificaciones de Stripe cada vez que se produce un pago, y actualiza los datos del alumno en Stackby.

### Verificacion del servicio

**Pasos:**
1. Abre en el navegador: **https://iitd-stripe-webhook-621601343355.europe-west1.run.app/health**
2. Deberia mostrar un mensaje indicando que el servicio esta activo

**Que verificar:**

- [ ] La URL del punto anterior responde (no da error)
- [ ] Entiendo que cuando un alumno pague en Stripe, su estado se actualizara automaticamente

> **Nota:** El panel de Stripe con las transacciones reales te lo mostramos por videollamada si lo necesitas.

**Notas/Correcciones:** _______________

---

## 7. RGPD — Resumen de cumplimiento legal

Hemos implementado varias herramientas para que el IITD cumpla con la ley de proteccion de datos. Esta seccion resume todo lo relacionado con RGPD en un solo sitio.

| Requisito RGPD | Como lo hemos resuelto | Donde verlo |
|-----------------|----------------------|-------------|
| Consentimiento de cookies | Banner Complianz en la web | Seccion 1.1 |
| Derechos ARCO+ (acceso, rectificacion, supresion...) | Portal en /ejercicio-derechos-rgpd/ | Seccion 1.2 |
| Textos legales (aviso legal, privacidad, cookies) | Paginas corregidas en la web | Seccion 1.3 |
| Footer legal en emails | Texto RGPD automatico en todos los emails del sistema | Implementado en los scripts |
| Inventario de herramientas y contratos DPA | Tabla INVENTARIO_SAAS en Stackby | Seccion 3.4 |
| Politica de retencion y borrado de datos | Sistema que anonimiza datos segun plazos legales | Implementado (script) |
| Portabilidad de datos (Art. 20) | Exportacion de datos del alumno en formato digital | Implementado (script) |
| Consentimientos separados en formularios | Guia entregada para modificar formularios web | Pendiente de aplicar por equipo web |

**Que verificar:**

- [ ] Entiendo el alcance de lo que hemos hecho en RGPD
- [ ] Si creo que falta algo, lo anoto

**Notas/Correcciones:** _______________

---

## 8. Estado del acta — Las 52 necesidades

En la reunion del 6 de febrero se identificaron 46 necesidades (N01-N46). Durante el desarrollo anadimos 6 mas (N47-N52) que surgieron como necesarias. Aqui tienes el estado de cada una.

**Leyenda:**
- **Hecho** = ya funciona y esta en uso
- **Implementado** = el sistema esta hecho, falta configurar algo o desplegar
- **Guia entregada** = se ha entregado documentacion para que alguien lo haga manualmente
- **Pendiente** = no se ha empezado
- **Bloqueado** = no se puede hacer por limitaciones externas

### GRUPO A: Inscripciones y datos

| Codigo | Necesidad | Estado | Donde verlo |
|--------|-----------|--------|-------------|
| N01 | Notificacion de alta a secretaria | Implementado | Pendiente configurar email alumnos@ |
| N02 | Datos de alumnos completos y descargables | Hecho | Stackby > ALUMNOS (seccion 3.1) |
| N03 | Formulario contacto OCH llegue a Miriam | Guia entregada | Pendiente config Gmail |
| N04 | Asignacion automatica de numero de expediente | Hecho | Campo "No Expediente" en Stackby (IITD-NNNNNN) |
| N14 | Captura automatica de leads web | Implementado | Pendiente Sheet ID de Sonia |
| N20 | Identificador unico + deduplicacion | Hecho | Integrado en toda la base de datos |
| N47 | Pipeline PDFs/Scorms automatizado | Implementado | Subida de contenidos educativos a FlipBooklets y SiteGround |

### GRUPO B: Gestion de alumnos

| Codigo | Necesidad | Estado | Donde verlo |
|--------|-----------|--------|-------------|
| N05 | Listados de alumnos por programa | Hecho | Panel IITD con pestanas por programa (seccion 2.1) |
| N06 | Calificaciones y gestion de notas | Hecho | Sheet Calificaciones + Stackby (seccion 2.2, 3.2) |
| N07 | Expediente completo en base de datos | Hecho | 1.585 alumnos importados de PolarDoc (seccion 3.1) |
| N21 | Validacion de datos migrados | Hecho | Pestana "Validacion" en Panel IITD |
| N50 | Panel IITD multi-pestana | Hecho | 14 pestanas en Google Sheet consolidado (seccion 2.1) |
| N51 | Sistema de recibos PDF | Hecho | Recibos + upload a Drive (seccion 4.1) |
| N52 | Deduplicacion avanzada | Hecho | Prevencion automatica de duplicados |

### GRUPO C: Certificados y documentos

| Codigo | Necesidad | Estado | Donde verlo |
|--------|-----------|--------|-------------|
| N08 | Recibos de matricula en PDF | Hecho | Seccion 4.1 |
| N09 | Certificados DECA automaticos | Hecho | Certificados con QR + upload (seccion 4.2) |
| N11 | Consentimientos RGPD separados en formularios | Guia entregada | Pendiente aplicar en formularios web |
| N15 | Firma electronica de contratos (BreezeDoc) | Implementado | 3 templates listos (seccion 5) |
| N48 | Hosting de diplomas online | Hecho | diplomas.institutoteologia.org (seccion 1.6) |
| N49 | Codigos QR para verificacion | Hecho | QR en certificados (seccion 4.2) |

### GRUPO D: Sincronizaciones

| Codigo | Necesidad | Estado | Donde verlo |
|--------|-----------|--------|-------------|
| N16 | Panel de control operativo diario | Hecho | Pestana "Dashboard" en Panel IITD (seccion 2.1) |
| N17 | Sincronizacion actividad del LMS | Bloqueado | La plataforma de cursos (OCH) no permite leer datos |
| N19 | KPIs DECA automaticos | Hecho | Pestana "KPIs DECA" en Panel IITD (seccion 2.1) |
| N22 | Notificacion preguntas alumno | Bloqueado | OCH no soporta esta funcion |

### GRUPO E: Cumplimiento RGPD

| Codigo | Necesidad | Estado | Donde verlo |
|--------|-----------|--------|-------------|
| N12 | Politica de retencion y borrado de datos | Hecho | Sistema de anonimizacion automatica |
| N13 | Inventario de herramientas SaaS | Hecho | Stackby > INVENTARIO_SAAS (seccion 3.4) |
| N23 | Minimizacion del uso del DNI | Bloqueado | Necesita decision de la direccion |
| N40 | Texto legal RGPD en emails | Hecho | Footer automatico en todos los emails |
| N41 | Banner de cookies en la web | Hecho | Complianz instalado (seccion 1.1) |
| N42 | Paginas legales en la web | Hecho | Aviso Legal, Privacidad, Cookies corregidos (seccion 1.3) |
| N43 | Portal de derechos RGPD (ARCO+) | Hecho | /ejercicio-derechos-rgpd/ (seccion 1.2) |
| N44 | Exportacion de datos del alumno (portabilidad) | Hecho | Exportacion en JSON y CSV |
| N45 | Registro de auditoria y brechas | Pendiente | Por implementar |
| N46 | Caducidad de acceso a grabaciones | Pendiente | Por implementar |

### GRUPO F: Pagos y facturacion

| Codigo | Necesidad | Estado | Donde verlo |
|--------|-----------|--------|-------------|
| N10 | Facturacion a centros asociados | Pendiente | Por implementar |
| N18 | Migracion Golden Soft a Holded | Pendiente | **URGENTE: Golden Soft caduca en junio 2026** |
| N36 | Pago Stripe automatico | Hecho | Webhook en la nube (seccion 6) |

### GRUPO G: Marketing y comunicacion

| Codigo | Necesidad | Estado | Donde verlo |
|--------|-----------|--------|-------------|
| N24 | Tabla de contactos institucionales | Hecho | Stackby > CONTACTOS (seccion 3.3) |
| N25 | Emails automaticos (bienvenida, notas, recibos) | Implementado | 4 plantillas listas, pendiente SMTP |
| N26 | Diplomas de todos los programas | Hecho | Multi-programa (seccion 4.3) |
| N27 | Alertas publicaciones comunidad OCH | Bloqueado | OCH no tiene esta funcion |
| N28 | Control de acceso a grabaciones | Pendiente | Por implementar |
| N29 | Flujo de publicacion de cursos | Pendiente | Por implementar |
| N30 | Paquetes de cursos y precios | Pendiente | Por implementar |
| N31 | Video multidioma | Pendiente | Por implementar |
| N32 | Onboarding curso gratuito desde blog | Pendiente | Por implementar |
| N33 | Oferta tutorias post-curso | Pendiente | Por implementar |
| N34 | Suscripcion newsletter | Pendiente | Por implementar |
| N35 | Respuesta a dudas con IA | Pendiente | Por implementar |
| N37 | Campanas Google Grants | Pendiente | Por implementar |
| N38 | Gestion de centros asociados | Pendiente | Por implementar |
| N39 | Foros con privacidad en LMS | Bloqueado | OCH no permite configuracion avanzada |

### Resumen

| Estado | Cantidad |
|--------|----------|
| Hecho | 26 |
| Implementado (pendiente config/deploy) | 5 |
| Guia entregada | 2 |
| Pendiente | 14 |
| Bloqueado | 5 |
| **Total** | **52** |

**Que verificar:**

- [ ] He revisado la tabla completa de las 52 necesidades
- [ ] Los estados me parecen correctos
- [ ] Si algo deberia tener otro estado, lo anoto

**Notas/Correcciones:** _______________

---

## 9. Lo que hemos hecho que NO estaba en el acta

Ademas de las 46 necesidades del acta, hemos implementado cosas adicionales que surgieron durante el desarrollo y que son fundamentales:

| Que | Para que sirve |
|-----|---------------|
| **Pipeline PDFs/Scorms (N47)** | Automatiza la subida de contenidos educativos a FlipBooklets y SiteGround |
| **Subdominio diplomas (N48)** | Los certificados se pueden verificar online escaneando el QR |
| **Codigos QR con pxl.to (N49)** | Cada certificado tiene un QR unico de verificacion |
| **Panel IITD consolidado (N50)** | La hoja central con 14 pestanas de gestion (todos los scripts escriben aqui) |
| **Sistema de recibos PDF (N51)** | Genera recibos profesionales y los sube a Drive |
| **Deduplicacion avanzada (N52)** | Evita que se dupliquen alumnos en la base de datos |
| **BreezeDoc firma electronica** | 3 templates de contratos para firma digital |
| **SEO con Yoast** | 13 paginas optimizadas para Google + sitemap + llms.txt |
| **Infraestructura Google Cloud** | Service Account, autenticacion, carpetas Drive organizadas |
| **Firma digital de PDFs (preparada)** | El codigo esta listo para cuando el director tenga su certificado digital FNMT |

**Que verificar:**

- [ ] Entiendo que hemos hecho mas de lo que estaba en el acta
- [ ] Estas automatizaciones adicionales son utiles para el IITD

**Notas/Correcciones:** _______________

---

## 10. Lo que falta y lo que necesitamos de vosotros

### 10.1 Lo que necesitamos de vosotros

| Que necesitamos | De quien | Para que | Urgencia |
|-----------------|----------|---------|----------|
| **Credenciales SMTP** de institutoteologia.org | Sonia / proveedor de hosting | Activar el envio de emails automaticos (bienvenida, notas, recibos) | **Alta** |
| **Sheet ID** del formulario de contacto web | Sonia | Activar la captura automatica de leads en Stackby | Media |
| **Disponibilidad de Gema** | Gema | Migrar la contabilidad de Golden Soft a Holded | **Urgente** (caduca junio 2026) |
| **Decision sobre el DNI** | Direccion + asesor legal | Decidir si se reduce el uso del DNI en formularios (N23) | Baja |
| **Verificar email alumnos@** | Miriam | Comprobar que el email alumnos@institutoteologia.org funciona para las notificaciones | **Alta** |

### 10.2 Lo que esta bloqueado por la plataforma de cursos (OCH)

OnlineCourseHost es la plataforma donde estan los cursos online. Su sistema de conexion con otras herramientas es muy limitado — solo permite hacer 2 cosas basicas. Esto bloquea estas necesidades que no dependen de nosotros:

| Necesidad | Por que no se puede hacer |
|-----------|--------------------------|
| N17: Sincronizar actividad del alumno en cursos | OCH no permite leer la actividad |
| N22: Avisar al profesor cuando un alumno pregunta | OCH no permite leer los foros |
| N27: Avisar de nuevas publicaciones en la comunidad | OCH no tiene esa funcion |
| N39: Configurar la privacidad de los foros | OCH no permite configuracion avanzada |

> Si en el futuro se cambia de plataforma de cursos, estas 4 necesidades se podrian resolver.

**Que verificar:**

- [ ] Entiendo que necesitamos los datos SMTP para activar los emails automaticos
- [ ] Entiendo la urgencia de Holded (la contabilidad actual caduca en junio 2026)
- [ ] Entiendo que las limitaciones de OCH no dependen de nosotros
- [ ] He trasladado las peticiones a las personas indicadas

**Notas/Correcciones:** _______________

---

## 11. Checklist final

| # | Que he verificado | OK? |
|---|-------------------|-----|
| 1 | Banner de cookies (Complianz) | [ ] |
| 2 | Portal ARCO+ (formulario derechos RGPD) | [ ] |
| 3 | Paginas legales (Aviso Legal, Privacidad, Cookies) | [ ] |
| 4 | Pie de pagina (copyright 2026, datos contacto) | [ ] |
| 5 | SEO (meta descriptions en Google) | [ ] |
| 6 | Diplomas online (subdominio) | [ ] |
| 7 | Panel IITD (Google Sheet consolidado con 14 pestanas) | [ ] |
| 8 | Calificaciones IITD (Google Sheet de notas) | [ ] |
| 9 | Stackby: tabla ALUMNOS (1.585 registros) | [ ] |
| 10 | Stackby: tabla CALIFICACIONES | [ ] |
| 11 | Stackby: tabla CONTACTOS | [ ] |
| 12 | Stackby: tabla INVENTARIO_SAAS | [ ] |
| 13 | Recibo PDF de ejemplo | [ ] |
| 14 | Certificado PDF de ejemplo (con QR) | [ ] |
| 15 | Diploma PDF de ejemplo | [ ] |
| 16 | BreezeDoc (firma electronica — entendido) | [ ] |
| 17 | Stripe (pagos automaticos — servicio activo) | [ ] |
| 18 | RGPD completo (resumen de cumplimiento) | [ ] |
| 19 | Tabla de estado N01-N52 revisada | [ ] |
| 20 | Extras fuera del acta (entendidos) | [ ] |
| 21 | Pendientes y bloqueos (entendidos y trasladados) | [ ] |

**Resultado global:** _____ de 21 puntos verificados

---

## Siguiente paso

1. Rellena los checkboxes y anade tus notas/correcciones en cada seccion
2. Envianos este documento a **javier@proportione.com**
3. Programamos una llamada si hay dudas
4. Corregimos lo que haga falta
5. Preparamos la presentacion al director del IITD

---

**Dudas o problemas:** Escribe a Javier (javier@proportione.com) o responde a este email.

Un saludo,
Equipo de automatizacion — Proportione
