# Issues Pendientes IITD - Febrero 2026

**Fecha:** 13 febrero 2026
**Origen:** Validación Mayte + Plan corrección tests
**Total issues:** 12 (9 resueltos, 3 pendientes)

---

## ✅ RESUELTOS

### Issue #1: Accesos Mayte - Desbloquear validación ✅

**Estado:** RESUELTO — 13 feb 2026
**Resolución:** Javier compartió accesos manualmente (Sheets + Stackby).

---

### Issue #2: Crear pestañas Dashboard y KPIs DECA ✅

**Estado:** RESUELTO — 13 feb 2026
**Resolución:** Ejecutados `dashboard.mjs` (1585 registros procesados, pestaña Dashboard generada) y `kpis-deca.mjs` (397 alumnos DECA, pestaña KPIs DECA generada) en Panel IITD Sheet.

---

### Issue #3: Corregir enlaces rotos Recibos y Certificados ✅

**Estado:** RESUELTO — 13 feb 2026
**Resolución:** Causa raíz: Service Account no puede crear archivos en Drive (storage quota). Creado Apps Script Web App proxy (`upload-proxy.gs`) desplegado como administracion@institutoteologia.org. Generados PDFs reales con alumna Izara Incera Arribas:
- **Recibo:** subido a Drive via Apps Script proxy (file ID: `1EDj5tG6jGHTheAmfWCqK21oOh19ytlyz`), enlace compartido
- **Certificados:** 2 PDFs subidos a SiteGround (diplomas.institutoteologia.org), short URL pxl.to creada, filas escritas en Sheet
- `recibo-pdf.mjs` modificado para soportar `APPS_SCRIPT_UPLOAD_URL` en `.env`

---

### Issue #4: Configurar BreezeDoc con templates funcionales ✅

**Estado:** RESUELTO — 13 feb 2026
**Resolución:** Enviado documento "Contrato matrícula DECA" (doc ID: 352936) a mayte.tortosa@proportione.com via API BreezeDoc (`createFromTemplate` + `sendDocument`). Mayte puede abrir y firmar.

---

### Issue #5: Generar y compartir PDFs de ejemplo ✅

**Estado:** RESUELTO — 13 feb 2026
**Resolución:** Verificados PDFs accesibles:
- Recibo en Drive: HTTP 200, enlace compartido con anyone-with-link
- Certificados en SiteGround: HTTP 200, PDF content-type confirmado
- URLs funcionales para validación de Mayte

---

### Issue #6: Verificar formulario ARCO+ envío emails ✅

**Estado:** RESUELTO — 13 feb 2026
**Resolución:** Formulario en institutoteologia.org/ejercicio-derechos-rgpd/ rellenado y enviado. WordPress mostró mensaje de éxito "Su solicitud ha sido enviada correctamente". Elementor Pro envía a informacion@institutoteologia.org + webhook Pabbly.

---

### Issue #7: Corregir maquetación Portal ARCO+ responsive ✅

**Estado:** RESUELTO — 13 feb 2026
**Resolución:** Identificado overflow del email `informacion@institutoteologia.org` en widget footer Elementor (data-id `77394ca`) a ~1073px viewport. Causa: `word-break: normal` + `overflow-wrap: normal` en texto 18px. Añadido CSS en Personalizar → CSS adicional:
```css
/* Fix footer email overflow on medium viewports */
.elementor-icon-list-text {
  overflow-wrap: break-word;
  word-break: break-word;
}
```
Publicado en Customizer. Móvil (375px) ya era correcto.

---

### Issue #8: Re-maquetar Política de Cookies ✅

**Estado:** RESUELTO — 13 feb 2026
**Resolución:** Página WordPress ID 514 (Elementor) completamente remaquetada. Cambios:
- H2 genéricos "Apartado 1/2/3" → títulos descriptivos (¿Qué son las cookies?, Tipos de cookies, etc.)
- Contenido desactualizado eliminado (Privacy Shield invalidado, Windows Phone obsoleto, Internet Explorer)
- Texto plano → listas bullet formateadas
- Añadido Microsoft Edge, cookies Complianz
- Enlaces actualizados (política Google, Google Analytics)
- Enlace funcional a /contacto/ + email directo
- Fecha actualización: febrero 2026
- Guardado via Elementor API (`elementor.saver.update()`) + REST API `_elementor_data`

