/**
 * Exporta datos de HubSpot a CSVs para importar en Stackby
 */

require('dotenv').config();
const fs = require('fs');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

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

function escapeCSV(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function writeCSV(filename, headers, rows) {
  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => headers.map(h => escapeCSV(row[h])).join(','))
  ].join('\n');

  fs.writeFileSync(filename, csv, 'utf8');
  console.log(`  Guardado: ${filename} (${rows.length} filas)`);
}

async function main() {
  console.log('=== EXPORTANDO HUBSPOT A CSV ===\n');

  // Contacts
  console.log('Contacts:');
  const contacts = await getAllHubspotRecords('contacts', [
    'firstname', 'lastname', 'email', 'phone', 'jobtitle', 'website', 'company'
  ]);

  const contactRows = contacts.map(c => ({
    'Full Name': [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ') || '',
    'Title': c.properties.jobtitle || '',
    'Email': c.properties.email || '',
    'Phone': c.properties.phone || '',
    'Website': c.properties.website || '',
    'Company': c.properties.company || ''
  }));

  writeCSV('CSVs/hubspot-contacts.csv', ['Full Name', 'Title', 'Email', 'Phone', 'Website', 'Company'], contactRows);

  // Companies
  console.log('\nCompanies:');
  const companies = await getAllHubspotRecords('companies', [
    'name', 'domain', 'industry', 'numberofemployees', 'city', 'country'
  ]);

  const companyRows = companies.map(c => ({
    'Company Name': c.properties.name || '',
    'Industry': c.properties.industry || '',
    'Employees': c.properties.numberofemployees || '',
    'Website': c.properties.domain || ''
  }));

  writeCSV('CSVs/hubspot-companies.csv', ['Company Name', 'Industry', 'Employees', 'Website'], companyRows);

  // Deals
  console.log('\nDeals:');
  const deals = await getAllHubspotRecords('deals', [
    'dealname', 'amount', 'dealstage', 'closedate', 'pipeline'
  ]);

  const dealRows = deals.map(d => ({
    'Deal Name': d.properties.dealname || '',
    'Stage': d.properties.dealstage || '',
    'Total Value': d.properties.amount || '',
    'Close Date': d.properties.closedate ? d.properties.closedate.split('T')[0] : ''
  }));

  writeCSV('CSVs/hubspot-opportunities.csv', ['Deal Name', 'Stage', 'Total Value', 'Close Date'], dealRows);

  console.log('\n=== EXPORTACION COMPLETADA ===');
  console.log('\nArchivos generados en CSVs/:');
  console.log('  - hubspot-contacts.csv');
  console.log('  - hubspot-companies.csv');
  console.log('  - hubspot-opportunities.csv');
  console.log('\nImporta cada CSV en la tabla correspondiente de Stackby.');
}

main().catch(console.error);
