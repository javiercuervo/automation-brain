# Automation Brain

Repositorio central de automatizaciones: scripts, mappings, microservicios y knowledge bases para orquestar flujos entre Google Sheets, Pabbly Connect, Stackby, FlipBooklets, SiteGround y GitHub Actions.

## Estructura

```
comunes/                    Recursos compartidos entre clientes
  conocimiento/             Knowledge bases (Pabbly, Stackby, Apps Script, etc.)
  referencia/               Documentacion de referencia
  apis/                     Clientes API reutilizables (Stackby, Acumbamail, Holded, OCH)
  servicios/                Microservicios desplegables (Cloud Run)
  schemas/                  Schemas de datos
  prompts/                  Prompts para IA

clientes/                   Contenido por cliente
  iitd/                     Instituto Internacional de Teología a Distancia
  proportione/              CRM Proportione (migracion HubSpot, completado)
```

## Clientes

### IITD — Instituto Internacional de Teología a Distancia
Automatizaciones academicas y administrativas: inscripciones, calificaciones, certificados, recibos, RGPD, pagos Stripe, contenidos educativos.

**Estado:** 20 de 52 necesidades completadas (38.5%) — Sprints 1-5.

- **Integraciones**: `clientes/iitd/integraciones/alumnos/` (20+ scripts Node.js)
- **Stripe Webhook**: `clientes/iitd/integraciones/stripe-webhook/` (Cloud Run)
- **Apps Script**: `clientes/iitd/integraciones/apps-script/` (DECA, leads)
- **Scripts**: `clientes/iitd/scripts/` (Pabbly, PDFs/Scorms)
- **Docs**: `clientes/iitd/docs/` (manuales, legal, guias)

### Proportione — CRM Migration (completado)
Migracion completa de HubSpot a Stackby: 911 contactos, 303 empresas, 62 oportunidades, 711 actividades.

- **Scripts**: `clientes/proportione/scripts/` (exportar, migrar, deduplicar, vincular)
- **Datos**: `clientes/proportione/datos/` (CSVs originales + exports Stackby)

## Recursos comunes

| Recurso | Ruta | Descripcion |
|---------|------|-------------|
| Stackby API | `comunes/conocimiento/stackby-api.md` | KB completa + hallazgos practicos |
| Pabbly Connect | `comunes/conocimiento/pabbly-connect.md` | Arquitectura y patrones |
| Apps Script | `comunes/conocimiento/apps-script-operativa.md` | Guia operativa |
| API Clients | `comunes/apis/` | Stackby, Acumbamail, Holded, OCH |
| Pabbly Mapper | `comunes/servicios/pabbly-mapper/` | Cloud Run Express |

## Principios

1. **UI minima, logica versionada** — Pabbly contiene esqueletos; la logica vive en GitHub
2. **Transformar una vez, reutilizar siempre** — Normalize & Validate unico al inicio
3. **Contrato unico (Envelope)** — `{ meta, data, control }` entre workflows
4. **Idempotencia por diseno** — Pabbly reintenta; writes no duplican
5. **Claude decide; Pabbly ejecuta** — Claude genera artefactos que Pabbly consume
