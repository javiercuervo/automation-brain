# Estado del Proyecto IITD - 13 Febrero 2026

**Fecha snapshot:** 13 febrero 2026, 12:00
**Responsable:** Javier Cuervo / Proportione
**Versión:** 1.0

---

## 📊 Resumen Ejecutivo

| Métrica | Valor | Cambio |
|---------|-------|--------|
| **Automatizaciones completadas** | 28/52 (53.8%) | +2 desde 11 Feb |
| **En implementación** | 5 (9.6%) | Sin cambio |
| **Guías entregadas** | 2 (3.8%) | Sin cambio |
| **Pendientes** | 14 (26.9%) | Sin cambio |
| **Bloqueadas** | 3 (5.8%) | -2 desde 11 Feb |
| **Validadores activos** | 6 personas | +5 desde 12 Feb |
| **Progreso validación Mayte** | 15/24 items (62.5%) | En curso |
| **Issues identificadas** | 12 | Documentadas |

---

## ⭐ Novedades Implementadas (Últimas 48h)

### 1. Sistema de Sheets Profesores (N06 - Completado)

**Fecha:** 13 Feb 2026 00:47 (commit `a127bdb`)
**Estado:** ✅ Completado y funcional

**Funcionalidad:**
- Google Sheets individuales para 3 profesores
- Sincronización bidireccional Sheet ↔ Stackby tabla CALIFICACIONES
- Permisos automáticos configurados

**Profesores activos:**
1. Avelino Revilla (Teología Fundamental, Sagrada Escritura)
   - Sheet ID: `19iNZX1iynhYBe8dyg_Hms0c-N4oz_cTqMknCFTiCEwc`
2. Javier Sánchez (Cristología, Moral, Liturgia)
   - Sheet ID: `1rXbSOxqbbtNftrllnuzJcQnHGlU3RRjgHTk0ViiTqQs`
3. Antonio Salas (Pedagogía y Didáctica)
   - Sheet ID: `1wytYZqMDvE4t3a4HNqvDCwNoGezmsQzUWLPebu7u3bk`

**Comandos disponibles:**
```bash
npm run profes:init     # Crear/poblar Sheets
npm run profes:sync     # Sincronizar notas Sheet → Stackby
npm run profes:refresh  # Actualizar con datos Stackby → Sheet
npm run profes:share    # Compartir con profesores
```

**Tests:** 44/44 ✅ (8 nuevos tests T19-T26 añadidos)

**Archivos:**
- `/integraciones/alumnos/sheets-profesores.mjs` (21 KB)
- `/integraciones/alumnos/sheets-profesores-state.json`

### 2. Inventario SaaS (N13 - Completado)

**Fecha:** 12 Feb 2026
**Estado:** ✅ Completado

**Funcionalidad:**
- Tabla INVENTARIO_SAAS en Stackby
- 14 columnas, 12 herramientas pre-pobladas
- Herramientas: Stackby, OCH, Google Workspace, Stripe, BreezeDoc, pxl.to, Acumbamail, FlipBooklets, SiteGround, Holded, Pabbly, WordPress

### 3. Documento de Validación Actualizado

**Fecha:** 13 Feb 2026 11:16 (vía Playwright MCP)
**Estado:** ✅ Actualizado

**Cambios aplicados:**
1. Nueva Sección 2.3: Sheets Profesores
2. N06 y N13 actualizados a estado "Hecho"
3. Sección 9 ampliada con novedades
4. Checklist expandido a 24 items
5. Metadata actualizada ("Para: IITD", fecha 12 Feb)

---

## 🚧 Validación en Curso

### Progreso General

**Mayte:** 15/24 items validados (62.5%)
- Inició: 12 Feb 2026
- Último update: 12 Feb 2026
- Issues identificadas: 12

**Nuevos validadores (5):**
- Sonia: 0/24 (0%)
- Miriam: 0/24 (0%)
- José Angel: 0/24 (0%)
- Josete: 0/24 (0%)
- Javier: 0/24 (0%)

**Sistema tracking:** Sección 12 en documento de validación (pendiente añadir via Apps Script)

### Issues Identificadas por Mayte

