# Upbase.io — API Interna (no documentada)

**Version**: 0.1.0
**Ultima actualizacion**: 2026-02-09
**Estado**: API interna funcional, no documentada oficialmente por Upbase

> Upbase no tiene API publica. Estos endpoints fueron descubiertos interceptando
> las llamadas de la web app. Pueden cambiar sin previo aviso.

## Base URL

```
https://api.upbase.io/v1
```

## Autenticacion

**Bearer JWT** en header `Authorization`.

El token se obtiene del `localStorage.access_token` tras login en `app.upbase.io`.
Para automatizacion: Playwright login → guardar storage state → extraer token.

```javascript
const ss = JSON.parse(readFileSync('upbase-storage-state.json', 'utf8'));
const token = ss.origins[0].localStorage.find(i => i.name === 'access_token').value;
```

**Expiracion**: ~30 dias (campo `exp` del JWT). Renovar ejecutando `auth-setup.mjs`.

## IDs Proportione

| Entidad | ID |
|---------|----|
| Organization | `2aDhmvUBeXmgce64BTaw2` |
| User (Javier) | `2aDL2txW4RXbPbc5uE2aL` |

## Endpoints descubiertos

### Organizations

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/v1/organizations` | Listar organizaciones del usuario |
| GET | `/v1/organizations/{org}/configs` | Configuracion de la org |
| GET | `/v1/organizations/{org}/my-permission` | Permisos del usuario actual |
| GET | `/v1/organizations/{org}/users` | Usuarios de la org |
| GET | `/v1/organizations/{org}/subscriptions/current-plan` | Plan actual |
| PUT | `/v1/organizations/{org}` | Actualizar org |

### Lists (Proyectos)

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/v1/organizations/{org}/lists` | Listar todas las listas (incluye children de folders) |
| GET | `/v1/organizations/{org}/lists/{list}` | Detalle de una lista |
| GET | `/v1/organizations/{org}/lists/{list}/stages` | Columnas/secciones de una lista (Kanban) |

### Tasks

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/v1/organizations/{org}/tasks?v=2` | Listar todas las tareas |
| GET | `/v1/organizations/{org}/tasks?v=2&list_id={list}` | Tareas de una lista |
| GET | `/v1/organizations/{org}/tasks/{task}` | Detalle de una tarea |
| POST | `/v1/organizations/{org}/tasks` | Crear tarea |
| PUT | `/v1/organizations/{org}/tasks/{task}` | Actualizar tarea |
| DELETE | `/v1/organizations/{org}/tasks/{task}` | Eliminar tarea |

#### Crear tarea (POST body)

```json
{
  "title": "Titulo de la tarea",
  "list_id": "2boyYKemZ7LCB4WkdDp96",
  "description": "Descripcion opcional",
  "priority": "medium",
  "due_date": "2026-03-01T00:00:00Z",
  "start_date": "2026-02-15T00:00:00Z",
  "assignee_ids": ["2aDL2txW4RXbPbc5uE2aL"],
  "tag_ids": []
}
```

**Campos de tarea conocidos**:
- `title` (string, requerido)
- `list_id` (string, requerido para crear)
- `description` (string)
- `priority` — `""` (none), `"low"`, `"medium"`, `"high"`, `"urgent"`
- `status` — `1` (abierta), `2` (cerrada/archivada)
- `due_date`, `start_date` — ISO datetime o null
- `due_date_time`, `start_date_time` — boolean (si incluye hora)
- `assignee_ids` — array de user IDs
- `tag_ids` — array de tag IDs
- `parent_id` — ID de tarea padre (para subtareas)

#### Respuesta de crear tarea

```json
{ "code": 200, "data": "taskId" }
```

#### Respuesta de leer tarea

Incluye: title, description, priority, status, dates, users (owner, assignees, followers), tags, children (subtasks), metadata, comment_count, attachment_count.

### Tags

| Metodo | Endpoint |
|--------|----------|
| GET | `/v1/organizations/{org}/tags` |
| GET | `/v1/organizations/{org}/agency-tags` |

### Custom Fields

| Metodo | Endpoint |
|--------|----------|
| GET | `/v1/organizations/{org}/cfields` |

### Notes

| Metodo | Endpoint |
|--------|----------|
| GET | `/v1/organizations/{org}/notes?date=YYYY-MM-DD` |
| GET | `/v1/organizations/{org}/notes?weekth=YYYY,WW` |
| GET | `/v1/organizations/{org}/notes/sticky-note` |

### Calendar

| Metodo | Endpoint |
|--------|----------|
| GET | `/v1/calendar/o/{org}/events?timeMin=...&timeMax=...` |

### Views

| Metodo | Endpoint |
|--------|----------|
| GET | `/v1/organizations/{org}/cviews?category=orgtask` |
| GET | `/v1/organizations/{org}/cviews/my-schedule` |
| POST | `/v1/organizations/{org}/generic-view` |
| POST | `/v1/organizations/{org}/recurring-view` |
| GET | `/v1/view-snapshot` |

### Profile

| Metodo | Endpoint |
|--------|----------|
| GET | `/v1/profile` |
| PUT | `/v1/profile` |

### Other

| Metodo | Endpoint |
|--------|----------|
| GET | `/v1/organizations/{org}/bookmarks` |
| GET | `/v1/organizations/{org}/spotlight/sections` |
| GET | `/v1/organizations/{org}/companies` |
| GET | `/v1/organizations/{org}/notifications?limit=20&unread_only=0` |

## WebSocket

- `wss://api.upbase.io/ws/connect` — real-time updates
- `wss://chat.upbase.io/ws?workspace={org}` — chat

