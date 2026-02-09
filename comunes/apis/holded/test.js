/**
 * Test de conexión para Holded API
 * Uso: node test_connection.js
 */

import 'dotenv/config';
import { HoldedClient } from './client.js';

async function testConnection() {
  console.log('🔌 Testeando conexión a Holded API...\n');

  // Verificar variables de entorno
  const apiKey = process.env.HOLDED_API_KEY;

  if (!apiKey) {
    console.error('❌ Error: HOLDED_API_KEY no está configurada en .env');
    process.exit(1);
  }

  console.log('✅ API Key encontrada');

  try {
    const client = new HoldedClient(apiKey);

    // Test: Obtener información de la cuenta
    console.log('📋 Obteniendo información de la cuenta...');

    // Primero intentamos obtener contactos (endpoint más común)
    const contacts = await client.listContacts();

    console.log(`✅ Conexión exitosa!`);

    if (Array.isArray(contacts)) {
      console.log(`   Contactos encontrados: ${contacts.length}\n`);

      if (contacts.length > 0) {
        console.log('📝 Primeros contactos:');
        contacts.slice(0, 5).forEach(contact => {
          const name = contact.name || contact.tradename || 'Sin nombre';
          const type = contact.type || 'N/A';
          console.log(`   - ${name} (Tipo: ${type})`);
        });
      }
    }

    // También intentamos obtener facturas
    console.log('\n📋 Obteniendo facturas recientes...');
    const invoices = await client.listInvoices();

    if (Array.isArray(invoices)) {
      console.log(`   Facturas encontradas: ${invoices.length}`);

      if (invoices.length > 0) {
        console.log('\n📝 Primeras facturas:');
        invoices.slice(0, 5).forEach(invoice => {
          const num = invoice.docNumber || invoice.number || 'Sin número';
          const total = invoice.total ? `${invoice.total}€` : 'N/A';
          console.log(`   - ${num} (Total: ${total})`);
        });
      }
    }

  } catch (error) {
    console.error(`❌ Error de conexión: ${error.message}`);
    process.exit(1);
  }
}

testConnection();
