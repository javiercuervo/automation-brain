# Stack IITD - Inventario y Capacidades de Automatización

**Fecha:** 2026-02-02
**Estado:** Documentación activa
**Contexto:** Instituto Internacional de Teología a Distancia (DECA)

---

## 1. Resumen del Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        CAPTACIÓN                                 │
│  Getformly (formularios) → Google Sheets (buffer)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     PROCESAMIENTO                                │
│  Google Apps Script (validación, IDs, publicación)              │
│  Pabbly Connect (orquestación, transformaciones)                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SOURCE OF TRUTH                               │
│  Stackby (base de datos consolidada)                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICIOS                                   │
│  Stripe (pagos) │ Holded (facturación) │ Acumbamail (email)    │
│  OnlineCourseHost (docencia) │ Breezedoc (firma)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. APIs con Cliente Funcional

### 2.1 Stackby API
**Archivo:** `IITD/integraciones/apis/stackby/client.js`
**Estado:** ✅ En producción
**Documentación:** https://github.com/javiercuervo/stackby-api-unofficial-docs

| Operación | Método | Endpoint |
|-----------|--------|----------|
| Listar filas | GET | `/rowlist/{stackId}/{tableId}` |
| Crear filas | POST | `/rowcreate/{stackId}/{tableId}` |
| Actualizar | PATCH | `/rowupdate/{stackId}/{tableId}` |
| Eliminar | DELETE | `/rowdelete/{stackId}/{tableId}?rowIds[]=` |

**Formato del payload:**
```javascript
{ "records": [{ "field": { "Columna": "valor" } }] }
// IMPORTANTE: Es "field" (singular), NO "fields"
```

---

### 2.2 Acumbamail API
**Archivo:** `IITD/integraciones/apis/acumbamail/client.js`
**Estado:** ✅ Testado
**Base URL:** `https://acumbamail.com/api/1`

| Operación | Función | Uso típico |
|-----------|---------|------------|
| Obtener listas | `getLists()` | Ver listas de email |
| Crear lista | `createList()` | Nueva lista de suscriptores |
| Añadir suscriptor | `addSubscriber()` | Registrar nuevo contacto |
| Obtener suscriptores | `getSubscribers()` | Exportar lista |
| Actualizar suscriptor | `updateSubscriber()` | Cambiar datos |
| Dar de baja | `unsubscribe()` | Eliminar de lista |
| Obtener campañas | `getCampaigns()` | Ver envíos |
| Crear campaña | `createCampaign()` | Nuevo envío masivo |
| Estadísticas | `getCampaignStats()` | Métricas de apertura/clicks |

**Ejemplo - Añadir suscriptor:**
```javascript
const client = new AcumbamailClient(API_KEY);
await client.addSubscriber(listId, {
  email: 'alumno@example.com',
  mergeFields: { NOMBRE: 'Juan', PROGRAMA: 'DECA' }
});
```

---

### 2.3 Holded API
**Archivo:** `IITD/integraciones/apis/holded/client.js`
**Estado:** ✅ Testado
**Base URL:** `https://api.holded.com/api`

| Operación | Función | Uso típico |
|-----------|---------|------------|
| Listar contactos | `listContacts()` | Ver clientes |
| Crear contacto | `createContact()` | Nuevo cliente |
| Actualizar contacto | `updateContact()` | Modificar datos |
| Listar facturas | `listInvoices()` | Ver facturas |
| Crear factura | `createInvoice()` | Nueva factura |
| Marcar pagada | `payInvoice()` | Registrar pago |
| Enviar factura | `sendInvoice()` | Email con factura |
| Listar productos | `listProducts()` | Ver catálogo |
| Crear producto | `createProduct()` | Nuevo producto |

**Ejemplo - Crear factura:**
```javascript
const client = new HoldedClient(API_KEY);
await client.createInvoice({
  contactId: 'contact_123',
  items: [{ name: 'Matrícula DECA', units: 1, subtotal: 150 }]
});
```

---

### 2.4 OnlineCourseHost API
**Archivo:** `IITD/integraciones/apis/onlinecoursehost/client.js`
**Estado:** ✅ Testado (API limitada)
**Nota:** Solo 2 endpoints disponibles (diseñado para Zapier)

| Operación | Función | Uso |
|-----------|---------|-----|
| Listar cursos | `listCourses()` | Ver cursos disponibles |
| Matricular alumno | `enrollStudent()` | Alta en curso |
| Matricular por nombre | `enrollByCourseName()` | Busca curso y matricula |

**Ejemplo - Matricular alumno:**
```javascript
const client = new OnlineCourseHostClient(API_KEY);
await client.enrollStudent({
  courseId: 'course_123',
  email: 'alumno@example.com',
  firstName: 'Juan',
  lastName: 'García'
});
```

---

### 2.5 Stripe (MCP)
**Configuración:** `.mcp.json`
**Estado:** ✅ Configurado
**Tipo:** MCP Server (acceso directo desde Claude)

| Operación | Disponible |
|-----------|------------|
| Listar pagos | ✅ |
| Ver detalles de pago | ✅ |
| Listar clientes | ✅ |
| Crear cliente | ✅ |
| Suscripciones | ✅ |
| Productos y precios | ✅ |
| Webhooks (eventos) | ✅ |

---

## 3. Google Apps Script (Producción)

### 3.1 Publisher DECA Matrículas
**Ubicación:** `IITD/integraciones/apps_script_deca/`
**Estado:** ✅ En producción
**Trigger:** Cada 5 minutos

