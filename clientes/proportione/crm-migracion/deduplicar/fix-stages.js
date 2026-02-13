/**
 * Arreglar las 62 oportunidades que tienen Stage vacío.
 * Las borra y las recrea con el Stage original en inglés + Main Contacts.
 *
 * El usuario luego renombra las opciones del Select en la UI.
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const CONTACTS_TABLE = 'tbl1770077025864393853';
const OPPORTUNITIES_TABLE = 'tbl17700770258658046c6';

const LOG_FILE = './fix-stages.log';
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
        log(`  ${e.message} en ${desc} (${i+1}/6)`); await sleep(wait); wait *= 2;
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
  log('=== ARREGLANDO STAGES DE OPORTUNIDADES ===\n');

  // CSV data
  const csvContent = fs.readFileSync('./CSVs/hubspot-opportunities.csv', 'utf8');
  const csvLines = csvContent.split('\n').slice(1).filter(l => l.trim());
  function parseCSVLine(line) {
    const fields = []; let current = ''; let inQuotes = false;
    for (const c of line) {
      if (c === '"') inQuotes = !inQuotes;
      else if (c === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
      else current += c;
    }
    fields.push(current.trim());
    return fields;
  }

  const csvDeals = new Map();
  for (const line of csvLines) {
    const [name, stage, value, closeDate] = parseCSVLine(line);
    if (name) csvDeals.set(normalizeString(name), { name: name.trim(), stage: (stage||'').trim(), value: (value||'').trim(), closeDate: (closeDate||'').trim() });
  }
  log(`CSV deals: ${csvDeals.size}`);

  // Contacts for Main Contacts links
  log('Leyendo contactos...');
  const contacts = await getAllRows(CONTACTS_TABLE);
  const contactByEmail = new Map();
  for (const r of contacts) {
    const email = normalizeString(r.field.Email);
    if (email) contactByEmail.set(email, r.field.rowId);
  }
  log(`  ${contactByEmail.size} emails`);
  await sleep(1500);

  // Associations
  const assoc = JSON.parse(fs.readFileSync('./CSVs/associations.json', 'utf8'));
  const dealContacts = new Map();
  for (const a of assoc.contactToDeal) {
    const d = normalizeString(a.dealName);
    if (!dealContacts.has(d)) dealContacts.set(d, []);
    dealContacts.get(d).push(normalizeString(a.contactEmail));
  }

  // Current opportunities
  const current = await getAllRows(OPPORTUNITIES_TABLE);
  log(`Oportunidades actuales: ${current.length}\n`);

  // Delete all current
  log('Borrando oportunidades con Stage vacío...');
  for (let i = 0; i < current.length; i += 10) {
    const batch = current.slice(i, i + 10);
    const params = batch.map(r => `rowIds[]=${r.field.rowId}`).join('&');
    await retryOnRateLimit(
      () => stackbyFetch(`/rowdelete/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}?${params}`, { method: 'DELETE' }),
      `delete batch`
    );
    log(`  Borrados ${Math.min(i + 10, current.length)}/${current.length}`);
    await sleep(REQUEST_DELAY);
  }

  // Recreate with English stages
  log('\nRecreando con Stage original...');
  let created = 0;
  for (const [normName, deal] of csvDeals) {
    const emails = dealContacts.get(normName) || [];
    const contactRowIds = emails.map(e => contactByEmail.get(e)).filter(Boolean);

    let mainContacts;
    if (contactRowIds.length === 1) mainContacts = [contactRowIds[0], contactRowIds[0]];
    else if (contactRowIds.length > 1) mainContacts = contactRowIds;

    const record = { 'Deal Name': deal.name, 'Stage': deal.stage };
    if (deal.value) record['Total Value'] = deal.value;
    if (deal.closeDate) record['Close Date'] = deal.closeDate;
    if (mainContacts) record['Main Contacts'] = mainContacts;

    try {
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowcreate/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}`,
          { method: 'POST', body: JSON.stringify({ records: [{ field: record }] }) }
        ),
        `create ${created + 1}`
      );
      created++;
      if (created % 10 === 0 || created === csvDeals.size) log(`  Creados: ${created}/${csvDeals.size}`);
      await sleep(REQUEST_DELAY);
    } catch (err) {
      log(`  ✗ ${deal.name}: ${err.message}`);
    }
  }

  // Verify
  await sleep(2000);
  const final = await getAllRows(OPPORTUNITIES_TABLE);
  const stages = {};
  for (const r of final) { const s = r.field.Stage || '(vacío)'; stages[s] = (stages[s] || 0) + 1; }

  log(`\n=== RESULTADO ===`);
  log(`Total: ${final.length} (esperado: 62)`);
  log('Etapas:');
  for (const [k, v] of Object.entries(stages)) log(`  ${k}: ${v}`);
  log('=== FIN ===');
}

main().catch(err => { log(`ERROR: ${err.message}`); process.exit(1); });
