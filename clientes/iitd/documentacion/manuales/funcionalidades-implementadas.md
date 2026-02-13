# Funcionalidades Implementadas - IITD

**Fecha:** 11 de febrero de 2026
**Version:** 2.0 (actualizado tras Sprint 4)

---

## Resumen

**19 de 46 necesidades resueltas** en 4 sprints (6-11 febrero 2026).
Camino critico PolarDoc: cerrado (5/5 pasos completados).

---

## Funcionando ahora (10 funcionalidades)

| # | ID | Funcionalidad | Script/Recurso |
|---|-----|---------------|----------------|
| 1 | N02 | Datos de alumnos completos (1.585 en Stackby) | `sync-sheets.mjs` |
| 2 | N04 | Numero de expediente automatico (IITD-110001+) | Apps Script `publisher.gs` |
| 3 | N05 | Listados por programa en Google Sheet | `sync-sheets.mjs`, `listados.mjs` |
| 4 | N06 | Calificaciones: sync Sheet ↔ Stackby (9 modulos DECA) | `calificaciones-client.mjs`, `sync-calificaciones.mjs` |
| 5 | N07 | Expediente academico (1.583 alumnos importados de PolarDoc) | `import-polar.mjs` |
| 6 | N08 | Recibos PDF + upload Drive + registro en Sheet | `recibo-pdf.mjs` |
| 7 | N09 | Certificados DECA con QR + upload SiteGround | `certificado-pdf.mjs` |
| 8 | N16 | Dashboard operativo diario (pipeline, alertas, actividad) | `dashboard.mjs` |
| 9 | N19 | KPIs DECA (funnel, tasas conversion, historico) | `kpis-deca.mjs` |
| 10 | N21 | Validacion de datos migrados (auditoria automatica) | `validar-datos.mjs` |

## Implementado, pendiente deploy/config (6)

| # | ID | Funcionalidad | Que falta |
|---|-----|---------------|-----------|
| 1 | N01 | Notificacion email de nuevas inscripciones | Configurar email alumnos@ |
| 2 | N04 | Asignacion expediente en flujo automatico | Deploy Apps Script actualizado |
| 3 | N13 | Inventario SaaS y DPAs | Crear tabla INVENTARIO_SAAS en Stackby |
| 4 | N14 | Captura leads web → Stackby | Sheet ID del formulario web (Sonia) |
| 5 | N20 | Deduplicacion avanzada | Integrado en scripts, listo |
| 6 | N40 | Footer RGPD en emails automaticos | Integrado en scripts |

## Guias/textos entregados (3)

| # | ID | Que se entrego |
|---|-----|----------------|
| 1 | N03 | Guia reenvio emails OCH → Miriam |
| 2 | N11 | Guia separacion consentimientos RGPD en formularios |
| 3 | N42 | Textos legales web (privacidad, aviso legal, cookies) |

---

## Cadena PolarDoc (cerrada)

```
1. ID unico alumno (N20)          ✅
2. Numero expediente (N04)         ✅
3. Expediente en BD (N07)          ✅ 1.583 alumnos
4. Calificaciones (N06)            ✅ Sheet ↔ Stackby
5. Certificados DECA (N09)         ✅ QR + hash + SiteGround
```

---

## Infraestructura creada

| Recurso | Para que |
|---------|----------|
| Google Sheet "Panel IITD" | Dashboard, KPIs, validacion, listados |
| Google Sheet "Calificaciones IITD" | Entrada de notas por profesores (3.573 filas prepobladas) |
| Carpeta Drive "Recibos IITD" | Almacen PDFs de recibos |
| Subdominio diplomas.institutoteologia.org | Hosting certificados/diplomas |
| Service Account Google | Auth Drive/Sheets para scripts |
| Tabla CALIFICACIONES en Stackby | 11 columnas para notas |
| pxl.to | Short links + QR para diplomas |
| BreezeDoc | Firma electronica (matricula, convenio, RGPD) |

---

## Scripts en `integraciones/alumnos/`

| Script | Uso |
|--------|-----|
| `sync-sheets.mjs` | `node sync-sheets.mjs` — Stackby → Sheet (pestanas por programa) |
| `listados.mjs` | `node listados.mjs --programa DECA --csv` — listados filtrados |
| `recibo-pdf.mjs` | `node recibo-pdf.mjs --email X --upload` — recibo + Drive |
| `certificado-pdf.mjs` | `node certificado-pdf.mjs --email X --upload` — certificado + SiteGround |
| `calificaciones-client.mjs` | `node calificaciones-client.mjs list` o `find <email>` |
| `sync-calificaciones.mjs` | `node sync-calificaciones.mjs` — Sheet → Stackby (--init-sheet, --reverse) |
| `dashboard.mjs` | `node dashboard.mjs` — dashboard → Sheet (--dry-run, --email) |
| `kpis-deca.mjs` | `node kpis-deca.mjs` — KPIs → Sheet (--dry-run, --all-programs) |
| `validar-datos.mjs` | `node validar-datos.mjs` — auditoria (--csv, --sheet) |
| `import-polar.mjs` | `node import-polar.mjs <xlsx>` — importar PolarDoc |
| `google-auth.mjs` | Auth compartido (Service Account con fallback ADC) |

---

*Documento actualizado automaticamente. Fuente de verdad: `informe-estado-feb2026.md`.*