**Total:** 12 issues documentadas en `ISSUES-PENDIENTES.md` y `ESTADO-ISSUES-MAYTE.md`

**Distribución por prioridad:**
- 🔴 Críticas (Sprint Hoy): 3 issues
- 🟡 Importantes (Sprint Semana): 3 issues
- 🟡 Web (Sprint Próxima Semana): 3 issues
- 🟢 Mejoras (Febrero/Marzo): 2 issues
- 🔴 Urgente Futuro: 1 issue

**Estado actual:**
- ✅ Resueltas y confirmadas: 0/12 (0%)
- 🚧 En marcha: 2/12 (16.7%) - Issues #2 y #3
- ⏸️ Pendientes: 10/12 (83.3%)

---

## 🔴 Issues Críticas - Sprint Hoy (50 min)

### Issue #1: Accesos Mayte
**Problema:** Mayte no puede acceder a Calificaciones Sheet ni Stackby
**Estado:** ⏸️ PENDIENTE
**Tiempo:** 10 min
**Bloqueo:** 40% validación bloqueada

**Acción:**
- Compartir "Calificaciones IITD" Sheet (viewer)
- Invitar a Stackby "IITD Matriculación" (Editor)

### Issue #2: Pestañas Dashboard y KPIs DECA
**Problema:** Pestañas documentadas como hechas pero no existen
**Estado:** 🚧 EN MARCHA
**Tiempo:** 20 min
**Bloqueo:** Afecta credibilidad, funcionalidad crítica

**Acción:**
```bash
cd ~/code/automation-brain/clientes/iitd/integraciones/alumnos
node dashboard.mjs
node kpis-deca.mjs
```

### Issue #3: Enlaces rotos Recibos/Certificados
**Problema:** Enlaces en Panel IITD no abren PDFs
**Estado:** 🚧 EN MARCHA
**Tiempo:** 20 min
**Bloqueo:** Funcionalidades no validables

**Acción:**
```bash
cd ~/code/automation-brain/clientes/iitd/integraciones/alumnos
# Verificar permisos Drive
node sync-sheets.mjs  # Regenerar Panel con enlaces correctos
```

---

## 📈 Progreso Automatizaciones

### Por Grupo

| Grupo | Completadas | En implementación | Pendientes | Bloqueadas | Total |
|-------|-------------|-------------------|------------|------------|-------|
| **A: Inscripciones** | 4 | 3 | 0 | 0 | 7 |
| **B: Gestión Alumnos** | 7 | 0 | 0 | 0 | 7 |
| **C: Comunicaciones** | 3 | 0 | 3 | 1 | 7 |
| **D: Pagos** | 2 | 1 | 2 | 1 | 6 |
| **E: RGPD** | 5 | 0 | 4 | 1 | 10 |
| **F: Documentos** | 4 | 1 | 1 | 0 | 6 |
| **G: Web/Portal** | 1 | 0 | 3 | 0 | 4 |
| **H: Mejoras** | 2 | 0 | 1 | 0 | 3 |
| **TOTAL** | **28** | **5** | **14** | **3** | **52** |

### Recientes Completadas

| Código | Automatización | Fecha completado | Archivos clave |
|--------|----------------|------------------|----------------|
| **N06** | Sistema Sheets Profesores + Calificaciones | 13 Feb 2026 | `sheets-profesores.mjs` |
| **N13** | Inventario SaaS en Stackby | 12 Feb 2026 | `inventario-saas-client.mjs` |
| **N50** | Panel IITD Multi-Pestaña | 10 Feb 2026 | `sync-sheets.mjs` |
| **N51** | Sistema Recibos PDF | 09 Feb 2026 | `recibo-pdf.mjs` |

---

## 💻 Actividad de Desarrollo (Últimos 3 Días)

### Commits Recientes

```
a127bdb (13 Feb 00:47) feat(iitd): per-professor grade Sheets with sync, sharing, and test suite (44/44)
67f619c (12 Feb 18:23) fix(iitd): consolidate Panel IITD, fix pagination bug, centralize auth
3d10f09 (12 Feb 15:41) feat(iitd): RGPD protections for diplomas
81ed753 (11 Feb 22:14) fix(iitd): correct program names
89490bd (11 Feb 19:32) docs(iitd): add comprehensive validation guide for Mayte
```

