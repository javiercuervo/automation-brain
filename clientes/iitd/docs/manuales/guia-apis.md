# Guía de APIs - Instituto Internacional de Teología a Distancia

**Ultima actualización:** 11 de febrero de 2026

## Resumen

| API | Base URL | Autenticación | Cliente en proyecto |
|-----|----------|---------------|---------------------|
| **Stackby** | `https://stackby.com/api/betav1` | Header `api-key` | `integraciones/alumnos/alumnos-client.js`<br>`integraciones/alumnos/calificaciones-client.mjs` |
| **Google Sheets/Drive** | `https://sheets.googleapis.com/v4`<br>`https://www.googleapis.com/upload/drive/v3` | Service Account (OAuth2 JWT) | `integraciones/alumnos/google-auth.mjs` |
| **pxl.to** | `https://pxl.to/api/v1` | Header `Authorization: Bearer JWT` | `integraciones/alumnos/pxl-client.mjs` |
| **BreezeDoc** | `https://api.breezedoc.com` | OAuth2 | `integraciones/alumnos/breezedoc-client.mjs` |
| **Stripe** | `https://api.stripe.com` | Bearer Token (API Key) | `integraciones/stripe-webhook/` |
| **Holded** | `https://api.holded.com/api` | Header `key` | (pendiente configurar) |
| **OnlineCourseHost** | `https://api.onlinecoursehost.com` | Header `X-Integration-Token` | `integraciones/och-sync/` (bloqueado — sin token) |
| **Acumbamail** | `https://acumbamail.com/api/1` | Form param `auth_token` | (pendiente) |

---

## Stackby

Base de datos principal del proyecto. Almacena alumnos, calificaciones y solicitudes.

### Credenciales
- **API Key**: en `.env` (`STACKBY_API_KEY`)
- **Stack ID**: `stHbLS2nezlbb3BL78` (en la URL al abrir el stack)

### Tablas principales

| Tabla | Table ID | Uso |
|-------|----------|-----|
| ALUMNOS | `tbJ6m2vPBrLEBvZ3VQ` | Datos de 1.585 alumnos |
| CALIFICACIONES | `tb3nYuG2t5t7Sq7Iz1` | Notas por alumno/asignatura (11 columnas) |
| SOLICITUDES_DECA | `tbcoXCDU2ArgKH4eQJ` | Inscripciones DECA desde formulario web |

### Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/rowlist/{stackId}/{tableId}` | Listar filas (paginado: `offset` + `maxRecords`, max 100/página) |
| GET | `/rowlist/{stackId}/{tableId}/{rowId}` | Obtener fila por ID |
| POST | `/rowcreate/{stackId}/{tableId}` | Crear filas (body: array de `{ field: {...} }`) |
| PATCH | `/rowupdate/{stackId}/{tableId}` | Actualizar filas (body: array de `{ id, field: {...} }`) |
| DELETE | `/rowdelete/{stackId}/{tableId}?rowIds=rw1&rowIds=rw2` | Eliminar filas (query string, NO body) |
| GET | `/columnlist/{stackId}/{tableId}` | Listar columnas de una tabla |

### Paginación
Stackby devuelve máximo 100 registros por petición. Para leer todos:
```javascript
let offset = 0;
let allRows = [];
while (true) {
  const res = await fetch(`${BASE}/rowlist/${stackId}/${tableId}?offset=${offset}&maxRecords=100`, { headers });
  const data = await res.json();
  allRows.push(...data);
  if (data.length < 100) break;
  offset += 100;
}
```

### Búsqueda por fórmula
```
GET /rowlist/{stackId}/{tableId}?filterByFormula={Email}='alumno@email.com'
```

### Clientes en el proyecto
- **`alumnos-client.js`**: CRUD tabla ALUMNOS (fetchAllRows, searchByEmail, createRow, updateRow)
- **`calificaciones-client.mjs`**: CRUD tabla CALIFICACIONES (findByEmail, upsertCalificacion, listarCalificaciones)

### Limitaciones
- No hay API para crear/modificar columnas — hay que usar Playwright o la UI web
- Paginación máxima: 100 registros por petición
- El endpoint DELETE usa query string (`?rowIds=rw1&rowIds=rw2`), NO body ni URL path

---

## Google Sheets / Drive

Se usa para el Panel IITD, Calificaciones y almacenamiento de recibos.

### Autenticación
Service Account: `iitd-drive-sa@automation-brain.iam.gserviceaccount.com`
- Key en: `integraciones/alumnos/service-account.json`
- Fallback: ADC (`~/.config/gcloud/application_default_credentials.json`)
- Auth helper: `integraciones/alumnos/google-auth.mjs`

### Sheets principales

| Sheet | ID | Uso |
|-------|----|-----|
| Panel IITD | `1JpEOMbu4JHjaaVqi5SZm0DienoiUl_0Q4uzdqt5RJUs` | Dashboard, KPIs, listados, validación |
| Calificaciones IITD | `1XH3kLM_Cgzt7hwXhd9ZPmIZgHwCDbfJEOfAtlBLZtnw` | Entrada de notas (3.573 filas) |
| Deca Inscripción | `1FK0TPur-qCYyVGM0bRuHMa6I8Q7vp_TpFWz3_2M56DQ` | Formulario inscripción web |

