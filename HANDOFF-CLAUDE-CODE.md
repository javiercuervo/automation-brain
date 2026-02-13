# 🚀 Handoff a Claude Code - Proyectos de Automatización

**Fecha:** 12 febrero 2026
**Preparado para:** Javier Cuervo
**Contexto:** Sesión de Cowork completada - Listo para continuar en VS Code + Claude Code

> **🎉 ACTUALIZACIÓN POST-SPRINTS:**
> ✅ **N06** (Tabla CALIFICACIONES) - Completado: 11 columnas, 3.573 filas, sync bidireccional
> ✅ **N13** (Inventario SaaS) - Completado: 14 columnas, 12 herramientas pre-pobladas
> ⚠️ **N18** (Migración Holded) ahora es PRIORIDAD #1 (caduca junio 2026)

---

## 📋 Resumen Ejecutivo

Se han completado **4 entregables principales** listos para implementación:

1. **Plan completo de automatización Upbase** (10 fases)
2. **Inventario exhaustivo de automatizaciones IITD** (52 necesidades N01-N52)
3. **Script de reorganización Google Drive** para IITD
4. **Script funcional de creación de tareas Upbase**

Todos los archivos están en `/Users/javiercuervolopez/code/automation-brain/`

---

## 🎯 Proyecto 1: Automatización Upbase (Proportione)

### Archivos Creados

#### 📄 `START-HERE-CLAUDE-CODE.md`
- **Qué es:** Punto de entrada rápido al proyecto Upbase
- **Contiene:** Visión general, ubicación de archivos, MVP recomendado
- **Acción:** Leer primero cuando abras el proyecto en VS Code

#### 📄 `PLAN-UPBASE-AUTOMATION.md`
- **Qué es:** Plan completo de implementación en 10 fases
- **Fases:**
  1. ✅ Mejora API client (envelope pattern)
  2. Microservicio Cloud Run
  3. Google Sheets integration
  4. Pabbly Connect
  5. CLI mejorado
  6. Sincronización bidireccional
  7. Dashboard web
  8. Testing automatizado
  9. CI/CD
  10. Monitorización y alertas
- **MVP:** Fases 1, 2, 3, 8, 9
- **Acción:** Seguir fase por fase o empezar por MVP

#### 💻 `crear-tarea-holded.mjs`
- **Qué es:** Script funcional para crear tarea en Upbase
- **Funcionalidad:**
  - Busca automáticamente a Javier y Mayte por email
  - Crea tarea "Unirse a Holded"
  - Asigna ambos usuarios
  - Establece prioridad alta y fecha límite
- **Uso:**
  ```bash
  cd /Users/javiercuervolopez/code/automation-brain
  node crear-tarea-holded.mjs
  ```
- **Nota:** Ejecutar desde terminal local (no desde VM)

### Archivos Existentes Clave

- `/clientes/proportione/upbase/upbase-api.mjs` - API client completo
- `/clientes/proportione/upbase/tasks.mjs` - CLI actual
- `/clientes/proportione/upbase/mcp-server.mjs` - Servidor MCP
- `/clientes/proportione/upbase/.playwright-storage.json` - JWT auth

### Próximos Pasos Upbase

1. **Fase 1 (MVP):** Implementar envelope pattern en `upbase-api.mjs`
2. **Fase 2 (MVP):** Crear microservicio Cloud Run para webhooks
3. **Fase 3 (MVP):** Integración con Google Sheets (lectura/escritura tareas)
4. **Fase 8 (MVP):** Tests unitarios con Jest
5. **Fase 9 (MVP):** GitHub Actions para CI/CD

---

## 🎯 Proyecto 2: Inventario Automatizaciones IITD

### Archivos Creados

#### 📊 `clientes/iitd/INVENTARIO-AUTOMATIZACIONES-IITD.xlsx`
- **Qué es:** Inventario completo en Excel con 52 automatizaciones
- **Pestañas:**
  - **Completa:** Todas las 52 necesidades (N01-N52)
  - **Por Estado:** Filtrada por ✅🔧📋⏳🚫
  - **Resumen:** Estadísticas y totales