## Listas de Proportione (feb 2026)

| ID | Nombre | Tipo |
|----|--------|------|
| 2boyNgNBnMB5NN6eBxb2W | Mensoft operaciones | lista |
| 2boyNgNSAXKrDsqCRC95S | Instituto Teologia | lista |
| 2boyTNv65mex62fZjMPiJ | Porqueviven WEB & ARQ | lista |
| 2boyTVUUa2PAhmv4J9tjQ | Porqueviven APP PADRES | lista |
| 2bpLrx1FHTxAf48BiK1LC | Porqueviven APP Scrum | lista |
| 2boyYFGbj8um8gv6vvQxA | Proportione (folder) | folder |
| 2boyYFGbjB7iZ26ocR7ui | → Proportione marketing | lista |
| 2boyYHVJ6n2mx2WTJ4Q32 | → Proportione ventas | lista |
| 2boyYKemZ7LCB4WkdDp96 | → Proportione IT | lista |
| 2boyYHTZeRRZLssD9ztor | → Proportione gestion | lista |

## Stages ejemplo (Proportione IT)

| ID | Titulo | Color |
|----|--------|-------|
| 2wYVi1YMnz | INBOX | #f26fb2 |
| 2bpiS9GXhC7aJysFj4QCg | Proceso | #d04762 |
| 2bpiS9GXhDcPBj8SWsUsN | Revision | #ee9000 |
| 2bpiS9GXhFpLc4K9Awt9v | Completado | #55975d |

## Client

`clientes/proportione/upbase/upbase-api.mjs` — ESM client con metodos para todos los endpoints CRUD.

```bash
node upbase-api.mjs lists        # listar proyectos
node upbase-api.mjs tasks        # listar tareas
node upbase-api.mjs tasks <id>   # tareas de una lista
node upbase-api.mjs users        # usuarios
node upbase-api.mjs tags         # tags
```

## Notas

- **No hay API publica** — estos son endpoints internos de la web app
- El token JWT expira (~30 dias). Renovar via `auth-setup.mjs`
- El endpoint GET tasks con `v=2` devuelve estructura diferente (mas campos)
- Los users del endpoint `/users` no siempre tienen first_name/last_name populados
- Paginacion: `paging.next_cursor`, `paging.has_next`
