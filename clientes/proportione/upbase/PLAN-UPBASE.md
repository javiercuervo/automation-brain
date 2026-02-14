# Plan de trabajo Upbase — Proportione

## Resumen

Plan de 5 puntos para convertir Upbase en una herramienta de gestión efectiva integrada con Claude Code / Cowork.

| # | Punto | Estado |
|---|-------|--------|
| 1 | Actas → Tareas (extraer tareas de reuniones) | Pendiente (carpetas Drive por confirmar) |
| 2 | Limpieza y triaje de tareas existentes | En curso |
| 3 | Vista priorizada / temporal (¿qué tengo esta semana?) | Pendiente |
| 4 | Cruce con repo automation-brain | ✅ Completado (14 feb 2026) |
| 5 | Tags y estructura | Pendiente |

---

## Punto 4: Cruce con repo (completado 14 feb 2026)

### Tareas cerradas (7)

| Tarea | Lista | Resuelto por | Script/Artefacto |
|-------|-------|-------------|-----------------|
| montar servicio de tickets y probarlo con Sonia y Miriam | IITD | N35 Sprint 9 | tickets-client.mjs + ticket-processor.mjs + faq-responder.mjs |
| Crear Google Ads Grants | IITD | N37 Sprint 10 | campaigns-client.mjs + google-grants-report.mjs |
| crear bot de email desde stackby | IITD | N25 Sprint 6 | email-sender.mjs (4 plantillas SMTP) |
| Programar que al asignar un tickets se envíe un correo al responsable | Prop IT | N35 Sprint 9 | ticket-processor.mjs (plantilla ticket-escalado.html) |
| Spark receipt | Prop IT | — | uber-invoices.mjs (Playwright → SparkReceipt) |
| IITD - keywordmapping y estructura HOME | Prop gestión | Sprint 6 SEO | Yoast SEO: 13 páginas + sitemap + FAQ |
| Traducir al español las plantillas de los correos | IITD | — | 9 plantillas HTML en español |

### Tarea actualizada con estado parcial (1)

**"Tareas OCH"** (IITD) — Descripción enriquecida con cruce detallado:
- ✅ Exportación: och-csv-import.mjs
- ✅ Calificaciones: calificaciones-client.mjs + sync
- ✅ Auto-enrollment: och-enrollment.mjs
- ✅ Diplomas: diploma-och.mjs + certificado-pdf.mjs
- 🚫 Notificaciones, permisos, vista gestión: bloqueados (OCH solo tiene 2 endpoints REST)

### Nota técnica

La API de Upbase filtra tareas cerradas: no aparecen en `GET /tasks` ni en `GET /tasks/{id}` (devuelve "not found"). Las descripciones con referencia al repo quedan guardadas pero solo son visibles desde la UI web de Upbase.

---

## Inventario de tareas por lista (14 feb 2026)

| Lista | Tareas abiertas | Con fecha | Con prioridad |
|-------|----------------|-----------|---------------|
| Instituto Teologia | 35 | 5 | 5 (medium) |
| Proportione IT | 20 | 4 | 0 |
| Proportione ventas | 13 | 8 | 5 (medium) |
| Proportione gestión | 10 | 3 | 0 |
| Proportione marketing | 44 | 12 | 5 |
| Mensoft operaciones | 3 | 2 | 2 (medium) |
| Contenidos | 3 | 2 | 1 (medium) |
| **Total** | **~128** | **~36** | **~18** |

---

## Punto 2: Plan de triaje (siguiente paso)

### Problemas detectados

1. **Duplicados**: "Traspasar SmartClerk a Mayte" ×2 en gestión
2. **Tareas vencidas**: ~15 con fechas de 2025 aún abiertas
3. **Sin prioridad**: >80% de las tareas
4. **Sin asignar**: casi todas
5. **0 tags**: no hay forma de filtrar por cliente/tipo
6. **Todo en Inbox**: ninguna tarea en Proceso/Revisión/Completado
7. **Tareas-nota**: muchas son fragmentos de reunión, no tareas accionables (ej: "e b2c en un curso", "registrar")

### Acciones planificadas

| Acción | Tareas afectadas | Criterio |
|--------|-----------------|----------|
| Cerrar duplicados | ~2 | Mismo título, mismo contenido |
| Cerrar vencidas obsoletas | ~10 | Fecha 2025, sin actividad, claramente superadas |
| Agrupar notas de reunión | ~15 | Fragmentos sin contexto → agrupar o archivar |
| Añadir prioridades | ~50 | Según impacto negocio y urgencia |
| Crear tags | 0→N | Por cliente: IITD, Proportione, Porqueviven, Mensoft |
| Asignar responsables | ~30 | javier.cuervo o mayte.tortosa según área |

---

## Datos de referencia

### Listas principales

| ID | Nombre | Tipo |
|----|--------|------|
| `2boyNgNSAXKrDsqCRC95S` | Instituto Teologia | list |
| `2boyYKemZ7LCB4WkdDp96` | Proportione IT | list |
| `2boyYHVJ6n2mx2WTJ4Q32` | Proportione ventas | list |
| `2boyYFGbjB7iZ26ocR7ui` | Proportione marketing | list |
| `2boyYHTZeRRZLssD9ztor` | Proportione gestión | list |
| `2boyNgNBnMB5NN6eBxb2W` | Mensoft operaciones | list |
| `2boyNgNSAdEQcbjSEgmcJ` | Contenidos | list |

### Usuarios

| ID | Email |
|----|-------|
| `75RyLPrv7QKSkR31MNAntY` | javier.cuervo@proportione.com |
| `75RyLPrv7TWkuUUCUN2bSg` | mayte.tortosa@proportione.com |
| `75RyLZZUthVwCjzaEVofJp` | ksalemidms@gmail.com |
| `75VEf81ex3T3ZpyPQykgRv` | hernandrb@gmail.com |
| `75VEf81ex3UYNhj8MWLGvG` | margaserranobl@gmail.com |
| `75VEfNYSWbndwEiYaRaJQG` | xavier@porqueviven.org |
| `75VEfYAdNPowFfgFf6SM7J` | ibizadayhq@gmail.com |

### Stages (Kanban) — patrón común

| Stage | Prop IT ID | IITD ID | Prop gestión ID |
|-------|-----------|---------|-----------------|
| Inbox | `2wYVi1YMnz` | `2wYVi1YMnz` | `2wYVi1YMnz` |
| Proceso | `2bpiS9GXhC7aJysFj4QCg` | `2bpi6xA1bN1BHjUgWRfd4` | `2bpiSGxe4SHoGnRGdYGhG` |
| Revisión | `2bpiS9GXhDcPBj8SWsUsN` | `2bpi6xA1bQD8fxASjaL2k` | `2bpiSGxe4UVbLKNgaE1C4` |
| Completado | `2bpiS9GXhFpLc4K9Awt9v` | `2bpi6xA1ea2eBKpjE5yq6` | `2bpiSGxe4VzQFB8onxVwa` |

### Tags

Actualmente: **0 tags definidos**. Propuesta para punto 5:
- `iitd`, `proportione`, `porqueviven`, `mensoft`, `personal`
- `automatizable`, `manual`, `bloqueado`
- `compra`, `admin`, `desarrollo`

---

## Siguiente paso pendiente

**Punto 1 — Actas → Tareas**: El usuario tiene carpetas de Drive con actas de reuniones. Cuando proporcione los IDs de carpeta, se podrán procesar con el Service Account de Google y extraer tareas automáticamente para crear en Upbase.