### Scripts Nuevos (Última Semana)

| Archivo | Tamaño | Fecha | Propósito |
|---------|--------|-------|-----------|
| `sheets-profesores.mjs` | 21 KB | 13 Feb | Sistema Sheets por profesor |
| `test-suite.mjs` | 8 KB | 13 Feb | Suite de tests end-to-end |
| `reorganizar-drive.mjs` | 5 KB | 12 Feb | Reorganización carpetas Drive |
| `inventario-saas-client.mjs` | 3 KB | 12 Feb | Cliente Stackby INVENTARIO_SAAS |

---

## 📊 Métricas Clave del Sistema

### Datos en Producción

| Recurso | Cantidad | Última actualización |
|---------|----------|----------------------|
| **Alumnos en Stackby** | 1.585 registros | 13 Feb 2026 |
| **Calificaciones registrables** | 3.573 filas | 13 Feb 2026 |
| **Profesores con Sheet activo** | 3 | 13 Feb 2026 |
| **Herramientas SaaS inventariadas** | 12 | 12 Feb 2026 |
| **Tests pasados** | 44/44 ✅ | 13 Feb 2026 |
| **Pestañas en Panel IITD** | 9+ | 10 Feb 2026 |

### Cobertura de Tests

- **Total tests:** 44
- **Pasados:** 44 (100%)
- **Fallidos:** 0
- **Última ejecución:** 13 Feb 2026 00:47
- **Nuevos tests (T19-T26):** Sheets profesores (8 tests)

---

## ⚠️ Urgencias y Bloqueos

### 🔴 Crítico: N18 - Migración Golden Soft → Holded

**Problema:** Golden Soft (contabilidad) caduca junio 2026
**Deadline:** 15 mayo 2026 (3 meses)
**Bloqueador:** Requiere disponibilidad de Gema (no disponible actualmente)
**Tiempo estimado:** 5-6 semanas
**Riesgo:** ⚠️ ALTO - Sin migración, pérdida de datos contables

**Próximos pasos:**
1. Coordinar urgente disponibilidad Gema
2. Planificar backup datos Golden Soft
3. Ejecutar migración antes mayo 2026

### 🟡 Otros Bloqueos

| Código | Automatización | Bloqueador | Impacto |
|--------|----------------|------------|---------|
| **N45** | Auditoría brechas seguridad | Pendiente IITD definir alcance | Medio |
| **N46** | Control acceso grabaciones | Pendiente decisión técnica IITD | Medio |

---

## 🎯 Plan de Acción Inmediato

### Hoy - 13 Feb 2026 (50 min)

**Sprint Crítico:**
1. ✅ Issue #1: Dar accesos Mayte (10 min - manual)
   - Google Drive: Compartir "Calificaciones IITD"
   - Stackby: Invitar a stack "IITD Matriculación"

2. ✅ Issue #2: Crear Dashboard y KPIs DECA (20 min)
   ```bash
   node dashboard.mjs
   node kpis-deca.mjs
   ```

3. ✅ Issue #3: Corregir enlaces Recibos/Certs (20 min)
   ```bash
   node sync-sheets.mjs
   # Verificar enlaces funcionan
   ```

**Post-Sprint:**
- Notificar a Mayte issues #1, #2, #3 resueltas
- Solicitar re-validación

### Esta Semana - 14-16 Feb 2026 (3 horas)

**Sprint Importante:**
4. Issue #4: BreezeDoc funcional (30 min)
5. Issue #5: PDFs ejemplo (15 min)
6. Issue #6: Test formulario ARCO+ (10 min)

**Sprint Web:**
7. Issue #7: Corregir Portal ARCO+ responsive (1h)
8. Issue #8: Re-maquetar Política Cookies (30 min)
9. Issue #9: DNS diplomas.institutoteologia.org (30 min)

### Próxima Semana - 17-21 Feb 2026

**Sprint Mejoras:**
10. Issue #10: Columnas Nombre/Apellidos CALIFICACIONES (30 min)
11. Issue #11: Actualizar docs columnas (10 min)

