# Integraciones IITD

Instituto Internacional de Teología a Distancia

---

## ⚠️ IMPORTANTE: Flujos Existentes en Pabbly

**NO DUPLICAR estos flujos que ya existen:**

| Flujo Pabbly | Función | Estado |
|--------------|---------|--------|
| 04 email a alumnos@ | Email tras nuevo registro DECA | Activo |
| 01 DECA - correo alumno aceptado | Email al aceptar alumno | Activo |
| 09 Formulario web a Acumba y correo | Formulario → Acumba + email | Activo |
| 07 Nuevo estudiante OCH a Acumba | Estudiante OCH → Acumbamail | Activo |
| 08 Lead en OCH a Acumba | Lead OCH → Acumbamail | Activo |

**Emails de prueba solo a:**
- `proportione@institutoteologia.org` (desarrollador)
- `javier.cuervo@proportione.org` (testing como alumno)

---

## Estructura

```
integraciones/
├── apps_script_deca/          # Publisher DECA (Sheets → Stackby)
│   ├── config.gs
│   └── publisher.gs           # ✅ Con notificaciones + upsert ALUMNOS
│
├── alumnos/                   # Gestión tabla ALUMNOS
│   └── alumnos-client.js      # ✅ Cliente con upsert por email
│
├── acumbamail/                # Cliente API Acumbamail
│   ├── acumbamail-client.js   # ✅ Módulo reutilizable
│   └── test-acumbamail.js
│
├── och-stackby-sync/          # Sync OnlineCourseHost → Stackby
│   ├── och-client.js          # ✅ Cliente API OCH
│   ├── stackby-client.js      # ✅ Cliente API Stackby
│   └── sync-enrollments.js    # ✅ Script de sincronización
│
├── stripe-webhook/            # Webhook Stripe → Stackby
│   ├── stripe-webhook-handler.js  # ✅ Handler de eventos
│   ├── server.js              # Servidor Express
│   ├── package.json
│   └── test-webhook.js
│
└── migration/                 # Migración datos históricos
    └── import-polar.js        # ✅ Importador CSV POLAR → ALUMNOS
```

## Estado de Implementación

| # | Automatización | Estado | Notas |
|---|----------------|--------|-------|
| 1 | Notificación a Miriam (DECA) | ✅ Listo | Email a proportione@ (cambiar a alumnos@ en prod) |
| 2 | Alta Acumbamail | ✅ Listo | List ID: 1214096 configurado |
| 3 | Sync OCH → Stackby | ✅ Listo | Falta STACKBY_ALUMNOS_TABLE_ID |
| 4 | Dashboard Stackby | 📋 Manual | Ver instrucciones abajo |
| 5 | Webhook Stripe | ✅ Listo | Falta configurar endpoint |
| 6 | Tabla ALUMNOS | ⏳ Pendiente | **Crear tabla en Stackby UI** |
| 7 | Upsert ALUMNOS | ✅ Listo | Código en publisher.gs + alumnos-client.js |
| 8 | Migración POLAR | ✅ Listo | Script import-polar.js preparado |

---

## 1. Notificación DECA

**Archivo:** `apps_script_deca/publisher.gs`

**Configuración:**
- Email destino: `alumnos@institutoteologia.org`
- Se envía automáticamente al publicar cada solicitud

**Para probar:**
1. Abrir Apps Script en Google
2. Ejecutar función `testNotification()`
3. Verificar email recibido

---

## 2. Acumbamail

**Archivos:** `acumbamail/acumbamail-client.js`

**Uso:**
```javascript
const acumbamail = require('./acumbamail-client');

// Obtener listas (para encontrar el list_id)
const listas = await acumbamail.getLists();
console.log(listas);

// Dar de alta un alumno
await acumbamail.altaAlumnoConConsentimiento({
  email: 'alumno@example.com',
  nombre: 'Juan',
  apellidos: 'García',
  consentimiento_marketing: true,
  origen: 'formulario_web'
}, 'LIST_ID_AQUI');
```

**Pendiente:**
- [ ] Ejecutar `node test-acumbamail.js` para obtener el list_id
- [ ] Configurar `ACUMBAMAIL_LIST_ID` en variables de entorno

---

## 3. Sync OCH → Stackby

**Archivos:** `och-stackby-sync/`

**Configuración necesaria:**
```bash
export STACKBY_ALUMNOS_TABLE_ID="tbXXXXXX"  # ID de tabla Alumnos
```

