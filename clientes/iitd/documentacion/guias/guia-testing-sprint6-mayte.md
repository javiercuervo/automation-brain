# Instrucciones de Testing — Sprint 6 IITD

**Para:** Mayte (comercial@institutoteologia.org)
**De:** Equipo de automatizacion — Proportione
**Fecha:** 11 de febrero de 2026

---

Hola Mayte,

En este documento tienes las instrucciones paso a paso para verificar las nuevas funcionalidades que hemos implementado para el IITD. No necesitas conocimientos tecnicos — solo seguir los pasos y marcar cada punto como verificado.

---

## 1. Banner de cookies en la web

**Que es:** Un banner que aparece al entrar en la web pidiendo permiso para usar cookies. Es obligatorio por la ley de proteccion de datos (RGPD).

### Pasos para verificar

Cuando el banner este instalado en la web (lo hara Sonia o el equipo web):

1. Abre una ventana de **navegador en modo incognito** (Ctrl+Shift+N en Chrome)
2. Ve a **institutoteologia.org**
3. Deberia aparecer un banner oscuro en la parte inferior con tres botones:
   - **"Aceptar todas"** — acepta todas las cookies
   - **"Solo necesarias"** — solo las imprescindibles
   - **"Configurar"** — permite elegir que cookies aceptar
4. Haz clic en **"Aceptar todas"** → el banner debe desaparecer
5. Cierra la pestana y vuelve a entrar en la web → el banner **NO** debe aparecer (recuerda tu eleccion)
6. En el pie de pagina, busca un enlace **"Configurar cookies"** → al hacer clic, debe reaparecer el banner

### Que verificar

- [ ] El banner aparece la primera vez que entro
- [ ] Los tres botones funcionan
- [ ] Al aceptar, el banner desaparece y no vuelve a aparecer
- [ ] El enlace "Configurar cookies" del pie de pagina reabre el banner

**Nota:** Si el banner aun no esta instalado en la web, no te preocupes. El codigo esta preparado y lo instalara el equipo web.

---

## 2. Portal ARCO+ (formulario de derechos RGPD)

**Que es:** Una pagina donde los alumnos pueden solicitar sus derechos sobre sus datos personales (ver sus datos, corregirlos, borrarlos, etc.).

### Pasos para verificar

Cuando el formulario este publicado en la web:

