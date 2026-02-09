/**
 * Diagnóstico 3: Probar rowcreate y rowdelete
 * Para confirmar que solo rowupdate está roto.
 */

require('dotenv').config();

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const TABLES = {
  interactions: 'tbl1770077025865d62b5f' // Usamos interactions para no ensuciar las otras tablas
};

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

  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    const errorMatch = text.match(/<pre>(.*?)<\/pre>/s);
    console.log(`→ ERROR: ${errorMatch ? errorMatch[1].substring(0, 300) : 'HTML response'}`);
    return { ok: false, status: response.status, text };
  }

  console.log(`→ OK: ${text.substring(0, 500)}`);
  try {
    return { ok: true, status: response.status, data: JSON.parse(text) };
  } catch (e) {
    return { ok: false, status: response.status, text };
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== DIAGNÓSTICO 3: Create, Update, Delete ===\n');

  // TEST 1: Create un registro de prueba en Interactions
  console.log('=== TEST 1: rowcreate ===');
  const createRes = await rawFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${TABLES.interactions}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{ field: { 'Task Name': 'TEST-BORRAR', 'Type': 'Note', 'Notes': 'Registro de prueba' } }]
      })
    }
  );
  await sleep(3000);

  if (!createRes.ok) {
    console.log('\n❌ rowcreate falló. La API de escritura está completamente rota.');
    return;
  }

  // Si el create funcionó, intentar update
  let newRowId = null;
  if (createRes.data && Array.isArray(createRes.data)) {
    newRowId = createRes.data[0]?.field?.rowId || createRes.data[0]?.id;
  } else if (createRes.data?.records) {
    newRowId = createRes.data.records[0]?.field?.rowId || createRes.data.records[0]?.id;
  }

  console.log(`\nRow creado con ID: ${newRowId}`);

  if (newRowId) {
    // TEST 2: Update el registro recién creado
    console.log('\n=== TEST 2: rowupdate del registro recién creado ===');
    const updateRes = await rawFetch(
      `/rowupdate/${STACKBY_STACK_ID}/${TABLES.interactions}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          records: [{ rowId: newRowId, field: { 'Notes': 'Actualizado' } }]
        })
      }
    );
    await sleep(3000);

    // TEST 3: Delete el registro
    console.log('\n=== TEST 3: rowdelete ===');
    const deleteRes = await rawFetch(
      `/rowdelete/${STACKBY_STACK_ID}/${TABLES.interactions}`,
      {
        method: 'DELETE',
        body: JSON.stringify({ rowIds: [newRowId] })
      }
    );
  }

  console.log('\n=== FIN DIAGNÓSTICO 3 ===');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
