/**
 * Vincular Oportunidades → Empresas usando associations.json.
 * Usa delete+recreate con workaround [id, id] para linked records.
 * Preserva todos los campos existentes (Stage, Main Contacts, Label, etc.)
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const COMPANIES_TABLE = 'tbl17700770258657e9b69';
const OPPORTUNITIES_TABLE = 'tbl17700770258658046c6';
const CONTACTS_TABLE = 'tbl1770077025864393853';

const LOG_FILE = './link-deals-companies.log';
const REQUEST_DELAY = 3000;

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function normalizeString(str) { return (str || '').toLowerCase().trim().replace(/\s+/g, ' '); }

async function stackbyFetch(endpoint, options = {}) {
  const response = await fetch(`https://stackby.com/api/betav1${endpoint}`, {
    ...options,
    headers: { 'api-key': STACKBY_API_KEY, 'Content-Type': 'application/json', ...options.headers }
  });
  const text = await response.text();
  if (response.status === 429 || (text.startsWith('<!DOCTYPE') && response.status !== 500)) throw new Error('RATE_LIMIT');
  if (response.status >= 400) throw new Error(`HTTP_${response.status}: ${text.substring(0, 200)}`);
  return JSON.parse(text);
}

async function retryOnRateLimit(fn, desc) {
  let wait = 15 * 60 * 1000;
  for (let i = 0; i < 6; i++) {
    try { return await fn(); } catch (e) {
      if (e.message === 'RATE_LIMIT' || e.message.includes('fetch failed')) {
        log(`  ${e.message} (${i+1}/6)`); await sleep(wait); wait *= 2;
      } else throw e;
    }
  }
  throw new Error(`Max retries: ${desc}`);
}

async function getAllRows(tableId) {
  const all = [];
  let offset = 0;
  while (true) {
    const data = await retryOnRateLimit(
      () => stackbyFetch(`/rowlist/${STACKBY_STACK_ID}/${tableId}?maxRecords=100&offset=${offset}`),
      `rowlist ${offset}`
    );
    if (!data.length) break;
    all.push(...data);
    if (data.length < 100) break;
    offset += 100;
    await sleep(1000);
  }
  return all;
}

async function main() {
  log('=== VINCULANDO OPORTUNIDADES → EMPRESAS ===\n');

  // Load associations
  const assoc = JSON.parse(fs.readFileSync('./CSVs/associations.json', 'utf8'));
  const dealToCompany = new Map();
  for (const a of assoc.companyToDeal) {
    dealToCompany.set(normalizeString(a.dealName), normalizeString(a.companyName));
  }
  log(`Asociaciones deal→company: ${dealToCompany.size}`);

  // Read companies from Stackby
  log('Leyendo empresas...');
  const companies = await getAllRows(COMPANIES_TABLE);
  const companyByName = new Map();
  for (const r of companies) {
    const name = normalizeString(r.field['Company Name']);
    if (name) companyByName.set(name, r.field.rowId);
  }
  log(`  ${companyByName.size} empresas con nombre`);
  await sleep(1500);

  // Read contacts for Main Contacts preservation
  log('Leyendo contactos...');
  const contacts = await getAllRows(CONTACTS_TABLE);
  const contactByEmail = new Map();
  for (const r of contacts) {
    const email = normalizeString(r.field.Email);
    if (email) contactByEmail.set(email, r.field.rowId);
  }
  log(`  ${contactByEmail.size} emails`);

  // Contact-to-deal associations for Main Contacts
  const dealContacts = new Map();
  for (const a of assoc.contactToDeal) {
    const d = normalizeString(a.dealName);
    if (!dealContacts.has(d)) dealContacts.set(d, []);
    dealContacts.get(d).push(normalizeString(a.contactEmail));
  }
  await sleep(1500);

  // Read opportunities
  log('Leyendo oportunidades...');
  const opportunities = await getAllRows(OPPORTUNITIES_TABLE);
  log(`  ${opportunities.length} oportunidades\n`);

  let linked = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i];
    const f = opp.field;
    const dealName = f['Deal Name'] || '';
    const normDeal = normalizeString(dealName);

    // Find company for this deal
    const companyName = dealToCompany.get(normDeal);
    if (!companyName) {
      skipped++;
      continue;
    }

    const companyRowId = companyByName.get(companyName);
    if (!companyRowId) {
      log(`  ! [${i+1}] ${dealName}: empresa "${companyName}" no encontrada en Stackby`);
      skipped++;
      continue;
    }

    // Resolve Main Contacts
    const emails = dealContacts.get(normDeal) || [];
    const contactRowIds = emails.map(e => contactByEmail.get(e)).filter(Boolean);
    let mainContacts;
    if (contactRowIds.length === 1) mainContacts = [contactRowIds[0], contactRowIds[0]];
    else if (contactRowIds.length > 1) mainContacts = contactRowIds;

    // Build record preserving all fields
    const record = { 'Deal Name': dealName };
    if (f.Stage) record.Stage = f.Stage;
    if (f['Total Value'] && f['Total Value'] !== '$0') record['Total Value'] = f['Total Value'];
    if (f['Close Date']) record['Close Date'] = f['Close Date'];
    if (f.Status) record.Status = f.Status;
    if (f.Priority) record.Priority = f.Priority;
    if (f.Owner) record.Owner = f.Owner;
    if (f.Users) record.Users = f.Users;
    if (f['Price/User']) record['Price/User'] = f['Price/User'];
    if (f.Label) record.Label = f.Label;
    if (mainContacts) record['Main Contacts'] = mainContacts;

    // Link company with [id, id] workaround
    record['Company'] = [companyRowId, companyRowId];

    // Clean empty/null values
    for (const key of Object.keys(record)) {
      if (record[key] === '' || record[key] === null || record[key] === undefined) delete record[key];
    }

    try {
      // Delete
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowdelete/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}?rowIds[]=${f.rowId}`,
          { method: 'DELETE' }
        ),
        `delete ${i+1}`
      );
      await sleep(REQUEST_DELAY);

      // Create with company link
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowcreate/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}`,
          { method: 'POST', body: JSON.stringify({ records: [{ field: record }] }) }
        ),
        `create ${i+1}`
      );

      linked++;
      log(`  ✓ [${linked}] ${dealName} → ${companyName}`);
      await sleep(REQUEST_DELAY);
    } catch (err) {
      errors++;
      log(`  ✗ [${i+1}] ${dealName}: ${err.message}`);
    }
  }

  // Verify
  await sleep(2000);
  const final = await getAllRows(OPPORTUNITIES_TABLE);
  let withCompany = 0;
  let withLabel = 0;
  let withStage = 0;
  let withContacts = 0;
  for (const r of final) {
    if (r.field.Company && r.field.Company !== 'Untitle') withCompany++;
    if (r.field.Label) withLabel++;
    if (r.field.Stage) withStage++;
    if (r.field['Main Contacts'] && r.field['Main Contacts'] !== 'Untitle') withContacts++;
  }

  log(`\n=== RESULTADO ===`);
  log(`Vinculados a empresa: ${linked}`);
  log(`Sin asociación (skip): ${skipped}`);
  log(`Errores: ${errors}`);
  log(`Total final: ${final.length} (esperado: 62)`);
  log(`  Con Company: ${withCompany}`);
  log(`  Con Label: ${withLabel}`);
  log(`  Con Stage: ${withStage}`);
  log(`  Con Main Contacts: ${withContacts}`);
  log('=== FIN ===');
}

main().catch(err => { log(`ERROR: ${err.message}`); process.exit(1); });
