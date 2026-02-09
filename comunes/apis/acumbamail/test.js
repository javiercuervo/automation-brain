/**
 * Test de conexión para Acumbamail API
 * Uso: node test_connection.js
 */

import 'dotenv/config';
import { AcumbamailClient } from './client.js';

async function testConnection() {
  console.log('🔌 Testeando conexión a Acumbamail API...\n');

  // Verificar variables de entorno
  const authToken = process.env.ACUMBAMAIL_AUTH_TOKEN;

  if (!authToken) {
    console.error('❌ Error: ACUMBAMAIL_AUTH_TOKEN no está configurada en .env');
    process.exit(1);
  }

  console.log('✅ Auth Token encontrado');

  try {
    const client = new AcumbamailClient(authToken);

    // Test: Obtener listas de suscriptores
    console.log('📋 Obteniendo listas de suscriptores...');
    const lists = await client.getLists();

    console.log(`✅ Conexión exitosa!`);

    if (Array.isArray(lists) && lists.length > 0) {
      console.log(`   Listas encontradas: ${lists.length}\n`);
      console.log('📝 Primeras listas:');
      lists.slice(0, 5).forEach(list => {
        console.log(`   - ${list.name} (ID: ${list.id}, Suscriptores: ${list.subscriber_count || 'N/A'})`);
      });
    } else if (typeof lists === 'object') {
      // Acumbamail puede retornar un objeto con las listas como propiedades
      const listArray = Object.values(lists);
      console.log(`   Listas encontradas: ${listArray.length}\n`);
      console.log('📝 Primeras listas:');
      listArray.slice(0, 5).forEach(list => {
        console.log(`   - ${list.name} (ID: ${list.id})`);
      });
    } else {
      console.log('   No se encontraron listas (la cuenta puede estar vacía)');
    }

  } catch (error) {
    console.error(`❌ Error de conexión: ${error.message}`);
    process.exit(1);
  }
}

testConnection();
