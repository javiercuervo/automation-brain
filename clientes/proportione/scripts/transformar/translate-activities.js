/**
 * Restaurar tipos de actividad en español.
 *
 * Los tipos se perdieron durante la importación original.
 * Este script recrea TODAS las interacciones desde el JSON fuente
 * con los tipos traducidos al español.
 *
 * Types: Call→Llamada, Meeting→Reunion, Note→Nota, Task→Tarea
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const INTERACTIONS_TABLE = 'tbl1770077025865d62b5f';

const LOG_FILE = './translate-activities.log';
const REQUEST_DELAY = 3000;

const TYPE_MAP = {
  'Call': 'Llamada',
  'Meeting': 'Reunion',
  'Note': 'Nota',
  'Task': 'Tarea',
  'Email': 'Email'
};

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

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch (e) {
    return null;
  }
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
  log('=== RESTAURANDO TIPOS DE ACTIVIDAD EN ESPAÑOL ===\n');

  // 1. Leer datos fuente
  const sourceData = JSON.parse(fs.readFileSync('./CSVs/hubspot-interactions.json', 'utf8'));
  log(`Interacciones en JSON fuente: ${sourceData.length}`);

  const typeCounts = {};
  for (const d of sourceData) {
    const t = d.type || '(vacío)';
    typeCounts[t] = (typeCounts[t] || 0) + 1;
  }
  log(`Tipos: ${JSON.stringify(typeCounts)}`);

  // 2. Leer interacciones actuales de Stackby
  log('\nLeyendo interacciones actuales de Stackby...');
  const currentRows = await getAllRows(INTERACTIONS_TABLE);
  log(`  ${currentRows.length} registros en Stackby`);

  // 3. Borrar TODAS las interacciones actuales en batches de 10
  log('\nBorrando interacciones actuales...');
  const rowIds = currentRows.map(r => r.field.rowId);
  let deleted = 0;

  for (let i = 0; i < rowIds.length; i += 10) {
    const batch = rowIds.slice(i, i + 10);
    const params = batch.map(id => `rowIds[]=${id}`).join('&');

    try {
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowdelete/${STACKBY_STACK_ID}/${INTERACTIONS_TABLE}?${params}`,
          { method: 'DELETE' }
        ),
        `delete batch ${Math.floor(i / 10) + 1}`
      );
      deleted += batch.length;
      if (deleted % 100 === 0 || i + batch.length >= rowIds.length) {
        log(`  Borrados: ${deleted}/${rowIds.length}`);
      }
    } catch (err) {
      log(`  Error borrando batch: ${err.message}`);
    }
    await sleep(REQUEST_DELAY);
  }

  log(`  Total borrados: ${deleted}`);

  // 4. Recrear TODAS las interacciones con tipos en español
  log('\nCreando interacciones con tipos en español...');
  const records = sourceData.map(interaction => {
    const spanishType = TYPE_MAP[interaction.type] || interaction.type || '';
    const notes = stripHtml(interaction.notes || '');

    const record = {
      'Task Name': interaction.title || `${spanishType || interaction.type} - Sin titulo`,
      'Notes': notes.substring(0, 5000),
      'Date': formatDate(interaction.date)
    };

    if (spanishType) record['Type'] = spanishType;
    if (interaction.status) record['Done?'] = interaction.status === 'COMPLETED';

    // Limpiar nulls
    for (const key of Object.keys(record)) {
      if (record[key] === null || record[key] === undefined) {
        delete record[key];
      }
    }

    return record;
  });

  // Crear en batches de 10
  let created = 0;
  let createErrors = 0;

  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);

    try {
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowcreate/${STACKBY_STACK_ID}/${INTERACTIONS_TABLE}`,
          {
            method: 'POST',
            body: JSON.stringify({ records: batch.map(r => ({ field: r })) })
          }
        ),
        `create batch ${Math.floor(i / 10) + 1}`
      );
      created += batch.length;
      if (created % 100 === 0 || i + batch.length >= records.length) {
        log(`  Creados: ${created}/${records.length}`);
      }
    } catch (err) {
      createErrors++;
      log(`  Error en batch ${Math.floor(i / 10) + 1}: ${err.message}`);
      // Intentar uno por uno
      for (const record of batch) {
        try {
          await retryOnRateLimit(
            () => stackbyFetch(
              `/rowcreate/${STACKBY_STACK_ID}/${INTERACTIONS_TABLE}`,
              {
                method: 'POST',
                body: JSON.stringify({ records: [{ field: record }] })
              }
            ),
            `create single`
          );
          created++;
        } catch (err2) {
          log(`    Error individual: ${err2.message} - ${record['Task Name']?.substring(0, 50)}`);
        }
        await sleep(REQUEST_DELAY);
      }
    }
    await sleep(REQUEST_DELAY);
  }

  // 5. Verificar
  await sleep(2000);
  const finalRows = await getAllRows(INTERACTIONS_TABLE);

  const finalTypes = {};
  for (const r of finalRows) {
    const t = r.field.Type || '(vacío)';
    finalTypes[t] = (finalTypes[t] || 0) + 1;
  }

  log(`\n=== RESULTADO ===`);
  log(`Borrados: ${deleted}`);
  log(`Creados: ${created}`);
  log(`Errores de creación: ${createErrors}`);
  log(`Total final: ${finalRows.length} (esperado: ${sourceData.length})`);
  log(`\nDistribución por tipo:`);
  for (const [k, v] of Object.entries(finalTypes)) log(`  ${k}: ${v}`);
  log('\n=== FIN ===');
}

main().catch(err => {
  log(`ERROR FATAL: ${err.message}`);
  process.exit(1);
});
