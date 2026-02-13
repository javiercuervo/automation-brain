/**
 * Exportar asociaciones de HubSpot
 *
 * Obtiene las relaciones entre contacts, companies y deals
 * para poder poblar los linked records en Stackby
 */

require('dotenv').config();
const fs = require('fs');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const OUTPUT_FILE = './CSVs/associations.json';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function hubspotFetch(endpoint) {
  const response = await fetch(`https://api.hubapi.com${endpoint}`, {
    headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}` }
  });

  if (response.status === 429) {
    console.log('  Rate limit de HubSpot, esperando 10 segundos...');
    await sleep(10000);
    return hubspotFetch(endpoint);
  }

  return response.json();
}

async function getAllRecords(objectType, properties) {
  const records = [];
  let after = null;

  console.log(`Obteniendo ${objectType}...`);

  do {
    const params = new URLSearchParams({
      limit: '100',
      properties: properties.join(',')
    });
    if (after) params.set('after', after);

    const data = await hubspotFetch(`/crm/v3/objects/${objectType}?${params}`);
    records.push(...(data.results || []));
    after = data.paging?.next?.after || null;

    process.stdout.write(`  ${records.length} registros\r`);
    await sleep(100);
  } while (after);

  console.log(`  ${records.length} registros totales`);
  return records;
}

async function getAssociations(objectType, objectId, toObjectType) {
  try {
    const data = await hubspotFetch(
      `/crm/v3/objects/${objectType}/${objectId}/associations/${toObjectType}`
    );
    return data.results || [];
  } catch (err) {
    return [];
  }
}

async function main() {
  console.log('=== EXPORTACIÓN DE ASOCIACIONES DE HUBSPOT ===\n');

  // Obtener todos los IDs
  const contacts = await getAllRecords('contacts', ['email', 'firstname', 'lastname']);
  const companies = await getAllRecords('companies', ['name', 'domain']);
  const deals = await getAllRecords('deals', ['dealname']);

  // Crear mapas de ID a datos
  const contactsById = new Map(contacts.map(c => [c.id, {
    id: c.id,
    email: c.properties.email,
    name: [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ')
  }]));

  const companiesById = new Map(companies.map(c => [c.id, {
    id: c.id,
    name: c.properties.name,
    domain: c.properties.domain
  }]));

  const dealsById = new Map(deals.map(d => [d.id, {
    id: d.id,
    name: d.properties.dealname
  }]));

  // Obtener asociaciones
  const associations = {
    contactToCompany: [],  // { contactId, contactEmail, companyId, companyName }
    contactToDeal: [],     // { contactId, contactEmail, dealId, dealName }
    companyToDeal: []      // { companyId, companyName, dealId, dealName }
  };

  // Contact → Company associations
  console.log('\nObteniendo asociaciones Contact → Company...');
  let processed = 0;
  for (const contact of contacts) {
    const assocs = await getAssociations('contacts', contact.id, 'companies');

    for (const assoc of assocs) {
      const company = companiesById.get(assoc.id);
      if (company) {
        associations.contactToCompany.push({
          contactId: contact.id,
          contactEmail: contact.properties.email,
          contactName: [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' '),
          companyId: assoc.id,
          companyName: company.name
        });
      }
    }

    processed++;
    if (processed % 50 === 0) {
      process.stdout.write(`  ${processed}/${contacts.length} contacts procesados\r`);
      await sleep(100);
    }
  }
  console.log(`  ${associations.contactToCompany.length} asociaciones Contact→Company`);

  // Contact → Deal associations
  console.log('\nObteniendo asociaciones Contact → Deal...');
  processed = 0;
  for (const contact of contacts) {
    const assocs = await getAssociations('contacts', contact.id, 'deals');

    for (const assoc of assocs) {
      const deal = dealsById.get(assoc.id);
      if (deal) {
        associations.contactToDeal.push({
          contactId: contact.id,
          contactEmail: contact.properties.email,
          contactName: [contact.properties.firstname, contact.properties.lastname].filter(Boolean).join(' '),
          dealId: assoc.id,
          dealName: deal.name
        });
      }
    }

    processed++;
    if (processed % 50 === 0) {
      process.stdout.write(`  ${processed}/${contacts.length} contacts procesados\r`);
      await sleep(100);
    }
  }
  console.log(`  ${associations.contactToDeal.length} asociaciones Contact→Deal`);

  // Company → Deal associations
  console.log('\nObteniendo asociaciones Company → Deal...');
  processed = 0;
  for (const company of companies) {
    const assocs = await getAssociations('companies', company.id, 'deals');

    for (const assoc of assocs) {
      const deal = dealsById.get(assoc.id);
      if (deal) {
        associations.companyToDeal.push({
          companyId: company.id,
          companyName: company.properties.name,
          dealId: assoc.id,
          dealName: deal.name
        });
      }
    }

    processed++;
    if (processed % 50 === 0) {
      process.stdout.write(`  ${processed}/${companies.length} companies procesadas\r`);
      await sleep(100);
    }
  }
  console.log(`  ${associations.companyToDeal.length} asociaciones Company→Deal`);

  // Guardar resultado
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(associations, null, 2));

  console.log('\n=== RESUMEN ===');
  console.log(`Contact → Company: ${associations.contactToCompany.length}`);
  console.log(`Contact → Deal: ${associations.contactToDeal.length}`);
  console.log(`Company → Deal: ${associations.companyToDeal.length}`);
  console.log(`\nGuardado en: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
