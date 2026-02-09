/**
 * Vincular Actividades → Oportunidades, Contactos y Empresas.
 * Solo procesa las 93 actividades que tienen asociaciones en HubSpot.
 * Usa delete+recreate con workaround [id, id] para linked records.
 *
 * IMPORTANTE: Los nombres de campos deben coincidir con los renombrados en la UI.
 * Verificar via API antes de ejecutar.
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const CONTACTS_TABLE = 'tbl1770077025864393853';
const COMPANIES_TABLE = 'tbl17700770258657e9b69';
const OPPORTUNITIES_TABLE = 'tbl17700770258658046c6';
const INTERACTIONS_TABLE = 'tbl1770077025865d62b5f';

const LOG_FILE = './link-activities.log';
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
  log('=== VINCULANDO ACTIVIDADES → OPORTUNIDADES, CONTACTOS, EMPRESAS ===\n');

  // Load source data
  const interactions = JSON.parse(fs.readFileSync('./CSVs/hubspot-interactions.json', 'utf8'));
  const assoc = JSON.parse(fs.readFileSync('./CSVs/associations.json', 'utf8'));

  // Build HubSpot ID → name maps
  const companyIdToName = new Map();
  for (const a of assoc.companyToDeal) companyIdToName.set(a.companyId, a.companyName);
  for (const a of assoc.contactToCompany) companyIdToName.set(a.companyId, a.companyName);

  const dealIdToName = new Map();
  for (const a of assoc.companyToDeal) dealIdToName.set(a.dealId, a.dealName);
  for (const a of assoc.contactToDeal) dealIdToName.set(a.dealId, a.dealName);

  const contactIdToEmail = new Map();
  for (const a of assoc.contactToDeal) contactIdToEmail.set(a.contactId, a.contactEmail);
  for (const a of assoc.contactToCompany) contactIdToEmail.set(a.contactId, a.contactEmail);

  log(`HubSpot maps: ${companyIdToName.size} companies, ${dealIdToName.size} deals, ${contactIdToEmail.size} contacts`);

  // Filter interactions that have associations
  const withAssoc = interactions.filter(i =>
    (i.associatedCompanies && i.associatedCompanies.length) ||
    (i.associatedDeals && i.associatedDeals.length) ||
    (i.associatedContacts && i.associatedContacts.length)
  );
  log(`Interactions with associations: ${withAssoc.length}\n`);

  // Read Stackby data for name → rowId mapping
  log('Leyendo empresas...');
  const companies = await getAllRows(COMPANIES_TABLE);
  const companyByName = new Map();
  for (const r of companies) {
    const name = normalizeString(r.field['Company Name'] || r.field['Nombre'] || '');
    if (name) companyByName.set(name, r.field.rowId);
  }
  log(`  ${companyByName.size} empresas`);
  await sleep(1500);

  log('Leyendo oportunidades...');
  const opps = await getAllRows(OPPORTUNITIES_TABLE);
  const dealByName = new Map();
  for (const r of opps) {
    const name = normalizeString(r.field['Deal Name'] || r.field['Nombre'] || '');
    if (name) dealByName.set(name, r.field.rowId);
  }
  log(`  ${dealByName.size} oportunidades`);
  await sleep(1500);

  log('Leyendo contactos...');
  const contacts = await getAllRows(CONTACTS_TABLE);
  const contactByEmail = new Map();
  for (const r of contacts) {
    const email = normalizeString(r.field.Email || r.field.email || '');
    if (email) contactByEmail.set(email, r.field.rowId);
  }
  log(`  ${contactByEmail.size} contactos`);
  await sleep(1500);

  // Read current activities to match by title+date
  log('Leyendo actividades actuales...');
  const currentActivities = await getAllRows(INTERACTIONS_TABLE);
  log(`  ${currentActivities.length} actividades\n`);

  // Build a map of normalized title → Stackby row for matching
  // Use title as key (should be unique enough given the data)
  const activityByTitle = new Map();
  for (const r of currentActivities) {
    const title = normalizeString(r.field['Tarea'] || r.field['Task Name'] || r.field['Titulo'] || '');
    if (title) {
      if (!activityByTitle.has(title)) activityByTitle.set(title, []);
      activityByTitle.get(title).push(r);
    }
  }

  // Detect field names from first record
  const sampleFields = Object.keys(currentActivities[0].field);
  const titleField = sampleFields.find(f => ['Tarea', 'Titulo', 'Task Name'].includes(f)) || 'Tarea';
  const typeField = sampleFields.find(f => ['Tipo', 'Type'].includes(f)) || 'Tipo';
  const notesField = sampleFields.find(f => ['Notas', 'Notes'].includes(f)) || 'Notas';
  const dateField = sampleFields.find(f => ['Fecha', 'Date'].includes(f)) || 'Fecha';
  const doneField = sampleFields.find(f => ['¿Hecho?', 'Completada', 'Done?'].includes(f)) || '¿Hecho?';
  const oppField = sampleFields.find(f => ['Oportunidades', 'Opportunities', 'Interactions'].includes(f) && f !== 'Interactions') || 'Oportunidades';
  const contactField = sampleFields.find(f => ['Contactos', 'Contacts'].includes(f)) || 'Contactos';
  const companyField = sampleFields.find(f => ['Empresas', 'Companies'].includes(f)) || 'Empresas';

  log(`Campos detectados: titulo=${titleField}, tipo=${typeField}, opp=${oppField}, contacto=${contactField}, empresa=${companyField}`);

  let linked = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < withAssoc.length; i++) {
    const src = withAssoc[i];
    const title = normalizeString(src.title);

    // Find matching Stackby record
    const matches = activityByTitle.get(title);
    if (!matches || matches.length === 0) {
      log(`  ! Skip: "${src.title}" — no match in Stackby`);
      skipped++;
      continue;
    }

    const stackbyRow = matches[0]; // take first match
    const f = stackbyRow.field;

    // Resolve linked records
    let companyRowIds = [];
    for (const cid of (src.associatedCompanies || [])) {
      const name = companyIdToName.get(cid);
      if (name) {
        const rowId = companyByName.get(normalizeString(name));
        if (rowId) companyRowIds.push(rowId);
      }
    }

    let dealRowIds = [];
    for (const did of (src.associatedDeals || [])) {
      const name = dealIdToName.get(did);
      if (name) {
        const rowId = dealByName.get(normalizeString(name));
        if (rowId) dealRowIds.push(rowId);
      }
    }

    let contactRowIds = [];
    for (const ctid of (src.associatedContacts || [])) {
      const email = contactIdToEmail.get(ctid);
      if (email) {
        const rowId = contactByEmail.get(normalizeString(email));
        if (rowId) contactRowIds.push(rowId);
      }
    }

    // Skip if nothing to link
    if (companyRowIds.length === 0 && dealRowIds.length === 0 && contactRowIds.length === 0) {
      skipped++;
      continue;
    }

    // Build record preserving all fields
    const record = {};
    if (f[titleField]) record[titleField] = f[titleField];
    if (f[typeField]) record[typeField] = f[typeField];
    if (f[notesField]) record[notesField] = f[notesField];
    if (f[dateField]) record[dateField] = f[dateField];

    // Apply workaround for single-element arrays
    if (companyRowIds.length === 1) companyRowIds = [companyRowIds[0], companyRowIds[0]];
    if (dealRowIds.length === 1) dealRowIds = [dealRowIds[0], dealRowIds[0]];
    if (contactRowIds.length === 1) contactRowIds = [contactRowIds[0], contactRowIds[0]];

    if (companyRowIds.length > 0) record[companyField] = companyRowIds;
    if (dealRowIds.length > 0) record[oppField] = dealRowIds;
    if (contactRowIds.length > 0) record[contactField] = contactRowIds;

    // Clean empty values
    for (const key of Object.keys(record)) {
      if (record[key] === '' || record[key] === null || record[key] === undefined || record[key] === 'Untitle') delete record[key];
    }

    try {
      // Delete
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowdelete/${STACKBY_STACK_ID}/${INTERACTIONS_TABLE}?rowIds[]=${f.rowId}`,
          { method: 'DELETE' }
        ),
        `delete ${i+1}`
      );
      await sleep(REQUEST_DELAY);

      // Create with links
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowcreate/${STACKBY_STACK_ID}/${INTERACTIONS_TABLE}`,
          { method: 'POST', body: JSON.stringify({ records: [{ field: record }] }) }
        ),
        `create ${i+1}`
      );

      const links = [];
      if (companyRowIds.length) links.push(`emp:${companyRowIds.length > 2 ? companyRowIds.length : 1}`);
      if (dealRowIds.length) links.push(`opp:${dealRowIds.length > 2 ? dealRowIds.length : 1}`);
      if (contactRowIds.length) links.push(`con:${contactRowIds.length > 2 ? contactRowIds.length : 1}`);

      linked++;
      log(`  ✓ [${linked}] ${src.title} → ${links.join(', ')}`);
      await sleep(REQUEST_DELAY);

      // Remove from map to avoid re-matching duplicates
      if (matches.length > 1) matches.shift();
      else activityByTitle.delete(title);
    } catch (err) {
      errors++;
      log(`  ✗ [${i+1}] ${src.title}: ${err.message}`);
    }
  }

  // Verify
  await sleep(2000);
  const final = await getAllRows(INTERACTIONS_TABLE);
  let withOpp = 0, withContact = 0, withCompany = 0;
  for (const r of final) {
    if (r.field[oppField] && r.field[oppField] !== 'Untitle') withOpp++;
    if (r.field[contactField] && r.field[contactField] !== 'Untitle') withContact++;
    if (r.field[companyField] && r.field[companyField] !== 'Untitle') withCompany++;
  }

  log(`\n=== RESULTADO ===`);
  log(`Vinculados: ${linked}`);
  log(`Sin match/sin resolución: ${skipped}`);
  log(`Errores: ${errors}`);
  log(`Total final: ${final.length} (esperado: 711)`);
  log(`  Con Empresa: ${withCompany}`);
  log(`  Con Oportunidad: ${withOpp}`);
  log(`  Con Contacto: ${withContact}`);
  log('=== FIN ===');
}

main().catch(err => { log(`ERROR: ${err.message}`); process.exit(1); });
