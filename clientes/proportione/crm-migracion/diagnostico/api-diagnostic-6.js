/**
 * Diagnóstico 6: ¿El rowcreate en Opportunities falla con arrays de 1 contacto?
 */

require('dotenv').config();

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const CONTACTS_TABLE = 'tbl1770077025864393853';
const OPPORTUNITIES_TABLE = 'tbl17700770258658046c6';

async function rawFetch(endpoint, options = {}) {
  const url = `https://stackby.com/api/betav1${endpoint}`;
  console.log(`\n${options.method || 'GET'} ${url}`);
  if (options.body) console.log(`Body: ${options.body.substring(0, 300)}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'api-key': STACKBY_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const text = await response.text();
  console.log(`→ HTTP ${response.status}`);

  if (text.startsWith('<!DOCTYPE')) {
    const err = text.match(/<pre>(.*?)<\/pre>/s);
    console.log(`→ ERROR: ${err ? err[1].substring(0, 150) : 'HTML'}`);
    return { ok: false, status: response.status };
  }
  try {
    const json = JSON.parse(text);
    console.log(`→ OK: ${JSON.stringify(json).substring(0, 200)}`);
    return { ok: true, data: json };
  } catch (e) {
    console.log(`→ Raw: ${text.substring(0, 200)}`);
    return { ok: false, status: response.status };
  }
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  console.log('=== DIAGNÓSTICO 6: Linked records con 1 vs 2 elementos ===\n');

  // Obtener 2 contactos reales
  const res = await rawFetch(`/rowlist/${STACKBY_STACK_ID}/${CONTACTS_TABLE}?maxRecords=2`);
  if (!res.ok) return;
  const c1 = res.data[0].field.rowId;
  const c2 = res.data[1].field.rowId;
  console.log(`\nContactos: ${c1}, ${c2}`);
  await sleep(2000);

  // TEST A: Opportunity con Main Contacts = [1 contacto]
  console.log('\n=== TEST A: Main Contacts con 1 contacto [c1] ===');
  const testA = await rawFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{ field: {
          'Deal Name': 'TEST-1CONTACT-BORRAR',
          'Stage': 'test',
          'Main Contacts': [c1]
        }}]
      })
    }
  );
  await sleep(3000);

  // TEST B: Opportunity con Main Contacts = [2 contactos]
  console.log('\n=== TEST B: Main Contacts con 2 contactos [c1, c2] ===');
  const testB = await rawFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{ field: {
          'Deal Name': 'TEST-2CONTACTS-BORRAR',
          'Stage': 'test',
          'Main Contacts': [c1, c2]
        }}]
      })
    }
  );
  await sleep(3000);

  // TEST C: Opportunity sin Main Contacts
  console.log('\n=== TEST C: Sin Main Contacts ===');
  const testC = await rawFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{ field: {
          'Deal Name': 'TEST-NOCONTACT-BORRAR',
          'Stage': 'test'
        }}]
      })
    }
  );
  await sleep(3000);

  // TEST D: Main Contacts con 1 contacto duplicado [c1, c1]
  console.log('\n=== TEST D: Main Contacts con mismo contacto duplicado [c1, c1] ===');
  const testD = await rawFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{ field: {
          'Deal Name': 'TEST-DUPECONTACT-BORRAR',
          'Stage': 'test',
          'Main Contacts': [c1, c1]
        }}]
      })
    }
  );

  // RESUMEN
  console.log('\n\n=== RESUMEN ===');
  console.log(`Test A (1 contacto):   ${testA.ok ? '✅' : '❌'} HTTP ${testA.status || 200}`);
  console.log(`Test B (2 contactos):  ${testB.ok ? '✅' : '❌'} HTTP ${testB.status || 200}`);
  console.log(`Test C (sin contacto): ${testC.ok ? '✅' : '❌'} HTTP ${testC.status || 200}`);
  console.log(`Test D (1 duplicado):  ${testD.ok ? '✅' : '❌'} HTTP ${testD.status || 200}`);

  // Limpiar los de prueba
  const toDelete = [];
  for (const t of [testA, testB, testC, testD]) {
    if (t.ok && t.data?.[0]?.field?.rowId) {
      toDelete.push(t.data[0].field.rowId);
    }
  }
  if (toDelete.length > 0) {
    await sleep(2000);
    const params = toDelete.map(id => `rowIds=${id}`).join('&');
    console.log(`\nLimpiando ${toDelete.length} registros de prueba...`);
    await rawFetch(
      `/rowdelete/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}?${params}`,
      { method: 'DELETE' }
    );
  }

  console.log('\n=== FIN ===');
}

main().catch(err => {
  console.error('Error:', err.message);
});