---

### Issue #9: Configurar DNS diplomas.institutoteologia.org ✅

**Estado:** RESUELTO — 13 feb 2026 (ya estaba configurado)
**Resolución:** DNS ya resuelve correctamente (registro A → 34.175.48.9). HTTPS funcional. PDFs accesibles en diplomas.institutoteologia.org. No requirió acción.

---

## 🟢 PENDIENTES - MEJORAS USABILIDAD (Febrero/Marzo)

### Issue #10: Añadir columnas Nombre/Apellidos en CALIFICACIONES

**Título:** Tabla CALIFICACIONES - Añadir columnas Nombre y Apellidos
**Prioridad:** 🟢 MEDIA-BAJA
**Tiempo estimado:** 30 min
**Responsable:** Javier Cuervo

**Tareas:**
- [ ] Abrir Stackby tabla CALIFICACIONES
- [ ] Añadir campo "Nombre" (tipo: texto)
- [ ] Añadir campo "Apellidos" (tipo: texto)
- [ ] Actualizar `/clientes/iitd/integraciones/alumnos/calificaciones-client.mjs`:
  - Añadir campos a CALIFICACIONES_FIELDS
  - Actualizar función createCalificacion()
  - Actualizar función upsertCalificacion()
- [ ] Actualizar `/clientes/iitd/integraciones/alumnos/sync-calificaciones.mjs`:
  - Añadir columnas Nombre/Apellidos en encabezados esperados
  - Actualizar mapping de datos
- [ ] Actualizar `/clientes/iitd/integraciones/alumnos/sheets-profesores.mjs`:
  - Ya tiene Nombre/Apellidos, verificar compatibilidad
- [ ] Re-sincronizar: `node sync-calificaciones.mjs --reverse` (Stackby → Sheet)
- [ ] Verificar en Sheet "Calificaciones IITD" que columnas aparecen

**Contexto:** Mayte sugiere "CREO QUE DEBERÍA TENER NOMBRE Y APELLIDOS" en tabla CALIFICACIONES. Actualmente solo tiene email, dificulta identificación visual de alumnos.

**Archivos involucrados:**
- `/clientes/iitd/integraciones/alumnos/calificaciones-client.mjs`
- `/clientes/iitd/integraciones/alumnos/sync-calificaciones.mjs`
- `/clientes/iitd/integraciones/alumnos/sheets-profesores.mjs`

**Impacto:** BAJO - Mejora usabilidad, no afecta funcionalidad core

---

### Issue #11: Actualizar documentación columnas reales

**Título:** Docs - Corregir nombres y orden columnas Stackby
**Prioridad:** 🟢 BAJA
**Tiempo estimado:** 10 min
**Responsable:** Javier Cuervo

**Tareas:**
- [ ] Revisar columna "Notas" vs "Nº Expediente" en tabla ALUMNOS:
  - Opción A: Renombrar en Stackby de "Notas" → "Nº Expediente"
  - Opción B: Actualizar docs para decir 'Columna "Notas" (contiene Nº Expediente)'
  - **Decisión:** Opción B (menos disruptivo)
- [ ] Abrir Stackby tabla CALIFICACIONES
- [ ] Documentar orden real de columnas
- [ ] Actualizar `/clientes/iitd/docs/GUIA-TESTS-VALIDACION-V2-CORREGIDA.md`:
  - Sección 3.1: Aclarar "Notas (contiene Nº Expediente)"
  - Sección 3.2: Corregir orden columnas CALIFICACIONES
- [ ] Actualizar Google Docs de Mayte con misma corrección

**Contexto:** Discrepancias anotadas por Mayte:
- Columna documentada "Nº Expediente" se llama "Notas" en Stackby
- Orden columnas CALIFICACIONES diferente al documentado

**Archivos involucrados:**
- `/clientes/iitd/docs/GUIA-TESTS-VALIDACION-V2-CORREGIDA.md`
- Google Docs Mayte

