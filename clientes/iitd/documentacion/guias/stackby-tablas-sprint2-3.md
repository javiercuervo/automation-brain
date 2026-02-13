# Tablas Stackby — Configuraci&oacute;n manual necesaria

**Fecha:** febrero 2026
**Para:** Miriam / Josete
**Acci&oacute;n requerida:** Crear columnas y tablas en Stackby UI

---

## 1. Tabla ALUMNOS (ya existe) — A&ntilde;adir columna

La tabla ALUMNOS ya tiene 1.583 registros importados de PolarDoc.

**Columna a a&ntilde;adir:**

| Columna | Tipo | Descripci&oacute;n |
|---------|------|------------|
| ID_ALUMNO | Texto | N&uacute;mero de expediente (IITD-NNNNNN). Ya est&aacute; en el campo Notas de cada registro, pero necesitamos columna propia para filtrar y buscar. |

**C&oacute;mo hacerlo:**
1. Abrir la tabla ALUMNOS en Stackby
2. Clic en "+" a la derecha de la &uacute;ltima columna
3. Nombre: `ID_ALUMNO`
4. Tipo: Single Line Text
5. Guardar

Una vez creada, ejecutaremos un script para rellenar autom&aacute;ticamente el ID_ALUMNO de los 1.583 registros.

---

## 2. Tabla CALIFICACIONES (nueva) — Para N06

Esta tabla registra las notas de cada alumno por asignatura. Sustituye la funcionalidad de PolarDoc para calificaciones.

**Columnas:**

| Columna | Tipo | Descripci&oacute;n | Ejemplo |
|---------|------|------------|---------|
| Email alumno | Single Line Text | Email del alumno (clave para cruzar con ALUMNOS) | juan@email.com |
| Asignatura | Single Line Text | Nombre de la asignatura | Teolog&iacute;a Fundamental |
| Programa | Single Select | Plan de estudios | DECA Infantil y Primaria |
| Curso acad&eacute;mico | Single Line Text | A&ntilde;o acad&eacute;mico | 2025/26 |
| Tipo | Single Select | Ordinaria / Extraordinaria / Convalidada | Ordinaria |
| Nota evaluaci&oacute;n | Number | Nota del trabajo/evaluaci&oacute;n continua (0-10) | 7.5 |
| Nota examen | Number | Nota del examen final (0-10) | 8.0 |
| Calificaci&oacute;n final | Single Select | Calificaci&oacute;n oficial | NOTABLE |
| Fecha evaluaci&oacute;n | Date | Fecha de la calificaci&oacute;n | 2026-01-15 |
| Profesor | Single Line Text | Nombre del profesor evaluador | Dr. Garc&iacute;a |
| Convalidada | Checkbox | Si la asignatura est&aacute; convalidada | No |
| Notas | Long Text | Observaciones | Convalidada desde Universidad X |

**Valores para Single Select:**

- **Programa:** DECA Infantil y Primaria, DECA ESO y Bachillerato, Diplomatura CC. Religiosas, Licenciatura CC. Religiosas, Bachillerato CC. Religiosas, Escuela de Evangelizadores, Formaci&oacute;n Sistem&aacute;tica
- **Tipo:** Ordinaria, Extraordinaria, Convalidada
- **Calificaci&oacute;n final:** SOBRESALIENTE, NOTABLE, APROBADO, SUSPENSO, NO PRESENTADO, CONVALIDADA

**C&oacute;mo crear:**
1. En el stack IITD, clic en "Add Table"
2. Nombre: `CALIFICACIONES`
3. Crear cada columna con el tipo indicado

---

## 3. Tabla LEADS (nueva) — Para N14

Para capturar leads del formulario de contacto web.

**Columnas:**

