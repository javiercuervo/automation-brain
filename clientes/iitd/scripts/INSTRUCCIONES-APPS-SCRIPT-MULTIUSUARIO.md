# Instrucciones: Apps Script Multi-Usuario para Documento de Validación IITD

**Creado:** 13 febrero 2026
**Autor:** Javier Cuervo / Proportione
**Propósito:** Añadir tracking de 6 validadores al documento de pruebas IITD

---

## 🎯 ¿Qué hace este script?

Añade una nueva **Sección 12: Registro de Validación Multi-Usuario** al documento de validación IITD con:

- Tabla con 6 validadores (Sonia, Miriam, José Angel, Josete, Javier, Mayte)
- Columnas: Validador | Rol | Progreso | Última actualización | Comentarios
- Renumera "Siguiente paso" de sección 12 → 13
- NO modifica ningún contenido existente

---

## 🚀 Pasos de Ejecución

### 1. Abrir el Documento de Validación IITD

```
https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit
```

### 2. Abrir Editor Apps Script

**Opción A:** Menú superior
```
Extensiones > Apps Script
```

**Opción B:** Atajo de teclado
```
Alt + Shift + F11 (Windows)
Cmd + Option + Shift + F11 (Mac)
```

### 3. Copiar el Script

Abrir el archivo:
```bash
cat /sessions/brave-vigilant-goodall/mnt/automation-brain/clientes/iitd/scripts/actualizar-doc-validacion-multiusuario.gs
```

O desde tu máquina local:
```bash
cat ~/code/automation-brain/clientes/iitd/scripts/actualizar-doc-validacion-multiusuario.gs
```

**Copiar TODO el contenido** (aproximadamente 200 líneas)

### 4. Pegar en Apps Script

1. En el editor Apps Script, **borrar** el código de ejemplo que aparece
2. **Pegar** el script completo copiado
3. **Guardar**: Ctrl+S (o icono diskette)
4. Nombrar proyecto: "IITD - Validación Multi-Usuario"

### 5. Ejecutar el Script

**En el editor Apps Script:**

1. Seleccionar función: `actualizarDocValidacionMultiusuario` (dropdown superior)
2. Click en botón **▶ Ejecutar** (Run)

**Primera vez - Autorización:**
```
1. Aparecerá: "Autorización necesaria"
2. Click: "Revisar permisos"
3. Selecciona tu cuenta: javier.cuervo@proportione.com
4. Click: "Avanzado"
5. Click: "Ir a IITD - Validación Multi-Usuario (no seguro)"
6. Click: "Permitir"
```

**Ejecución:**
- El script tarda 3-5 segundos
- Verás en el log: "🚀 Iniciando actualización multi-usuario..."
- Al terminar: Pop-up "✅ Actualización Completada"

### 6. Verificar Resultado

Volver al documento de validación y verificar:

- ✅ Nueva **Sección 12: Registro de Validación Multi-Usuario** añadida
- ✅ Tabla con 6 validadores y sus columnas
- ✅ Sección "Siguiente paso" renumerada a **13**
- ✅ Contenido existente intacto (Secciones 0-11 sin cambios)

---

## 📋 Contenido Añadido (Vista Previa)

```markdown
---

## 12. Registro de Validación Multi-Usuario

Este proyecto está siendo validado por múltiples personas del equipo IITD. Aquí se registra el progreso de cada validador.

**Validadores activos:** 6 personas

| Validador | Rol | Progreso | Última actualización | Comentarios/Issues reportados |
|-----------|-----|----------|----------------------|-------------------------------|
| Sonia | - | 0/24 | - | - |
| Miriam | Secretaria | 0/24 | - | - |
| José Angel | - | 0/24 | - | - |
| Josete | - | 0/24 | - | - |
| Javier | Coordinador técnico | 0/24 | - | - |
| Mayte | QA | 15/24 (62.5%) | 12 Feb 2026 | 12 issues identificados (ver ISSUES-PENDIENTES.md) |

**Notas:**
- Cada validador marca su progreso en el Checklist (Sección 11)
- Los comentarios se registran en comunicación externa (email/Slack)
- Issues críticos se documentan en `/clientes/iitd/docs/ESTADO-ISSUES-MAYTE.md`

---

## 13. Siguiente paso
[contenido original sin cambios]
```

---

## 🎯 Menú Personalizado (Bonus)

El script también añade un menú personalizado:

**En el documento de validación:**
```
Menú superior: 📋 IITD Validación
  ↳ 🔄 Añadir tracking multi-usuario
  ↳ 📊 Ver estado validadores
```

**Uso futuro:**
- Si necesitas re-ejecutar: Menú > IITD Validación > Añadir tracking multi-usuario
- Ver estado rápido: Menú > IITD Validación > Ver estado validadores

---

## ⚙️ Solución de Problemas

