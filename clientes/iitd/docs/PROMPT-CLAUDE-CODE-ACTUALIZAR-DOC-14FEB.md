# PROMPT PARA CLAUDE CODE - Actualizar Documento Validación IITD (14 Feb 2026)

**Fecha:** 14 febrero 2026
**Documento:** https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit

---

## PROMPT COMPLETO

```
# TAREA: Actualizar Documento Validación IITD con Cambios del 14 Febrero

## CONTEXTO
El 14 de febrero se resolvieron Issues #10 y #11, añadiendo columnas Nombre y Apellidos a la tabla CALIFICACIONES (Stackby + Sheet). El documento de validación compartido (usado por 6 validadores) necesita actualizarse para reflejar estos cambios.

## DOCUMENTO A MODIFICAR
URL: https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit
Método: Usar Playwright MCP (Google Drive)

## CAMBIOS A APLICAR

### CAMBIO 1: Actualizar Sección 2.2 - Sheet Calificaciones IITD

**Ubicación:** Buscar el encabezado "## 2.2 Calificaciones IITD"

**BUSCAR este texto exacto en la sección:**
```
**Columnas:**
- Email alumno
- Asignatura
- Programa (DECA / Formación Sistemática)
- Nota evaluación (0-10)
- Nota examen (0-10)
- Calificación final (APT / NT APT / Convalidada)
- Profesor
- Convalidada (Sí/No)
```

**REEMPLAZAR CON:**
```
**Columnas:** (10 columnas totales - actualizado 14 feb 2026)
1. Email alumno
2. **Nombre** ⭐ NUEVO
3. **Apellidos** ⭐ NUEVO
4. Asignatura
5. Programa (DECA / Formación Sistemática)
6. Nota evaluación (0-10)
7. Nota examen (0-10)
8. Calificación final (APT / NT APT / Convalidada)
9. Profesor
10. Convalidada (Sí/No)

**Cambio reciente (14 feb):** Se añadieron columnas Nombre y Apellidos para facilitar visualización y evitar búsquedas por email. Datos sincronizados automáticamente desde tabla ALUMNOS en Stackby.
```

---

### CAMBIO 2: Actualizar Sección 3.2 - Tabla CALIFICACIONES Stackby

**Ubicación:** Buscar el encabezado "## 3.2 CALIFICACIONES" (en la sección de Stackby)

**CAMBIO 2A: Descripción de columnas**

**BUSCAR este texto (aproximado - puede variar ligeramente):**
```
**Columnas:**
1. Email alumno
2. Asignatura
3. Programa
4. Curso académico
5. Nota evaluación
6. Nota examen
7. Calificación final
8. Fecha evaluación
9. Profesor
10. Convalidada
11. Notas
```

**REEMPLAZAR CON:**
```
**Columnas:** (13 columnas totales - actualizado 14 feb 2026)
1. Email alumno (Short Text) - Clave única
2. **Nombre** (Short Text) ⭐ NUEVO 14 feb
3. **Apellidos** (Short Text) ⭐ NUEVO 14 feb
4. Asignatura (Short Text)
5. Programa (Single Select: DECA / Formación Sistemática)
6. Curso académico (Short Text: "2024-2025")
7. Nota evaluación (Number: 0-10)
8. Nota examen (Number: 0-10)
9. Calificación final (Single Select: APT / NT APT / Convalidada)
10. Fecha evaluación (Date)
11. Profesor (Short Text)
12. Convalidada (Checkbox: Sí/No)
13. Notas (Long Text) - Observaciones del profesor

**Total registros:** 3.573 filas (397 alumnos × 9 módulos aprox.)

**Cambio reciente (14 feb):** Issue #10 RESUELTO - Añadidas columnas Nombre y Apellidos para mejorar usabilidad. Los profesores ahora ven nombres completos en vez de solo emails. Datos sincronizados automáticamente desde tabla ALUMNOS.

**Qué verificar:**
- [ ] Puedo acceder a tabla CALIFICACIONES en Stackby
- [ ] Veo 13 columnas (incluyendo Nombre y Apellidos)
- [ ] Las columnas Nombre y Apellidos están pobladas con datos reales
- [ ] Los datos coinciden entre CALIFICACIONES y ALUMNOS
- [ ] El orden de columnas es: Email, Nombre, Apellidos, Asignatura, Programa, Curso...
```

**CAMBIO 2B: Ejemplo de registro**

**BUSCAR en la misma sección 3.2 (después de las columnas):**
```
**Ejemplo de registro:**
- Email: alumno@ejemplo.com
- Asignatura: Teología Fundamental
- Programa: DECA
```

(Puede tener más campos, buscar la estructura que comienza con "Email:" y "Asignatura:")

**REEMPLAZAR CON:**
```
**Ejemplo de registro real (14 feb 2026):**
- Email: alumno@ejemplo.com
- **Nombre: María** ⭐
- **Apellidos: García López** ⭐
- Asignatura: Teología Fundamental
- Programa: DECA
- Curso académico: 2024-2025
- Nota evaluación: 8.5
- Nota examen: 9.0
- Calificación final: APT
- Fecha evaluación: 15/01/2025
- Profesor: Avelino Revilla
- Convalidada: No
- Notas: Excelente participación en evaluaciones
```

---

### CAMBIO 3: Actualizar Sección 12 - Estado Issues de Mayte

**Ubicación:** Buscar el encabezado "## 12. Registro de Validación Multi-Usuario"

**CAMBIO 3A: Fila de Mayte en la tabla**

**BUSCAR esta fila en la tabla de validadores:**
```
| **Mayte** | QA | 15/24 (62.5%) | 12 Feb 2026 | 12 issues identificados (ver ISSUES-PENDIENTES.md) |
```

**REEMPLAZAR CON:**
```
| **Mayte** | QA | 15/24 (62.5%) | 14 Feb 2026 | **11/12 issues RESUELTOS** (92%) - Issues #10, #11 completados 14 feb |
```

**CAMBIO 3B: Añadir actualización en Notas**

**BUSCAR la sección de Notas (después de la tabla):**
```
**Notas:**
- Cada validador marca su progreso en el Checklist (Sección 11)
- Los comentarios se registran en comunicación externa (email/Slack)
- Issues críticos se documentan en `/clientes/iitd/docs/ESTADO-ISSUES-MAYTE.md`
```

**REEMPLAZAR CON (añadir al final de las notas existentes):**
```
**Notas:**
- Cada validador marca su progreso en el Checklist (Sección 11)
- Los comentarios se registran en comunicación externa (email/Slack)
- Issues críticos se documentan en `/clientes/iitd/docs/ESTADO-ISSUES-MAYTE.md`