**Sprint Urgente:**
12. Issue #12: Coordinar Gema para N18 Holded

---

## 📁 Archivos y Documentación Clave

### Documentos Principales

| Archivo | Propósito | Ubicación |
|---------|-----------|-----------|
| **INVENTARIO-AUTOMATIZACIONES-IITD.md** | Estado 52 automatizaciones | `/clientes/iitd/` |
| **ISSUES-PENDIENTES.md** | 12 issues de Mayte documentadas | `/clientes/iitd/` |
| **ESTADO-ISSUES-MAYTE.md** | Tracking detallado issues | `/clientes/iitd/docs/` |
| **INSTRUCCIONES-ACTUALIZAR-DOC-MAYTE.md** | Contenido para copiar/pegar | `/clientes/iitd/docs/` |
| **RESUMEN-REUNION-13FEB2026.md** | Resumen para reunión IITD | `/clientes/iitd/docs/` |
| **PLAN-CORRECCION-TESTS-MAYTE.md** | Plan de corrección de tests | `/clientes/iitd/docs/` |

### Google Docs y Sheets

| Recurso | Tipo | URL |
|---------|------|-----|
| **Guía validación - test MT** | Google Doc | [1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg](https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit) |
| **Panel IITD** | Google Sheet | (Pendiente enlace) |
| **Calificaciones IITD** | Google Sheet | (Pendiente enlace) |
| **Sheet Avelino Revilla** | Google Sheet | [19iNZX1iynhYBe8dyg_Hms0c-N4oz_cTqMknCFTiCEwc](https://docs.google.com/spreadsheets/d/19iNZX1iynhYBe8dyg_Hms0c-N4oz_cTqMknCFTiCEwc/) |
| **Sheet Javier Sánchez** | Google Sheet | [1rXbSOxqbbtNftrllnuzJcQnHGlU3RRjgHTk0ViiTqQs](https://docs.google.com/spreadsheets/d/1rXbSOxqbbtNftrllnuzJcQnHGlU3RRjgHTk0ViiTqQs/) |
| **Sheet Antonio Salas** | Google Sheet | [1wytYZqMDvE4t3a4HNqvDCwNoGezmsQzUWLPebu7u3bk](https://docs.google.com/spreadsheets/d/1wytYZqMDvE4t3a4HNqvDCwNoGezmsQzUWLPebu7u3bk/) |

### Scripts Críticos

| Script | Función | Comando |
|--------|---------|---------|
| `sheets-profesores.mjs` | Gestión Sheets profesores | `npm run profes:*` |
| `sync-sheets.mjs` | Regenerar Panel IITD | `node sync-sheets.mjs` |
| `dashboard.mjs` | Crear pestaña Dashboard | `node dashboard.mjs` |
| `kpis-deca.mjs` | Crear pestaña KPIs DECA | `node kpis-deca.mjs` |
| `calificaciones-client.mjs` | CRUD Stackby CALIFICACIONES | `node calificaciones-client.mjs find <email>` |

---

## 🔄 Próximas Actualizaciones Previstas

### Semanal (Cada Lunes)

- Actualizar INVENTARIO con nuevas completadas
- Consolidar progreso issues de Mayte
- Revisar commits de la semana
- Actualizar métricas clave

### Mensual (Inicio de Mes)

- Informe completo estado proyecto
- Análisis tendencias y velocidad
- Revisión prioridades próximo mes
- Actualización documentación general

---

## 📞 Contactos del Proyecto

| Rol | Persona | Email |
|-----|---------|-------|
| **Coordinador Técnico** | Javier Cuervo | javier.cuervo@proportione.com |
| **QA Lead** | Mayte Tortosa | mayte.tortosa@proportione.com |
| **Validador** | Sonia | - |
| **Validador (Secretaria)** | Miriam | - |
| **Validador** | José Angel | - |
| **Validador** | Josete | - |
| **Cliente IITD** | Director | - |

---

**Generado por:** Javier Cuervo / Proportione
**Fecha:** 13 febrero 2026, 12:00
**Próxima actualización:** 20 febrero 2026
