/**
 * Exportar engagements (interactions) de HubSpot
 *
 * Obtiene calls, emails, notes, meetings y tasks
 * para poblar la tabla Interactions en Stackby
 */

require('dotenv').config();
const fs = require('fs');

const HUBSPOT_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const OUTPUT_FILE = './CSVs/hubspot-interactions.csv';
const OUTPUT_JSON = './CSVs/hubspot-interactions.json';

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function hubspotFetch(endpoint) {
  const response = await fetch(`https://api.hubapi.com${endpoint}`, {
    headers: { 'Authorization': `Bearer ${HUBSPOT_TOKEN}` }
  });

  if (response.status === 429) {
    console.log('  Rate limit, esperando 10 segundos...');
    await sleep(10000);
    return hubspotFetch(endpoint);
  }

  if (!response.ok) {
    const text = await response.text();
    console.log(`  Error ${response.status}: ${text.substring(0, 100)}`);
    return { results: [] };
  }

  return response.json();
}

async function getAllEngagements(objectType, properties) {
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

async function getAssociatedContacts(objectType, objectId) {
  try {
    const data = await hubspotFetch(
      `/crm/v3/objects/${objectType}/${objectId}/associations/contacts`
    );
    return (data.results || []).map(r => r.id);
  } catch (err) {
    return [];
  }
}

async function getAssociatedCompanies(objectType, objectId) {
  try {
    const data = await hubspotFetch(
      `/crm/v3/objects/${objectType}/${objectId}/associations/companies`
    );
    return (data.results || []).map(r => r.id);
  } catch (err) {
    return [];
  }
}

async function getAssociatedDeals(objectType, objectId) {
  try {
    const data = await hubspotFetch(
      `/crm/v3/objects/${objectType}/${objectId}/associations/deals`
    );
    return (data.results || []).map(r => r.id);
  } catch (err) {
    return [];
  }
}

function escapeCSV(str) {
  if (!str) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function main() {
  console.log('=== EXPORTACIÓN DE ENGAGEMENTS DE HUBSPOT ===\n');

  const allInteractions = [];

  // CALLS
  const calls = await getAllEngagements('calls', [
    'hs_timestamp', 'hs_call_body', 'hs_call_duration',
    'hs_call_from_number', 'hs_call_to_number', 'hs_call_title'
  ]);

  for (const call of calls) {
    allInteractions.push({
      type: 'Call',
      date: call.properties.hs_timestamp,
      title: call.properties.hs_call_title || 'Llamada',
      notes: call.properties.hs_call_body || '',
      duration: call.properties.hs_call_duration,
      hubspotId: call.id
    });
  }

  // EMAILS
  const emails = await getAllEngagements('emails', [
    'hs_timestamp', 'hs_email_subject', 'hs_email_text',
    'hs_email_from_email', 'hs_email_to_email'
  ]);

  for (const email of emails) {
    allInteractions.push({
      type: 'Email',
      date: email.properties.hs_timestamp,
      title: email.properties.hs_email_subject || 'Email',
      notes: email.properties.hs_email_text || '',
      from: email.properties.hs_email_from_email,
      to: email.properties.hs_email_to_email,
      hubspotId: email.id
    });
  }

  // NOTES
  const notes = await getAllEngagements('notes', [
    'hs_timestamp', 'hs_note_body'
  ]);

  for (const note of notes) {
    allInteractions.push({
      type: 'Note',
      date: note.properties.hs_timestamp,
      title: 'Nota',
      notes: note.properties.hs_note_body || '',
      hubspotId: note.id
    });
  }

  // MEETINGS
  const meetings = await getAllEngagements('meetings', [
    'hs_timestamp', 'hs_meeting_title', 'hs_meeting_body',
    'hs_meeting_start_time', 'hs_meeting_end_time'
  ]);

  for (const meeting of meetings) {
    allInteractions.push({
      type: 'Meeting',
      date: meeting.properties.hs_timestamp || meeting.properties.hs_meeting_start_time,
      title: meeting.properties.hs_meeting_title || 'Reunión',
      notes: meeting.properties.hs_meeting_body || '',
      startTime: meeting.properties.hs_meeting_start_time,
      endTime: meeting.properties.hs_meeting_end_time,
      hubspotId: meeting.id
    });
  }

  // TASKS
  const tasks = await getAllEngagements('tasks', [
    'hs_timestamp', 'hs_task_subject', 'hs_task_body',
    'hs_task_status', 'hs_task_priority'
  ]);

  for (const task of tasks) {
    allInteractions.push({
      type: 'Task',
      date: task.properties.hs_timestamp,
      title: task.properties.hs_task_subject || 'Tarea',
      notes: task.properties.hs_task_body || '',
      status: task.properties.hs_task_status,
      priority: task.properties.hs_task_priority,
      hubspotId: task.id
    });
  }

  // Obtener asociaciones para las interacciones (limitado para evitar rate limits)
  console.log('\nObteniendo asociaciones de interacciones (muestra de 100)...');
  const sampleSize = Math.min(100, allInteractions.length);

  for (let i = 0; i < sampleSize; i++) {
    const interaction = allInteractions[i];
    const objectType = interaction.type.toLowerCase() + 's'; // calls, emails, etc.

    try {
      interaction.associatedContacts = await getAssociatedContacts(objectType, interaction.hubspotId);
      interaction.associatedCompanies = await getAssociatedCompanies(objectType, interaction.hubspotId);
      interaction.associatedDeals = await getAssociatedDeals(objectType, interaction.hubspotId);
    } catch (err) {
      interaction.associatedContacts = [];
      interaction.associatedCompanies = [];
      interaction.associatedDeals = [];
    }

    if (i % 20 === 0) {
      process.stdout.write(`  ${i}/${sampleSize} asociaciones\r`);
      await sleep(200);
    }
  }

  console.log(`  ${sampleSize} asociaciones obtenidas`);

  // Guardar JSON completo
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(allInteractions, null, 2));

  // Guardar CSV
  const csvHeader = 'Type,Date,Title,Notes,HubSpot ID';
  const csvRows = allInteractions.map(i =>
    [
      escapeCSV(i.type),
      escapeCSV(i.date),
      escapeCSV(i.title),
      escapeCSV(i.notes?.substring(0, 500)), // Truncar notas largas
      escapeCSV(i.hubspotId)
    ].join(',')
  );

  fs.writeFileSync(OUTPUT_FILE, [csvHeader, ...csvRows].join('\n'));

  console.log('\n=== RESUMEN ===');
  console.log(`Calls: ${calls.length}`);
  console.log(`Emails: ${emails.length}`);
  console.log(`Notes: ${notes.length}`);
  console.log(`Meetings: ${meetings.length}`);
  console.log(`Tasks: ${tasks.length}`);
  console.log(`TOTAL: ${allInteractions.length}`);
  console.log(`\nGuardado en:`);
  console.log(`  - ${OUTPUT_FILE} (CSV)`);
  console.log(`  - ${OUTPUT_JSON} (JSON con asociaciones)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
