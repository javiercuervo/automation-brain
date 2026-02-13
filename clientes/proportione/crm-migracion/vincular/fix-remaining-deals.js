/**
 * Vincular las 45 oportunidades restantes con sus contactos.
 *
 * Workaround: rowcreate con Main Contacts de 1 elemento falla (HTTP 500).
 * Solución: duplicar el contacto → [c1, c1] funciona (Test D del diagnóstico 6).
 *
 * Proceso:
 * 1. Leer datos actuales de Stackby (contacts, opportunities)
 * 2. Identificar oportunidades sin Main Contacts vinculados
 * 3. Para cada una: delete vieja + create con Main Contacts: [c1, c1]
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const TABLES = {
  contacts: 'tbl1770077025864393853',
  opportunities: 'tbl17700770258658046c6'
};

const LOG_FILE = './fix-remaining-deals.log';
const PROGRESS_FILE = './fix-remaining-deals-progress.json';
const REQUEST_DELAY = 3000;

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

async function sleep(ms) {
  const mins = Math.round(ms / 60000);
  if (mins >= 1) log(`Esperando ${mins} minutos...`);
  return new Promise(r => setTimeout(r, ms));
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

  const remaining = response.headers.get('x-ratelimit-remaining');
  const text = await response.text();

  if (response.status === 429 || (text.startsWith('<!DOCTYPE') && response.status !== 500)) {
    throw new Error('RATE_LIMIT');
  }

  if (response.status === 500) {
    throw new Error(`SERVER_ERROR: ${text.substring(0, 200)}`);
  }

  if (response.status >= 400) {
    throw new Error(`HTTP_${response.status}: ${text.substring(0, 200)}`);
  }

  try {
    return { data: JSON.parse(text), remaining: parseInt(remaining) || null };
  } catch (e) {
    throw new Error(`PARSE_ERROR: ${text.substring(0, 200)}`);
  }
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
    const result = await retryOnRateLimit(
      () => stackbyFetch(`/rowlist/${STACKBY_STACK_ID}/${tableId}?maxRecords=100&offset=${offset}`),
      `rowlist offset=${offset}`
    );
    if (!result.data.length) break;
    all.push(...result.data);
    if (result.data.length < 100) break;
    offset += 100;
    await sleep(1000);
  }
  return all;
}

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { index: 0, linked: 0, skipped: 0, errors: 0, alreadyLinked: 0 };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function main() {
  log('=== VINCULANDO OPORTUNIDADES RESTANTES (WORKAROUND [c, c]) ===\n');

  // 1. Leer datos actuales de Stackby
  log('Leyendo contactos de Stackby...');
  const contacts = await getAllRows(TABLES.contacts);
  log(`  ${contacts.length} contactos`);
  await sleep(1500);

  log('Leyendo oportunidades de Stackby...');
  const opportunities = await getAllRows(TABLES.opportunities);
  log(`  ${opportunities.length} oportunidades`);
  await sleep(1500);

  // 2. Crear mapas
  const contactByEmail = new Map();
  for (const row of contacts) {
    const email = normalizeString(row.field.Email);
    if (email) contactByEmail.set(email, row.field.rowId);
  }

  const dealMap = new Map(); // normalizedName → { rowId, field, hasLinks }
  for (const row of opportunities) {
    const name = normalizeString(row.field['Deal Name']);
    const mainContacts = row.field['Main Contacts'];
    const hasLinks = Array.isArray(mainContacts) && mainContacts.length > 0;
    dealMap.set(name, {
      rowId: row.field.rowId,
      field: row.field,
      hasLinks
    });
  }

  // 3. Cargar asociaciones y encontrar las que faltan
  const associations = JSON.parse(fs.readFileSync('./CSVs/associations.json', 'utf8'));

  // Agrupar contactos por deal
  const dealContacts = new Map();
  for (const assoc of associations.contactToDeal) {
    const dealName = normalizeString(assoc.dealName);
    if (!dealContacts.has(dealName)) {
      dealContacts.set(dealName, { dealName: assoc.dealName, emails: [] });
    }
    dealContacts.get(dealName).emails.push(normalizeString(assoc.contactEmail));
  }

  // Identificar oportunidades que necesitan vinculación
  const toFix = [];
  for (const [normalizedDeal, info] of dealContacts) {
    const deal = dealMap.get(normalizedDeal);
    if (!deal) {
      log(`  Skip: deal "${info.dealName}" no encontrado en Stackby`);
      continue;
    }

    if (deal.hasLinks) {
      // Ya tiene Main Contacts vinculados
      continue;
    }

    // Buscar rowIds de contactos
    const contactRowIds = info.emails
      .map(email => contactByEmail.get(email))
      .filter(Boolean);

    if (contactRowIds.length === 0) {
      log(`  Skip: deal "${info.dealName}" sin contactos encontrados`);
      continue;
    }

    // Workaround: si solo 1 contacto, duplicar para evitar bug de arrays de 1 elemento
    const mainContactsValue = contactRowIds.length === 1
      ? [contactRowIds[0], contactRowIds[0]]
      : contactRowIds;

    toFix.push({
      dealName: info.dealName,
      rowId: deal.rowId,
      field: deal.field,
      contactRowIds: mainContactsValue,
      originalCount: contactRowIds.length
    });
  }

  const alreadyLinked = [...dealContacts.keys()].filter(n => dealMap.get(n)?.hasLinks).length;
  log(`\nOportunidades ya vinculadas: ${alreadyLinked}`);
  log(`Oportunidades a vincular: ${toFix.length}\n`);

  if (toFix.length === 0) {
    log('Nada que hacer.');
    return;
  }

  // 4. Procesar: delete + create con Main Contacts
  const progress = loadProgress();
  progress.alreadyLinked = alreadyLinked;

  for (let i = progress.index; i < toFix.length; i++) {
    const deal = toFix[i];

    try {
      // Paso 1: Borrar la oportunidad vieja (formato rowIds[]=id)
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowdelete/${STACKBY_STACK_ID}/${TABLES.opportunities}?rowIds[]=${deal.rowId}`,
          { method: 'DELETE' }
        ),
        `delete deal ${i + 1}`
      );
      await sleep(REQUEST_DELAY);

      // Paso 2: Crear con Main Contacts (usando [c, c] si solo 1)
      const newRecord = {
        'Deal Name': deal.field['Deal Name'] || '',
        'Stage': deal.field.Stage || '',
        'Total Value': deal.field['Total Value'] || '',
        'Close Date': deal.field['Close Date'] || '',
        'Main Contacts': deal.contactRowIds
      };

      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowcreate/${STACKBY_STACK_ID}/${TABLES.opportunities}`,
          {
            method: 'POST',
            body: JSON.stringify({ records: [{ field: newRecord }] })
          }
        ),
        `create deal ${i + 1}`
      );

      progress.linked++;
      progress.index = i + 1;
      saveProgress(progress);
      log(`  ✓ [${i + 1}/${toFix.length}] ${deal.dealName} → ${deal.originalCount} contacto(s) [workaround: ${deal.contactRowIds.length}]`);

      await sleep(REQUEST_DELAY);
    } catch (err) {
      progress.errors++;
      progress.index = i + 1;
      saveProgress(progress);
      log(`  ✗ [${i + 1}/${toFix.length}] ${deal.dealName}: ${err.message}`);
    }
  }

  // 5. Verificación final
  await sleep(2000);
  const finalOpps = await getAllRows(TABLES.opportunities);
  const linkedCount = finalOpps.filter(r => {
    const mc = r.field['Main Contacts'];
    return Array.isArray(mc) && mc.length > 0;
  }).length;

  log(`\n=== RESULTADO ===`);
  log(`Oportunidades totales: ${finalOpps.length} (esperado: 62)`);
  log(`Con Main Contacts vinculados: ${linkedCount}`);
  log(`Vinculados en esta ejecución: ${progress.linked}`);
  log(`Errores: ${progress.errors}`);
  log(`=== FIN ===`);

  // Limpiar progreso
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

main().catch(err => {
  log(`ERROR FATAL: ${err.message}`);
  process.exit(1);
});