**Ejecución:**
```bash
# Test sin cambios
node sync-enrollments.js --dry-run

# Sync real
node sync-enrollments.js
```

**Programar con cron:**
```bash
# Diario a las 6:00
0 6 * * * cd /path/to/och-stackby-sync && node sync-enrollments.js >> /var/log/och-sync.log 2>&1
```

**Pendiente:**
- [ ] Crear tabla "Alumnos" en Stackby con campos necesarios
- [ ] Configurar STACKBY_ALUMNOS_TABLE_ID

---

## 4. Dashboard Stackby (Manual)

Para crear el dashboard operativo, seguir estos pasos en la UI de Stackby:

### Vistas a Crear

**Vista 1: Solicitudes Pendientes**
- Tabla: SOLICITUDES_DECA
- Filtro: Estado = "Pendiente" O Estado está vacío
- Ordenar por: Fecha solicitud (más reciente primero)

**Vista 2: Pagos Pendientes**
- Tabla: Alumnos
- Filtro: Estado pago ≠ "Pagado"
- Mostrar: Nombre, Email, Programa, Fecha solicitud

**Vista 3: Alumnos Inactivos (30 días)**
- Tabla: Alumnos
- Filtro: Última actividad < hace 30 días
- O: Progreso < 10% Y Fecha matrícula > hace 7 días

**Vista 4: Próximas Tutorías**
- Tabla: Tutorías (si existe)
- Filtro: Fecha tutoría = próximos 7 días
- Ordenar: Fecha ascendente

### Métricas Sugeridas

1. **Total solicitudes del mes:** Count donde Fecha > inicio mes
2. **Tasa de conversión:** Pagados / Total solicitudes
3. **Alumnos activos:** Count donde Última actividad > hace 30 días
4. **Ingresos del mes:** Sum(Importe) donde Fecha pago > inicio mes

---

## 5. Webhook Stripe

**Archivos:** `stripe-webhook/`

### Configuración en Stripe

1. Ir a [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://tu-dominio.com/api/stripe-webhook`
4. Eventos a escuchar:
   - `checkout.session.completed`
   - `invoice.paid`
   - `payment_intent.succeeded`
5. Copiar "Signing secret" → configurar como `STRIPE_WEBHOOK_SECRET`

### Despliegue

**Opción A: Servidor propio**
```bash
cd stripe-webhook
npm install
PORT=3000 npm start
```

**Opción B: Vercel**
```javascript
// pages/api/stripe-webhook.js
import { vercelHandler } from '../../lib/stripe-webhook-handler';
export default vercelHandler;
export const config = { api: { bodyParser: false } };
```

**Opción C: Google Cloud Functions**
```javascript
exports.stripeWebhook = async (req, res) => {
  const { handleWebhook } = require('./stripe-webhook-handler');
  return handleWebhook(req, res);
};
```

### Testing Local

```bash
# Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# Autenticar
stripe login

# Escuchar eventos y reenviar
stripe listen --forward-to localhost:3000/webhook

# En otra terminal, simular evento
stripe trigger checkout.session.completed
```

---

## Variables de Entorno

```bash
# Acumbamail
ACUMBAMAIL_AUTH_TOKEN=YOUR_ACUMBAMAIL_AUTH_TOKEN
ACUMBAMAIL_LIST_ID=YOUR_LIST_ID  # Obtener con getLists()

# OnlineCourseHost
OCH_API_KEY=YOUR_OCH_API_KEY

# Stackby
STACKBY_API_KEY=YOUR_STACKBY_API_KEY
STACKBY_STACK_ID=YOUR_STACK_ID
STACKBY_ALUMNOS_TABLE_ID=YOUR_TABLE_ID  # Obtener de URL de Stackby

# Stripe
STRIPE_SECRET_KEY=YOUR_STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET=YOUR_WEBHOOK_SECRET  # Obtener al crear webhook

# NOTA: Las credenciales reales están en credentials.env (no versionado)
```

---

## Próximos Pasos

1. **Inmediato:**
   - [ ] Probar notificación DECA (`testNotification()`)
   - [ ] Obtener list_id de Acumbamail (`node test-acumbamail.js`)

2. **Esta semana:**
   - [ ] Crear tabla Alumnos en Stackby
   - [ ] Configurar sync OCH
   - [ ] Crear vistas de dashboard

3. **Próxima semana:**
   - [ ] Desplegar webhook Stripe
   - [ ] Configurar cron para sync diario
