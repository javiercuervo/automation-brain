/**
 * Migración HubSpot → Stackby CRM
 * Versión persistente - reintenta hasta completar
 */

require('dotenv').config();
const fs = require('fs');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const STACKBY_TABLES = {
  contacts: 'tbl1770077025864393853',
  companies: 'tbl17700770258657e9b69',
  opportunities: 'tbl17700770258658046c6'
};

const PROGRESS_FILE = './migration-progress.json';
const LOG_FILE = './migration.log';

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

function loadProgress() {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8'));
    }
  } catch (e) {}
  return { companies: 0, contacts: 0, opportunities: 0 };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function hubspotFetch(endpoint) {
  const response = await fetch(`https://api.hubapi.com${endpoint}`, {
    headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}` }
  });
  return response.json();
}

async function getAllHubspotRecords(objectType, properties) {
  const records = [];
  let after = null;

  do {
    const params = new URLSearchParams({
      limit: '100',
      properties: properties.join(',')
    });
    if (after) params.set('after', after);

    const data = await hubspotFetch(`/crm/v3/objects/${objectType}?${params}`);
    records.push(...(data.results || []));
    after = data.paging?.next?.after || null;
  } while (after);

  return records;
}

async function stackbyCreateBatch(tableId, batch) {
  const response = await fetch(
    `https://stackby.com/api/betav1/rowcreate/${STACKBY_STACK_ID}/${tableId}`,
    {
      method: 'POST',
      headers: {
        'api-key': STACKBY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: batch.map(r => ({ field: r })) })
    }
  );

  const text = await response.text();

  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error('RATE_LIMIT');
  }

  const result = JSON.parse(text);
  if (result.error) {
    throw new Error(result.error);
  }

  return result;
}

function transformContact(hs) {
  return {
    'Full Name': [hs.properties.firstname, hs.properties.lastname].filter(Boolean).join(' ') || 'Sin nombre',
    'Title': hs.properties.jobtitle || '',
    'Email': hs.properties.email || '',
    'Phone': hs.properties.phone || '',
    'Website': hs.properties.website || ''
  };
}

function transformCompany(hs) {
  return {
    'Company Name': hs.properties.name || 'Sin nombre',
    'Industry': hs.properties.industry || '',
    'Employees': hs.properties.numberofemployees || '',
    'Website': hs.properties.domain || ''
  };
}

function transformDeal(hs) {
  return {
    'Deal Name': hs.properties.dealname || 'Sin nombre',
    'Stage': hs.properties.dealstage || '',
    'Total Value': hs.properties.amount || '',
    'Close Date': hs.properties.closedate || ''
  };
}

async function migrateTable(tableId, records, tableName, progress) {
  const batchSize = 3;
  let current = progress[tableName] || 0;

  if (current >= records.length) {
    log(`${tableName}: Ya completado (${records.length}/${records.length})`);
    return true;
  }

  log(`${tableName}: Continuando desde ${current}/${records.length}`);

  while (current < records.length) {
    const batch = records.slice(current, current + batchSize);

    try {
      await stackbyCreateBatch(tableId, batch);
      current += batch.length;
      progress[tableName] = current;
      saveProgress(progress);
      log(`${tableName}: ${current}/${records.length}`);
      await sleep(2000); // 2 segundos entre batches
    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        log(`${tableName}: Rate limit en ${current}/${records.length}. Esperando 1 hora...`);
        return false; // Indica que hay que esperar
      }
      throw err;
    }
  }

  log(`${tableName}: COMPLETADO (${records.length}/${records.length})`);
  return true;
}

async function main() {
  log('=== MIGRACION HUBSPOT -> STACKBY (PERSISTENTE) ===');

  // Cargar datos de HubSpot (solo una vez)
  log('Cargando datos de HubSpot...');

  const contacts = await getAllHubspotRecords('contacts', [
    'firstname', 'lastname', 'email', 'phone', 'jobtitle', 'website', 'company'
  ]);
  const companies = await getAllHubspotRecords('companies', [
    'name', 'domain', 'industry', 'numberofemployees'
  ]);
  const deals = await getAllHubspotRecords('deals', [
    'dealname', 'amount', 'dealstage', 'closedate'
  ]);

  log(`Total: ${contacts.length} contacts, ${companies.length} companies, ${deals.length} deals`);

  const stackbyContacts = contacts.map(transformContact);
  const stackbyCompanies = companies.map(transformCompany);
  const stackbyDeals = deals.map(transformDeal);

  // Bucle principal - reintenta hasta completar
  while (true) {
    const progress = loadProgress();

    // Migrar companies
    const companiesDone = await migrateTable(
      STACKBY_TABLES.companies, stackbyCompanies, 'companies', progress
    );
    if (!companiesDone) {
      await sleep(60 * 60 * 1000); // Esperar 1 hora
      continue;
    }

    // Migrar contacts
    const contactsDone = await migrateTable(
      STACKBY_TABLES.contacts, stackbyContacts, 'contacts', progress
    );
    if (!contactsDone) {
      await sleep(15 * 60 * 1000);
      continue;
    }

    // Migrar opportunities
    const opportunitiesDone = await migrateTable(
      STACKBY_TABLES.opportunities, stackbyDeals, 'opportunities', progress
    );
    if (!opportunitiesDone) {
      await sleep(15 * 60 * 1000);
      continue;
    }

    // Todo completado
    log('=== MIGRACION COMPLETADA ===');
    if (fs.existsSync(PROGRESS_FILE)) {
      fs.unlinkSync(PROGRESS_FILE);
    }
    break;
  }
}

main().catch(err => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
