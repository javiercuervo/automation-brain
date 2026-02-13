# Instrucciones: Actualizar Documento Mayte con Apps Script

**Creado:** 13 febrero 2026
**Autor:** Javier Cuervo / Proportione

---

## 🚀 Método 1: Apps Script AUTOMATIZADO (Recomendado)

### Ventajas
- ✅ **Automático**: Un solo clic actualiza todo
- ✅ **Sin errores**: Formato perfecto garantizado
- ✅ **Rápido**: 5-10 segundos vs 30 minutos manual
- ✅ **Reversible**: Puedes deshacer (Ctrl+Z) si es necesario
- ✅ **Comentarios**: Marca automáticamente secciones modificadas

### Pasos de Ejecución

#### 1. Abrir el Documento de Mayte

```
https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit
```

#### 2. Abrir Editor Apps Script

**Opción A:** Menú superior
```
Extensiones > Apps Script
```

**Opción B:** Atajo de teclado
```
Alt + Shift + F11 (Windows)
Cmd + Option + Shift + F11 (Mac)
```

#### 3. Copiar el Script

Abrir el archivo:
```bash
cat /sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/scripts/actualizar-doc-mayte.gs
```

O desde tu máquina local:
```bash
cat ~/code/automation-brain/clientes/iitd/scripts/actualizar-doc-mayte.gs
```

**Copiar TODO el contenido** (460 líneas aproximadamente)

#### 4. Pegar en Apps Script

1. En el editor Apps Script, **borrar** el código de ejemplo que aparece
2. **Pegar** el script completo copiado
3. **Guardar**: Ctrl+S (o icono diskette)
4. Nombrar proyecto: "IITD - Actualizar Issues Mayte"

#### 5. Ejecutar el Script

**En el editor Apps Script:**

1. Seleccionar función: `actualizarDocumentoMayte` (dropdown superior)
2. Click en botón **▶ Ejecutar** (Run)

**Primera vez - Autorización:**
```
1. Aparecerá: "Autorización necesaria"
2. Click: "Revisar permisos"
3. Selecciona tu cuenta: javier.cuervo@proportione.com
4. Click: "Avanzado"
5. Click: "Ir a IITD - Actualizar Issues Mayte (no seguro)"
6. Click: "Permitir"
```

**Ejecución:**
- El script tarda 5-10 segundos
- Verás en el log: "🚀 Iniciando actualización..."
- Al terminar: Pop-up "✅ Actualización Completada"

#### 6. Verificar Resultado

Volver al documento de Mayte y verificar:

- ✅ Nueva **Sección 11: Estado de Resolución de Issues** añadida
- ✅ Anterior Sección 11 renumerada a **Sección 12**
- ✅ Contenido completo con:
  - Protocolo de confirmación
  - 12 issues detalladas
  - Checkboxes para Mayte
  - Tabla resumen

---

## 🎯 Menú Personalizado (Bonus)

El script también añade un menú personalizado:

**En el documento de Mayte:**
```
Menú superior: 📋 IITD Tracking
  ↳ 🔄 Actualizar con Issues
  ↳ 📊 Ver estado issues
```

**Uso futuro:**
- Si necesitas re-ejecutar: Menú > IITD Tracking > Actualizar con Issues
- Ver estado rápido: Menú > IITD Tracking > Ver estado issues

---

## 📝 Método 2: Copiar/Pegar MANUAL (Alternativa)

Si prefieres no usar Apps Script, puedes copiar/pegar manualmente.

### Archivo de Texto Plano

He preparado el contenido en formato texto plano:

```bash
# Ver contenido a copiar:
cat /sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/docs/INSTRUCCIONES-ACTUALIZAR-DOC-MAYTE.md
```

### Pasos Manuales

1. **Ubicación:** Ir a final de Sección 10 en Google Docs
2. **Salto de página:** Insertar > Salto > Salto de página
3. **Copiar:** Todo el contenido de la "Nueva Sección 11" del archivo
4. **Pegar:** En el documento después del salto de página
5. **Renumerar:** Cambiar "11. Checklist final" → "12. Checklist final"
6. **Revisar:** Formato de checkboxes, negritas, encabezados

**Tiempo estimado:** 30-45 minutos
**Riesgo:** Errores de formato, checkboxes no funcionales

---

## ⚙️ Solución de Problemas

### Error: "No se encontró Sección 10"

**Causa:** El script busca el patrón exacto `## 10. Lo que falta...`

**Solución:**
1. Verificar que Sección 10 existe con ese título exacto
2. Si el título es diferente, modificar línea 30 del script:
   ```javascript
   const seccion10Index = buscarTexto(body, 'TU_TITULO_REAL');
   ```

