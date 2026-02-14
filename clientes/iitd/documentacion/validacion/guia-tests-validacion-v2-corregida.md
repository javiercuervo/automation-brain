# Guía de Validación IITD - Versión 2 (Corregida)

**Para:** Mayte Tortosa (comercial@institutoteologia.org)
**Fecha:** 12 de febrero de 2026
**Versión:** 2.0 - Corregida según feedback

---

## ⚠️ IMPORTANTE - Lee esto primero

Esta guía ha sido **actualizada** después de tu primer round de testing. Hemos corregido:

✅ **Accesos proporcionados:** Stackby, Calificaciones Sheet
✅ **Pestañas creadas:** Dashboard y KPIs DECA en Panel IITD
✅ **PDFs de ejemplo:** Adjuntos en carpeta compartida de Drive
✅ **Documentación corregida:** Nombres de columnas actualizados
✅ **Problemas conocidos documentados:** Diplomas online (DNS pendiente), BreezeDoc (en configuración)

**TODO ES AUTOEXPLICATIVO** - No necesitas llamadas ni demos para completar esta guía.

---

## 0. Antes de empezar - Verifica tus accesos

| Herramienta | URL / Ubicación | Login | Estado |
|-------------|-----------------|-------|--------|
| **Web IITD** | institutoteologia.org | Público (sin login) | ✅ Disponible |
| **Stackby** | [stackby.com](https://stackby.com) → Stack "IITD Matriculación" | mayte.tortosa@proportione.com | ✅ Invitación enviada |
| **Panel IITD** | [Enlace directo](INSERTAR_URL_AQUI) | Tu cuenta Google Proportione | ✅ Compartido |
| **Calificaciones IITD** | [Enlace directo](INSERTAR_URL_AQUI) | Tu cuenta Google Proportione | ✅ Compartido |
| **PDFs de ejemplo** | [Carpeta Drive](INSERTAR_URL_AQUI) | Tu cuenta Google Proportione | ✅ Compartida |

### Checklist de accesos

- [ ] Puedo abrir institutoteologia.org
- [ ] Tengo invitación a Stackby en mi email
- [ ] Puedo abrir Panel IITD
- [ ] Puedo abrir Calificaciones IITD
- [ ] Puedo ver la carpeta con PDFs de ejemplo

**Si algún acceso NO funciona:** Escribe a javier.cuervo@proportione.com indicando cuál.

---

## 1. La Web - Pruebas en navegador

### 1.1 Banner de Cookies (Complianz)

**Qué verificar:**

1. Abre Chrome en **modo incógnito** (Ctrl+Shift+N)
2. Ve a **institutoteologia.org**
3. Debe aparecer banner con texto en español
4. Haz clic en "Aceptar" → banner desaparece
5. Cierra y reabre → banner NO debe reaparecer
6. Busca botón "Gestionar consentimiento" (esquina inferior derecha)
7. Haz clic → debe reaparecer panel de preferencias

**Checklist:**

- [ ] Banner aparece en modo incógnito
- [ ] Al aceptar, desaparece y no vuelve
- [ ] Botón "Gestionar consentimiento" presente y funcional
- [ ] Texto en español y legible

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 1.2 Portal ARCO+ - Derechos RGPD

**Qué verificar:**

1. Ve a **institutoteologia.org/ejercicio-derechos-rgpd/**
2. Verifica que el formulario se ve correctamente:
   - ✅ **CORREGIDO:** Maquetación ajustada para PC y móvil
   - Debe tener campos: Nombre, Email, DNI (opcional), Tipo de derecho, Mensaje
   - Desplegable con 6 opciones: Acceso, Rectificación, Supresión, Portabilidad, Oposición, Limitación

**Prueba de envío:**

3. Rellena con datos de prueba:
   - Nombre: `Test Mayte V2`
   - Email: `comercial@institutoteologia.org`
   - Tipo: Acceso
   - Mensaje: `Prueba versión 2 de tests`
4. Marca checkbox de aceptación
5. Envía
6. **Verificación de email:**
   - Abre informacion@institutoteologia.org
   - Busca email con asunto tipo "Nueva solicitud de derechos RGPD"
   - Verifica que contiene tus datos

**Checklist:**

- [ ] Página se ve correctamente en PC (sin elementos cortados)
- [ ] Página se ve correctamente en móvil
- [ ] Desplegable tiene las 6 opciones correctas
- [ ] Al enviar, RECIBO email de confirmación en informacion@
- [ ] Email contiene los datos del formulario
- [ ] Página menciona plazo de 30 días
- [ ] Hay enlace a AEPD (Agencia Española de Protección de Datos)

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 1.3 Páginas Legales

**Qué verificar:**

1. Ve al pie de página de institutoteologia.org
2. Haz clic en cada enlace y verifica los datos:

**Aviso Legal** (institutoteologia.org/aviso-legal/)
- [ ] NIF: R2800617I
- [ ] Dirección: Calle Iriarte 3, 28028 Madrid
- [ ] Teléfono: 91 401 50 62
- [ ] Email: informacion@institutoteologia.org
- [ ] Dominio correcto: institutoteologia.org

**Privacidad** (institutoteologia.org/politica-de-privacidad/)
- [ ] Mismos datos correctos
- [ ] Menciona derechos ARCO+
- [ ] Enlace a formulario de ejercicio de derechos

**Cookies** (institutoteologia.org/politica-de-cookies/)
- [ ] ✅ **CORREGIDO:** Página re-maquetada
- [ ] Mismo formato que otras páginas legales
- [ ] Explica tipos de cookies usadas
- [ ] Datos de contacto correctos

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 1.4 Pie de Página (Footer)

**Qué verificar:**

1. Ve a cualquier página de institutoteologia.org
2. Baja hasta el final

**Checklist:**

- [ ] Copyright: "Instituto Internacional de Teología © 2026"
- [ ] Teléfono: +34 91 401 50 62
- [ ] Email: informacion@institutoteologia.org
- [ ] Dirección: Calle Iriarte 3, CP 28028 Madrid
- [ ] Enlace "Política de cookies (UE)" NO está en menú principal (solo en footer)

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 1.5 SEO - Posicionamiento Google

**Qué verificar:**

1. Abre Google
2. Busca: **"instituto teologia a distancia"**
3. Anota si aparece institutoteologia.org
4. Si aparece, anota si tiene descripción coherente debajo del título

**Nota:** Google puede tardar días en actualizar. Si no aparece o la descripción no está optimizada, es normal.

**Checklist:**

- [ ] He buscado la frase en Google
- [ ] Aparece institutoteologia.org: ☐ SÍ ☐ NO
- [ ] Tiene descripción optimizada: ☐ SÍ ☐ NO ☐ NO APLICA

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 1.6 Diplomas Online - Verificación QR

**⚠️ ESTADO ACTUAL:** Subdominio diplomas.institutoteologia.org está **pendiente de configuración DNS**.

**Qué verificar:**

1. Ve a **diplomas.institutoteologia.org**
2. **Resultado esperado:** Error 404 o mensaje "Sitio no encontrado"
3. **Esto es NORMAL** - El DNS se configurará próximamente

**Cómo funcionará cuando esté activo:**

- Los certificados incluyen un código QR
- Al escanearlo, descarga el PDF desde diplomas.institutoteologia.org/IITD-XXXXXX.pdf
- Permite verificar autenticidad del certificado

**Checklist:**

- [ ] Entiendo que el subdominio está pendiente de activación
- [ ] Entiendo que los certificados tendrán QR de verificación
- [ ] Sé que no puedo probar esto hasta que el DNS esté activo

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

## 2. Google Sheets - Paneles de Gestión

### 2.1 Panel IITD (Hoja Principal)

**Cómo acceder:**

1. Abre el enlace compartido: [Panel IITD](INSERTAR_URL_AQUI)
2. Usa tu cuenta Google de Proportione

**Qué verificar:**

**Pestañas por programa:**
- [ ] Pestaña "DECA" existe y tiene alumnos
- [ ] Pestaña "Evangelizadores" existe
- [ ] Pestaña "Formación Sistemática" existe
- [ ] Pestaña "Formación Bíblica" existe
- [ ] Pestaña "Compromiso Laical" existe
- [ ] Pestaña "Otros" existe
- [ ] Los datos parecen coherentes (nombres, emails, programas)

**Pestaña Resumen:**
- [ ] Pestaña "Resumen" existe
- [ ] Muestra totales por programa
- [ ] Muestra totales por estado (activo, baja, etc.)

**✅ Pestaña Dashboard (NUEVA - CREADA):**
- [ ] Pestaña "Dashboard" existe
- [ ] Muestra pipeline de alumnos (etapas: solicitud → matriculado → pagado)
- [ ] Muestra alertas:
  - Alumnos con solicitud >7 días sin respuesta
  - Alumnos con >14 días sin pago
- [ ] Muestra actividad reciente

**✅ Pestaña KPIs DECA (NUEVA - CREADA):**
- [ ] Pestaña "KPIs DECA" existe
- [ ] Muestra embudo de conversión:
  - Cuántos solicitan info
  - Cuántos se matriculan
  - Cuántos pagan
- [ ] Desglose por variante:
  - DECA Infantil y Primaria
  - DECA ESO y Bachillerato

**✅ Pestaña Recibos (CORREGIDA):**
- [ ] Pestaña "Recibos" existe
- [ ] Tiene columnas: Alumno, Email, Programa, Fecha, Enlace PDF
- [ ] Los enlaces a PDFs funcionan (abren el recibo en Drive)

**✅ Pestaña Certificados (CORREGIDA):**
- [ ] Pestaña "Certificados" existe
- [ ] Tiene columnas: Alumno, Email, Programa, Fecha emisión, Enlace PDF
- [ ] Los enlaces a PDFs funcionan

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 2.2 Calificaciones IITD (Hoja de Notas)

**Cómo acceder:**

1. Abre el enlace compartido: [Calificaciones IITD](INSERTAR_URL_AQUI)

**✅ Estructura actualizada (orden real de columnas en el Sheet):**

```
1. Email alumno
2. Nombre
3. Apellidos
4. Programa
5. Asignatura
6. Nota evaluación
7. Nota examen
8. Calificación final
9. Profesor
10. Convalidada
```

**Nota:** El Sheet tiene 10 columnas. La tabla Stackby tiene 13 columnas adicionales (Notas, Curso académico, Fecha evaluación) que no se sincronizan al Sheet.

**Qué verificar:**

- [ ] Puedo abrir el Sheet
- [ ] Tiene ~3.573 filas (397 alumnos DECA × 9 módulos)
- [ ] Las columnas siguen el orden indicado arriba
- [ ] ✅ Columnas Nombre y Apellidos están presentes
- [ ] Las 9 asignaturas DECA son correctas:
  1. Sagrada Escritura
  2. Teología Dogmática
  3. Teología Moral
  4. Teología Espiritual
  5. Liturgia
  6. Historia de la Iglesia
  7. Derecho Canónico
  8. Filosofía
  9. Pastoral

**Nota:** Las columnas de notas pueden estar vacías - los profesores las rellenarán.

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

## 3. Stackby - Base de Datos

### 3.1 Acceso Inicial

**Pasos:**

1. Ve a **stackby.com**
2. Inicia sesión con mayte.tortosa@proportione.com
3. ✅ Deberías tener acceso al Stack "IITD Matriculación"
4. Si no aparece, busca invitación en tu email

**Checklist:**

- [ ] Puedo iniciar sesión en Stackby
- [ ] Veo el Stack "IITD Matriculación"
- [ ] Puedo abrir el Stack

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 3.2 Tabla ALUMNOS (1.585 registros)

**Qué verificar:**

1. Haz clic en la pestaña "ALUMNOS"
2. Verifica estructura:

**Columnas principales:**
- Nombre completo
- Email
- Teléfono
- Programa
- Estado (activo, baja, pendiente, etc.)
- ✅ **Notas** (contiene Nº Expediente formato IITD-NNNNNN)
- Fecha alta
- Fecha baja
- Observaciones

**Checklist:**

- [ ] Hay aproximadamente 1.585 registros
- [ ] La columna "Notas" contiene números de expediente IITD-NNNNNN
- [ ] Los datos se ven coherentes
- [ ] Busco un alumno por nombre y encuentro sus datos completos

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 3.3 Tabla CALIFICACIONES

**Qué verificar:**

1. Haz clic en la pestaña "CALIFICACIONES"
2. Verifica que existe y tiene las columnas en este orden:

**Columnas Stackby CALIFICACIONES (orden real):**
```
1. Email alumno
2. Nombre
3. Apellidos
4. Notas
5. Calificación final
6. Asignatura
7. Programa
8. Curso académico
9. Nota evaluación
10. Nota examen
11. Fecha evaluación
12. Profesor
13. Convalidada
```

**Checklist:**

- [ ] La tabla existe
- [ ] Tiene columnas Nombre y Apellidos (después de Email alumno)
- [ ] Si tiene datos, son coherentes
- [ ] Entiendo que se sincroniza con el Google Sheet "Calificaciones IITD"

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 3.4 Tabla CONTACTOS (CRM)

**✅ Permisos corregidos:** Ahora puedes crear, editar y borrar contactos.

**Qué verificar:**

**Prueba de creación:**

1. Haz clic en la pestaña "CONTACTOS"
2. Haz clic en "+ Add record"
3. Rellena:
   - Nombre: `Test Mayte V2`
   - Email: `test@test.com`
   - Tipo: `institucional`
   - Organización: `Prueba`
4. Guarda
5. Verifica que aparece en la tabla
6. **Borra el registro de prueba después**

**Columnas:**
- Nombre
- Organización
- Cargo
- Email
- Teléfono
- Tipo (centro_asociado / proveedor / colaborador / institucional)
- Notas
- Fecha Contacto

**Checklist:**

- [ ] Puedo crear un contacto de prueba
- [ ] Puedo editarlo
- [ ] Puedo borrarlo
- [ ] Las columnas son útiles para gestionar contactos del IITD

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 3.5 Tabla INVENTARIO_SAAS

**Qué verificar:**

1. Haz clic en la pestaña "INVENTARIO_SAAS"
2. Debe tener 12 herramientas pre-pobladas:
   - Stackby
   - OnlineCourseHost (OCH)
   - Google Workspace
   - Stripe
   - BreezeDoc
   - pxl.to
   - Acumbamail
   - FlipBooklets
   - SiteGround
   - Holded
   - Pabbly Connect
   - WordPress

**Columnas:**
- Nombre herramienta
- Categoría
- URL
- Proveedor
- DPA firmado (Sí/No)
- Fecha DPA
- Coste mensual
- Fecha renovación
- Responsable
- Notas
- [+4 columnas más técnicas]

**Nota:** Algunas columnas están vacías (Coste, Fecha DPA, etc.) - habrá que rellenarlas con datos reales.

**Checklist:**

- [ ] La tabla tiene 12 herramientas
- [ ] Los nombres son correctos
- [ ] Entiendo que hay que completar costes y fechas de contratos DPA

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

## 4. Certificados y Recibos - Ejemplos

**✅ PDFs de ejemplo generados y compartidos en Drive.**

**Cómo acceder:**

1. Abre la carpeta compartida: [PDFs de ejemplo IITD](INSERTAR_URL_AQUI)
2. Encontrarás:
   - `ejemplo-recibo-matricula.pdf`
   - `ejemplo-certificado-academico.pdf`
   - `ejemplo-diploma.pdf`

### 4.1 Recibo de Matrícula

**Qué verificar:**

- [ ] Datos del Instituto son correctos:
  - Nombre: Instituto Internacional de Teología a Distancia
  - NIF: R2800617I
  - Dirección: Calle Iriarte 3, 28028 Madrid
  - Teléfono: 91 401 50 62
- [ ] Formato profesional y legible
- [ ] Incluye datos del alumno (nombre, programa, importe)
- [ ] Si algo debe cambiar en el diseño, lo anoto

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 4.2 Certificado Académico (con notas y QR)

**Qué verificar:**

- [ ] Datos del Instituto correctos
- [ ] Tabla de notas visible y legible
- [ ] Incluye las 9 asignaturas DECA
- [ ] Hay un código QR en el certificado
- [ ] Formato profesional

**Nota:** El QR enlazará a diplomas.institutoteologia.org cuando el subdominio esté activo.

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

### 4.3 Diploma

**Qué verificar:**

- [ ] Formato más formal que el certificado
- [ ] No incluye tabla de notas (solo nombre, programa, fecha)
- [ ] Adecuado para todos los programas del IITD:
  - DECA Infantil y Primaria
  - DECA ESO y Bachillerato
  - Formación Sistemática en Teología
  - Formación Bíblica (AT/NT)
  - Compromiso Laical y Doctrina Social
  - Cursos Monográficos

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

## 5. BreezeDoc - Firma Electrónica

**⚠️ ESTADO ACTUAL:** Templates en configuración. Documento de prueba será enviado a tu email.

### Cómo funciona

1. Se envía documento por email al alumno
2. El alumno abre el enlace
3. Firma digitalmente (desde ordenador o móvil)
4. Queda registro con validez legal

### Templates creados

| Documento | Cuándo se usa |
|-----------|---------------|
| Contrato de matrícula DECA | Al matricularse en DECA |
| Convenio centro asociado | Al firmar acuerdo con centro educativo |
| Consentimiento RGPD | Para obtener consentimiento explícito de protección de datos |

### Qué verificar

**Cuando recibas el email de prueba:**

- [ ] He recibido email de BreezeDoc en mayte.tortosa@proportione.com
- [ ] El email contiene enlace al documento
- [ ] Al hacer clic, se abre el documento
- [ ] El documento tiene datos poblados (nombre alumno, programa, etc.)
- [ ] Puedo firmar digitalmente (con ratón o dedo en móvil)
- [ ] Después de firmar, recibo confirmación

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

## 6. Stripe - Pagos Automáticos

**Qué verificar:**

1. Abre en el navegador: **https://iitd-stripe-webhook-621601343355.europe-west1.run.app/health**
2. Debe mostrar mensaje: `{"status":"ok","service":"iitd-stripe-webhook"}`
3. Esto confirma que el servicio está activo

**Cómo funciona:**

- Cuando un alumno paga en Stripe
- El webhook recibe la notificación automáticamente
- Actualiza el estado del alumno en Stackby a "Pagado"
- Registra la transacción

**Checklist:**

- [ ] La URL del health check responde OK
- [ ] Entiendo que los pagos se procesan automáticamente

**Nota:** El panel de Stripe con transacciones reales es solo para administradores.

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

## 7. RGPD - Resumen de Cumplimiento

### Qué hemos implementado

| Requisito RGPD | Solución | Dónde verlo |
|----------------|----------|-------------|
| Consentimiento de cookies | Banner Complianz | Sección 1.1 |
| Derechos ARCO+ | Portal web | Sección 1.2 |
| Textos legales | Aviso Legal, Privacidad, Cookies | Sección 1.3 |
| Footer legal en emails | Automático en todos los emails | Implementado en scripts |
| Inventario herramientas | Tabla INVENTARIO_SAAS | Sección 3.5 |
| Política de retención | Sistema de anonimización | Implementado (script) |
| Portabilidad de datos | Exportación JSON/CSV | Implementado (script) |
| Consentimientos separados | Guía para formularios web | Pendiente aplicar |

**Checklist:**

- [ ] He verificado todas las implementaciones RGPD
- [ ] Entiendo el alcance de lo implementado
- [ ] ⚠️ NOTA: Una abogada especialista debe revisar antes de presentar al director

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

## 8. Estado de las 52 Necesidades

### Resumen por estado

| Estado | Cantidad | % |
|--------|----------|---|
| ✅ Hecho | 28 | 53.8% |
| 🔧 Implementado (pendiente config) | 5 | 9.6% |
| 📋 Guía entregada | 2 | 3.8% |
| ⏳ Pendiente | 14 | 26.9% |
| 🚫 Bloqueado (limitaciones externas) | 5 | 9.6% |
| **Total** | **52** | **100%** |

### Necesidades completadas recientemente

- ✅ N06: Tabla CALIFICACIONES (3.573 filas, sync bidireccional)
- ✅ N13: Tabla INVENTARIO_SAAS (12 herramientas, 14 columnas)

### Necesidad urgente

- ⚠️ **N18: Migración Golden Soft → Holded**
  - **CRÍTICO:** Golden Soft caduca en junio 2026
  - Requiere disponibilidad de Gema

**Checklist:**

- [ ] He revisado el resumen de estados
- [ ] Los porcentajes me parecen correctos
- [ ] Entiendo la urgencia de N18

**Notas/Problemas:**
```
_______________________________________________________________________
```

---

## 9. Checklist Final

| # | Qué he verificado | Estado |
|---|-------------------|--------|
| 1 | Banner de cookies (Complianz) | ☐ |
| 2 | Portal ARCO+ (corregido PC+móvil) | ☐ |
| 3 | Páginas legales (Aviso Legal, Privacidad, Cookies) | ☐ |
| 4 | Pie de página (copyright 2026, datos correctos) | ☐ |
| 5 | SEO (búsqueda en Google) | ☐ |
| 6 | Diplomas online (entiendo que está pendiente DNS) | ☐ |
| 7 | Panel IITD - Pestañas por programa | ☐ |
| 8 | Panel IITD - Dashboard (NUEVA) | ☐ |
| 9 | Panel IITD - KPIs DECA (NUEVA) | ☐ |
| 10 | Panel IITD - Recibos (enlaces corregidos) | ☐ |
| 11 | Panel IITD - Certificados (enlaces corregidos) | ☐ |
| 12 | Calificaciones IITD Sheet (con Nombre/Apellidos) | ☐ |
| 13 | Stackby - Tabla ALUMNOS | ☐ |
| 14 | Stackby - Tabla CALIFICACIONES | ☐ |
| 15 | Stackby - Tabla CONTACTOS (con permisos) | ☐ |
| 16 | Stackby - Tabla INVENTARIO_SAAS | ☐ |
| 17 | PDF ejemplo - Recibo | ☐ |
| 18 | PDF ejemplo - Certificado | ☐ |
| 19 | PDF ejemplo - Diploma | ☐ |
| 20 | BreezeDoc - Documento de prueba recibido y firmado | ☐ |
| 21 | Stripe - Health check OK | ☐ |
| 22 | RGPD - Resumen completo | ☐ |
| 23 | Estado N01-N52 revisado | ☐ |

**Resultado:** _____ de 23 puntos verificados

---

## 10. Siguiente Paso

### Cuando termines

1. ✅ Marca todos los checkboxes
2. ✅ Añade tus notas en cada sección "Notas/Problemas"
3. ✅ Envía este documento a javier.cuervo@proportione.com
4. ✅ Si hay problemas, coordinamos correcciones
5. ✅ Si todo está OK, preparamos presentación al director

### Si tienes dudas o bloqueos

- **Email:** javier.cuervo@proportione.com
- **Asunto:** Testing IITD - Duda/Problema en [sección]
- **Incluye:** Captura de pantalla si es problema visual

---

## 📎 Anexos

### Enlaces Útiles

- Stack Stackby IITD: [INSERTAR_URL]
- Panel IITD: [INSERTAR_URL]
- Calificaciones IITD: [INSERTAR_URL]
- PDFs de ejemplo: [INSERTAR_URL]
- Web IITD: https://institutoteologia.org
- Portal ARCO+: https://institutoteologia.org/ejercicio-derechos-rgpd/
- Stripe health check: https://iitd-stripe-webhook-621601343355.europe-west1.run.app/health

### Credenciales

- **Stackby:** mayte.tortosa@proportione.com (usa tu password de Proportione)
- **Google Sheets:** Tu cuenta Google de Proportione
- **Web IITD:** No requiere login (público)

---

**Versión:** 2.1
**Última actualización:** 14 febrero 2026
**Tiempo estimado:** 60-90 minutos para completar todos los tests

✅ **Todo es autoexplicativo - No necesitas demos ni llamadas**
