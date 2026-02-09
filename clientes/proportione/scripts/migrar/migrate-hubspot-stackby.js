/**
 * Migración HubSpot → Stackby CRM
 *
 * Extrae datos de HubSpot y los importa a Stackby
 * Con manejo de rate limits y reintentos
 */

require('dotenv').config();
const fs = require('fs');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const STACKBY_TABLES = {
  contacts: 'tbl1770077025864393853',
  companies: 'tbl17700770258657e9b69',
  opportunities: 'tbl17700770258658046c6',
  interactions: 'tbl1770077025865d62b5f'
};

const PROGRESS_FILE = './migration-progress.json';

// =====================================================
// PROGRESS TRACKING
// =====================================================

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

// =====================================================
// HUBSPOT API
// =====================================================

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

    console.log(`  Obtenidos ${records.length} ${objectType}...`);
  } while (after);

  return records;
}

// =====================================================
// STACKBY API (con reintentos)
// =====================================================

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function stackbyCreateRowsWithRetry(tableId, records, tableName, progress) {
  const batchSize = 3; // Muy reducido para evitar rate limits
  const startFrom = progress[tableName] || 0;

  console.log(`  Continuando desde registro ${startFrom}...`);

  for (let i = startFrom; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const count = Math.min(i + batchSize, records.length);

    let retries = 5;
    let success = false;

    while (retries > 0 && !success) {
      try {
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
          throw new Error('Rate limit - servidor devolvio HTML');
        }

        const result = JSON.parse(text);

        if (result.error) {
          throw new Error(result.error);
        }

        success = true;
        console.log(`  Insertados ${count}/${records.length}`);

        // Guardar progreso
        progress[tableName] = count;
        saveProgress(progress);

      } catch (err) {
        retries--;
        if (retries > 0) {
          const waitTime = (6 - retries) * 15; // 15s, 30s, 45s, 60s
          console.log(`  Error: ${err.message}. Reintentando en ${waitTime}s... (${retries} intentos restantes)`);
          await sleep(waitTime * 1000);
        } else {
          console.log(`  ERROR FATAL en registro ${i}: ${err.message}`);
          console.log(`  Guardando progreso. Ejecuta de nuevo para continuar.`);
          saveProgress(progress);
          throw err;
        }
      }
    }

    // Delay entre batches (2 segundos)
    await sleep(2000);
  }
}

// =====================================================
// TRANSFORMACIONES
// =====================================================

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

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('=== MIGRACION HUBSPOT -> STACKBY ===\n');

  const progress = loadProgress();
  console.log('Progreso anterior:', progress, '\n');

  // 1. Extraer de HubSpot
  console.log('1. Extrayendo datos de HubSpot...\n');

  console.log('Contacts:');
  const contacts = await getAllHubspotRecords('contacts', [
    'firstname', 'lastname', 'email', 'phone', 'jobtitle', 'website', 'company'
  ]);

  console.log('\nCompanies:');
  const companies = await getAllHubspotRecords('companies', [
    'name', 'domain', 'industry', 'numberofemployees', 'city', 'country'
  ]);

  console.log('\nDeals:');
  const deals = await getAllHubspotRecords('deals', [
    'dealname', 'amount', 'dealstage', 'closedate', 'pipeline'
  ]);

  console.log('\n----------------------------------------');
  console.log(`Total: ${contacts.length} contacts, ${companies.length} companies, ${deals.length} deals`);
  console.log('----------------------------------------\n');

  // 2. Transformar
  console.log('2. Transformando datos...\n');

  const stackbyContacts = contacts.map(transformContact);
  const stackbyCompanies = companies.map(transformCompany);
  const stackbyDeals = deals.map(transformDeal);

  // 3. Importar a Stackby
  console.log('3. Importando a Stackby...\n');

  if (progress.companies < stackbyCompanies.length) {
    console.log('Companies:');
    await stackbyCreateRowsWithRetry(STACKBY_TABLES.companies, stackbyCompanies, 'companies', progress);
  } else {
    console.log('Companies: Ya completado');
  }

  if (progress.contacts < stackbyContacts.length) {
    console.log('\nContacts:');
    await stackbyCreateRowsWithRetry(STACKBY_TABLES.contacts, stackbyContacts, 'contacts', progress);
  } else {
    console.log('Contacts: Ya completado');
  }

  if (progress.opportunities < stackbyDeals.length) {
    console.log('\nOpportunities (Deals):');
    await stackbyCreateRowsWithRetry(STACKBY_TABLES.opportunities, stackbyDeals, 'opportunities', progress);
  } else {
    console.log('Opportunities: Ya completado');
  }

  console.log('\n=== MIGRACION COMPLETADA ===');

  // Limpiar archivo de progreso
  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

main().catch(err => {
  console.error('\nError:', err.message);
  console.log('Ejecuta el script de nuevo para continuar desde donde se quedo.');
});