- **Columnas:**
  - Código (N01-N52)
  - Necesidad/Automatización
  - Estado
  - Qué hace
  - Cómo probarla
  - Archivos/Scripts clave
- **Estadísticas actuales:**
  - ✅ Hecho: 26 (50%)
  - 🔧 Implementado: 5 (9.6%)
  - 📋 Guía: 2 (3.8%)
  - ⏳ Pendiente: 14 (26.9%)
  - 🚫 Bloqueado: 5 (9.6%)

#### 📄 `clientes/iitd/INVENTARIO-AUTOMATIZACIONES-IITD.md`
- **Qué es:** Versión Markdown del inventario
- **Estructura:** 7 grupos temáticos (A-G)
  - Grupo A: Inscripciones y Captura (N01-N04, N14, N20, N47)
  - Grupo B: Gestión Alumnos (N05-N07, N21, N50-N52)
  - Grupo C: Certificados y Documentos (N08-N09, N11, N15, N48-N49)
  - Grupo D: Sincronizaciones y LMS (N16-N17, N19, N22)
  - Grupo E: Cumplimiento RGPD (N11-N13, N23, N40-N46)
  - Grupo F: Pagos y Facturación (N10, N18, N36)
  - Grupo G: Marketing y Comunicación (N24-N35, N37-N38)
- **Uso:** GitHub-flavored Markdown, fácil de leer en VS Code

### Automatizaciones Nuevas Identificadas (N47-N52)

Estas NO estaban en el acta original pero fueron implementadas:

- **N47:** Pipeline PDFs/Scorms → FlipBooklets
- **N48:** Infraestructura Hosting Diplomas (diplomas.institutoteologia.org)
- **N49:** Sistema QR Codes Dinámicos (pxl.to)
- **N50:** Panel IITD Multi-Pestaña (Google Sheets con 9 pestañas)
- **N51:** Sistema Recibos PDF Automáticos
- **N52:** Deduplicación Avanzada de Alumnos

### Archivos Clave del Proyecto IITD

**Documentación:**
- `clientes/iitd/docs/informes/informe-estado-feb2026.md` - Acta 6 feb 2026
- `clientes/iitd/docs/informes/informe-automatizaciones-feb2026.md` - Informe ejecutivo

**Scripts Principales:**
- `clientes/iitd/integraciones/alumnos/sync-sheets.mjs` - Sync Stackby → Sheet
- `clientes/iitd/integraciones/alumnos/recibos-pdf.mjs` - Generación recibos
- `clientes/iitd/integraciones/alumnos/certificado-pdf.mjs` - Generación certificados
- `clientes/iitd/integraciones/alumnos/dashboard.mjs` - Dashboard operativo
- `clientes/iitd/integraciones/alumnos/kpis-deca.mjs` - KPIs DECA

**Apps Scripts:**
- `clientes/iitd/integraciones/apps-script/deca/publisher.gs` - Notificaciones DECA
- `clientes/iitd/integraciones/apps-script/leads/publisher_leads.gs` - Captura leads

### Próximos Pasos IITD

**✅ Completado en Sprints Recientes:**
- **N06:** Tabla CALIFICACIONES en Stackby (11 columnas, 3.573 filas) + sync bidireccional
- **N13:** Tabla INVENTARIO_SAAS en Stackby (14 columnas, 12 herramientas pre-pobladas)

**Urgente (Sprint 4 - Marzo 2026):**
1. **N18:** Migración Golden Soft → Holded (⚠️ CRÍTICO: caduca junio 2026)

**Prioritario:**
1. Activar N01 (config email alumnos@)
2. Completar N15 (templates BreezeDoc)
3. Desbloquear N17 (API OCH limitada - contactar soporte)

**RGPD (Sprint 5 - Abril 2026):**
1. N12, N41, N43, N44, N45, N46

---

## 🎯 Proyecto 3: Reorganización Google Drive IITD

### Archivo Creado

#### 💻 `clientes/iitd/integraciones/alumnos/reorganizar-drive.mjs`
- **Qué es:** Script para reorganizar estructura de carpetas en Google Drive
- **Problema resuelto:** Recibos y certificados estaban en raíz, deben estar bajo carpeta organizadora
- **Carpeta padre:** `1CUY5Spma5__nR-MVKa1f8sa1vtvt6PdS`
- **Subcarpetas a crear/mover:**
  1. Recibos IITD
  2. Documentos Firmados
  3. Importaciones
  4. Backups
