/**
 * Diagnóstico 2: Probar distintos formatos de update
 *
 * El error 500 sugiere que el formato del payload no es correcto
 * para campos tipo Link/Linked Record.
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const TABLES = {
  contacts: 'tbl1770077025864393853',
  companies: 'tbl17700770258657e9b69',
  opportunities: 'tbl17700770258658046c6'
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
  console.log(`→ ${response.status} | Remaining: ${remaining}`);

  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    const errorMatch = text.match(/<pre>(.*?)<\/pre>/s);
    console.log(`→ ERROR: ${errorMatch ? errorMatch[1].substring(0, 200) : 'HTML response'}`);
    return { ok: false, status: response.status, error: errorMatch?.[1] || 'HTML' };
  }

  try {
    const json = JSON.parse(text);
    console.log(`→ OK: ${text.substring(0, 300)}`);
    return { ok: true, status: response.status, data: json };
  } catch (e) {
    console.log(`→ Parse error: ${text.substring(0, 200)}`);
    return { ok: false, status: response.status, error: text.substring(0, 200) };
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  console.log('=== DIAGNÓSTICO 2: Formatos de Update ===\n');

  // Paso 1: Obtener un contacto y una company con sus rowIds reales
  console.log('--- Obteniendo datos de prueba ---');
  const contactsRes = await rawFetch(
    `/rowlist/${STACKBY_STACK_ID}/${TABLES.contacts}?maxRecords=3`
  );
  await sleep(2000);

  const companiesRes = await rawFetch(
    `/rowlist/${STACKBY_STACK_ID}/${TABLES.companies}?maxRecords=3`
  );
  await sleep(2000);

  if (!contactsRes.ok || !companiesRes.ok) {
    console.log('\n❌ No se pudieron obtener datos de prueba');
    return;
  }

  const contact = contactsRes.data[0];
  const company = companiesRes.data[0];

  console.log(`\nContacto: ${contact.field['Full Name']} (${contact.field.rowId})`);
  console.log(`Company: ${company.field['Company Name']} (${company.field.rowId})`);
  console.log(`\nCampos del contacto:`);
  for (const [key, value] of Object.entries(contact.field)) {
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  }
  console.log(`\nCampos de la company:`);
  for (const [key, value] of Object.entries(company.field)) {
    console.log(`  ${key}: ${JSON.stringify(value)}`);
  }

  const contactRowId = contact.field.rowId;
  const companyRowId = company.field.rowId;

  // Test A: Update campo de texto simple (Title)
  console.log('\n\n=== TEST A: Update campo texto (Title) ===');
  const currentTitle = contact.field.Title || '';
  const testA = await rawFetch(
    `/rowupdate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        records: [{ rowId: contactRowId, field: { 'Title': currentTitle } }]
      })
    }
  );
  await sleep(3000);

  // Test B: Update linked record con array de rowIds
  console.log('\n=== TEST B: Update linked record con array [rowId] ===');
  const testB = await rawFetch(
    `/rowupdate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        records: [{ rowId: contactRowId, field: { 'Company': [companyRowId] } }]
      })
    }
  );
  await sleep(3000);

  // Test C: Update linked record con string rowId
  console.log('\n=== TEST C: Update linked record con string rowId ===');
  const testC = await rawFetch(
    `/rowupdate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        records: [{ rowId: contactRowId, field: { 'Company': companyRowId } }]
      })
    }
  );
  await sleep(3000);

  // Test D: Update linked record con objeto {id: rowId}
  console.log('\n=== TEST D: Update linked record con [{id: rowId}] ===');
  const testD = await rawFetch(
    `/rowupdate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        records: [{ rowId: contactRowId, field: { 'Company': [{ id: companyRowId }] } }]
      })
    }
  );
  await sleep(3000);

  // Test E: Update usando el ID del row (no rowId del campo field)
  console.log('\n=== TEST E: Update usando id del row (no field.rowId) ===');
  const testE = await rawFetch(
    `/rowupdate/${STACKBY_STACK_ID}/${TABLES.contacts}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        records: [{ rowId: contact.id, field: { 'Title': currentTitle } }]
      })
    }
  );
  await sleep(3000);

  // Test F: Probar con la columna "id" del JSON en lugar de field.rowId
  console.log('\n=== TEST F: Verificar estructura de la API (GET column list) ===');
  const testF = await rawFetch(
    `/rowlist/${STACKBY_STACK_ID}/${TABLES.contacts}?maxRecords=1&columnIds=Company`
  );

  // RESUMEN
  console.log('\n\n=== RESUMEN ===');
  console.log(`Test A (texto): ${testA.ok ? '✅' : '❌'} HTTP ${testA.status}`);
  console.log(`Test B (array [rowId]): ${testB.ok ? '✅' : '❌'} HTTP ${testB.status}`);
  console.log(`Test C (string rowId): ${testC.ok ? '✅' : '❌'} HTTP ${testC.status}`);
  console.log(`Test D ([{id: rowId}]): ${testD.ok ? '✅' : '❌'} HTTP ${testD.status}`);
  console.log(`Test E (row.id vs field.rowId): ${testE.ok ? '✅' : '❌'} HTTP ${testE.status}`);
  console.log(`Test F (column filter): ${testF.ok ? '✅' : '❌'} HTTP ${testF.status}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
