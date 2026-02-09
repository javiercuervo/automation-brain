/**
 * Servidor Express para el webhook de Stripe
 * Para desarrollo local o despliegue en VPS
 *
 * Uso:
 *   npm install
 *   npm start
 *
 * Para testing con Stripe CLI:
 *   stripe listen --forward-to localhost:3000/webhook
 */

const express = require('express');
const { expressHandler } = require('./stripe-webhook-handler');

const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANTE: El webhook de Stripe necesita el body raw para verificar la firma
app.post('/webhook', express.raw({ type: 'application/json' }), expressHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Stripe webhook server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log('');
  console.log('Para testing con Stripe CLI:');
  console.log(`  stripe listen --forward-to localhost:${PORT}/webhook`);
});