- **Funcionalidad:**
  - Busca carpetas existentes
  - Las mueve si están en ubicación incorrecta
  - Crea las que faltan
  - Actualiza `.env` con IDs correctos
  - Modo dry-run para testing seguro

### Uso del Script

```bash
# Desde terminal LOCAL (no VM)
cd /Users/javiercuervolopez/code/automation-brain/clientes/iitd/integraciones/alumnos

# 1. Preview sin cambios (RECOMENDADO PRIMERO)
node reorganizar-drive.mjs --dry-run

# 2. Si todo se ve bien, ejecutar
node reorganizar-drive.mjs

# 3. Verificar .env actualizado
cat .env | grep DRIVE_
```

### Output Esperado

```
═══════════════════════════════════════════════════════
  REORGANIZACIÓN DE CARPETAS DRIVE - IITD
═══════════════════════════════════════════════════════

🔐 Autenticando con Google Drive...
✓ Carpeta organizadora encontrada: "IITD Documentos"
  ID: 1CUY5Spma5__nR-MVKa1f8sa1vtvt6PdS
  URL: https://drive.google.com/drive/folders/1CUY5Spma5__nR-MVKa1f8sa1vtvt6PdS

📂 Procesando subcarpetas...

📁 Procesando: Recibos IITD
  ℹ Existe pero en ubicación incorrecta, moviendo...
  ✓ Movida exitosamente

📁 Procesando: Documentos Firmados
  ℹ No existe, creando...
  ✓ Creada: 1ABC...XYZ

📝 Actualizando .env
  ✓ Actualizado: DRIVE_RECIBOS_FOLDER_ID
  ✓ Añadido: DRIVE_DOCUMENTOS_FOLDER_ID
  ✓ Archivo .env actualizado

✅ Reorganización completada exitosamente.
```

### Variables .env Generadas

```bash
DRIVE_RECIBOS_FOLDER_ID=1ABC...XYZ
DRIVE_DOCUMENTOS_FOLDER_ID=1DEF...ABC
DRIVE_IMPORTACIONES_FOLDER_ID=1GHI...DEF
DRIVE_BACKUPS_FOLDER_ID=1JKL...GHI
```

Estas variables serán usadas automáticamente por:
- `recibos-pdf.mjs`
- `certificado-pdf.mjs`
- Scripts de importación/backup

---

## 🛠️ Configuración del Entorno

### Requisitos Previos

1. **Node.js 18+**
   ```bash
   node --version  # Verificar versión
   ```

2. **Dependencias instaladas**
   ```bash
   cd /Users/javiercuervolopez/code/automation-brain
   npm install
   ```

3. **Variables de entorno configuradas**
   - Upbase: `.playwright-storage.json` en `/clientes/proportione/upbase/`
   - IITD: `.env` en `/clientes/iitd/integraciones/alumnos/`
   - Stackby: `STACKBY_API_KEY` en variables de entorno

4. **Google Cloud credentials**
   - ADC configurado: `gcloud auth application-default login`
   - O service account JSON en `GOOGLE_APPLICATION_CREDENTIALS`

### Estructura de Carpetas