**Actualización 14 feb 2026:**
- ✅ **Issue #10 RESUELTO:** Columnas Nombre/Apellidos añadidas a CALIFICACIONES (Secciones 2.2 y 3.2 actualizadas)
- ✅ **Issue #11 RESUELTO:** Documentación de columnas corregida - Guía v2.1 publicada
- ⏸️ **Issue #12 PENDIENTE:** Migración Golden Soft → Holded (requiere coordinación Gema, deadline 15 mayo 2026)
- 📊 **Progreso global issues:** 11/12 completadas (92%)
```

---

### CAMBIO 4 (OPCIONAL): Mención en Sección 9

**Ubicación:** Buscar el encabezado "## 9. Lo que hemos hecho que NO estaba en el acta"

**AÑADIR al final de la tabla/lista existente:**

```
| **Issue #10 y #11 (14 feb)** | Columnas Nombre/Apellidos en CALIFICACIONES (Stackby + Sheet) para mejorar usabilidad | Secciones 2.2 y 3.2 |
| **Guía de validación v2.1** | Documentación actualizada con orden correcto de columnas (13 en Stackby, 10 en Sheet) | Documentación interna |
```

---

## VERIFICACIÓN POST-CAMBIOS

Después de aplicar todos los cambios, verificar visualmente:

1. **Sección 2.2:**
   - ✅ Lista de columnas muestra 10 columnas (no 8)
   - ✅ Menciona "Nombre" y "Apellidos" como NUEVO
   - ✅ Incluye nota "Cambio reciente (14 feb)"

2. **Sección 3.2:**
   - ✅ Lista de columnas muestra 13 columnas (no 11)
   - ✅ Menciona "Nombre" y "Apellidos" con estrella ⭐
   - ✅ Ejemplo actualizado incluye "María" y "García López"
   - ✅ Incluye checkboxes de verificación

3. **Sección 12:**
   - ✅ Fila Mayte muestra "11/12 issues RESUELTOS (92%)"
   - ✅ Fecha actualizada a "14 Feb 2026"
   - ✅ Sección de Notas incluye "Actualización 14 feb 2026" con 4 bullets

4. **Sección 9 (opcional):**
   - ✅ Dos filas nuevas añadidas al final de la tabla

## RESULTADO ESPERADO

1. ✅ 3 secciones modificadas (2.2, 3.2, 12)
2. ✅ Opcionalmente: 1 sección modificada adicional (9)
3. ✅ Todo el contenido existente preservado
4. ✅ Formato mantenido (tablas, listas, negritas)
5. ✅ Documento actualizado reflejando cambios del 14 de febrero

## NOTAS IMPORTANTES

- **NO modificar** otras secciones (0, 1, 4-8, 10, 11, 13)
- **Preservar** todo el formato existente
- **Verificar** que las tablas se mantienen correctamente formateadas
- Si un texto a BUSCAR no se encuentra exactamente, buscar una variación similar
- Reportar cualquier dificultad o texto que no coincida

## COMANDOS DE EJECUCIÓN

Usa Playwright MCP vía Google Drive para:
1. Abrir documento 1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg
2. Aplicar los 4 cambios secuencialmente
3. Guardar automáticamente (Google Docs guarda en tiempo real)
4. Verificar resultado visualmente
5. Reportar éxito o errores encontrados

**Ejecuta ahora y reporta el resultado.**
```

---

## RESUMEN DE CAMBIOS

| Sección | Cambio | Antes | Después |
|---------|--------|-------|---------|
| **2.2 Sheet** | Columnas | 8 columnas | **10 columnas** (+ Nombre, Apellidos) |
| **3.2 Stackby** | Columnas | 11 columnas | **13 columnas** (+ Nombre, Apellidos) |
| **3.2 Stackby** | Ejemplo | Sin nombres | **Con nombres** (María García López) |
| **12 Multi-Usuario** | Estado Mayte | 12 issues identificados | **11/12 RESUELTOS** (92%) |
| **12 Multi-Usuario** | Notas | Sin actualización | **Actualización 14 feb** añadida |
| **9 Novedades** | Items | Original | **+2 filas** (opcional) |

---

## TIEMPO ESTIMADO

- Cambio 1 (Sección 2.2): 2 minutos
- Cambio 2 (Sección 3.2): 3 minutos
- Cambio 3 (Sección 12): 2 minutos
- Cambio 4 (Sección 9): 1 minuto (opcional)
- Verificación: 2 minutos
- **Total:** ~10 minutos

---

**Preparado por:** Javier Cuervo / Proportione
**Fecha:** 14 febrero 2026
**Archivo:** `/clientes/iitd/docs/PROMPT-CLAUDE-CODE-ACTUALIZAR-DOC-14FEB.md`
