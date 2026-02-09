/**
 * Recuperar las 62 oportunidades borradas + traducir etapas.
 * SIN "Tipo de Servicio" (columna no existe aún) ni "Company" link (bug API).
 * Preserva Main Contacts usando associations.json.
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const TABLES = {
  contacts: 'tbl1770077025864393853',
  opportunities: 'tbl17700770258658046c6'
};

const LOG_FILE = './recover-opportunities-v2.log';
const REQUEST_DELAY = 3000;

const STAGE_MAP = {
  'closedwon': 'Ganada',
  'closedlost': 'Perdida',
  'appointmentscheduled': 'Contacto Inicial',
  'qualifiedtobuy': 'Calificada',
  'presentationscheduled': 'Propuesta',
  'decisionmakerboughtin': 'Negociacion',
  'contractsent': 'Contrato Enviado'
};

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function stackbyFetch(endpoint, options = {}) {
  const response = await fetch(`https://stackby.com/api/betav1${endpoint}`, {
    ...options,
    headers: {
      'api-key': STACKBY_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  const text = await response.text();
  if (response.status === 429 || (text.startsWith('<!DOCTYPE') && response.status !== 500)) {
    throw new Error('RATE_LIMIT');
  }
  if (response.status >= 400) {
    throw new Error(`HTTP_${response.status}: ${text.substring(0, 200)}`);
  }
  return JSON.parse(text);
}

async function retryOnRateLimit(fn, description) {
  let waitTime = 15 * 60 * 1000;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.message === 'RATE_LIMIT' || err.message.includes('fetch failed') || err.message.includes('ECONNRESET')) {
        log(`  ${err.message} en ${description} (intento ${attempt + 1}/6)`);
        await sleep(waitTime);
        waitTime = Math.min(waitTime * 2, 60 * 60 * 1000);
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Max reintentos en ${description}`);
}

async function getAllRows(tableId) {
  const all = [];
  let offset = 0;
  while (true) {
    const data = await retryOnRateLimit(
      () => stackbyFetch(`/rowlist/${STACKBY_STACK_ID}/${tableId}?maxRecords=100&offset=${offset}`),
      `rowlist offset=${offset}`
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
  log('=== RECUPERANDO OPORTUNIDADES + TRADUCIENDO ETAPAS ===\n');

  // Leer datos originales del CSV
  const csvContent = fs.readFileSync('./CSVs/hubspot-opportunities.csv', 'utf8');
  const csvLines = csvContent.split('\n').slice(1).filter(l => l.trim());

  function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; }
      else if (char === ',' && !inQuotes) { fields.push(current.trim()); current = ''; }
      else { current += char; }
    }
    fields.push(current.trim());
    return fields;
  }

  const csvDeals = [];
  for (const line of csvLines) {
    const [dealName, stage, totalValue, closeDate] = parseCSVLine(line);
    if (dealName) {
      csvDeals.push({
        dealName: dealName.trim(),
        stage: (stage || '').trim(),
        totalValue: (totalValue || '').trim(),
        closeDate: (closeDate || '').trim()
      });
    }
  }
  log(`Deals en CSV: ${csvDeals.length}`);

  // Leer contactos actuales para resolver Main Contacts
  log('Leyendo contactos de Stackby...');
  const contacts = await getAllRows(TABLES.contacts);
  const contactByEmail = new Map();
  for (const row of contacts) {
    const email = normalizeString(row.field.Email);
    if (email) contactByEmail.set(email, row.field.rowId);
  }
  log(`  ${contacts.length} contactos (${contactByEmail.size} con email)`);
  await sleep(1500);

  // Cargar asociaciones
  const associations = JSON.parse(fs.readFileSync('./CSVs/associations.json', 'utf8'));
  const dealContacts = new Map();
  for (const assoc of associations.contactToDeal) {
    const dealName = normalizeString(assoc.dealName);
    if (!dealContacts.has(dealName)) dealContacts.set(dealName, []);
    dealContacts.get(dealName).push(normalizeString(assoc.contactEmail));
  }

  // Verificar qué hay actualmente en Stackby
  const existing = await getAllRows(TABLES.opportunities);
  const existingNames = new Set(existing.map(r => normalizeString(r.field['Deal Name'])));
  log(`Oportunidades actuales en Stackby: ${existing.length}`);

  // Crear records
  let created = 0;
  let errors = 0;

  for (let i = 0; i < csvDeals.length; i++) {
    const deal = csvDeals[i];
    const normalizedName = normalizeString(deal.dealName);

    // Skip si ya existe
    if (existingNames.has(normalizedName)) {
      log(`  Skip: "${deal.dealName}" ya existe`);
      continue;
    }

    // Traducir etapa
    const oldStage = deal.stage.toLowerCase();
    const newStage = STAGE_MAP[oldStage] || deal.stage || '';

    // Resolver contactos
    const emails = dealContacts.get(normalizedName) || [];
    const contactRowIds = emails.map(e => contactByEmail.get(e)).filter(Boolean);

    let mainContacts;
    if (contactRowIds.length === 1) {
      mainContacts = [contactRowIds[0], contactRowIds[0]]; // workaround
    } else if (contactRowIds.length > 1) {
      mainContacts = contactRowIds;
    }

    const record = {
      'Deal Name': deal.dealName,
      'Stage': newStage
    };
    if (deal.totalValue) record['Total Value'] = deal.totalValue;
    if (deal.closeDate) record['Close Date'] = deal.closeDate;
    if (mainContacts) record['Main Contacts'] = mainContacts;

    try {
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowcreate/${STACKBY_STACK_ID}/${TABLES.opportunities}`,
          {
            method: 'POST',
            body: JSON.stringify({ records: [{ field: record }] })
          }
        ),
        `create opp ${i + 1}`
      );
      created++;
      existingNames.add(normalizedName);
      const details = [`etapa: ${newStage}`];
      if (mainContacts) details.push(`${contactRowIds.length} contacto(s)`);
      log(`  ✓ [${created}] ${deal.dealName} → ${details.join(', ')}`);
      await sleep(REQUEST_DELAY);
    } catch (err) {
      errors++;
      log(`  ✗ ${deal.dealName}: ${err.message}`);
    }
  }

  // Verificar
  await sleep(2000);
  const final = await getAllRows(TABLES.opportunities);
  const stageCount = {};
  for (const r of final) {
    const s = r.field.Stage || '(vacío)';
    stageCount[s] = (stageCount[s] || 0) + 1;
  }

  log(`\n=== RESULTADO ===`);
  log(`Creados: ${created}`);
  log(`Errores: ${errors}`);
  log(`Total final: ${final.length} (esperado: 62)`);
  log('\nDistribución por etapa:');
  for (const [k, v] of Object.entries(stageCount)) log(`  ${k}: ${v}`);
  log('\n=== FIN ===');
}

main().catch(err => {
  log(`ERROR FATAL: ${err.message}`);
  process.exit(1);
});