```
automation-brain/
├── HANDOFF-CLAUDE-CODE.md          ← ESTE ARCHIVO (punto de entrada)
├── START-HERE-CLAUDE-CODE.md       ← Upbase: inicio rápido
├── PLAN-UPBASE-AUTOMATION.md       ← Upbase: plan completo 10 fases
├── crear-tarea-holded.mjs          ← Upbase: script crear tarea
│
├── clientes/
│   ├── proportione/
│   │   └── upbase/
│   │       ├── upbase-api.mjs      ← API client actual
│   │       ├── tasks.mjs           ← CLI actual
│   │       ├── mcp-server.mjs      ← MCP server
│   │       └── .playwright-storage.json
│   │
│   └── iitd/
│       ├── INVENTARIO-AUTOMATIZACIONES-IITD.xlsx  ← Inventario Excel
│       ├── INVENTARIO-AUTOMATIZACIONES-IITD.md    ← Inventario Markdown
│       │
│       ├── docs/
│       │   └── informes/
│       │       ├── informe-estado-feb2026.md      ← Acta 6 feb
│       │       └── informe-automatizaciones-feb2026.md
│       │
│       └── integraciones/
│           ├── alumnos/
│           │   ├── sync-sheets.mjs            ← Sync Stackby → Sheet
│           │   ├── recibos-pdf.mjs            ← Generación recibos
│           │   ├── certificado-pdf.mjs        ← Generación certificados
│           │   ├── reorganizar-drive.mjs      ← ⭐ NUEVO: reorganizar Drive
│           │   ├── dashboard.mjs              ← Dashboard operativo
│           │   ├── kpis-deca.mjs              ← KPIs DECA
│           │   └── .env
│           │
│           └── apps-script/
│               ├── deca/publisher.gs          ← Apps Script DECA
│               └── leads/publisher_leads.gs   ← Apps Script Leads
│
└── scripts/
    └── pdfs-y-scorms/
        ├── discover.mjs                       ← FlipBooklets explorer
        └── upload.mjs                         ← FlipBooklets uploader
```

---

## 🚦 Próximos Pasos Recomendados

### Inmediato (Hoy)

1. **Abrir proyecto en VS Code**
   ```bash
   cd /Users/javiercuervolopez/code/automation-brain
   code .
   ```

2. **Leer este archivo en Claude Code**
   - Abrir `HANDOFF-CLAUDE-CODE.md` en VS Code
   - Pedirle a Claude Code que lo lea y entienda el contexto

3. **Reorganizar Drive IITD (CRÍTICO)**
   ```bash
   cd clientes/iitd/integraciones/alumnos
   node reorganizar-drive.mjs --dry-run   # Preview primero
   node reorganizar-drive.mjs              # Ejecutar si OK
   ```

### Esta Semana

**Proyecto Upbase:**
1. Leer `START-HERE-CLAUDE-CODE.md`
2. Revisar `PLAN-UPBASE-AUTOMATION.md`
3. Decidir: ¿MVP (5 fases) o plan completo (10 fases)?
4. Comenzar Fase 1: Mejorar `upbase-api.mjs` con envelope pattern

**Proyecto IITD:**
1. Abrir `INVENTARIO-AUTOMATIZACIONES-IITD.xlsx` en Excel
2. Revisar necesidades pendientes (⏳) y bloqueadas (🚫)
3. ✅ **Completado:** N06 (Calificaciones), N13 (Inventario SaaS)
4. **Priorizar ahora:** N18 (⚠️ urgente, caduca junio 2026)
5. Testing de automatizaciones ✅ según comandos en inventario

### Próximo Sprint (Marzo 2026)

**IITD Sprint 4 (Urgente):**
1. **N18:** Migración Golden Soft → Holded (⚠️ CRÍTICO)
2. Activar N01, N14, N15
3. Completar templates BreezeDoc (N15)
4. Contactar soporte OCH para desbloquear N17

**Upbase MVP:**
1. Completar Fases 1-3, 8-9
2. Deploy microservicio a Cloud Run
3. Integración Google Sheets funcional
4. Tests automatizados

---

## 📚 Documentación de Referencia

### APIs y Servicios

**Upbase:**
- API interna: `https://api.upbase.io`
- Docs: No públicas (ingeniería inversa)
- Auth: JWT en `.playwright-storage.json`

**Stackby:**
- API: `https://stackby.com/api/betav1`
- Docs: https://stackby.com/developer-docs
- Auth: API key en `STACKBY_API_KEY`

**Google:**
- Drive API: https://developers.google.com/drive/api/v3
- Sheets API: https://developers.google.com/sheets/api
- Auth: ADC o service account

**IITD Servicios:**
- OnlineCourseHost (OCH): LMS - API limitada
- BreezeDoc: Firma electrónica
- Stripe: Pagos y webhooks
- Acumbamail: Email marketing
- pxl.to: Short links + QR codes
- FlipBooklets.com: Conversión PDFs a flipbooks

### Scripts de Testing Rápido

