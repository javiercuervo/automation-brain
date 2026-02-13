# Plan de Corrección - Tests de Validación Mayte

**Fecha:** 12 febrero 2026
**Origen:** Anotaciones de Mayte en tests de validación
**Documento origen:** [Guía para validar - test MT](https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit)
**Objetivo:** Todo debe ser autoexplicativo - sin necesidad de demos

---

## 📊 Resumen Ejecutivo

**Total de problemas identificados:** 18
- 🔴 **Críticos (bloquean testing):** 7
- 🟡 **Importantes (afectan experiencia):** 6
- 🟢 **Menores (documentación):** 5

**Tiempo estimado de resolución:** 2-3 sprints (4-6 horas de trabajo efectivo)

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. Acceso a "Calificaciones IITD" (Google Sheet)

**Problema:** Mayte marcó "NO ME DEJA" en el acceso al Sheet de Calificaciones.

**Impacto:** No puede validar la sección 2.2 completa.

**Causa probable:**
- Sheet no compartido con su cuenta
- O permisos insuficientes (solo lectura cuando necesita ver estructura)

**Solución:**
```
1. Identificar el Sheet ID de "Calificaciones IITD"
2. Compartir con mayte.tortosa@proportione.com (permiso visualizador)
3. Verificar que puede abrirlo
```

**Responsable:** Javier
**Prioridad:** 🔴 CRÍTICA
**Tiempo estimado:** 5 minutos

---

### 2. Acceso a Stackby

**Problema:** Mayte NO tiene acceso a Stackby con su cuenta.

**Impacto:** No puede validar TODO el Grupo 3 (ALUMNOS, CALIFICACIONES, CONTACTOS, INVENTARIO_SAAS).

**Solución:**
```
1. Ir a Stackby.com
2. Abrir Stack "IITD Matriculación"
3. Invite member > mayte.tortosa@proportione.com
4. Rol: Editor (o Viewer si solo necesita ver)
5. Enviar invitación
```

**Responsable:** Javier (owner de Stackby)
**Prioridad:** 🔴 CRÍTICA
**Tiempo estimado:** 5 minutos

---

### 3. Permisos en Stackby - Tabla CONTACTOS

**Problema:** Mayte indica "NO PUEDO CREAR, EDITAR NI BORRAR CONTACTOS".

**Impacto:** No puede probar la funcionalidad de CRM.

