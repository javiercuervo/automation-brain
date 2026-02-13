# Instrucciones para Actualizar Google Docs de Mayte

**Documento:** https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit
**Fecha:** 13 febrero 2026
**Cambios:** 5 secciones a añadir/actualizar

---

## 📍 CAMBIO 1: Añadir Nueva Sección 2.3 (DESPUÉS de sección 2.2)

**Ubicación:** Entre la sección "2.2 Calificaciones IITD (hoja de notas)" y "3. Stackby — La base de datos"

**Acción:** Copiar y pegar el siguiente contenido:

```markdown
---

## 2.3 Sheets Profesores - Sistema de Gestión de Notas

**⭐ NOVEDAD 13 Feb 2026:** Cada profesor tiene su propio Sheet para poner notas.

**Qué es:** Sistema automatizado donde profesores gestionan calificaciones en Sheets individuales que se sincronizan con Stackby.

**Profesores con Sheet activo:**
1. **Avelino Revilla** - Teología Fundamental, Sagrada Escritura
2. **Javier Sánchez** - Cristología, Eclesiología, Moral, Liturgia
3. **Antonio Salas** - Pedagogía y Didáctica de la Religión

**Cómo funciona:**
1. Profesor abre su Sheet (enlace compartido)
2. Ve pestañas por programa (DECA, Formación Sistemática)
3. Completa: Nota evaluación, Nota examen, Calificación final
4. Sistema sincroniza automáticamente a Stackby
5. Datos disponibles en Panel IITD y para alumnos

**Enlaces a Sheets profesores:**
- Avelino Revilla: [Sheet Avelino](https://docs.google.com/spreadsheets/d/19iNZX1iynhYBe8dyg_Hms0c-N4oz_cTqMknCFTiCEwc/)
- Javier Sánchez: [Sheet Javier](https://docs.google.com/spreadsheets/d/1rXbSOxqbbtNftrllnuzJcQnHGlU3RRjgHTk0ViiTqQs/)
- Antonio Salas: [Sheet Antonio](https://docs.google.com/spreadsheets/d/1wytYZqMDvE4t3a4HNqvDCwNoGezmsQzUWLPebu7u3bk/)

**Qué verificar:**
- [ ] Puedo abrir al menos uno de los Sheets profesores
- [ ] Tiene pestañas por programa (ej: DECA)
- [ ] Estructura: Email | Nombre | Apellidos | Asignatura | Nota evaluación | Nota examen | Calificación final | Convalidada
- [ ] Los alumnos listados corresponden al programa
- [ ] Entiendo que profesores rellenan columnas de notas

**Comandos técnicos (informativo):**
```
npm run profes:init     # Inicializar Sheets (ya ejecutado)
npm run profes:sync     # Sincronizar notas a Stackby
npm run profes:refresh  # Refrescar con datos actuales
```

**Notas/Problemas:** _______________________________________________
```

---

## 📍 CAMBIO 2: Actualizar Sección 8 - Estado de las 52 Necesidades

**Ubicación:** Sección "8. Estado del acta — Las 52 necesidades" → Subsección "GRUPO B: Gestión de alumnos"

### 2.1 Actualizar N06

**Acción:** Buscar la fila de N06 y reemplazar con:

```markdown
| N06 | Calificaciones numéricas y gestión de notas | ✅ Hecho | Tabla CALIFICACIONES en Stackby (11 columnas, 3.573 filas) + sync bidireccional + Sheets por profesor | 1. Stackby > CALIFICACIONES (sección 3.2)<br>2. Sheets profesores (sección 2.3)<br>3. Sheet "Calificaciones IITD" (sección 2.2) | `/integraciones/alumnos/calificaciones-client.mjs`<br>`/integraciones/alumnos/sync-calificaciones.mjs`<br>`/integraciones/alumnos/sheets-profesores.mjs` |
```

**Cambios:**
- Estado: 🚫 Bloqueado → ✅ Hecho
- Descripción ampliada con "Sheets por profesor"
- Dónde verlo: Añadir referencia a sección 2.3

---

### 2.2 Actualizar Sección "GRUPO E: Cumplimiento RGPD"

**Acción:** Buscar la fila de N13 y reemplazar con:

```markdown
| N13 | Inventario de herramientas SaaS y contratos DPA | ✅ Hecho | Tabla INVENTARIO_SAAS en Stackby: 14 columnas, 12 herramientas pre-pobladas (Stackby, OCH, Google, Stripe, BreezeDoc, pxl.to, Acumbamail, FlipBooklets, SiteGround, Holded, Pabbly, WordPress) | 1. Abrir Stackby → INVENTARIO_SAAS<br>2. Verificar 12 herramientas<br>3. Completar: Coste, Fecha DPA, Renovación | Tabla Stackby `tbx3UGrWC0XTA5Rd2e` |
```

