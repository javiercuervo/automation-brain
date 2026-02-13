/**
 * Diagnóstico 5: Probar formatos de rowdelete
 * Necesitamos borrar los registros de prueba TEST-LINK-BORRAR-*
 */

require('dotenv').config();

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const CONTACTS_TABLE = 'tbl1770077025864393853';

async function rawFetch(endpoint, options = {}) {
  const url = `https://stackby.com/api/betav1${endpoint}`;
  console.log(`\n${options.method || 'GET'} ${url}`);
  if (options.body) console.log(`Body: ${options.body}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'api-key': STACKBY_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const text = await response.text();
  const remaining = response.headers.get('x-ratelimit-remaining');
  console.log(`→ HTTP ${response.status} | Remaining: ${remaining}`);
  console.log(`→ ${text.substring(0, 400)}`);
  return { status: response.status, text };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== DIAGNÓSTICO 5: Formatos de rowdelete ===\n');

  // Los rowIds de los registros de prueba
  const testRowIds = [
    'rw1770208139052e62e0b',  // TEST-LINK-BORRAR-A
    'rw1770208142494fd7eb3',  // TEST-LINK-BORRAR-B
    'rw17702081462557ef350'   // TEST-LINK-BORRAR-C
  ];

  // TEST A: DELETE con query params (un solo ID)
  console.log('=== TEST A: DELETE con query param rowIds[] ===');
  await rawFetch(
    `/rowdelete/${STACKBY_STACK_ID}/${CONTACTS_TABLE}?rowIds[]=${testRowIds[0]}`,
    { method: 'DELETE' }
  );
  await sleep(3000);

  // TEST B: DELETE con body como array directo
  console.log('\n=== TEST B: DELETE con body array directo ===');
  await rawFetch(
    `/rowdelete/${STACKBY_STACK_ID}/${CONTACTS_TABLE}`,
    {
      method: 'DELETE',
      body: JSON.stringify([testRowIds[1]])
    }
  );
  await sleep(3000);

  // TEST C: DELETE con body rows (no rowIds)
  console.log('\n=== TEST C: DELETE con {rows: [rowId]} ===');
  await rawFetch(
    `/rowdelete/${STACKBY_STACK_ID}/${CONTACTS_TABLE}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ rows: [testRowIds[2]] })
    }
  );
  await sleep(3000);

  // TEST D: DELETE con records [{rowId}]
  console.log('\n=== TEST D: DELETE con {records: [{rowId}]} ===');
  await rawFetch(
    `/rowdelete/${STACKBY_STACK_ID}/${CONTACTS_TABLE}`,
    {
      method: 'DELETE',
      body: JSON.stringify({ records: [{ rowId: testRowIds[2] }] })
    }
  );
  await sleep(3000);

  // TEST E: DELETE con query params múltiples
  console.log('\n=== TEST E: DELETE con query params rowIds=id1&rowIds=id2 ===');
  const params = testRowIds.map(id => `rowIds=${id}`).join('&');
  await rawFetch(
    `/rowdelete/${STACKBY_STACK_ID}/${CONTACTS_TABLE}?${params}`,
    { method: 'DELETE' }
  );

  console.log('\n=== FIN ===');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