### Error: "No tienes permisos"

**Causa:** Tu cuenta no tiene permisos de edición en el documento

**Solución:**
1. Verificar que eres propietario o editor del documento
2. Si es de Mayte, pedirle que te dé permisos de edición
3. O pedirle que ejecute ella el script

### El script no hace nada

**Causa:** Posible error en ejecución

**Solución:**
1. En Apps Script, abrir: Ver > Registros (View > Logs)
2. Buscar línea con "❌ Error:"
3. Copiar mensaje de error y revisar

### Quiero deshacer los cambios

**Solución fácil:**
1. En el documento: Ctrl+Z (deshacer) varias veces
2. O: Archivo > Historial de versiones > Ver historial de versiones
3. Restaurar versión anterior a la ejecución del script

---

## 🔍 Qué Hace el Script (Técnicamente)

### Funciones Principales

1. **`actualizarDocumentoMayte()`**
   - Punto de entrada principal
   - Busca Sección 10
   - Renumera Sección 11 → 12
   - Inserta nueva Sección 11
   - Añade comentarios

2. **`buscarTexto(body, patron)`**
   - Busca un patrón regex en el documento
   - Devuelve índice del elemento encontrado

3. **`renumerarSeccion11a12(body)`**
   - Encuentra "## 11. Checklist final"
   - Cambia a "## 12. Checklist final"

4. **`insertarSeccion11(body, index)`**
   - Inserta salto de página
   - Añade título Sección 11
   - Inserta todas las subsecciones
   - Llama a funciones específicas por issue

5. **`insertarIssue1/2/3...(body, index)`**
   - Inserta contenido específico de cada issue
   - Formato: título, problema, estado, tareas, verificaciones, confirmaciones

6. **`insertarTablaResumen(body, index)`**
   - Crea tabla con estado de 12 issues
   - 6 filas x 5 columnas

### Seguridad

- ✅ **Solo lectura de documento ID específico**: No accede a otros documentos
- ✅ **No envía datos externos**: Todo el procesamiento es local
- ✅ **Reversible**: Ctrl+Z funciona perfectamente
- ✅ **Código abierto**: Puedes revisar todo el código antes de ejecutar

---

## 📧 Notificar a Mayte (Post-Ejecución)

Después de ejecutar el script, enviar email a Mayte:

**Asunto:** ✅ Actualizado documento con tracking de issues

**Cuerpo:**
```
Hola Mayte,

He actualizado tu documento de validación utilizando Apps Script.

📄 Documento: https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit

✅ Cambios realizados automáticamente:
• Nueva Sección 11: "Estado de Resolución de Issues"
• Sección 11 anterior renumerada a 12
• 12 issues documentadas con protocolo de confirmación
• Checkboxes para que marques solo después de verificar

🔴 Issues que estoy trabajando HOY (Sprint 50 min):
1. #1: Darte accesos Stackby y Sheet Calificaciones
2. #2: Crear pestañas Dashboard y KPIs DECA
3. #3: Corregir enlaces rotos Recibos/Certificados

IMPORTANTE: Solo marca los checkboxes ✅ después de verificar
personalmente que cada issue funciona. Si hay problemas, usa
el espacio "Observaciones Mayte" para anotarlos.

Te notificaré por email cuando cada issue esté lista para
que la verifiques.

Saludos,
Javier
```

---

## 📊 Logs de Ejecución (Ejemplo)

Cuando ejecutes el script, verás en los logs:

```
🚀 Iniciando actualización documento Mayte...
✅ Sección 10 encontrada en índice: 287
✅ Renumerada Sección 11 → 12
✅ Sección 11 insertada completa
✅ Marcado para comentario: ## 11. Estado de Resolución de Issues
✅ Marcado para comentario: ## 12. Checklist final
✅ Documento actualizado exitosamente
📄 Ver: https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit
```

---

## ✅ Checklist Pre-Ejecución

Antes de ejecutar el script, verificar:

- [ ] Tengo permisos de edición en el documento de Mayte
- [ ] He leído las instrucciones completas
- [ ] He copiado el script correcto (actualizar-doc-mayte.gs)
- [ ] Entiendo que puedo deshacer con Ctrl+Z si es necesario
- [ ] Sé que la primera ejecución requiere autorización

---

## 🆘 Contacto

Si tienes problemas:

1. **Revisar logs:** Apps Script > Ver > Registros
2. **Documentación:** Este archivo
3. **Contacto:** javier.cuervo@proportione.com

---

**Preparado por:** Javier Cuervo / Proportione
**Archivo script:** `/clientes/iitd/scripts/actualizar-doc-mayte.gs`
**Fecha:** 13 febrero 2026
