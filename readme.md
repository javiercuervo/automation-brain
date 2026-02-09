# Automation Brain

Repositorio central de automatizaciones: scripts, mappings, microservicios y knowledge bases para orquestar flujos entre Google Sheets, Pabbly Connect, Stackby, FlipBooklets, SiteGround y GitHub Actions.

## Proyectos

### WF_001 — DECA Inscripcion (Pabbly + Stackby)
Automatizacion del formulario de inscripcion DECA: normaliza datos de Google Sheets, decide CREATE/UPDATE y persiste en Stackby.

- **Scripts**: `scripts/pabbly/wf_001_deca_inscripcion/` (JS v2, v3, Python v3)
- **Microservicio**: `services/pabbly-mapper/` (Cloud Run, Express, GitHub Actions)
- **Flujo**: Sheets → Pabbly Iterator → Normalize → Stackby Search → Filter & Decide → Persist

### IITD — PDFs y Scorms (tarea recurrente)
Subida de contenidos educativos: PDFs a FlipBooklets.com (Playwright) y Scorms HTML5 a SiteGround (SSH/rsync). Actualiza Google Sheet con embed codes y URLs.

- **Scripts**: `scripts/IITD/PDFs y Scorms/` (pipeline.mjs, upload.mjs)
- **Destinos**: `pdf.proportione.com` (FlipBooklets), `scorm.institutoteologia.org` (SiteGround)

## Layout

```
docs/knowledge/          # Knowledge bases (Pabbly, Python, Syntax, Patterns, APIs)
scripts/pabbly/          # Scripts para Code by Pabbly
scripts/IITD/            # Scripts para cliente IITD
services/pabbly-mapper/  # Microservicio Cloud Run
.github/workflows/       # GitHub Actions (pabbly-dispatch)
mappings/                # Mappings JSON por dominio/tabla
schemas/                 # Schemas (Envelope, etc.)
samples/                 # Payloads y outputs esperados
```

## Knowledge Bases

| Archivo | Contenido |
|---------|-----------|
| `pabbly-connect-knowledge-base.md` | Pabbly Connect: arquitectura, Code by Pabbly (JS), limites |
| `pabbly_python_kb.md` | Python 3.9 en Pabbly: modulos, input/output |
| `PABBLY_SYNTAX.md` | Tokens, variables, iterators, headers |
| `integration-patterns-and-architecture.md` | Envelope, patrones E2E, directivas Claude Code |
| `OnlineCourseHost_API_KB.md` | API de OnlineCourseHost |

## Principios

1. **UI minima, logica versionada** — Pabbly contiene esqueletos; la logica vive en GitHub
2. **Transformar una vez, reutilizar siempre** — Normalize & Validate unico al inicio
3. **Contrato unico (Envelope)** — `{ meta, data, control }` entre workflows
4. **Idempotencia por diseno** — Pabbly reintenta; writes no duplican
5. **Claude decide; Pabbly ejecuta** — Claude genera artefactos que Pabbly consume
