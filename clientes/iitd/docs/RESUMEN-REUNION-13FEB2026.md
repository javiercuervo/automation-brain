# Resumen para Reunión IITD - 13 Febrero 2026

**Preparado por:** Javier Cuervo / Proportione
**Fecha:** 13 febrero 2026
**Destinatarios:** Dirección IITD, Miriam, Josete

---

## 1. Progreso General del Proyecto

**Estado Actual:** 28/52 automatizaciones completadas **(53.8%)**

| Estado | Cantidad | % | Descripción |
|--------|----------|---|-------------|
| ✅ Completadas | 28 | 53.8% | Funcionales y en producción |
| 🔧 Implementadas | 5 | 9.6% | Código listo, pendiente config/deploy |
| 📋 Guías entregadas | 2 | 3.8% | Documentación para acción manual |
| ⏳ Pendientes | 14 | 26.9% | No iniciadas |
| 🚫 Bloqueadas | 3 | 5.8% | Limitaciones externas (OCH, legal) |
| **TOTAL** | **52** | **100%** | |

**Avance desde última reunión (6 Feb):** +7.8% (N06 y N13 completadas)

---

## 2. Novedades Implementadas (Últimas 24 horas)

### ⭐ Sistema de Sheets para Profesores (N06 Ampliado)

**Fecha implementación:** 13 febrero 2026 (commit `a127bdb`)

**¿Qué es?**
Cada profesor tiene un Google Sheet personalizado para gestionar calificaciones de sus alumnos. El sistema sincroniza automáticamente las notas a Stackby, eliminando errores de transcripción manual.

**Profesores con Sheet activo:**

