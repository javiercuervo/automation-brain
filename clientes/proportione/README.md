# Estado de Migración CRM HubSpot → Stackby

**Última actualización:** 2026-02-04 23:00 UTC
**Estado:** DATOS COMPLETOS + COLUMNAS RENOMBRADAS — Pendiente campos nuevos, vistas y dashboard

---

## ✅ Completado

| Fase | Tarea | Resultado |
|------|-------|-----------|
| 1 | Importar contacts de HubSpot | 949 registros |
| 2 | Importar companies de HubSpot | 302 registros |
| 3 | Importar opportunities de HubSpot | 62 registros |
| 4 | Deduplicación | 274 contacts + 185 companies eliminados |
| 5 | Importar interactions | **711/711 registros** |
| 6a | Vincular Contact → Company | **237 relaciones** |
| 6b | Vincular Opportunity → Contact | **53/53 relaciones** |
| 6c | Vincular Opportunity → Company | **53/53 relaciones** |
| 7 | Etapas pipeline en español | **62/62** (Ganada:18, Perdida:37, Propuesta:2, Contacto inicial:5) |
| 8 | Tipos de actividad en español | **711/711** (Llamada:10, Reunion:535, Nota:88, Tarea:78) |
| 9 | Clasificar oportunidades por tipo | **62/62** (Tipo de Servicio) |
| 10 | Vincular Actividades → Oportunidades | **19 links** (parcial — Empresas link tiene bug 501) |
| 11 | Renombrar columnas al español | **Contactos, Oportunidades, Actividades** (Empresas pendiente) |

### Estado actual en Stackby:

| Tabla | Registros | Columnas renombradas | Links |
|---|---|---|---|
| **Contactos** | 911 | ✅ Español | 237 → Empresa |
| **Empresas** | 303 | ❌ Inglés (pendiente) | — |
| **Oportunidades** | 62 | ✅ Español | 53 → Contacto, 53 → Empresa, Tipo Servicio |
| **Actividades** | 711 | ✅ Español | 19 → Oportunidad, 1 → Contacto |

### Clasificación de oportunidades:
| Tipo | Cantidad |
|---|---|
| Otro | 21 |
| Desarrollo Web | 19 |
| Formacion | 12 |
| Consultoria | 6 |
| Marketing | 3 |
| Coaching | 1 |

### Pipeline actual:
| Etapa | Cantidad |
|---|---|
| Perdida | 37 |
| Ganada | 18 |
| Contacto inicial | 5 |
| Propuesta | 2 |

---

## ⏳ Pendiente para mañana

### En UI (sin API):
1. **Renombrar columnas de Empresas**: Company Name→Nombre, Industry→Sector, Employees→Empleados, Website→Web
2. **Convertir Type** (Actividades) de Short Text → **Single Select**
3. Añadir campos nuevos (PASO 5 de GUIA-CRM-PROPORTIONE.md)
4. Crear tabla Proyectos (PASO 6)
5. Configurar vistas: Kanban, Calendario, Grids (PASO 7)
6. Configurar dashboard ejecutivo (PASO 8)

### Bugs API conocidos:
- **Linked records Empresas en Actividades**: HTTP 501 "Something went wrong" — no se pueden vincular actividades a empresas via API
- **rowupdate**: HTTP 500 — sigue roto

---

## Hallazgos API Stackby

| Endpoint | Método | Estado |
|----------|--------|--------|
| `/rowlist` | GET | ✅ Funciona |
| `/rowcreate` | POST | ✅ Funciona (linked records con workaround) |
| `/rowupdate` | PATCH | ❌ Bug HTTP 500 |
| `/rowdelete` | DELETE | ✅ Funciona (`?rowIds[]=id`) |
| Linked → Empresas en Actividades | POST | ❌ Bug HTTP 501 |

### Workarounds:
- **Linked records 1 elem**: duplicar → `[id, id]`
- **rowdelete**: usar `rowIds[]` con corchetes
- **Select fields**: solo acepta opciones existentes. Cambiar a Text, escribir, convertir a Select.
- **Campos nuevos**: crear en UI, luego poblar via API.
- **Nombres de campo**: la API usa el nombre exacto visible en UI.

---

## Archivos

```
CRM/
├── GUIA-CRM-PROPORTIONE.md          # Guía paso a paso
├── MIGRATION_STATUS.md              # Este archivo
├── classify-services.js              # Clasificar oportunidades (EJECUTADO)
├── translate-activities.js           # Tipos actividad español (EJECUTADO)
├── link-deals-companies.js           # Vincular Opp→Empresa (EJECUTADO)
├── link-activities.js                # Vincular Actividades→Opp/Con (EJECUTADO parcial)
├── fix-stages.js                     # Restaurar etapas (EJECUTADO)
├── fix-remaining-deals.js            # Vincular Opp→Contact (EJECUTADO)
├── populate-relations.js             # Contact→Company (EJECUTADO)
├── import-interactions.js            # Importar actividades (EJECUTADO)
├── dedup-contacts.js / dedup-opportunities.js (EJECUTADOS)
├── recover-opportunities-v2.js       # Recuperación emergencia
├── api-diagnostic*.js                # Diagnósticos (1-6)
└── CSVs/                             # Datos originales HubSpot
```

## Configuración

**Stack ID:** `stBBsLQwR69x3Vgs49`

| Tabla | ID | Registros |
|-------|-----|-----------|
| Contactos | `tbl1770077025864393853` | 911 |
| Empresas | `tbl17700770258657e9b69` | 303 |
| Oportunidades | `tbl17700770258658046c6` | 62 |
| Actividades | `tbl1770077025865d62b5f` | 711 |