**Cambios:**
- Estado: 🔧 Implementado → ✅ Hecho
- Descripción completa con las 12 herramientas
- Añadir detalles de columnas

---

### 2.3 Actualizar Tabla "Resumen" (al final de sección 8)

**Acción:** Buscar la tabla de resumen y actualizar números:

```markdown
| Estado | Cantidad |
|--------|----------|
| Hecho | 28 |
| Implementado (pendiente config/deploy) | 5 |
| Guía entregada | 2 |
| Pendiente | 14 |
| Bloqueado | 3 |
| **Total** | **52** |
```

**Cambios:**
- Hecho: 26 → 28 (+N06, +N13)
- Bloqueado: 5 → 3 (-N06, -N13)

---

## 📍 CAMBIO 3: Actualizar Sección 9 - Lo que hemos hecho NO en el acta

**Ubicación:** Sección "9. Lo que hemos hecho que NO estaba en el acta"

**Acción:** Añadir al FINAL de la tabla (después de la última fila) la siguiente nueva fila:

```markdown
| **Sistema de Sheets por profesor (N06 ampliado)** | Sheets individuales para 3 profesores (Avelino, Javier, Antonio) con sincronización automática de notas a Stackby. Comandos: profes:init, profes:sync, profes:refresh | Sección 2.3 |
```

**Nota:** Añadir ANTES de la línea que dice "**Nota:** Este documento resume..."

---

## 📍 CAMBIO 4: Actualizar Sección 10.1 - Lo que necesitamos de vosotros

**Ubicación:** Sección "10. Lo que falta y lo que necesitamos de vosotros" → "10.1 Lo que necesitamos de vosotros"

**Acción:** Eliminar la siguiente fila de la tabla (si existe):

```markdown
| **Disponibilidad de Gema** | Gema | Crear tabla INVENTARIO_SAAS (N13) | Media |
```

**Motivo:** N13 ya completada, Gema ya no es necesaria para esto (sí para N18 Holded)

**Verificar que la fila de Holded esté:**
```markdown
| **Disponibilidad de Gema** | Gema | Migrar la contabilidad de Golden Soft a Holded | **Urgente** (caduca junio 2026) |
```

---

## 📍 CAMBIO 5: Actualizar Sección 11 - Checklist Final

**Ubicación:** Sección "11. Checklist final"

**Acción:** Añadir nueva fila al FINAL de la tabla (después del item 21):

```markdown
| 22 | Sheets Profesores (sistema de notas) | ☐ |
| 23 | Documentación actualizada (N06 y N13) | ☐ |
| 24 | Issues pendientes revisados (12 issues) | ☐ |
```

**Y actualizar la línea de resultado:**

```markdown
**Resultado global:** _____ de 24 puntos verificados
```

**Cambio:** "21 puntos" → "24 puntos"

---

## ✅ Verificación Post-Actualización

Después de hacer todos los cambios, verificar:

- [ ] Nueva sección 2.3 existe y tiene enlaces a Sheets profesores
- [ ] N06 cambió de 🚫 a ✅ en sección 8
- [ ] N13 cambió de 🔧 a ✅ en sección 8
- [ ] Resumen muestra 28 Hecho, 3 Bloqueado
- [ ] Sección 9 incluye nueva fila "Sistema Sheets profesores"
- [ ] Sección 10.1 NO tiene fila Gema para N13 (solo para N18)
- [ ] Checklist final tiene 24 items (no 21)

---

## 📧 Notificar a Mayte

Después de actualizar el documento, enviar email a Mayte:

**Asunto:** Actualización Guía Tests - Nueva Sección Sheets Profesores

**Contenido sugerido:**
```
Hola Mayte,

He actualizado la guía de tests con novedades:

⭐ Nueva Sección 2.3 - Sheets Profesores
Sistema automático donde cada profesor gestiona sus notas en un Sheet individual.
3 profesores activos: Avelino, Javier, Antonio.

✅ Actualización de Estados:
- N06 (Calificaciones): Ahora ✅ Hecho (era Bloqueado)
- N13 (Inventario SaaS): Ahora ✅ Hecho (era Implementado)

📋 Progreso: 28/52 completadas (53.8% - antes 50%)

El documento está en: [enlace]

Revisa especialmente la nueva sección 2.3 para validar los Sheets profesores.

Cualquier duda, me avisas.

Javier
```

---

**Tiempo estimado para actualizar:** 15 minutos
**Responsable:** Javier Cuervo
**Fecha límite:** Antes de reunión IITD (hoy 13 feb 2026)
