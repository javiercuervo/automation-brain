/**
 * =====================================================
 * STRIPE WEBHOOK HANDLER
 * =====================================================
 *
 * Instituto Internacional de Teología a Distancia
 *
 * Recibe eventos de Stripe y actualiza Stackby automáticamente
 *
 * Eventos manejados:
 * - checkout.session.completed → Actualiza estado de pago
 * - invoice.paid → Registra pago de factura
 * - customer.subscription.created → Nueva suscripción
 *
 * Despliegue recomendado:
 * - Vercel/Netlify serverless function
 * - Google Cloud Functions
 * - AWS Lambda
 *
 * Configuración en Stripe:
 * 1. Dashboard → Developers → Webhooks
 * 2. Add endpoint: https://tu-dominio.com/api/stripe-webhook
 * 3. Seleccionar eventos: checkout.session.completed, invoice.paid
 * 4. Copiar Signing Secret → STRIPE_WEBHOOK_SECRET
 */

const Stripe = require('stripe');

// Configuración
const CONFIG = {
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || 'YOUR_STRIPE_SECRET_KEY',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || null, // Configurar después de crear webhook
  STACKBY_API_KEY: process.env.STACKBY_API_KEY || 'YOUR_STACKBY_API_KEY',
  STACKBY_STACK_ID: process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78',
  STACKBY_ALUMNOS_TABLE_ID: process.env.STACKBY_ALUMNOS_TABLE_ID || null
};

const stripe = new Stripe(CONFIG.STRIPE_SECRET_KEY);

/**
 * Handler principal del webhook
 * Compatible con Express, Vercel, Netlify, etc.
 */
async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  // Verificar firma del webhook
  try {
    if (CONFIG.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(
        req.body, // Debe ser el body raw
        sig,
        CONFIG.STRIPE_WEBHOOK_SECRET
      );
    } else {
      // En desarrollo, parsear directamente (NO usar en producción)
      event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      console.warn('⚠️  Webhook sin verificación de firma - solo para desarrollo');
    }
  } catch (err) {
    console.error('Error verificando webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Recibido evento: ${event.type}`);

  // Procesar según tipo de evento
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    res.status(200).json({ received: true, type: event.type });

  } catch (error) {
    console.error('Error procesando evento:', error);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Maneja checkout completado
 *
 * Columnas disponibles en tabla ALUMNOS:
 * Email, Nombre, Apellidos, Telefono, DNI, Estado, Fecha estado,
 * Programa, Docs estado, Estado pago, Fecha pago, OCH Student ID,
 * Ultimo acceso, Progreso, Fuente, Notas
 */
async function handleCheckoutComplete(session) {
  console.log('Procesando checkout completado...');
  console.log(`  Session ID: ${session.id}`);
  console.log(`  Customer Email: ${session.customer_email}`);
  console.log(`  Amount: ${session.amount_total / 100} ${session.currency?.toUpperCase()}`);

  // Buscar alumno en Stackby por email
  const alumno = await findAlumnoByEmail(session.customer_email);

  // Construir nota con detalles del pago
  const fechaHoy = new Date().toISOString().split('T')[0];
  const importe = session.amount_total / 100;
  const moneda = session.currency?.toUpperCase() || 'EUR';
  const notaPago = `[${fechaHoy}] Pago Stripe: ${importe} ${moneda} - Session: ${session.id}`;

  if (alumno) {
    // Actualizar estado de pago
    const notaExistente = alumno.field['Notas'] || '';
    await updateAlumnoEnStackby(alumno.id, {
      'Estado pago': 'pagado',
      'Fecha pago': fechaHoy,
      'Notas': notaExistente ? `${notaExistente}\n${notaPago}` : notaPago
    });

    console.log(`  ✓ Alumno ${session.customer_email} actualizado en Stackby`);

  } else {
    console.log(`  ⚠️  Alumno no encontrado: ${session.customer_email}`);
    // Crear nuevo registro con campos existentes
    const nombreCompleto = session.customer_details?.name || '';
    const [nombre, ...apellidosArr] = nombreCompleto.split(' ');

    await createAlumnoEnStackby({
      'Email': session.customer_email,
      'Nombre': nombre || '',
      'Apellidos': apellidosArr.join(' ') || '',
      'Estado': 'pagado',
      'Fecha estado': fechaHoy,
      'Estado pago': 'pagado',
      'Fecha pago': fechaHoy,
      'Fuente': 'stripe_checkout',
      'Notas': notaPago
    });
    console.log(`  ✓ Nuevo alumno creado en Stackby`);
  }
}

/**
 * Maneja factura pagada
 */
async function handleInvoicePaid(invoice) {
  console.log('Procesando factura pagada...');
  console.log(`  Invoice ID: ${invoice.id}`);
  console.log(`  Customer Email: ${invoice.customer_email}`);

  const alumno = await findAlumnoByEmail(invoice.customer_email);

  if (alumno) {
    const fechaFactura = new Date(invoice.created * 1000).toISOString().split('T')[0];
    const notaExistente = alumno.field['Notas'] || '';
    const notaFactura = `[${fechaFactura}] Factura: ${invoice.id}`;

    await updateAlumnoEnStackby(alumno.id, {
      'Estado pago': 'pagado',
      'Fecha pago': fechaFactura,
      'Notas': notaExistente ? `${notaExistente}\n${notaFactura}` : notaFactura
    });
    console.log(`  ✓ Factura registrada para ${invoice.customer_email}`);
  }
}

/**
 * Maneja nueva suscripción
 */
async function handleSubscriptionCreated(subscription) {
  console.log('Procesando nueva suscripción...');
  console.log(`  Subscription ID: ${subscription.id}`);
  console.log(`  Status: ${subscription.status}`);

  // Obtener datos del cliente
  const customer = await stripe.customers.retrieve(subscription.customer);
  const email = customer.email;

  if (email) {
    const alumno = await findAlumnoByEmail(email);
    if (alumno) {
      const fechaHoy = new Date().toISOString().split('T')[0];
      const notaExistente = alumno.field['Notas'] || '';
      const notaSub = `[${fechaHoy}] Suscripción: ${subscription.id} (${subscription.status})`;

      await updateAlumnoEnStackby(alumno.id, {
        'Notas': notaExistente ? `${notaExistente}\n${notaSub}` : notaSub
      });
      console.log(`  ✓ Suscripción registrada para ${email}`);
    }
  }
}

/**
 * Maneja pago exitoso
 */
async function handlePaymentSucceeded(paymentIntent) {
  console.log('Procesando pago exitoso...');
  console.log(`  PaymentIntent ID: ${paymentIntent.id}`);
  console.log(`  Amount: ${paymentIntent.amount / 100} ${paymentIntent.currency?.toUpperCase()}`);

  // Obtener email del cliente si existe
  const email = paymentIntent.receipt_email || paymentIntent.metadata?.email;

  if (email) {
    const alumno = await findAlumnoByEmail(email);
    if (alumno) {
      const fechaHoy = new Date().toISOString().split('T')[0];
      const importe = paymentIntent.amount / 100;
      const moneda = paymentIntent.currency?.toUpperCase() || 'EUR';
      const notaExistente = alumno.field['Notas'] || '';
      const notaPago = `[${fechaHoy}] Pago: ${importe} ${moneda} - Intent: ${paymentIntent.id}`;

      await updateAlumnoEnStackby(alumno.id, {
        'Estado pago': 'pagado',
        'Fecha pago': fechaHoy,
        'Notas': notaExistente ? `${notaExistente}\n${notaPago}` : notaPago
      });
    }
  }
}

// =====================================================
// FUNCIONES DE STACKBY
// =====================================================

async function stackbyFetch(endpoint, options = {}) {
  const url = `https://stackby.com/api/betav1${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'api-key': CONFIG.STACKBY_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Stackby error ${response.status}: ${text}`);
  }

  return response.json();
}