1. **Avelino Revilla**
   - Email: avelino.revilla@institutoteologia.org
   - Asignaturas: Teología Fundamental, Sagrada Escritura (A.T. y N.T.)
   - Programas: DECA
   - Sheet: [Ver aquí](https://docs.google.com/spreadsheets/d/19iNZX1iynhYBe8dyg_Hms0c-N4oz_cTqMknCFTiCEwc/)

2. **Javier Sánchez**
   - Email: javier.sanchez@institutoteologia.org
   - Asignaturas: Cristología, Eclesiología, Moral, Liturgia, Sacramentos
   - Programas: DECA, Formación Sistemática
   - Sheet: [Ver aquí](https://docs.google.com/spreadsheets/d/1rXbSOxqbbtNftrllnuzJcQnHGlU3RRjgHTk0ViiTqQs/)

3. **Antonio Salas**
   - Email: antonio.salas@institutoteologia.org
   - Asignaturas: Pedagogía y Didáctica (Infantil/Primaria y ESO/Bachillerato)
   - Programas: DECA
   - Sheet: [Ver aquí](https://docs.google.com/spreadsheets/d/1wytYZqMDvE4t3a4HNqvDCwNoGezmsQzUWLPebu7u3bk/)

**¿Cómo funciona?**
```
1. Profesor abre su Sheet (enlace compartido)
2. Ve pestañas por programa (DECA, Formación Sistemática)
3. Completa: Nota evaluación, Nota examen, Calificación final
4. Sistema sincroniza automáticamente cada 24h o bajo demanda
5. Datos visibles en Panel IITD (dirección) y exportables
```

**Beneficios para el Instituto:**
- ✅ **Entorno familiar:** Profesores trabajan en Google Sheets (no Stackby)
- ✅ **Sin errores de transcripción:** Sincronización automática
- ✅ **Registro centralizado:** Todo en Stackby para reportes
- ✅ **Visibilidad dirección:** Panel IITD actualizado en tiempo real
- ✅ **Auditoría:** Historial de cambios en Sheets

**Estado:** Funcional y testeado (44/44 tests pasados ✅)

**Comandos técnicos (informativo):**
```bash
npm run profes:init     # Crear/poblar Sheets (ya ejecutado)
npm run profes:sync     # Sincronizar notas a Stackby
npm run profes:refresh  # Actualizar Sheets con últimos datos
npm run profes:share    # Compartir con profesores (ya ejecutado)
```

---

## 3. Progreso de Validación con Mayte (60-70% Completada)

Mayte Tortosa (comercial@institutoteologia.org) ha estado validando sistemáticamente todas las automatizaciones implementadas.

### ✅ Validaciones Exitosas (Funcionalidades OK)

**Web:**
- Banner de cookies (Complianz) - Aparece, se acepta, persiste correctamente
- Páginas legales con datos correctos (Aviso Legal, Privacidad)
- Pie de página con copyright 2026 y contactos actualizados
- SEO con Yoast activo (búsqueda en Google funcional)

**Base de Datos:**
- 1.585 alumnos importados en Stackby desde PolarDoc
- Tabla ALUMNOS funcional con expedientes IITD-NNNNNN
- Tabla CONTACTOS con CRUD completo (crear, editar, borrar)
- Tabla INVENTARIO_SAAS con 12 herramientas

**Integraciones:**
- Panel IITD accesible con múltiples pestañas por programa
- Sheet Calificaciones IITD con 3.573 filas (397 alumnos × 9 módulos)
- Webhook Stripe activo (health check OK)

### 🔴 Problemas Identificados (Bloquean Validación)

**Críticos (requieren acción hoy):**

1. **Acceso denegado** - Mayte no puede acceder a:
   - "Calificaciones IITD" Sheet (error "NO ME DEJA")
   - Stackby (sin invitación a cuenta)
   - **Impacto:** Bloquea ~40% de tests

2. **Pestañas Dashboard y KPIs DECA NO EXISTEN**
   - Documentadas como "Hechas" (N16, N19) pero ausentes del Panel IITD
   - **Impacto:** Discrepancia documentación vs realidad

3. **Enlaces rotos en Recibos y Certificados**
   - PDFs no abren al hacer clic en Panel IITD
   - Probablemente permisos insuficientes
   - **Impacto:** N08, N09, N51 no validables

4. **BreezeDoc no funciona**
   - Mayte reporta "NO SE PUEDE FIRMAR Y VA SIN DATOS"
   - Templates sin configurar con datos reales
   - **Impacto:** N15 (firma electrónica) no validable

5. **Portal ARCO+ roto visualmente**
   - Formulario cortado en PC y móvil (capturas adjuntas)
   - **Impacto:** Imagen poco profesional, afecta cumplimiento RGPD

6. **Diplomas online Error 404**
   - diplomas.institutoteologia.org no accesible
   - DNS pendiente de configuración
   - **Impacto:** N48, N49 implementados pero no públicos

7. **PDFs de ejemplo no proporcionados**
   - Mayte marca "NO HE VISTO" en secciones 4.1, 4.2, 4.3
   - **Impacto:** No puede validar diseño/formato documentos

**Importantes (esta semana):**
- Política de Cookies necesita re-maquetación
- Formulario ARCO+ sin verificar envío de email
- Discrepancias entre documentación y nombres reales de columnas Stackby

---

## 4. Plan de Acción Inmediato

### Sprint Hoy (1 hora - ANTES reunión)

**Objetivo:** Desbloquear validación de Mayte

1. ✅ **Dar accesos a Mayte** (10 min)
   - Compartir "Calificaciones IITD" Sheet (visualizador)
   - Invitar a Stackby como Editor

2. ✅ **Crear pestañas Dashboard y KPIs DECA** (20 min)
   - Ejecutar `node dashboard.mjs`
   - Ejecutar `node kpis-deca.mjs`
   - Verificar en Panel IITD

3. ✅ **Corregir enlaces Recibos/Certificados** (20 min)
   - Verificar PDFs en Drive/SiteGround
   - Re-ejecutar `sync-sheets.mjs`
   - Probar enlaces

4. ✅ **Generar PDFs ejemplo** (10 min)
   - Ejecutar scripts recibo y certificado
   - Compartir carpeta Drive con Mayte

**Responsable:** Javier Cuervo
**Entregables:** 4 problemas críticos resueltos

---

### Sprint Esta Semana (3 horas)

**Objetivo:** Completar validación end-to-end

5. Configurar BreezeDoc funcional (30 min)
6. Corregir Portal ARCO+ responsive (1h)
7. Re-maquetar Política Cookies (30 min)
8. Configurar DNS diplomas.institutoteologia.org (30 min)
9. Verificar formulario ARCO+ email (10 min)

**Responsable:** Javier Cuervo
**Entregables:** Tests de Mayte 100% completados

---

## 5. Urgencias y Riesgos

### ⚠️ CRÍTICO: N18 - Migración Golden Soft → Holded

**Estado actual:** Pospuesto (Gema no disponible)
**Deadline:** Junio 2026 **(4 meses restantes)**
**Riesgo:** Sin migración, IITD pierde acceso a contabilidad y no puede facturar

**Acción requerida:**
- Coordinar disponibilidad urgente de Gema
- Agendar kick-off migración (1-2 semanas)
- Backup Golden Soft completo
- Importación a Holded (3-4 semanas)
- Validación contable (1 semana)
- Go-live antes del 15 mayo 2026

**Responsable:** Javier + Gema
**Tiempo estimado:** 5-6 semanas (con buffer)

---

### Otras Prioridades Alta

**N45:** Sistema auditoría y brechas seguridad
- Logging de accesos y cambios
- Alertas automáticas ante eventos sospechosos
- Sprint 5 (abril 2026)

**N46:** Control de acceso a grabaciones
- Gestión de permisos temporales
- Caducidad automática
- Sprint 5 (abril 2026)

---

## 6. Métricas del Proyecto

| Métrica | Valor | Observación |
|---------|-------|-------------|
| **Alumnos en base de datos** | 1.585 | Importados de PolarDoc |
| **Calificaciones registrables** | 3.573 filas | 397 alumnos DECA × 9 módulos |
| **Profesores con Sheet activo** | 3 | Avelino, Javier, Antonio |
| **Herramientas SaaS inventariadas** | 12 | Stackby, OCH, Google, Stripe, etc. |
| **Tests automatizados pasados** | 44/44 ✅ | Suite completa |
| **Commits última semana** | 5 | sheets-profesores + fixes |
| **Issues pendientes** | 12 | 3 críticos, 3 importantes, 6 mejoras |

---

## 7. Roadmap Próximos Meses

### Febrero 2026 (Esta Semana)
- [x] Completar sheets-profesores (HECHO)
- [x] N06: Tabla CALIFICACIONES (HECHO)
- [x] N13: Inventario SaaS (HECHO)
- [ ] Resolver issues críticos validación Mayte
- [ ] Tests 100% completados

### Marzo 2026 (Sprint 4)
- [ ] **N18:** Migración Golden Soft → Holded (URGENTE)
- [ ] N01: Activar notificación inscripciones
- [ ] N14: Activar captura leads web
- [ ] N15: Desplegar BreezeDoc completo

### Abril 2026 (Sprint 5 - RGPD Final)
- [ ] N45: Sistema auditoría brechas
- [ ] N46: Control acceso grabaciones
- [ ] N12: Política retención datos
- [ ] Auditoría RGPD completa por abogada

### Mayo-Junio 2026
- [ ] Finalizar N18 Holded (DEADLINE mayo)
- [ ] Pendientes marketing (N24-N35, N37-N38)
- [ ] Optimizaciones y mejoras UX

---

## 8. Necesidades del Instituto para Continuar

| Necesidad | De quién | Para qué | Urgencia |
|-----------|----------|----------|----------|
| **Credenciales SMTP** institutoteologia.org | Sonia / Hosting | Activar emails automáticos (notas, bienvenida) | Alta |
| **Sheet ID formulario contacto** | Sonia | Activar captura leads N14 | Media |
| **Disponibilidad Gema** | Gema / Dirección | Migración Holded N18 | **CRÍTICA** |
| **Decisión DNI** | Dirección + Abogada | Minimización DNI N23 | Baja |
| **Verificar email alumnos@** | Miriam | Notificaciones inscripciones N01 | Alta |

---

## 9. Conclusiones y Siguientes Pasos

### Logros Destacados
✅ **50%+ del proyecto completado** en 6 sprints
✅ **Sistema profesores innovador** implementado en 24h
✅ **Validación sistemática** con Mayte (60-70% completada)
✅ **Suite de tests** robusta (44/44 pasados)
✅ **RGPD avanzado** (banner cookies, portal ARCO+, políticas, inventario)

### Próximos Pasos Inmediatos
1. **Hoy:** Resolver 4 issues críticos (1 hora)
2. **Esta semana:** Completar validación Mayte (3 horas)
3. **Presentar al director:** Cuando tests 100% OK
4. **Marzo:** Sprint 4 - Migración Holded
5. **Abril:** Sprint 5 - RGPD final

### Recomendaciones
⚠️ **Priorizar coordinación con Gema** para N18 (4 meses deadline)
📋 **Documentar flujo profesores** para capacitación
✅ **Celebrar hito 50%** con equipo IITD

---

## 10. Anexos

### A. Documentos de Referencia
- **Inventario completo:** `/clientes/iitd/INVENTARIO-AUTOMATIZACIONES-IITD.xlsx`
- **Issues pendientes:** `/clientes/iitd/ISSUES-PENDIENTES.md`
- **Informe estado:** `/clientes/iitd/docs/informes/informe-estado-feb2026.md`
- **Tests Mayte:** [Google Docs](https://docs.google.com/document/d/1OXRf-5wCO6ZtShhIt2ODF2XsV4DBRnXAgmurVHsNVBg/edit)

### B. Enlaces Útiles
- **Panel IITD:** [Google Sheet](enlace compartido con dirección)
- **Calificaciones IITD:** [Google Sheet](enlace compartido)
- **Stackby IITD:** [stackby.com](https://stackby.com) → Stack "IITD Matriculación"
- **Webhook Stripe:** [Health check](https://iitd-stripe-webhook-621601343355.europe-west1.run.app/health)

### C. Contactos Clave
- **Javier Cuervo** (Proportione): javier.cuervo@proportione.com
- **Mayte Tortosa** (Validación): mayte.tortosa@proportione.com
- **Gema** (Contadora IITD): Pendiente contacto N18

---

**Documento preparado con datos actualizados al 13 febrero 2026, 8:00 AM**