### Error: "No se encontró Sección 11 (Checklist final)"

**Causa:** El script busca el patrón exacto `## 11. Checklist final`

**Solución:**
1. Verificar que Sección 11 existe con ese título exacto
2. Si el título es diferente, modificar línea 33 del script:
   ```javascript
   const seccion11Index = buscarTexto(body, 'TU_TITULO_REAL');
   ```

### Error: "No se encontró sección Siguiente paso"

**Causa:** El script busca `## Siguiente paso` para renumerarla

**Solución:**
1. Verificar que existe sección "Siguiente paso" al final del documento
2. Si tiene otro título, modificar línea 42 del script

### Error: "No tienes permisos"

**Causa:** Tu cuenta no tiene permisos de edición en el documento

**Solución:**
1. Verificar que eres propietario o editor del documento
2. Si es de IITD, pedirles que te dén permisos de edición
3. O pedirles que ejecuten ellos el script

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

### La tabla no tiene formato

**Causa:** Posible conflicto de estilos

**Solución:**
1. Seleccionar tabla manualmente
2. Aplicar formato: Bordes visibles, encabezado en negrita
3. O ejecutar script de nuevo (primero Ctrl+Z)

---

## 🔍 Qué Hace el Script (Técnicamente)

### Funciones Principales

1. **`actualizarDocValidacionMultiusuario()`**
   - Punto de entrada principal
   - Busca Sección 11 (Checklist)
   - Busca "Siguiente paso"
   - Renumera "Siguiente paso" → 13
   - Inserta nueva Sección 12 con tabla

2. **`buscarTexto(body, patron)`**
   - Busca un patrón regex en el documento
   - Devuelve índice del elemento encontrado

3. **`renumerarSiguientePaso(body, index)`**
   - Encuentra "## Siguiente paso"
   - Cambia a "## 13. Siguiente paso"

4. **`insertarSeccion12MultiUsuario(body, index)`**
   - Inserta separador
   - Añade título Sección 12
   - Crea tabla 7x5 (6 validadores + encabezado)
   - Añade notas explicativas
   - Inserta separador final

5. **`onOpen()`**
   - Crea menú personalizado cuando se abre el documento

6. **`mostrarEstadoValidadores()`**
   - Muestra pop-up con resumen estado actual de validadores

### Seguridad

- ✅ **Solo lectura de documento ID específico**: No accede a otros documentos
- ✅ **No envía datos externos**: Todo el procesamiento es local
- ✅ **Reversible**: Ctrl+Z funciona perfectamente
- ✅ **Código abierto**: Puedes revisar todo el código antes de ejecutar

---

## 📧 Notificar a Validadores (Post-Ejecución)

Después de ejecutar el script, enviar email a los 6 validadores:

**Asunto:** 📋 Documento de validación IITD - Sistema tracking multi-usuario activado

**Destinatarios:**
- sonia@...
- miriam@...
- joseangel@...
- josete@...
- javier.cuervo@proportione.com
- mayte.tortosa@proportione.com

**Cuerpo:**
```
Hola equipo,

He actualizado el documento de validación IITD con un sistema de tracking multi-usuario.

📄 Documento: https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit

✅ Cambios realizados:
• Nueva Sección 12: "Registro de Validación Multi-Usuario"
• Tabla con los 6 validadores y progreso individual
• Cada uno puede actualizar su fila con progreso y comentarios

📋 Cómo usar:
1. Abre el documento (link arriba)
2. Ve a Sección 12
3. Encuentra tu fila en la tabla
4. Actualiza tu progreso conforme completes items del Checklist (Sección 11)
5. Anota comentarios/problemas en la columna correspondiente

IMPORTANTE: Mayte ya ha avanzado 15/24 items (62.5%) y documentó 12 issues.
El resto comenzamos en 0/24.

Cualquier duda, me avisas.

Saludos,
Javier
```

---

## 📊 Logs de Ejecución (Ejemplo)

Cuando ejecutes el script, verás en los logs:

```
🚀 Iniciando actualización multi-usuario...
✅ Sección 11 encontrada en índice: 287
✅ Sección "Siguiente paso" encontrada en índice: 412
✅ Renumerada "Siguiente paso" → "13. Siguiente paso"
✅ Sección 12 Multi-Usuario insertada completa
✅ Documento actualizado exitosamente
📄 Ver: https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit
```

---

## ✅ Checklist Pre-Ejecución

Antes de ejecutar el script, verificar:

- [ ] Tengo permisos de edición en el documento de validación IITD
- [ ] He leído las instrucciones completas
- [ ] He copiado el script correcto (actualizar-doc-validacion-multiusuario.gs)
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
**Archivo script:** `/clientes/iitd/scripts/actualizar-doc-validacion-multiusuario.gs`
**Fecha:** 13 febrero 2026