**Impacto:** BAJO - Documentación vs realidad, no afecta funcionalidad

---

## 🟢 MEJORAS USABILIDAD - Sprint 4 (Febrero/Marzo - 1 hora)

### Issue #10: Añadir columnas Nombre/Apellidos en CALIFICACIONES

**Título:** Tabla CALIFICACIONES - Añadir columnas Nombre y Apellidos
**Prioridad:** 🟢 MEDIA-BAJA
**Tiempo estimado:** 30 min
**Responsable:** Javier Cuervo

**Tareas:**
- [ ] Abrir Stackby tabla CALIFICACIONES
- [ ] Añadir campo "Nombre" (tipo: texto)
- [ ] Añadir campo "Apellidos" (tipo: texto)
- [ ] Actualizar `/clientes/iitd/integraciones/alumnos/calificaciones-client.mjs`:
  - Añadir campos a CALIFICACIONES_FIELDS
  - Actualizar función createCalificacion()
  - Actualizar función upsertCalificacion()
- [ ] Actualizar `/clientes/iitd/integraciones/alumnos/sync-calificaciones.mjs`:
  - Añadir columnas Nombre/Apellidos en encabezados esperados
  - Actualizar mapping de datos
- [ ] Actualizar `/clientes/iitd/integraciones/alumnos/sheets-profesores.mjs`:
  - Ya tiene Nombre/Apellidos, verificar compatibilidad
- [ ] Re-sincronizar: `node sync-calificaciones.mjs --reverse` (Stackby → Sheet)
- [ ] Verificar en Sheet "Calificaciones IITD" que columnas aparecen

**Contexto:** Mayte sugiere "CREO QUE DEBERÍA TENER NOMBRE Y APELLIDOS" en tabla CALIFICACIONES. Actualmente solo tiene email, dificulta identificación visual de alumnos.

**Archivos involucrados:**
- `/clientes/iitd/integraciones/alumnos/calificaciones-client.mjs`
- `/clientes/iitd/integraciones/alumnos/sync-calificaciones.mjs`
- `/clientes/iitd/integraciones/alumnos/sheets-profesores.mjs`

**Impacto:** BAJO - Mejora usabilidad, no afecta funcionalidad core

---

### Issue #11: Actualizar documentación columnas reales

**Título:** Docs - Corregir nombres y orden columnas Stackby
**Prioridad:** 🟢 BAJA
**Tiempo estimado:** 10 min
**Responsable:** Javier Cuervo

**Tareas:**
- [ ] Revisar columna "Notas" vs "Nº Expediente" en tabla ALUMNOS:
  - Opción A: Renombrar en Stackby de "Notas" → "Nº Expediente"
  - Opción B: Actualizar docs para decir 'Columna "Notas" (contiene Nº Expediente)'
  - **Decisión:** Opción B (menos disruptivo)
- [ ] Abrir Stackby tabla CALIFICACIONES
- [ ] Documentar orden real de columnas
- [ ] Actualizar `/clientes/iitd/docs/GUIA-TESTS-VALIDACION-V2-CORREGIDA.md`:
  - Sección 3.1: Aclarar "Notas (contiene Nº Expediente)"
  - Sección 3.2: Corregir orden columnas CALIFICACIONES
- [ ] Actualizar Google Docs de Mayte con misma corrección

**Contexto:** Discrepancias anotadas por Mayte:
- Columna documentada "Nº Expediente" se llama "Notas" en Stackby
- Orden columnas CALIFICACIONES diferente al documentado

**Archivos involucrados:**
- `/clientes/iitd/docs/GUIA-TESTS-VALIDACION-V2-CORREGIDA.md`
- Google Docs Mayte

**Impacto:** BAJO - Documentación vs realidad, no afecta funcionalidad

---

## 🔴 URGENTES FUTURO - Sprint Especial (Marzo/Abril)

### Issue #12: N18 - Migración Golden Soft → Holded (⚠️ CRÍTICO)

**Título:** URGENTE - Migración contabilidad Golden Soft → Holded (caduca junio 2026)
**Prioridad:** 🔴 CRÍTICA
**Tiempo estimado:** Pendiente estimación (requiere coordinación Gema)
**Responsable:** Javier Cuervo + Gema (contadora IITD)