async function findAlumnoByEmail(email) {
  if (!CONFIG.STACKBY_ALUMNOS_TABLE_ID) {
    console.warn('STACKBY_ALUMNOS_TABLE_ID no configurado');
    return null;
  }

  const rows = await stackbyFetch(
    `/rowlist/${CONFIG.STACKBY_STACK_ID}/${CONFIG.STACKBY_ALUMNOS_TABLE_ID}?maxRecords=100`
  );

  if (!rows.records) return null;

  return rows.records.find(row => {
    const rowEmail = row.field['Email'] || row.field['Correo electrónico'];
    return rowEmail && rowEmail.toLowerCase() === email.toLowerCase();
  });
}

async function updateAlumnoEnStackby(rowId, fields) {
  return stackbyFetch(
    `/rowupdate/${CONFIG.STACKBY_STACK_ID}/${CONFIG.STACKBY_ALUMNOS_TABLE_ID}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        records: [{ id: rowId, field: fields }]
      })
    }
  );
}

async function createAlumnoEnStackby(fields) {
  return stackbyFetch(
    `/rowcreate/${CONFIG.STACKBY_STACK_ID}/${CONFIG.STACKBY_ALUMNOS_TABLE_ID}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{ field: fields }]
      })
    }
  );
}

// =====================================================
// EXPORTS Y ADAPTADORES
// =====================================================

// Para Express
function expressHandler(req, res) {
  return handleWebhook(req, res);
}

// Para Vercel/Next.js API Routes
async function vercelHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  return handleWebhook(req, res);
}

// Para Netlify Functions
async function netlifyHandler(event) {
  const mockReq = {
    body: event.body,
    headers: event.headers
  };

  let statusCode = 200;
  let responseBody = {};

  const mockRes = {
    status: (code) => {
      statusCode = code;
      return mockRes;
    },
    json: (body) => {
      responseBody = body;
    },
    send: (body) => {
      responseBody = { message: body };
    }
  };

  await handleWebhook(mockReq, mockRes);

  return {
    statusCode,
    body: JSON.stringify(responseBody)
  };
}

module.exports = {
  handleWebhook,
  expressHandler,
  vercelHandler,
  netlifyHandler,
  // Para testing
  handleCheckoutComplete,
  handleInvoicePaid
};