### Patrón de escritura (clear + update)
```javascript
// 1. Limpiar rango existente
await sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Pestaña!A:Z' });
// 2. Escribir datos nuevos
await sheets.spreadsheets.values.update({
  spreadsheetId, range: 'Pestaña!A1',
  valueInputOption: 'USER_ENTERED',
  requestBody: { values: rows }
});
```

### Drive — Carpeta Recibos
- **Folder ID**: `1WFNPkzGDv3KoiTw8AdcFYz6OnHR6PAuZ`
- **Nota**: Service Account no puede crear archivos (cuota storage). Crear con ADC y compartir con SA como writer.

---

## pxl.to (Short Links + QR)

Genera short links con QR codes para los certificados/diplomas.

### Credenciales
- Bearer JWT en `.env` (`PXL_TOKEN`)
- Límite: 500 requests/día

### Endpoints
```
POST /api/v1/short
Headers: Authorization: Bearer {JWT}
Body: { "url": "https://diplomas.institutoteologia.org/IITD-110001.pdf" }
Response: { "shortUrl": "https://pxl.to/abc123", ... }
```

### Cliente
`integraciones/alumnos/pxl-client.mjs` — también genera QR como imagen PNG local.

---

## BreezeDoc (Firma Electrónica)

E-signature de contratos de matrícula, convenio y consentimiento RGPD.

### Credenciales
- OAuth2 en `.env` (`BREEZEDOC_CLIENT_ID`, `BREEZEDOC_CLIENT_SECRET`, `BREEZEDOC_REFRESH_TOKEN`)

### Templates configurados

| Template | ID | Uso |
|----------|----|-----|
| Matrícula | 349874 | Contrato de matrícula |
| Convenio | 349877 | Convenio con centros |
| RGPD | 349896 | Consentimiento RGPD |

### Limitaciones
- La API NO soporta subida de PDFs ni DELETE de templates — requiere navegador
- El endpoint `/templates` listing NO devuelve team templates, pero GET/POST por ID sí funciona
- Es e-signature, NO firma digital de PDFs

### Clientes
- `breezedoc-client.mjs` — cliente API genérico
- `breezedoc-enrollment.mjs` — envío de documentos para firma (CLI: `--email X --template matricula|convenio|rgpd`)

---

## Stripe

Pagos de matrículas. Webhook para actualizar estado en Stackby.

### Credenciales
- API Key en `.env` (`STRIPE_SECRET_KEY`)
- Webhook signing secret: `STRIPE_WEBHOOK_SECRET`

### MCP Server
Stripe tiene MCP server oficial. Configuración en `.mcp.json`:
```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-stripe"],
      "env": { "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}" }
    }
  }
}
```

### Estado actual
El webhook handler existe en `integraciones/stripe-webhook/` pero está pendiente de deploy y configuración.

---

## Holded

Contabilidad y facturación. Migración desde Golden Soft pendiente.

### Credenciales
- API Key en `.env` (`HOLDED_API_KEY`) — **pendiente configurar con la key del IITD**

### Endpoints principales
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/invoicing/v1/contacts` | Listar contactos |
| POST | `/invoicing/v1/contacts` | Crear contacto |
| GET | `/invoicing/v1/documents/invoice` | Listar facturas |
| POST | `/invoicing/v1/documents/invoice` | Crear factura |
| GET | `/invoicing/v1/products` | Listar productos |

### Estado
N18 (migración Golden Soft → Holded) pospuesto — Gema no disponible. Caduca junio 2026.

---

## OnlineCourseHost (OCH)

LMS del instituto. API extremadamente limitada.

### Endpoints disponibles (solo 2)
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/pabbly-tenant-courses` | Listar cursos |
| POST | `/api/zapier-enroll-student-action-webhook` | Matricular estudiante |

### Estado
**Bloqueado:** N15/N17 requieren token de integración que no está disponible. Sin webhooks para foros ni comunidad.

---

## Acumbamail

Email marketing. Integración pendiente.

### Endpoints principales
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/getLists/` | Listar listas de suscriptores |
| POST | `/addSubscriber/` | Añadir suscriptor |
| POST | `/getSubscribers/` | Obtener suscriptores de una lista |

---

## SiteGround (SSH/rsync)

Hosting de certificados y diplomas.

### Conexión
- Host: configurado en `.env` (`SITEGROUND_HOST`, `SITEGROUND_USER`)
- Key SSH: `~/.ssh/id_siteground` (sin passphrase)
- Destino: `diplomas.institutoteologia.org/`

### Cliente
`integraciones/alumnos/siteground-upload.mjs` — upload via rsync sobre SSH.

---

## Notas de seguridad

1. **Nunca subir `.env` a Git** — incluido en `.gitignore`
2. **service-account.json** también en `.gitignore`
3. **Rotar keys periódicamente** — especialmente si se sospecha compromiso
4. **Usar keys de test** cuando sea posible para desarrollo
5. **Credenciales centralizadas** en `integraciones/alumnos/.env`

---

*Ultima actualización: 11 de febrero de 2026*
