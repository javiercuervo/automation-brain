/**
 * Test del webhook handler
 * Simula eventos de Stripe para verificar la lógica
 */

const { handleCheckoutComplete } = require('./stripe-webhook-handler');

async function testCheckoutComplete() {
  console.log('=== TEST: checkout.session.completed ===\n');

  const mockSession = {
    id: 'cs_test_123456',
    customer_email: 'test@example.com',
    customer_details: {
      name: 'Test Usuario'
    },
    amount_total: 9900, // 99.00 EUR en centavos
    currency: 'eur',
    payment_status: 'paid',
    metadata: {}
  };

  console.log('Session simulada:', JSON.stringify(mockSession, null, 2));
  console.log('');

  // NOTA: Este test solo funcionará si STACKBY_ALUMNOS_TABLE_ID está configurado
  try {
    await handleCheckoutComplete(mockSession);
    console.log('\n✓ Test completado sin errores');
  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.log('\nVerifica que STACKBY_ALUMNOS_TABLE_ID esté configurado');
  }
}

// Ejecutar test
testCheckoutComplete().catch(console.error);
