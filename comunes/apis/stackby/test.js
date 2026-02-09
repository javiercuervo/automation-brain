/**
 * Test de conexión para Stackby API
 * Uso: node test_connection.js
 */

import 'dotenv/config';
import { StackbyClient } from './client.js';

async function testConnection() {
  console.log('🔌 Testeando conexión a Stackby API...\n');

  // Verificar variables de entorno
  const apiKey = process.env.STACKBY_API_KEY;
  const stackId = process.env.STACKBY_STACK_ID;
  const tableId = process.env.STACKBY_TEST_TABLE_ID;

  if (!apiKey) {
    console.error('❌ Error: STACKBY_API_KEY no está configurada en .env');
    process.exit(1);
  }

  console.log('✅ API Key encontrada');

  if (!stackId || !tableId) {
    console.warn('⚠️  STACKBY_STACK_ID o STACKBY_TEST_TABLE_ID no configuradas');
    console.log('   Para un test completo, configura estas variables en .env\n');
    console.log('✅ Conexión básica verificada (API Key presente)');
    return;
  }

  try {
    const client = new StackbyClient(apiKey);

    // Test: Listar filas de una tabla
    console.log(`📋 Listando filas de stack: ${stackId}, tabla: ${tableId}...`);
    const result = await client.listRows(stackId, tableId, { maxRecords: 5 });

    console.log(`✅ Conexión exitosa!`);
    console.log(`   Registros obtenidos: ${result.records?.length || 0}`);

    if (result.records?.length > 0) {
      console.log('\n📄 Primer registro (campos):');
      const firstRecord = result.records[0];
      console.log(`   ID: ${firstRecord.id}`);
      const fieldNames = Object.keys(firstRecord.field || {});
      console.log(`   Campos: ${fieldNames.slice(0, 5).join(', ')}${fieldNames.length > 5 ? '...' : ''}`);
    }

  } catch (error) {
    console.error(`❌ Error de conexión: ${error.message}`);
    process.exit(1);
  }
}

testConnection();