**Verificar acceso Stackby:**
```bash
curl -H "api-key: $STACKBY_API_KEY" \
  https://stackby.com/api/betav1/rowlist/stHbLS2nezlbb3BL78/tbJ6m2vPBrLEBvZ3VQ
```

**Verificar acceso Google Drive:**
```bash
cd clientes/iitd/integraciones/alumnos
node -e "
const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/drive'] });
const drive = google.drive({ version: 'v3', auth });
drive.files.get({ fileId: '1CUY5Spma5__nR-MVKa1f8sa1vtvt6PdS', fields: 'id,name' })
  .then(r => console.log('✓', r.data))
  .catch(e => console.error('✗', e.message));
"
```

**Test Upbase API:**
```bash
cd clientes/proportione/upbase
node -e "
const UpbaseAPI = require('./upbase-api.mjs');
const api = new UpbaseAPI();
api.getTasks('2boyNgNSAXKrDsqCRC95S').then(tasks => console.log('Tasks:', tasks.length));
"
```

---

## ⚠️ Notas Importantes

### Limitaciones Conocidas

1. **Upbase API:** No documentada oficialmente, puede cambiar sin aviso
2. **OnlineCourseHost (OCH):** API muy limitada (solo 2 endpoints), no soporta webhooks
3. **VM Network:** Algunas APIs pueden dar 403 desde VM - ejecutar en terminal local
4. **Google Auth:** Requiere ADC configurado o service account JSON

### Seguridad

- **Nunca commitear** `.env`, `.playwright-storage.json`, service account JSONs
- `.gitignore` ya configurado correctamente
- Secrets en GitHub Secrets para CI/CD (cuando se implemente)

### Backups

Los siguientes archivos son críticos y deberían tener backup:

1. `.env` de cada proyecto
2. `.playwright-storage.json` (Upbase)
3. Service account JSON (Google)
4. `INVENTARIO-AUTOMATIZACIONES-IITD.xlsx`

---

## 🆘 Troubleshooting

### Error: "Cannot find module 'googleapis'"

```bash
cd /Users/javiercuervolopez/code/automation-brain
npm install
```

### Error: "403 Forbidden" al llamar API desde VM

Ejecutar desde terminal local, no desde VM:
```bash
# En tu Mac, no en VM
cd /Users/javiercuervolopez/code/automation-brain
node crear-tarea-holded.mjs
```

### Error: "Google auth: Could not load the default credentials"

```bash
# Opción 1: ADC
gcloud auth application-default login

# Opción 2: Service account
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

### Error: "Upbase JWT expired"

Re-generar `.playwright-storage.json`:
```bash
cd clientes/proportione/upbase
node login.mjs  # Si existe script de login
```

---

## 📞 Contacto y Soporte

**Proyecto:** Automatizaciones Proportione + IITD
**Desarrollador:** Javier Cuervo (javier.cuervo@proportione.com)
**Última actualización:** 12 febrero 2026 (post-sprints N06 y N13)

**Claude Code en VS Code:**
- Extensión: Claude Code (Anthropic)
- Docs: https://docs.claude.com/claude-code

---

## ✅ Checklist de Handoff

- [x] Plan Upbase completo (10 fases)
- [x] Script crear tarea Upbase funcional
- [x] Inventario IITD completo (52 automatizaciones)
- [x] Inventario en Excel + Markdown
- [x] Script reorganizar Drive IITD
- [x] Documentación de uso y testing
- [x] Este documento de handoff
- [x] N06: Tabla CALIFICACIONES completada (Sprint reciente)
- [x] N13: Tabla INVENTARIO_SAAS completada (Sprint reciente)
- [ ] Ejecutar `reorganizar-drive.mjs` (pendiente usuario)
- [ ] Comenzar implementación Upbase MVP
- [ ] Priorizar N18 (⚠️ urgente - caduca junio 2026)

---

**🎯 ACCIÓN RECOMENDADA AHORA:**

1. Abrir VS Code en `/Users/javiercuervolopez/code/automation-brain`
2. Leer este archivo en Claude Code
3. Ejecutar `reorganizar-drive.mjs --dry-run` para IITD
4. Decidir si empezar con Upbase MVP o necesidades urgentes IITD

**¡Todo listo para continuar! 🚀**
