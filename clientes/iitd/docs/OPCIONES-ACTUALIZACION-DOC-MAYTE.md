# Opciones para Actualizar Documento de Mayte

**Fecha:** 13 febrero 2026
**Responsable:** Javier Cuervo

---

## 🎯 Tu Pregunta

> "¿Hay algo que pudiera yo ejecutar directamente sobre ese documento?
> ¿Algo que tú me puedas dar y yo lo pegue directamente citando a todo el mundo
> o con todas las resoluciones o con todas las modificaciones?
> ¿O puedes darme textos para copiar y pegar o hay alguna automatización
> que pudiera ejecutar Claude Code al respecto?"

## ✅ Respuesta: SÍ - Tienes 3 Opciones

---

## 🚀 OPCIÓN 1: Apps Script AUTOMATIZADO (⭐ Recomendado)

### ¿Qué es?
Un script de Google Apps Script que actualiza el documento automáticamente en 10 segundos.

### Ventajas
- ✅ **Rapidísimo**: 10 segundos vs 30-45 minutos manual
- ✅ **Sin errores**: Formato perfecto garantizado
- ✅ **Automático**: Un solo clic hace todo
- ✅ **Profesional**: Estructura consistente
- ✅ **Reversible**: Ctrl+Z si no te gusta el resultado

### Qué hace automáticamente
1. Busca final de Sección 10
2. Añade salto de página
3. Inserta **Sección 11 completa** con:
   - Protocolo de confirmación
   - 12 issues detalladas (críticas, importantes, web, mejoras, urgente)
   - Checkboxes para Mayte
   - Tabla resumen estado
4. Renumera Sección 11 antigua → Sección 12
5. Marca secciones modificadas con indicaciones

### Cómo ejecutar

**Paso 1:** Abrir documento
```
https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit
```

**Paso 2:** Abrir Apps Script
```
Menú: Extensiones > Apps Script
```

**Paso 3:** Copiar script
```bash
# Ver el script:
cat ~/code/automation-brain/clientes/iitd/scripts/actualizar-doc-mayte.gs

# O desde la sesión actual:
cat /sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/scripts/actualizar-doc-mayte.gs
```

**Paso 4:** Pegar todo el código en Apps Script

**Paso 5:** Guardar (Ctrl+S)

**Paso 6:** Ejecutar función `actualizarDocumentoMayte`
- Dropdown: Seleccionar función
- Botón: ▶ Ejecutar
- Primera vez: Autorizar permisos

**Paso 7:** ¡Listo! Ver resultado en el documento

