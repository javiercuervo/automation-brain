/**
 * Diagnóstico 4: ¿Se pueden crear registros con linked records ya vinculados?
 * Si rowcreate soporta linked records, podemos recrear contactos con Company.
 */

require('dotenv').config();

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const TABLES = {
  contacts: 'tbl1770077025864393853',
  companies: 'tbl17700770258657e9b69',
  interactions: 'tbl1770077025865d62b5f'
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
    console.log(`→ ERROR: ${errorMatch ? errorMatch[1].substring(0, 200) : 'HTML'}`);
    return { ok: false, status: response.status };
  }

  try {
    const json = JSON.parse(text);
    console.log(`→ OK: ${JSON.stringify(json, null, 2).substring(0, 500)}`);
    return { ok: true, status: response.status, data: json };
  } catch (e) {
    console.log(`→ Raw: ${text.substring(0, 300)}`);
    return { ok: false, status: response.status };
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== DIAGNÓSTICO 4: Linked Records en rowcreate ===\n');

  // Obtener un rowId real de una company
  const compRes = await rawFetch(
    `/rowlist/${STACKBY_STACK_ID}/${TABLES.companies}?maxRecords=1`
  );
  await sleep(2000);

  if (!compRes.ok) {
    console.log('No se pudo obtener company');
    return;
  }

  const companyRowId = compRes.data[0].field.rowId;
  const companyName = compRes.data[0].field['Company Name'];
  console.log(`\nCompany de prueba: "${companyName}" (${companyRowId})`);

  // TEST A: Crear contacto con linked record como array de rowIds
  console.log('\n=== TEST A: rowcreate con Company como [rowId] ===');
  const testA = await rawFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{
          field: {
            'Full Name': 'TEST-LINK-BORRAR-A',
            'Email': 'test-link-a@test.com',
            'Company': [companyRowId]
          }
        }]
      })
    }
  );
  await sleep(3000);

  // TEST B: Crear contacto con linked record como string
  console.log('\n=== TEST B: rowcreate con Company como string ===');
  const testB = await rawFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{
          field: {
            'Full Name': 'TEST-LINK-BORRAR-B',
            'Email': 'test-link-b@test.com',
            'Company': companyRowId
          }
        }]
      })
    }
  );
  await sleep(3000);

  // TEST C: Crear contacto con linked record como nombre de la company
  console.log('\n=== TEST C: rowcreate con Company como nombre ===');
  const testC = await rawFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{
          field: {
            'Full Name': 'TEST-LINK-BORRAR-C',
            'Email': 'test-link-c@test.com',
            'Company': companyName
          }
        }]
      })
    }
  );

  // RESUMEN
  console.log('\n\n=== RESUMEN ===');
  console.log(`Test A (array [rowId]): ${testA.ok ? '✅' : '❌'} HTTP ${testA.status}`);
  if (testA.ok) {
    const compField = testA.data[0]?.field?.Company;
    console.log(`  → Company field: ${JSON.stringify(compField)}`);
  }
  console.log(`Test B (string rowId): ${testB.ok ? '✅' : '❌'} HTTP ${testB.status}`);
  if (testB.ok) {
    const compField = testB.data[0]?.field?.Company;
    console.log(`  → Company field: ${JSON.stringify(compField)}`);
  }
  console.log(`Test C (nombre): ${testC.ok ? '✅' : '❌'} HTTP ${testC.status}`);
  if (testC.ok) {
    const compField = testC.data[0]?.field?.Company;
    console.log(`  → Company field: ${JSON.stringify(compField)}`);
  }

  console.log('\n⚠️  RECUERDA: Borrar los registros TEST-LINK-BORRAR-* manualmente en Stackby');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