| Columna | Tipo | Descripci&oacute;n |
|---------|------|------------|
| Email | Single Line Text | Email del contacto |
| Nombre | Single Line Text | Nombre completo |
| Tel&eacute;fono | Single Line Text | Tel&eacute;fono de contacto |
| Mensaje | Long Text | Texto del mensaje |
| Fuente | Single Select | De d&oacute;nde viene el lead |
| Fecha | Date | Fecha de contacto |
| Estado | Single Select | Estado del seguimiento |
| Consentimiento marketing | Single Select | S&iacute; / No |
| external_id | Single Line Text | ID generado por el sistema |

**Valores para Single Select:**

- **Fuente:** web_contacto, blog, landing_deca, referido, otro
- **Estado:** nuevo, contactado, interesado, descartado, convertido

---

## 4. Tabla INVENTARIO_SAAS (nueva) — Para N13

Para el inventario de herramientas SaaS y contratos DPA.

**Columnas:**

| Columna | Tipo | Descripci&oacute;n |
|---------|------|------------|
| Herramienta | Single Line Text | Nombre del servicio |
| Categor&iacute;a | Single Select | Tipo de herramienta |
| URL | URL | Web del servicio |
| Responsable | Single Line Text | Qui&eacute;n gestiona la cuenta |
| Coste mensual | Number | Coste en EUR |
| Fecha contrato | Date | Inicio del contrato |
| Fecha renovaci&oacute;n | Date | Siguiente renovaci&oacute;n |
| Tiene DPA | Checkbox | Contrato de tratamiento de datos firmado |
| Fecha DPA | Date | Fecha de firma del DPA |
| Trata datos personales | Checkbox | Si accede a datos de alumnos |
| Transferencia internacional | Checkbox | Si los datos salen de la UE |
| Notas | Long Text | Observaciones |

**Valores para Categor&iacute;a:** LMS, Email Marketing, Contabilidad, Pagos, Almacenamiento, Videoconferencia, Web/CMS, Gesti&oacute;n, Otro

---

## 5. Vistas para N05 (listados de alumnos por curso)

Una vez importados los alumnos, crear estas vistas filtradas en la tabla ALUMNOS:

| Vista | Filtro | Para |
|-------|--------|------|
| DECA Activos | Programa contiene "DECA" AND Estado = "activo" | Profesores DECA |
| Bachillerato Activos | Programa contiene "BACHILLERATO" AND Estado = "activo" | Profesores Bach. |
| Diplomatura Activos | Programa contiene "DIPLOMATURA" AND Estado = "activo" | Profesores Dipl. |
| Todos Activos | Estado = "activo" | Secretar&iacute;a |
| Pendientes de pago | Estado pago = "pendiente" | Administraci&oacute;n |
| Importados PolarDoc | Fuente = "polar" | Verificaci&oacute;n |

**C&oacute;mo crear vistas:**
1. En la tabla ALUMNOS, clic en "+" junto a las pesta&ntilde;as de vista
2. Nombre: (seg&uacute;n tabla)
3. A&ntilde;adir filtros seg&uacute;n la tabla
4. Opcionalmente ocultar columnas que no necesite cada perfil

---

## Resumen de acciones

| Prioridad | Acci&oacute;n | Qui&eacute;n | Tiempo estimado |
|-----------|--------|-------|----------------|
| 1 | A&ntilde;adir columna ID_ALUMNO a ALUMNOS | Miriam/Josete | 2 min |
| 2 | Crear tabla CALIFICACIONES | Miriam/Josete | 10 min |
| 3 | Crear tabla LEADS | Miriam/Josete | 5 min |
| 4 | Crear tabla INVENTARIO_SAAS | Miriam/Josete | 5 min |
| 5 | Crear vistas filtradas en ALUMNOS | Miriam/Josete | 10 min |

Total: ~30 minutos de trabajo manual en Stackby.

Una vez creadas, Proportione ejecutar&aacute; los scripts para:
- Rellenar ID_ALUMNO en los 1.583 registros
- Activar la captura autom&aacute;tica de leads (N14)
- Activar el inventario SaaS (N13)