**Flujo:**
```
Google Sheets (Deca Inscripción)
    ↓ [validación + external_id]
Stackby API (directo)
    ↓ [marca published_at]
Google Sheets (actualizado)
```

**Funciones disponibles:**
- `sync()` - Sincronización principal
- `testSync()` - Test manual
- `resetAllErrors()` - Resetear filas fallidas
- `checkData()` - Diagnóstico de columnas

### 3.2 Publisher Pre-matrícula
**Ubicación:** `IITD/integraciones/apps_script/`
**Estado:** ✅ Operativo
**Trigger:** Cada 5 minutos

**Flujo:**
```
Google Sheets (raw_getformly)
    ↓ [validación + external_id]
Pabbly Connect (webhook)
    ↓ [upsert]
Stackby
```

---

## 4. Automatizaciones RÁPIDAS de Implementar

### Nivel 1: Inmediatas (< 30 min)

| # | Automatización | Cómo hacerlo |
|---|----------------|--------------|
| 1 | **Sincronizar otra hoja a Stackby** | Copiar `publisher.gs`, cambiar `CONFIG.SHEET_NAME` y `STACKBY_TABLE_ID` |
| 2 | **Añadir alumno a lista de email** | `acumbamailClient.addSubscriber(listId, {email, mergeFields})` |
| 3 | **Crear cliente en Holded** | `holdedClient.createContact({name, email, nif})` |
| 4 | **Matricular en OnlineCourseHost** | `ochClient.enrollStudent({courseId, email, firstName, lastName})` |
| 5 | **Consultar pagos de Stripe** | Usar MCP Stripe directamente |
| 6 | **Exportar Stackby a CSV** | Script Node.js con `listRows()` + fs.writeFile |

### Nivel 2: Rápidas (1-2 horas)

| # | Automatización | Componentes |
|---|----------------|-------------|
| 7 | **Pago Stripe → actualizar Stackby** | Webhook Stripe + Apps Script + Stackby API |
| 8 | **Email bienvenida automático** | Trigger en Stackby/Pabbly → Acumbamail |
| 9 | **Factura automática en Holded** | Cuando estado_pago = "pagado" → createInvoice |
| 10 | **Exportar Stackby → Sheets (bidireccional)** | Apps Script con sync en ambas direcciones |

### Nivel 3: Medio día

| # | Automatización | Descripción |
|---|----------------|-------------|
| 11 | **Pipeline completo de matrícula** | Pago → Factura → Alta curso → Email bienvenida |
| 12 | **Dashboard KPIs en Sheets** | Métricas de Stackby + Stripe + Acumbamail |
| 13 | **Sistema de recordatorios** | Fechas en Stackby → emails automáticos |

---

## 5. Ejemplos de Código Listos para Usar

### Añadir suscriptor a Acumbamail
```javascript
require('dotenv').config();
const AcumbamailClient = require('./acumbamail/client');

async function addToMailingList(email, nombre, programa) {
  const client = new AcumbamailClient(process.env.ACUMBAMAIL_TOKEN);
  await client.addSubscriber(process.env.LIST_ID, {
    email,
    mergeFields: { NOMBRE: nombre, PROGRAMA: programa }
  });
}
```

### Crear contacto en Holded
```javascript
require('dotenv').config();
const HoldedClient = require('./holded/client');

async function createStudent(data) {
  const client = new HoldedClient(process.env.HOLDED_API_KEY);
  return client.createContact({
    name: `${data.nombre} ${data.apellidos}`,
    email: data.email,
    phone: data.telefono,
    vatnumber: data.dni,
    type: 'client'
  });
}
```

### Matricular en OnlineCourseHost
```javascript
require('dotenv').config();
const OCHClient = require('./onlinecoursehost/client');

async function enrollInDECA(email, nombre, apellidos) {
  const client = new OCHClient(process.env.OCH_TOKEN);
  return client.enrollByCourseName('DECA', {
    email,
    firstName: nombre,
    lastName: apellidos
  });
}
```

---

## 6. Credenciales Necesarias

| Servicio | Variable de entorno | Ubicación |
|----------|---------------------|-----------|
| Stackby | `STACKBY_API_KEY` | Apps Script Properties / .env |
| Acumbamail | `ACUMBAMAIL_TOKEN` | .env |
| Holded | `HOLDED_API_KEY` | .env |
| OnlineCourseHost | `OCH_TOKEN` | .env |
| Stripe | `STRIPE_SECRET_KEY` | .env / MCP |

**Archivo de credenciales:** `IITD/integraciones/credentials.env` (git-ignored)

---

## 7. Próximos Pasos Sugeridos

1. **Esperar respuesta de Miriam** - Identificar siguiente proceso a automatizar
2. **Probar pipeline Pago → Factura** - Conectar Stripe con Holded
3. **Configurar emails transaccionales** - Bienvenida, confirmación de pago
4. **Evaluar Breezedoc** - Para firma de contratos de matrícula

---

## 8. Archivos de Referencia

| Archivo | Contenido |
|---------|-----------|
| `generico/corpus/Inventario_herramientas_y_procesos.md` | Visión general del stack |
| `generico/corpus/stackby_api_investigacion.md` | Documentación detallada API Stackby |
| `IITD/docs/guia_apis.md` | Guía técnica de APIs |
| `IITD/integraciones/apps_script_deca/README.md` | Documentación del publisher DECA |

---

**Fin del documento.**
