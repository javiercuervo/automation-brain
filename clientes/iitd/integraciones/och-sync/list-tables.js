/**
 * Lista las tablas disponibles en el Stack de Stackby
 * Ejecutar: node list-tables.js
 */

const STACKBY_CONFIG = {
  API_KEY: process.env.STACKBY_API_KEY || 'YOUR_STACKBY_API_KEY',
  STACK_ID: process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78',
  BASE_URL: 'https://stackby.com/api/betav1'
};

async function listTables() {
  console.log('=== TABLAS EN STACKBY ===\n');
  console.log(`Stack ID: ${STACKBY_CONFIG.STACK_ID}\n`);

  try {
    // La API de Stackby no tiene un endpoint directo para listar tablas
    // Pero podemos intentar acceder al stack
    const response = await fetch(
      `${STACKBY_CONFIG.BASE_URL}/rowlist/${STACKBY_CONFIG.STACK_ID}/tbcoXCDU2ArgKH4eQJ?maxRecords=1`,
      {
        headers: {
          'api-key': STACKBY_CONFIG.API_KEY
        }
      }
    );

    if (response.ok) {
      console.log('✓ Conexión a Stackby OK');
      console.log('✓ Tabla SOLICITUDES_DECA (tbcoXCDU2ArgKH4eQJ) accesible\n');
    }

    // Mostrar info conocida
    console.log('Tablas conocidas:');
    console.log('  - SOLICITUDES_DECA: tbcoXCDU2ArgKH4eQJ');
    console.log('  - ALUMNOS: [PENDIENTE - crear o identificar]');
    console.log('\nPara ver todas las tablas:');
    console.log('  1. Ir a https://stackby.com/');
    console.log('  2. Abrir el stack IITD');
    console.log('  3. En cada tabla, el ID está en la URL');
    console.log('     Formato: stackby.com/STACK_ID/TABLE_ID\n');

  } catch (error) {
    console.error('Error:', error.message);
  }
}

listTables();
