/**
 * Diagnóstico de la API de Stackby
 *
 * Prueba distintas operaciones para entender los rate limits:
 * 1. Lectura simple (GET rowlist)
 * 2. Escritura individual (PATCH 1 registro)
 * 3. Escritura batch (PATCH N registros)
 * 4. Captura headers de respuesta para entender límites
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const TABLES = {
  contacts: 'tbl1770077025864393853',
  companies: 'tbl17700770258657e9b69',
  opportunities: 'tbl17700770258658046c6',
  interactions: 'tbl1770077025865d62b5f'
};

async function rawFetch(endpoint, options = {}) {
  const url = `https://stackby.com/api/betav1${endpoint}`;
  console.log(`\n--- REQUEST ---`);
  console.log(`${options.method || 'GET'} ${url}`);
  if (options.body) {
    console.log(`Body: ${options.body.substring(0, 200)}`);
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      'api-key': STACKBY_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  console.log(`\n--- RESPONSE ---`);
  console.log(`Status: ${response.status} ${response.statusText}`);
  console.log(`Headers:`);
  for (const [key, value] of response.headers.entries()) {
    // Mostrar headers relevantes para rate limits
    const k = key.toLowerCase();
    if (k.includes('rate') || k.includes('limit') || k.includes('retry') ||
        k.includes('x-') || k.includes('remaining') || k.includes('reset') ||
        k === 'content-type' || k === 'date') {
      console.log(`  ${key}: ${value}`);
    }
  }

  const text = await response.text();
  const isHtml = text.startsWith('<!DOCTYPE') || text.startsWith('<html');

  if (isHtml) {
    // Extraer el título del HTML para más info
    const titleMatch = text.match(/<title>([^<]*)<\/title>/);
    console.log(`Body: [HTML] ${titleMatch ? titleMatch[1] : 'sin título'}`);
    console.log(`Body preview: ${text.substring(0, 300)}`);
  } else {
    console.log(`Body: ${text.substring(0, 500)}`);
  }

  return { status: response.status, headers: Object.fromEntries(response.headers), text, isHtml };
}

async function sleep(ms) {
  console.log(`\nEsperando ${Math.round(ms/1000)} segundos...`);
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('==============================================');
  console.log('  DIAGNÓSTICO API STACKBY');
  console.log(`  Fecha: ${new Date().toISOString()}`);
  console.log(`  API Key: ${STACKBY_API_KEY ? STACKBY_API_KEY.substring(0, 8) + '...' : 'NO CONFIGURADA'}`);
  console.log('==============================================\n');

  const results = {};

  // TEST 1: Lectura simple - 1 registro
  console.log('\n========== TEST 1: Lectura simple (1 registro) ==========');
  results.test1 = await rawFetch(
    `/rowlist/${STACKBY_STACK_ID}/${TABLES.contacts}?maxRecords=1`
  );

  await sleep(3000);

  // TEST 2: Lectura simple - otra tabla
  console.log('\n========== TEST 2: Lectura otra tabla (1 registro) ==========');
  results.test2 = await rawFetch(
    `/rowlist/${STACKBY_STACK_ID}/${TABLES.companies}?maxRecords=1`
  );

  await sleep(3000);

  // TEST 3: Escritura - update 1 registro (sin cambiar datos realmente)
  // Necesitamos un rowId real del test 1
  let contactRowId = null;
  if (!results.test1.isHtml) {
    try {
      const data = JSON.parse(results.test1.text);
      if (data.length > 0) {
        contactRowId = data[0].field.rowId;
        const currentEmail = data[0].field.Email;
        console.log(`\nUsando contacto: rowId=${contactRowId}, email=${currentEmail}`);
      }
    } catch (e) {}
  }

  if (contactRowId) {
    console.log('\n========== TEST 3: Update individual (1 registro, mismos datos) ==========');
    results.test3 = await rawFetch(
      `/rowupdate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          records: [{ rowId: contactRowId, field: { 'Website': '' } }]
        })
      }
    );

    await sleep(5000);

    // TEST 4: Update batch - 2 registros
    console.log('\n========== TEST 4: Update batch (2 registros) ==========');
    results.test4 = await rawFetch(
      `/rowupdate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          records: [
            { rowId: contactRowId, field: { 'Website': '' } },
            { rowId: contactRowId, field: { 'Website': '' } }
          ]
        })
      }
    );
  } else {
    console.log('\n⚠️  No se pudo obtener un rowId para test de escritura');
    console.log('(Probablemente rate limited en la lectura)');
  }

  // RESUMEN
  console.log('\n\n==============================================');
  console.log('  RESUMEN DE DIAGNÓSTICO');
  console.log('==============================================');

  for (const [name, result] of Object.entries(results)) {
    const statusIcon = result.status === 200 ? '✅' : result.status === 429 ? '🚫' : result.isHtml ? '⚠️' : '❓';
    console.log(`${statusIcon} ${name}: HTTP ${result.status} ${result.isHtml ? '(HTML/Rate Limit)' : '(JSON OK)'}`);
  }

  console.log('\n==============================================');
  console.log('  FIN DIAGNÓSTICO');
  console.log('==============================================');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