**Causa probable:**
- Permisos de solo lectura en tabla CONTACTOS
- O no tiene invitación al Stack aún (relacionado con problema #2)

**Solución:**
```
1. Resolver primero problema #2 (darle acceso al Stack)
2. Verificar que la tabla CONTACTOS tenga permisos de edición
3. Si sigue sin poder, revisar permisos a nivel de tabla
```

**Responsable:** Javier
**Prioridad:** 🔴 ALTA (depende de #2)
**Tiempo estimado:** 10 minutos

---

### 4. Pestañas Dashboard y KPIs DECA NO EXISTEN

**Problema:** Mayte reporta:
- "La pestaña Dashboard muestra alertas y pipeline. NO EXISTE."
- "La pestaña KPIs DECA muestra el embudo de conversión. NO EXISTE."

**Impacto:** Dos funcionalidades documentadas como "Hechas" no existen.

**Causa:** Discrepancia entre documentación y realidad.

**Soluciones posibles:**

**Opción A - Crear las pestañas (RECOMENDADO):**
```bash
cd /Users/javiercuervolopez/code/automation-brain/clientes/iitd/integraciones/alumnos

# Crear pestaña Dashboard
node dashboard.mjs

# Crear pestaña KPIs DECA
node kpis-deca.mjs
```

**Opción B - Actualizar documentación:**
- Cambiar estado de N16 (Dashboard) y N19 (KPIs DECA) de "Hecho" a "Implementado"
- Explicar que el código está listo pero no desplegado

**Responsable:** Javier
**Prioridad:** 🔴 CRÍTICA
**Tiempo estimado:** 20 minutos (Opción A) o 5 minutos (Opción B)
**Recomendación:** Opción A - ejecutar los scripts para crear las pestañas

---

### 5. BreezeDoc no funciona

**Problema:** Mayte indica "NO SE PUEDE FIRMAR Y VA SIN DATOS".

**Impacto:** No puede validar la firma electrónica (sección 5).

**Causa probable:**
- Templates no configurados con datos reales
- O no se ha enviado un documento de prueba con datos poblados

**Solución:**
```bash
# Generar y enviar documento de prueba con datos reales
cd /Users/javiercuervolopez/code/automation-brain/clientes/iitd/integraciones/alumnos

node breezedoc-enrollment.mjs \
  --email mayte.tortosa@proportione.com \
  --template matricula \
  --alumno-nombre "María" \
  --alumno-apellidos "García López" \
  --programa "DECA Infantil y Primaria"
```

**Responsable:** Javier
**Prioridad:** 🔴 ALTA
**Tiempo estimado:** 30 minutos (verificar templates + enviar prueba)

---

### 6. Enlaces de Recibos no funcionan

**Problema:** "En las pestañas recibos no puedo abrir los enlaces" + captura de pantalla mostrando error.

**Impacto:** No puede verificar que los recibos se generan correctamente.

**Causa probable:**
- PDFs no subidos a Drive
- O permisos de Drive insuficientes para Mayte
- O enlaces rotos en el Sheet

**Solución:**
```
1. Verificar que los PDFs existen en Drive folder "Recibos IITD"
2. Comprobar permisos del folder (debe ser compartido con Mayte)
3. Si los enlaces están rotos, regenerar con:
   cd clientes/iitd/integraciones/alumnos
   node sync-sheets.mjs  # Re-sincronizar para actualizar enlaces
```

**Responsable:** Javier
**Prioridad:** 🔴 ALTA
**Tiempo estimado:** 15 minutos

---

### 7. Enlaces de Certificados dan error

**Problema:** "En la pestaña certificados los enlaces me dan error" + captura.

**Impacto:** No puede verificar que los certificados se generan correctamente.

**Causa probable:** Similar a problema #6.

**Solución:**
```
1. Verificar que los PDFs existen en diplomas.institutoteologia.org
2. Si el subdominio no está activo, los certificados estarán en SiteGround
3. Actualizar enlaces en Sheet o esperar activación DNS del subdominio
4. Alternativa temporal: compartir PDFs por email/Drive
```

**Responsable:** Javier
**Prioridad:** 🔴 ALTA
**Tiempo estimado:** 20 minutos

---

## 🟡 PROBLEMAS IMPORTANTES

### 8. Portal ARCO+ - Problemas visuales

**Problema:** Mayte reporta problemas de visualización en PC y móvil (capturas de pantalla incluidas).

**Impacto:** La página existe pero no se ve correctamente, afecta credibilidad.

**Solución:**
```
1. Revisar las capturas de Mayte
2. Identificar problemas CSS/maquetación
3. Corregir en WordPress:
   - Revisar plugin de formulario
   - Ajustar CSS responsive
   - Probar en distintos dispositivos
```

**Responsable:** Javier o desarrollador web
**Prioridad:** 🟡 ALTA
**Tiempo estimado:** 1 hora

---

### 9. Formulario ARCO+ - No sabe si llega el email

**Problema:** Mayte marcó "NO LO SÉ" en verificar que llega email al enviar el formulario.

**Impacto:** No puede completar la validación de la funcionalidad.

**Solución:**
```
1. Enviar formulario de prueba desde comercial@institutoteologia.org
2. Verificar en informacion@institutoteologia.org si llega
3. Si no llega, revisar configuración del formulario en WordPress
4. Documentar resultado para Mayte
```

**Responsable:** Javier + Mayte (coordinado)
**Prioridad:** 🟡 MEDIA
**Tiempo estimado:** 10 minutos

---

### 10. Diplomas online - Error 404

**Problema:** Mayte ve error 404 en diplomas.institutoteologia.org.

**Impacto:** No puede validar la verificación de certificados con QR.

**Causa:** El subdominio diplomas.institutoteologia.org no tiene DNS configurado aún.

**Solución:**
```
1. Configurar registro DNS:
   - Tipo: CNAME
   - Nombre: diplomas
   - Valor: [servidor SiteGround]
2. Esperar propagación DNS (24-48h)
3. Mientras tanto, explicar en la guía que está pendiente
```

**Responsable:** Javier (acceso DNS del dominio)
**Prioridad:** 🟡 MEDIA
**Tiempo estimado:** 30 minutos + 24-48h propagación

---

### 11. Política de Cookies - Necesita re-maquetación

**Problema:** Mayte indica "hay que volver a maquetar la página https://institutoteologia.org/politica-de-cookies/".

**Impacto:** La página funciona pero no tiene formato adecuado.

**Solución:**
```
1. Revisar la página en WordPress
2. Aplicar formato consistente con otras páginas legales
3. Verificar que se lee bien en móvil y desktop
```

**Responsable:** Javier o desarrollador web
**Prioridad:** 🟡 MEDIA
**Tiempo estimado:** 30 minutos

---

### 12. PDFs de ejemplo - No proporcionados

**Problema:** Todas las secciones de certificados/recibos marcadas como "NO HE VISTO".

**Impacto:** No puede validar el diseño y formato de los documentos.

**Solución:**
```bash
# Generar PDFs de ejemplo
cd /Users/javiercuervolopez/code/automation-brain/clientes/iitd/integraciones/alumnos

# Recibo de ejemplo
node recibo-pdf.mjs --email alumno.prueba@test.com --upload

# Certificado de ejemplo
node certificado-pdf.mjs --email alumno.prueba@test.com --upload

# Enviar PDFs a Mayte por email o compartir carpeta Drive
```

**Responsable:** Javier
**Prioridad:** 🟡 ALTA
**Tiempo estimado:** 15 minutos

---

### 13. RGPD - Debe verificar abogada

**Problema:** Mayte anota "DEBERÍA COMPROBAR LA ABOGADA".

**Impacto:** Sin validación legal, podría haber riesgos de cumplimiento.

**Solución:**
```
1. Preparar documento resumen de medidas RGPD implementadas
2. Coordinar revisión con abogada especialista en protección de datos
3. Incluir: textos legales, política de cookies, portal ARCO+, retención de datos
```

**Responsable:** Javier (preparar doc) + Abogada IITD (revisar)
**Prioridad:** 🟡 MEDIA
**Tiempo estimado:** 2 horas preparación + tiempo abogada

---

## 🟢 PROBLEMAS MENORES (Documentación)

### 14. Columna "Nº Expediente" vs "Notas"

**Problema:** Mayte reporta que en Stackby la columna se llama "Notas" y no "Nº Expediente".

**Impacto:** Confusión al buscar la columna.

**Solución:**
```
Opción A: Renombrar columna en Stackby a "Nº Expediente"
Opción B: Actualizar documentación para indicar "Notas (contiene Nº Expediente)"
```

**Responsable:** Javier
**Prioridad:** 🟢 BAJA
**Tiempo estimado:** 2 minutos

---

### 15. Orden de columnas en CALIFICACIONES

**Problema:** Mayte indica que el orden es diferente al documentado.

**Orden documentado:**
```
Email alumno → Asignatura → Programa → Curso académico → Tipo →
Nota evaluación → Nota examen → Calificación final →
Fecha evaluación → Profesor → Convalidada
```

**Orden real:**
```
Email → Notas → Calificación final → Asignatura → Programa →
Curso académico → Nota Evaluación → Nota examen →
Fecha evaluación → Profesor → Convalidada
```

**Solución:** Actualizar documentación con el orden real.

**Responsable:** Javier
**Prioridad:** 🟢 BAJA
**Tiempo estimado:** 2 minutos

---

### 16. Falta Nombre y Apellidos en CALIFICACIONES

**Problema:** Mayte indica "CREO QUE DEBERÍA TENER NOMBRE Y APELLIDOS".

**Impacto:** Solo hay email, dificulta identificar al alumno visualmente.

**Solución:**
```
Opción A: Añadir columnas "Nombre" y "Apellidos" en Stackby CALIFICACIONES
Opción B: Explicar que el email es suficiente (se hace lookup a ALUMNOS)

Recomendación: Opción A - mejorar usabilidad
```

**Responsable:** Javier
**Prioridad:** 🟢 MEDIA-BAJA
**Tiempo estimado:** 30 minutos (si se implementa columna)

---

### 17. Nombre columna "Notas" en CALIFICACIONES

**Problema:** Hay una columna llamada "Notas" que aparece después de "Email".

**Impacto:** Confusión - ¿es para observaciones o para calificaciones?

**Solución:** Aclarar el propósito de esta columna en la documentación.

**Responsable:** Javier
**Prioridad:** 🟢 BAJA
**Tiempo estimado:** 2 minutos

---

### 18. Checkboxes sin marcar

**Problema:** Múltiples checkboxes sin marcar porque requieren accesos o ejemplos no proporcionados.

**Impacto:** Tests incompletos.

**Solución:** Resolver problemas #1-13 para que Mayte pueda completar todos los checkboxes.

**Responsable:** Javier (resolver dependencias)
**Prioridad:** 🟢 Resultado de otros fixes
**Tiempo estimado:** N/A

---

## 📋 Plan de Acción Priorizado

### Sprint 1 - Accesos y Bloqueos Críticos (1 hora)

**Objetivo:** Desbloquear a Mayte para que pueda hacer testing.

1. ✅ **[5 min]** Compartir Sheet "Calificaciones IITD" con Mayte
2. ✅ **[5 min]** Invitar a Mayte a Stackby con permisos de Editor
3. ✅ **[20 min]** Ejecutar `dashboard.mjs` y `kpis-deca.mjs` para crear pestañas faltantes
4. ✅ **[15 min]** Verificar y corregir enlaces de Recibos en Panel IITD
5. ✅ **[15 min]** Verificar y corregir enlaces de Certificados en Panel IITD

**Output:** Mayte puede acceder a todo y probar funcionalidades core.

---

### Sprint 2 - Documentos y Ejemplos (1 hora)

**Objetivo:** Proporcionar ejemplos visuales y funcionales.

6. ✅ **[15 min]** Generar PDFs de ejemplo (recibo + certificado + diploma)
7. ✅ **[30 min]** Configurar y enviar documento BreezeDoc de prueba a Mayte
8. ✅ **[10 min]** Coordinarse con Mayte para test de formulario ARCO+ (verificar email)
9. ✅ **[5 min]** Actualizar documentación con columnas reales de Stackby

**Output:** Mayte tiene todos los ejemplos necesarios para validar.

---

### Sprint 3 - Mejoras Web y Visuales (2 horas)

**Objetivo:** Corregir problemas de presentación.

10. ⏳ **[1 hora]** Corregir maquetación de Portal ARCO+ (PC + móvil)
11. ⏳ **[30 min]** Re-maquetar página Política de Cookies
12. ⏳ **[30 min]** Configurar DNS para diplomas.institutoteologia.org

**Output:** Web profesional y pulida en todos los dispositivos.

---

### Sprint 4 - Mejoras de Usabilidad (1 hora)

**Objetivo:** Optimizaciones sugeridas por Mayte.

13. ⏳ **[30 min]** Añadir columnas Nombre/Apellidos en CALIFICACIONES
14. ⏳ **[2 min]** Renombrar columna "Notas" a "Nº Expediente" en ALUMNOS
15. ⏳ **[2 min]** Aclarar propósito de columna "Notas" en CALIFICACIONES
16. ⏳ **[30 min]** Preparar doc resumen RGPD para abogada

**Output:** Sistema más usable y documentación precisa.

---

## 📝 Nueva Guía de Tests (Corregida)

Después de resolver los problemas, se generará una **nueva versión de la guía de tests** que:

1. **Elimine requisitos de "demo"** - Todo autoexplicativo
2. **Incluya enlaces directos** - Sheet IDs, URLs exactas
3. **Proporcione ejemplos** - PDFs adjuntos o enlaces a Drive
4. **Corrija nombres de columnas** - Coincidan con la realidad
5. **Actualice estados** - Solo incluya lo que realmente existe
6. **Añada instrucciones claras** - Paso a paso sin ambigüedad

---

## ✅ Checklist de Resolución

### Antes de entregar nueva guía:

- [ ] Mayte tiene acceso a Calificaciones IITD Sheet
- [ ] Mayte tiene acceso a Stackby (Editor)
- [ ] Mayte puede crear/editar en Stackby CONTACTOS
- [ ] Pestaña Dashboard existe en Panel IITD
- [ ] Pestaña KPIs DECA existe en Panel IITD
- [ ] Enlaces de Recibos funcionan en Panel IITD
- [ ] Enlaces de Certificados funcionan en Panel IITD
- [ ] BreezeDoc envía documentos con datos poblados
- [ ] PDFs de ejemplo generados y compartidos
- [ ] Portal ARCO+ se ve correctamente en PC y móvil
- [ ] Formulario ARCO+ envía emails correctamente
- [ ] Política de Cookies está bien maquetada
- [ ] Documentación coincide con nombres reales de columnas
- [ ] DNS de diplomas.institutoteologia.org configurado (o explicado como pendiente)

### Después de resolver:

- [ ] Mayte re-ejecuta todos los tests
- [ ] Mayte marca todos los checkboxes
- [ ] Nueva versión de guía publicada
- [ ] Tests superados al 100%

---

## 📞 Responsables y Contactos

**Javier Cuervo** (javier.cuervo@proportione.com)
- Accesos y permisos
- Ejecución de scripts
- Correcciones técnicas

**Mayte Tortosa** (mayte.tortosa@proportione.com)
- Testing y validación
- Feedback de usabilidad

**Abogada IITD** (pendiente identificar)
- Revisión RGPD

---

## 🎯 Objetivo Final

**Guía de tests 100% autoexplicativa donde Mayte pueda:**
1. Acceder a todas las herramientas sin pedir ayuda
2. Ver ejemplos reales de todos los documentos
3. Probar todas las funcionalidades paso a paso
4. Marcar 21/21 checkboxes sin bloqueos
5. Validar que todo funciona según documentado

**Fecha objetivo:** 14 febrero 2026
**Tiempo total estimado:** 5-6 horas de trabajo efectivo (distribuido en 4 sprints)