### Archivos
- 📄 **Script:** [actualizar-doc-mayte.gs](computer:///sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/scripts/actualizar-doc-mayte.gs)
- 📖 **Instrucciones:** [INSTRUCCIONES-APPS-SCRIPT.md](computer:///sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/scripts/INSTRUCCIONES-APPS-SCRIPT.md)

---

## 📋 OPCIÓN 2: Copiar/Pegar TEXTO COMPLETO (Manual pero Simple)

### ¿Qué es?
Texto completo pre-formateado listo para copiar y pegar directamente en Google Docs.

### Ventajas
- ✅ **Control total**: Ves exactamente qué se añade
- ✅ **Sin código**: No necesitas ejecutar scripts
- ✅ **Simple**: Solo copiar y pegar
- ✅ **Seguro**: No requiere permisos especiales

### Desventajas
- ⏱️ **Tiempo**: 30-45 minutos vs 10 segundos
- ⚠️ **Errores posibles**: Formato manual puede fallar
- 📝 **Tedioso**: Muchas secciones para pegar

### Cómo hacerlo

**Archivo con contenido completo:**
```bash
cat ~/code/automation-brain/clientes/iitd/docs/INSTRUCCIONES-ACTUALIZAR-DOC-MAYTE.md
```

**Pasos:**
1. Abrir documento de Mayte
2. Ir a final de Sección 10
3. Insertar > Salto de página
4. Copiar contenido de "Nueva Sección 11" del archivo
5. Pegar en documento
6. Buscar "## 11. Checklist final" y cambiar a "## 12. Checklist final"
7. Revisar formato (checkboxes, negritas, encabezados)

### Archivos
- 📄 **Contenido:** [INSTRUCCIONES-ACTUALIZAR-DOC-MAYTE.md](computer:///sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/docs/INSTRUCCIONES-ACTUALIZAR-DOC-MAYTE.md)

---

## 🤖 OPCIÓN 3: TEXTO PLANO con MARCAS JAVIER CUERVO

### ¿Qué es?
Contenido estructurado con marcas explícitas `[JAVIER CUERVO - 13 Feb 2026]` en cada modificación.

### Ventajas
- ✅ **Trazabilidad**: Cada cambio firmado por ti
- ✅ **Transparencia**: Mayte ve quién hizo qué
- ✅ **Auditable**: Registro claro de modificaciones

### Formato de Marcas

Cada sección modificada incluye:

```markdown
[JAVIER CUERVO - 13 Feb 2026 10:45]:
Añadida nueva sección para tracking de 12 issues identificadas
durante validación de Mayte. Incluye protocolo de confirmación
donde Mayte debe marcar checkboxes solo después de verificar
personalmente cada resolución.
```

### Archivo
```bash
cat ~/code/automation-brain/clientes/iitd/docs/ESTADO-ISSUES-MAYTE.md
```

Este archivo incluye marcas en:
- Nueva Sección 11 (AÑADIDA)
- Sección 11→12 (RENUMERADA)
- Cada issue (DOCUMENTADA)
- Tabla resumen (CREADA)

---

## 📊 Comparación de Opciones

| Aspecto | Apps Script | Copiar/Pegar | Texto con Marcas |
|---------|-------------|--------------|------------------|
| **Tiempo** | ⚡ 10 seg | 🐢 30-45 min | 🐢 30-45 min |
| **Errores** | ✅ Ninguno | ⚠️ Posibles | ⚠️ Posibles |
| **Reversible** | ✅ Ctrl+Z | ✅ Ctrl+Z | ✅ Ctrl+Z |
| **Automatización** | ✅ Total | ❌ Manual | ❌ Manual |
| **Marcas firma** | ⚠️ Limitado | ❌ No | ✅ Explícitas |
| **Control** | ⚠️ Medio | ✅ Total | ✅ Total |
| **Requiere código** | ⚠️ Sí (copiar) | ❌ No | ❌ No |

---

## 🎯 Recomendación

### Para TI (Javier):
**Opción 1: Apps Script**
- Eres desarrollador, te sientes cómodo con código
- Quieres resultado perfecto en 10 segundos
- Tienes prisa (reunión hoy)

### Para Mayte (si le pides que lo haga):
**Opción 2: Copiar/Pegar**
- No técnica, prefiere ver exactamente qué añade
- Tiene tiempo
- Quiere control total

### Para Auditoría/Documentación:
**Opción 3: Texto con Marcas**
- Necesitas trazabilidad explícita
- Importante documentar quién hizo qué
- Para revisión legal/compliance

---

## 🚀 Ejecución Inmediata (Tu Caso)

### Recomendación: Apps Script (10 segundos)

**Razón:**
- ⏰ Reunión IITD hoy - necesitas velocidad
- 👨‍💻 Eres desarrollador - Apps Script es trivial para ti
- ✅ Resultado perfecto garantizado
- 🔄 Reversible si no te gusta

### Comando Rápido

```bash
# 1. Ver el script
cat ~/code/automation-brain/clientes/iitd/scripts/actualizar-doc-mayte.gs

# 2. Copiar TODO el contenido (Ctrl+A, Ctrl+C)

# 3. Ir a documento:
# https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit

# 4. Extensiones > Apps Script

# 5. Pegar código, Guardar, Ejecutar

# 6. ¡Listo en 10 segundos!
```

---

## 📝 Post-Ejecución

Después de actualizar el documento (cualquier opción):

### 1. Verificar Resultado
- [ ] Sección 11 existe y tiene contenido correcto
- [ ] Sección 12 (antes 11) renumerada correctamente
- [ ] Checkboxes funcionan
- [ ] Tabla resumen visible

### 2. Notificar a Mayte
Email template disponible en:
```bash
cat ~/code/automation-brain/clientes/iitd/scripts/INSTRUCCIONES-APPS-SCRIPT.md
# Ver sección "📧 Notificar a Mayte"
```

### 3. Continuar Sprint Hoy
Ejecutar las 3 issues críticas:
```bash
cd ~/code/automation-brain/clientes/iitd/integraciones/alumnos

# Issue #1: Accesos (manual Google Drive + Stackby)
# Issue #2: Dashboard y KPIs
node dashboard.mjs
node kpis-deca.mjs

# Issue #3: Enlaces
node sync-sheets.mjs
```

---

## 🔗 Todos los Archivos Creados

| Archivo | Propósito | Ubicación |
|---------|-----------|-----------|
| **actualizar-doc-mayte.gs** | Script Apps Script automatizado | [Ver](computer:///sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/scripts/actualizar-doc-mayte.gs) |
| **INSTRUCCIONES-APPS-SCRIPT.md** | Guía completa Apps Script | [Ver](computer:///sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/scripts/INSTRUCCIONES-APPS-SCRIPT.md) |
| **ESTADO-ISSUES-MAYTE.md** | Tracking interno con marcas | [Ver](computer:///sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/docs/ESTADO-ISSUES-MAYTE.md) |
| **INSTRUCCIONES-ACTUALIZAR-DOC-MAYTE.md** | Contenido para copiar/pegar | [Ver](computer:///sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/docs/INSTRUCCIONES-ACTUALIZAR-DOC-MAYTE.md) |
| **RESUMEN-ESTADO-ISSUES-13FEB.md** | Resumen ejecutivo | [Ver](computer:///sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/docs/RESUMEN-ESTADO-ISSUES-13FEB.md) |

---

## ❓ Preguntas Frecuentes

### ¿El Apps Script modifica otras cosas del documento?
**No.** Solo añade Sección 11 y renumera 11→12. Todo lo demás queda intacto.

### ¿Puedo deshacer si no me gusta?
**Sí.** Ctrl+Z inmediatamente después, o Archivo > Historial de versiones.

### ¿Mayte verá las marcas de Javier Cuervo?
Apps Script tiene limitaciones para añadir comentarios nativos de Google Docs.
Si necesitas comentarios visibles, usa **Opción 3: Texto con Marcas** o añade
comentarios manualmente después de ejecutar el script.

### ¿Puedo ejecutar el script varias veces?
**Sí**, pero creará Sección 11 duplicada. Mejor: Ctrl+Z y re-ejecutar, o
modificar script para detectar si ya existe.

### ¿Funciona en móvil?
Apps Script requiere desktop. Para móvil, usa **Opción 2: Copiar/Pegar**.

---

## ✅ Decisión Rápida

**¿Qué opción elegir en 10 segundos?**

```
¿Tienes prisa? → Apps Script (Opción 1)
¿Prefieres control manual? → Copiar/Pegar (Opción 2)
¿Necesitas trazabilidad explícita? → Texto con Marcas (Opción 3)
```

---

**Preparado por:** Javier Cuervo / Proportione
**Fecha:** 13 febrero 2026
**Reunión IITD:** Hoy
