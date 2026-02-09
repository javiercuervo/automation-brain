/**
 * Poblar relaciones en Stackby - Workaround via delete + recreate
 *
 * Como rowupdate está roto (HTTP 500), usamos:
 * 1. rowdelete (query params) para borrar el registro original
 * 2. rowcreate con linked record para recrearlo con la relación
 *
 * Proceso:
 * - Contactos: delete + create con Company: [companyRowId]
 * - Oportunidades: delete + create con Main Contacts: [contactRowId, ...]
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

const CACHE_FILE = './CSVs/stackby-rows-cache.json';
const PROGRESS_FILE = './relations-progress.json';
const LOG_FILE = './relations.log';

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

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return {
    contactIndex: 0,
    dealIndex: 0,
    newContactRowIds: {}, // email → new rowId (tras recrear contactos)
    stats: { linked: 0, skipped: 0, errors: 0 }
  };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
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

  try {
    return { data: JSON.parse(text), remaining: parseInt(remaining) || null };
  } catch (e) {
    throw new Error(`PARSE_ERROR: ${text.substring(0, 200)}`);
  }
}

async function deleteRows(tableId, rowIds) {
  // rowdelete usa query params: ?rowIds=id1&rowIds=id2 (max 10)
  const params = rowIds.map(id => `rowIds=${id}`).join('&');
  return stackbyFetch(
    `/rowdelete/${STACKBY_STACK_ID}/${tableId}?${params}`,
    { method: 'DELETE' }
  );
}

async function createRows(tableId, records) {
  return stackbyFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${tableId}`,
    {
      method: 'POST',
      body: JSON.stringify({ records: records.map(r => ({ field: r })) })
    }
  );
}

async function retryOnRateLimit(fn, description) {
  let waitTime = 15 * 60 * 1000;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.message === 'RATE_LIMIT' || err.message.includes('fetch failed')) {
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

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function findCompanyRowId(companyName, companyByName) {
  const normalized = normalizeString(companyName);
  if (companyByName.has(normalized)) return companyByName.get(normalized);
  for (const [name, rowId] of companyByName) {
    if (name.includes(normalized) || normalized.includes(name)) return rowId;
  }
  return null;
}

async function main() {
  log('=== POBLANDO RELACIONES (DELETE + RECREATE WORKAROUND) ===\n');

  // Cargar caché
  if (!fs.existsSync(CACHE_FILE)) {
    log('ERROR: No hay caché de datos Stackby. Ejecuta primero una lectura.');
    process.exit(1);
  }

  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
  log(`Caché: ${cache.contacts.length} contacts, ${cache.companies.length} companies, ${cache.deals.length} deals`);

  // Cargar asociaciones
  const associations = JSON.parse(fs.readFileSync('./CSVs/associations.json', 'utf8'));

  // Crear mapas
  const contactByEmail = new Map();
  const contactDataByEmail = new Map();
  for (const row of cache.contacts) {
    const email = normalizeString(row.field.Email);
    if (email) {
      contactByEmail.set(email, row.field.rowId);
      contactDataByEmail.set(email, row.field);
    }
  }

  const companyByName = new Map();
  for (const row of cache.companies) {
    const name = normalizeString(row.field['Company Name']);
    if (name) companyByName.set(name, row.field.rowId);
  }

  const dealByName = new Map();
  const dealDataByName = new Map();
  for (const row of cache.deals) {
    const name = normalizeString(row.field['Deal Name']);
    if (name) {
      dealByName.set(name, row.field.rowId);
      dealDataByName.set(name, row.field);
    }
  }

  log(`Maps: ${contactByEmail.size} contacts, ${companyByName.size} companies, ${dealByName.size} deals\n`);

  const progress = loadProgress();

  // ===== FASE 1: Contactos → Empresa (delete + recreate) =====

  // Preparar la lista de contactos a re-linkar
  const contactsToRelink = [];
  for (const assoc of associations.contactToCompany) {
    const email = normalizeString(assoc.contactEmail);
    const contactRowId = contactByEmail.get(email);
    const companyRowId = findCompanyRowId(assoc.companyName, companyByName);
    const contactData = contactDataByEmail.get(email);

    if (contactRowId && companyRowId && contactData) {
      contactsToRelink.push({
        email,
        oldRowId: contactRowId,
        companyRowId,
        data: {
          'Full Name': contactData['Full Name'] || '',
          'Title': contactData.Title || '',
          'Email': contactData.Email || '',
          'Phone': contactData.Phone || '',
          'Company': [companyRowId]  // ← Linked record
        }
      });
    } else {
      progress.stats.skipped++;
    }
  }

  log(`Contactos a re-linkar: ${contactsToRelink.length} (${progress.stats.skipped} sin match)`);

  if (progress.contactIndex < contactsToRelink.length) {
    log(`=== Fase 1: Contact → Company (desde ${progress.contactIndex}/${contactsToRelink.length}) ===`);

    for (let i = progress.contactIndex; i < contactsToRelink.length; i++) {
      const c = contactsToRelink[i];

      try {
        // Paso 1: Borrar el contacto viejo
        await retryOnRateLimit(
          () => deleteRows(TABLES.contacts, [c.oldRowId]),
          `delete contact ${i + 1}`
        );

        await sleep(REQUEST_DELAY);

        // Paso 2: Crear el contacto nuevo con Company vinculada
        const result = await retryOnRateLimit(
          () => createRows(TABLES.contacts, [c.data]),
          `create contact ${i + 1}`
        );

        // Guardar el nuevo rowId
        const newRowId = result.data[0]?.field?.rowId || result.data[0]?.id;
        if (newRowId) {
          progress.newContactRowIds[c.email] = newRowId;
        }

        progress.stats.linked++;
        progress.contactIndex = i + 1;
        saveProgress(progress);

        if ((i + 1) % 10 === 0 || i === contactsToRelink.length - 1) {
          log(`  ✓ [${i + 1}/${contactsToRelink.length}] último: ${c.email} → Company vinculada`);
        }

        await sleep(REQUEST_DELAY);
      } catch (err) {
        progress.stats.errors++;
        progress.contactIndex = i + 1;
        saveProgress(progress);
        log(`  ✗ [${i + 1}] ${c.email}: ${err.message}`);
      }
    }
    log('Fase 1 completada\n');
  } else {
    log('Fase 1 (Contact → Company): ya completada');
  }

  // ===== FASE 2: Oportunidades → Contactos =====
  // Agrupar contactos por deal
  const dealsToRelink = [];
  const dealGroups = new Map();
  for (const assoc of associations.contactToDeal) {
    const dealName = normalizeString(assoc.dealName);
    if (!dealGroups.has(dealName)) {
      dealGroups.set(dealName, { dealName: assoc.dealName, emails: [] });
    }
    dealGroups.get(dealName).emails.push(assoc.contactEmail);
  }

  for (const { dealName, emails } of dealGroups.values()) {
    const normalizedDeal = normalizeString(dealName);
    const dealRowId = dealByName.get(normalizedDeal);
    const dealData = dealDataByName.get(normalizedDeal);
    if (!dealRowId || !dealData) continue;

    // Buscar rowIds de contactos (usar los nuevos si fueron recreados)
    const contactRowIds = emails
      .map(email => {
        const normalizedEmail = normalizeString(email);
        return progress.newContactRowIds[normalizedEmail] || contactByEmail.get(normalizedEmail);
      })
      .filter(Boolean);

    if (contactRowIds.length === 0) continue;

    dealsToRelink.push({
      dealName,
      oldRowId: dealRowId,
      contactRowIds,
      data: {
        'Deal Name': dealData['Deal Name'] || '',
        'Stage': dealData.Stage || '',
        'Total Value': dealData['Total Value'] || '',
        'Close Date': dealData['Close Date'] || '',
        'Main Contacts': contactRowIds  // ← Linked records
      }
    });
  }

  log(`Oportunidades a re-linkar: ${dealsToRelink.length}`);

  if (progress.dealIndex < dealsToRelink.length) {
    log(`=== Fase 2: Opportunity → Contact (desde ${progress.dealIndex}/${dealsToRelink.length}) ===`);

    for (let i = progress.dealIndex; i < dealsToRelink.length; i++) {
      const d = dealsToRelink[i];

      try {
        // Paso 1: Borrar la oportunidad vieja
        await retryOnRateLimit(
          () => deleteRows(TABLES.opportunities, [d.oldRowId]),
          `delete deal ${i + 1}`
        );

        await sleep(REQUEST_DELAY);

        // Paso 2: Crear la oportunidad nueva con Main Contacts vinculados
        await retryOnRateLimit(
          () => createRows(TABLES.opportunities, [d.data]),
          `create deal ${i + 1}`
        );

        progress.stats.linked++;
        progress.dealIndex = i + 1;
        saveProgress(progress);
        log(`  ✓ [${i + 1}/${dealsToRelink.length}] ${d.dealName} → ${d.contactRowIds.length} contactos`);

        await sleep(REQUEST_DELAY);
      } catch (err) {
        progress.stats.errors++;
        progress.dealIndex = i + 1;
        saveProgress(progress);
        log(`  ✗ [${i + 1}] ${d.dealName}: ${err.message}`);
      }
    }
    log('Fase 2 completada\n');
  } else {
    log('Fase 2 (Opportunity → Contact): ya completada');
  }

  // ===== RESUMEN =====
  log(`\n=== RESUMEN RELACIONES ===`);
  log(`Vinculados: ${progress.stats.linked}`);
  log(`Sin match: ${progress.stats.skipped}`);
  log(`Errores: ${progress.stats.errors}`);
  log(`Nuevos rowIds guardados: ${Object.keys(progress.newContactRowIds).length}`);
  log(`=== RELACIONES COMPLETADAS ===`);

  // Invalidar caché (los rowIds cambiaron)
  if (fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
    log('Caché invalidada (rowIds cambiaron)');
  }

  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

main().catch(err => {
  log(`ERROR FATAL: ${err.message}`);
  process.exit(1);
});
