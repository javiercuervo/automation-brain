/**
 * Clasificar oportunidades por Label.
 *
 * REQUISITO: Crear columna "Label" como "Single Line Text" ANTES de ejecutar.
 * Después de ejecutar, se puede convertir a "Single Select" en la UI.
 *
 * Usa delete+recreate porque rowupdate está roto.
 * Preserva Main Contacts usando associations.json.
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const CONTACTS_TABLE = 'tbl1770077025864393853';
const OPPORTUNITIES_TABLE = 'tbl17700770258658046c6';

const LOG_FILE = './classify-services.log';
const REQUEST_DELAY = 3000;

const SERVICE_RULES = [
  { type: 'Formacion', keywords: ['formacion', 'formación', 'programa', 'curso', 'taller', 'capacitacion', 'capacitación', 'ucm', 'guaix', 'claves de gestion', 'claves para gestionar', 'educación en ia', 'educacion en ia', 'iitd', 'lms', 'erp'] },
  { type: 'Coaching', keywords: ['coaching', 'one to one', 'one-to-one', 'mentoring', 'procesos one to one', 'mentor'] },
  { type: 'Consultoria', keywords: ['consultoría', 'consultoria', 'auditoría', 'auditoria', 'evaluación', 'evaluacion', 'automatización', 'automatizacion', 'estrategias para la mejora'] },
  { type: 'Desarrollo Web', keywords: ['web', 'ecommerce', 'e-commerce', 'marketplace', 'shopify', 'hosting', 'app', 'chatgpt', 'whatsapp', 'plataforma', 'showroom', 'posicionamiento', 'seo'] },
  { type: 'Marketing', keywords: ['marketing', 'branding', 'youtube', 'contenido', 'edición', 'edicion', 'diseminación', 'diseminacion', 'fidelización', 'fidelizacion'] }
];

function classifyService(dealName) {
  const lower = dealName.toLowerCase();
  for (const rule of SERVICE_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.type;
    }
  }
  return 'Otro';
}

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
  log('=== CLASIFICANDO OPORTUNIDADES POR TIPO DE SERVICIO ===\n');

  // Read contacts for Main Contacts preservation
  log('Leyendo contactos...');
  const contacts = await getAllRows(CONTACTS_TABLE);
  const contactByEmail = new Map();
  for (const r of contacts) {
    const email = normalizeString(r.field.Email);
    if (email) contactByEmail.set(email, r.field.rowId);
  }
  log(`  ${contactByEmail.size} emails`);
  await sleep(1500);

  // Associations for contact links
  const assoc = JSON.parse(fs.readFileSync('./CSVs/associations.json', 'utf8'));
  const dealContacts = new Map();
  for (const a of assoc.contactToDeal) {
    const d = normalizeString(a.dealName);
    if (!dealContacts.has(d)) dealContacts.set(d, []);
    dealContacts.get(d).push(normalizeString(a.contactEmail));
  }

  // Read opportunities
  log('Leyendo oportunidades...');
  const opportunities = await getAllRows(OPPORTUNITIES_TABLE);
  log(`  ${opportunities.length} oportunidades\n`);

  // Process each
  let classified = 0;
  let errors = 0;

  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i];
    const f = opp.field;
    const dealName = f['Deal Name'] || '';
    const serviceType = classifyService(dealName);

    // Resolve contacts
    const emails = dealContacts.get(normalizeString(dealName)) || [];
    const contactRowIds = emails.map(e => contactByEmail.get(e)).filter(Boolean);
    let mainContacts;
    if (contactRowIds.length === 1) mainContacts = [contactRowIds[0], contactRowIds[0]];
    else if (contactRowIds.length > 1) mainContacts = contactRowIds;

    // Build new record preserving all fields
    const record = {
      'Deal Name': dealName,
      'Stage': f.Stage || '',
      'Total Value': f['Total Value'] || '',
      'Close Date': f['Close Date'] || '',
      'Label': serviceType
    };
    if (f.Status) record.Status = f.Status;
    if (f.Priority) record.Priority = f.Priority;
    if (f.Owner) record.Owner = f.Owner;
    if (f.Users) record.Users = f.Users;
    if (f['Price/User']) record['Price/User'] = f['Price/User'];
    if (mainContacts) record['Main Contacts'] = mainContacts;

    // Clean empty values
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

      // Create
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowcreate/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}`,
          { method: 'POST', body: JSON.stringify({ records: [{ field: record }] }) }
        ),
        `create ${i+1}`
      );

      classified++;
      log(`  ✓ [${i+1}/${opportunities.length}] ${dealName} → ${serviceType}`);
      await sleep(REQUEST_DELAY);
    } catch (err) {
      errors++;
      log(`  ✗ [${i+1}] ${dealName}: ${err.message}`);
    }
  }

  // Verify
  await sleep(2000);
  const final = await getAllRows(OPPORTUNITIES_TABLE);
  const serviceCount = {};
  const stageCount = {};
  for (const r of final) {
    const s = r.field['Label'] || '(vacío)';
    const st = r.field.Stage || '(vacío)';
    serviceCount[s] = (serviceCount[s] || 0) + 1;
    stageCount[st] = (stageCount[st] || 0) + 1;
  }

  log(`\n=== RESULTADO ===`);
  log(`Clasificados: ${classified}/${opportunities.length}`);
  log(`Errores: ${errors}`);
  log(`Total final: ${final.length} (esperado: 62)`);
  log('\nPor tipo de servicio:');
  for (const [k, v] of Object.entries(serviceCount)) log(`  ${k}: ${v}`);
  log('\nPor etapa (verificación):');
  for (const [k, v] of Object.entries(stageCount)) log(`  ${k}: ${v}`);
  log('=== FIN ===');
}

main().catch(err => { log(`ERROR: ${err.message}`); process.exit(1); });