1. Ve a **institutoteologia.org/ejercicio-derechos-rgpd/** (o la URL que os confirmen)
2. Deberia aparecer un formulario con estos campos:
   - Nombre completo
   - Correo electronico
   - DNI/NIE (opcional)
   - Tipo de derecho (desplegable con 6 opciones)
   - Mensaje (opcional)
   - Checkbox de aceptacion
3. Rellena el formulario con datos de prueba:
   - Nombre: **Test Mayte**
   - Email: **comercial@institutoteologia.org**
   - Tipo de derecho: **Acceso**
   - Mensaje: **Esto es una prueba de testing**
4. Marca el checkbox y pulsa **"Enviar solicitud"**
5. Verifica que llega un email a **informacion@institutoteologia.org** con los datos del formulario

### Que verificar

- [ ] El formulario se ve bien en la web
- [ ] El desplegable tiene 6 opciones (Acceso, Rectificacion, Supresion, Portabilidad, Oposicion, Limitacion)
- [ ] Al enviar, se recibe un email con los datos
- [ ] El texto legal es claro y menciona plazo de 30 dias

**Nota:** Si el formulario aun no esta publicado, puedes abrir el archivo `arco-portal.html` directamente en tu navegador para verlo.

---

## 3. Diplomas multi-programa

**Que es:** Ahora el sistema de certificados funciona para TODOS los programas del IITD, no solo para los DECA.

### Programas disponibles

| Programa | Certificado academico (con notas) | Diploma |
|----------|-----------------------------------|---------|
| DECA Infantil y Primaria | Si | Si |
| DECA ESO y Bachillerato | Si | Si |
| Formacion Sistematica en Teologia | No (curso corto) | Si |
| Formacion Biblica (AT/NT) | No (curso corto) | Si |
| Compromiso Laical y Doctrina Social | No (curso corto) | Si |
| Cursos Monograficos | No (curso corto) | Si |

### Que verificar

- [ ] Los programas listados arriba coinciden con los programas reales del IITD
- [ ] Si falta algun programa, avisanos para anadirlo
- [ ] Las asignaturas de cada programa son correctas (las revisaremos contigo si es necesario)

**Nota:** Los certificados se generan con un script tecnico. Tu solo necesitas verificar que los programas y asignaturas son correctos.

---

## 4. Tabla de contactos en Stackby

**Que es:** Una tabla nueva en Stackby para gestionar los contactos institucionales del IITD (centros asociados, proveedores, colaboradores, etc.).

### Como acceder

1. Ve a **stackby.com** e inicia sesion con tu cuenta de Proportione (`mayte.tortosa@proportione.com`)
   - Si no tienes cuenta, Javier te enviara una invitacion al stack
2. Busca el stack **"IITD Matriculacion"**
3. En la parte inferior, veras las pestanas de las tablas. Busca **"CONTACTOS"**
4. Haz clic en CONTACTOS

### Columnas de la tabla

| Columna | Para que sirve |
|---------|---------------|
| **Nombre** | Nombre completo del contacto |
| **Organizacion** | Centro o empresa |
| **Cargo** | Puesto del contacto |
| **Email** | Correo electronico |
| **Telefono** | Telefono de contacto |
| **Tipo** | Clasificacion: centro_asociado, proveedor, colaborador, institucional |
| **Notas** | Observaciones libres |
| **Fecha Contacto** | Ultimo contacto con esta persona |

### Prueba

1. Haz clic en la fila vacia de abajo para crear un contacto nuevo
2. Escribe un contacto de prueba:
   - Nombre: **Test Contacto**
   - Email: **test@test.com**
   - Tipo: **institucional**
3. Verifica que se guarda correctamente
4. Puedes borrar el contacto de prueba despues

### Que verificar

- [ ] Puedo acceder a Stackby con mi cuenta
- [ ] La tabla CONTACTOS existe y puedo verla
- [ ] Las columnas son las correctas
- [ ] Puedo crear, editar y borrar contactos

---

## 5. Sistema de email (informativo)

**Que es:** Hemos creado las plantillas y el sistema para enviar emails automaticos a los alumnos.

### Plantillas creadas

| Plantilla | Cuando se envia |
|-----------|----------------|
| **Bienvenida** | Al matricularse un alumno |
| **Notas publicadas** | Cuando se publican calificaciones |
| **Recibo adjunto** | Con el recibo de matricula |
| **Recordatorio pago** | Si hay pagos pendientes |

**Nota:** El envio automatico aun no esta activo porque necesitamos que nos proporcioneis los datos de acceso al servidor de correo (SMTP) del dominio institutoteologia.org. Cuando los tengamos, activaremos el envio automatico.

### Que necesitamos de vosotros

- [ ] Acceso SMTP del dominio institutoteologia.org (preguntad al proveedor de hosting/email)
  - Servidor SMTP (ej: smtp.institutoteologia.org)
  - Puerto (normalmente 587 o 465)
  - Usuario (normalmente una direccion email)
  - Contrasena

---

## Resumen — Checklist final

| # | Funcionalidad | Estado |
|---|--------------|--------|
| 1 | Banner de cookies | [ ] Verificado |
| 2 | Portal ARCO+ | [ ] Verificado |
| 3 | Diplomas multi-programa | [ ] Programas correctos |
| 4 | Tabla de contactos | [ ] Verificado |
| 5 | Plantillas email | [ ] Datos SMTP proporcionados |

---

**Dudas o problemas:** Escribe a Javier (javier@proportione.com) o responde a este email.

Un saludo,
Equipo de automatizacion — Proportione
