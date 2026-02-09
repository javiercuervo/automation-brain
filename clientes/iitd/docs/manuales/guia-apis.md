# Guía de APIs - Instituto de Teología

## Resumen

| API | Base URL | Autenticación | Cliente |
|-----|----------|---------------|---------|
| **Stripe** | `https://api.stripe.com` | Bearer Token (API Key) | MCP Server |
| **Stackby** | `https://api.stackby.com/v1` | Header `api-key` | `apis/stackby/client.js` |
| **Acumbamail** | `https://acumbamail.com/api/1` | Form param `auth_token` | `apis/acumbamail/client.js` |
| **Holded** | `https://api.holded.com/api` | Header `key` | `apis/holded/client.js` |
| **OnlineCourseHost** | `https://api.onlinecoursehost.com` | Header `X-Integration-Token` | `apis/onlinecoursehost/client.js` |

---

## Stripe (MCP Server)

### Conexión
Stripe tiene MCP server oficial de Anthropic. La conexión se configura en `.mcp.json`:

```json
{
  "mcpServers": {
    "stripe": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-stripe"],
      "env": {
        "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}"
      }
    }
  }
}
```

### Obtener credenciales
1. Ir a [Dashboard de Stripe](https://dashboard.stripe.com/apikeys)
2. Copiar "Secret key" (empieza por `sk_live_` o `sk_test_`)
3. Para webhooks: ir a [Webhooks](https://dashboard.stripe.com/webhooks) y copiar el signing secret

### Capacidades
- Consultar pagos, clientes, suscripciones
- Crear payment intents
- Gestionar productos y precios
- Ver eventos de webhook

---

## Stackby

### Obtener credenciales
1. Ir a [Configuración de cuenta](https://stackby.com/account/settings)
2. Buscar sección "API" y generar una API Key
3. El Stack ID aparece en la URL cuando abres un stack: `stackby.com/stack/{STACK_ID}/...`

### Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/rowlist/{stackId}/{tableId}` | Listar filas |
| GET | `/rowlist/{stackId}/{tableId}/{rowId}` | Obtener fila |
| POST | `/rowcreate/{stackId}/{tableId}` | Crear filas |
| PATCH | `/rowupdate/{stackId}/{tableId}` | Actualizar filas |
| DELETE | `/rowdelete/{stackId}/{tableId}?rowIds[]=...` | Eliminar filas |

### Ejemplo de uso

```javascript
import { StackbyClient } from './stackby/client.js';

const client = new StackbyClient(process.env.STACKBY_API_KEY);

// Listar filas
const rows = await client.listRows(stackId, 'Alumnos', { maxRecords: 10 });

// Buscar por fórmula
const results = await client.searchRows(stackId, 'Alumnos', "{Email} = 'test@test.com'");

// Crear fila
await client.createRows(stackId, 'Alumnos', [
  { field: { 'Nombre': 'Juan', 'Email': 'juan@test.com' } }
]);
```

---

## Acumbamail

### Obtener credenciales
1. Ir a [API de Acumbamail](https://acumbamail.com/account/api/)
2. Copiar el "Auth Token"

### Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/getLists/` | Listar listas de suscriptores |
| POST | `/addSubscriber/` | Añadir suscriptor |
| POST | `/getSubscribers/` | Obtener suscriptores de una lista |
| POST | `/getCampaigns/` | Listar campañas |
| POST | `/createCampaign/` | Crear campaña |

### Ejemplo de uso

```javascript
import { AcumbamailClient } from './acumbamail/client.js';

const client = new AcumbamailClient(process.env.ACUMBAMAIL_AUTH_TOKEN);

// Obtener listas
const lists = await client.getLists();

// Añadir suscriptor
await client.addSubscriber('list_id', 'email@test.com', {
  NOMBRE: 'Juan',
  APELLIDO: 'García'
});
```

---

## Holded

### Obtener credenciales
1. Ir a [Configuración > API](https://app.holded.com/settings/developer)
2. Generar una API Key

### Endpoints principales

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/invoicing/v1/contacts` | Listar contactos |
| POST | `/invoicing/v1/contacts` | Crear contacto |
| GET | `/invoicing/v1/documents/invoice` | Listar facturas |
| POST | `/invoicing/v1/documents/invoice` | Crear factura |
| POST | `/invoicing/v1/documents/invoice/{id}/pay` | Marcar como pagada |
| GET | `/invoicing/v1/products` | Listar productos |

### Ejemplo de uso

```javascript
import { HoldedClient } from './holded/client.js';

const client = new HoldedClient(process.env.HOLDED_API_KEY);

// Listar contactos
const contacts = await client.listContacts();

// Crear factura
await client.createInvoice({
  contactId: 'xxx',
  items: [
    { name: 'Curso Teología', units: 1, subtotal: 100 }
  ]
});
```

---

## OnlineCourseHost

### Obtener credenciales
1. Acceder al panel de administración de OCH
2. Ir a Integraciones/API
3. Generar un Integration Token

### Limitaciones
La API de OCH es muy limitada. Solo tiene 2 endpoints disponibles para integraciones:

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/pabbly-tenant-courses` | Listar cursos |
| POST | `/api/zapier-enroll-student-action-webhook` | Matricular estudiante |

### Ejemplo de uso

```javascript
import { OnlineCourseHostClient } from './onlinecoursehost/client.js';

const client = new OnlineCourseHostClient(process.env.OCH_INTEGRATION_TOKEN);

// Listar cursos
const courses = await client.listCourses();

// Matricular estudiante
await client.enrollStudent({
  email: 'alumno@test.com',
  firstName: 'Juan',
  lastName: 'García',
  courseId: 'course_id'
});

// Matricular por nombre de curso (búsqueda)
await client.enrollByCourseName('alumno@test.com', 'Introducción a la Teología');
```

---

## Testing de conexiones

Para verificar que las credenciales funcionan:

```bash
cd IITD/integraciones/apis

# Instalar dependencias
npm install

# Copiar y configurar .env
cp .env.example .env
# Editar .env con las credenciales reales

# Ejecutar tests
npm run test:stackby
npm run test:acumbamail
npm run test:holded
npm run test:onlinecoursehost

# O todos a la vez
npm run test:all
```

---

## Herramientas sin API

### Getformly
Solo funciona mediante webhooks. Los datos de formularios se envían a Apps Script y de ahí se procesan. No hay API para consultar.

### Pabbly Connect
Tiene API pero principalmente se usa para:
- Disparar workflows manualmente
- Consultar estado de ejecuciones

El MCP está en beta y no se recomienda su uso todavía.

---

## Notas de seguridad

1. **Nunca subir `.env` a Git** - Está incluido en `.gitignore`
2. **Rotar keys periódicamente** - Especialmente si se sospecha compromiso
3. **Usar keys de test** cuando sea posible para desarrollo
4. **Limitar permisos** - Algunas APIs permiten crear keys con permisos restringidos

---

*Última actualización: 2026-02-01*