**Tareas:**
- [ ] **Fase 1 - Coordinación (1 semana):**
  - [ ] Contactar Gema para disponibilidad
  - [ ] Agendar reunión de kick-off migración
  - [ ] Identificar stakeholders (director IITD, Gema, Javier)

- [ ] **Fase 2 - Backup y Análisis (1 semana):**
  - [ ] Hacer backup completo Golden Soft (todos los años)
  - [ ] Exportar datos: facturas, gastos, clientes, proveedores
  - [ ] Analizar estructura de datos Golden Soft
  - [ ] Mapear a estructura Holded

- [ ] **Fase 3 - Importación (2 semanas):**
  - [ ] Crear cuenta Holded (si no existe)
  - [ ] Configurar plan de cuentas en Holded
  - [ ] Importar clientes (alumnos y centros)
  - [ ] Importar proveedores
  - [ ] Importar facturas emitidas (histórico)
  - [ ] Importar gastos y facturas recibidas

- [ ] **Fase 4 - Verificación (1 semana):**
  - [ ] Verificar integridad de datos importados
  - [ ] Comparar balances: Golden Soft vs Holded
  - [ ] Revisar con Gema para aprobación
  - [ ] Corregir discrepancias

- [ ] **Fase 5 - Go-Live (1 semana):**
  - [ ] Capacitar a Gema en Holded
  - [ ] Migrar operaciones actuales a Holded
  - [ ] Dar de baja Golden Soft antes de junio 2026
  - [ ] Documentar proceso para referencia futura

**Contexto:** Golden Soft caduca en junio 2026 (4 meses). Gema no ha estado disponible para coordinar. Migración requiere tiempo y validación contable.

**Archivos involucrados:**
- Potencial: `/clientes/iitd/integraciones/holded/` (crear scripts import)
- Potencial: `/clientes/iitd/docs/guias/migracion-holded.md`

**Impacto:** CRÍTICO - Sin migración, IITD pierde acceso a contabilidad histórica y no puede facturar

**Deadline:** 15 mayo 2026 (buffer 2 semanas antes de caducidad)

---

## Resumen de Estado

| Issue | Título | Estado |
|-------|--------|--------|
| #1 | Accesos Mayte | ✅ Resuelto 13 feb |
| #2 | Dashboard y KPIs DECA | ✅ Resuelto 13 feb |
| #3 | Enlaces Recibos/Certificados | ✅ Resuelto 13 feb |
| #4 | BreezeDoc templates | ✅ Resuelto 13 feb |
| #5 | PDFs ejemplo | ✅ Resuelto 13 feb |
| #6 | Formulario ARCO+ | ✅ Resuelto 13 feb |
| #7 | ARCO+ responsive | ✅ Resuelto 13 feb |
| #8 | Cookies formato | ✅ Resuelto 13 feb |
| #9 | DNS diplomas | ✅ Resuelto 13 feb (ya estaba OK) |
| #10 | Columnas Nombre/Apellidos | ⬚ Pendiente |
| #11 | Docs columnas Stackby | ⬚ Pendiente |
| #12 | Migración Holded | ⬚ Pendiente (deadline mayo 2026) |

**Progreso: 9/12 completados (75%)**

### Pendientes:
- [ ] Issue #10: Columnas Nombre/Apellidos en CALIFICACIONES (~30 min)
- [ ] Issue #11: Docs actualizadas (~10 min)
- [ ] Issue #12: Migración Golden Soft → Holded (5-6 semanas, requiere Gema)

### Artefactos generados durante resolución (13 feb):
- `clientes/iitd/integraciones/apps-script/drive-upload/upload-proxy.gs` — Apps Script proxy para Drive
- `.env` → `APPS_SCRIPT_UPLOAD_URL` añadida
- `recibo-pdf.mjs` → función `uploadViaAppsScript()` añadida
- WordPress Customizer → CSS adicional para footer overflow
- WordPress página 514 → Política de Cookies remaquetada completa

---

**Última actualización:** 13 febrero 2026 21:00
**Preparado por:** Javier Cuervo / Proportione
