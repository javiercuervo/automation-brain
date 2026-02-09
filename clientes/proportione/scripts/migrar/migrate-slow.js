/**
 * Migración HubSpot → Stackby CRM
 * Versión ULTRA LENTA para evitar rate limits
 *
 * Estrategia: 1 registro cada 5 minutos = ~60 horas para completar
 */

require('dotenv').config();
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const STACKBY_TABLES = {
  contacts: 'tbl1770077025864393853',
  opportunities: 'tbl17700770258658046c6'
};

const PROGRESS_FILE = './migration-slow-progress.json';
const LOG_FILE = './migration-slow.log';

// 5 minutos entre cada registro (muy conservador)
const DELAY_BETWEEN_RECORDS = 5 * 60 * 1000;

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
  return { contacts: 0, opportunities: 0 };
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
}

async function sleep(ms) {
  const mins = Math.round(ms / 60000);
  log(`Esperando ${mins} minutos...`);
  return new Promise(r => setTimeout(r, ms));
}

async function stackbyCreateSingle(tableId, record) {
  const response = await fetch(
    `https://stackby.com/api/betav1/rowcreate/${STACKBY_STACK_ID}/${tableId}`,
    {
      method: 'POST',
      headers: {
        'api-key': STACKBY_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: [{ field: record }] })
    }
  );

  const text = await response.text();

  // Rate limit detection
  if (response.status === 429 || text.includes('rate') || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    return { success: false, rateLimited: true };
  }

  try {
    const result = JSON.parse(text);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: text.substring(0, 200) };
  }
}

function readCSV(filename) {
  const content = fs.readFileSync(`./CSVs/${filename}`, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true });
}

async function migrateRecords(tableId, records, tableName, progress) {
  let current = progress[tableName] || 0;
  const total = records.length;

  if (current >= total) {
    log(`${tableName}: Ya completado (${total}/${total})`);
    return true;
  }

  log(`${tableName}: Iniciando desde ${current}/${total}`);

  // Calcular tiempo estimado
  const remaining = total - current;
  const hoursRemaining = Math.round((remaining * DELAY_BETWEEN_RECORDS) / (1000 * 60 * 60));
  log(`Tiempo estimado: ~${hoursRemaining} horas`);

  while (current < total) {
    const record = records[current];

    log(`${tableName}: Enviando ${current + 1}/${total}...`);
    const result = await stackbyCreateSingle(tableId, record);

    if (result.success) {
      current++;
      progress[tableName] = current;
      saveProgress(progress);
      log(`${tableName}: OK ${current}/${total}`);

      if (current < total) {
        await sleep(DELAY_BETWEEN_RECORDS);
      }
    } else if (result.rateLimited) {
      log(`${tableName}: Rate limit en ${current}/${total}. Esperando 30 minutos...`);
      await sleep(30 * 60 * 1000); // 30 minutos si hay rate limit
    } else {
      log(`${tableName}: Error en ${current}/${total}: ${result.error}`);
      // Saltar el registro con error y continuar
      current++;
      progress[tableName] = current;
      saveProgress(progress);
      await sleep(DELAY_BETWEEN_RECORDS);
    }
  }

  log(`${tableName}: COMPLETADO (${total}/${total})`);
  return true;
}

async function main() {
  log('=== MIGRACION LENTA INICIADA ===');
  log(`Intervalo entre registros: ${DELAY_BETWEEN_RECORDS / 60000} minutos`);

  // Leer CSVs pendientes
  const contacts = readCSV('contacts-pending.csv');
  const opportunities = readCSV('opportunities-pending.csv');

  log(`Datos a migrar: ${contacts.length} contactos, ${opportunities.length} oportunidades`);

  const progress = loadProgress();

  // Migrar contactos
  await migrateRecords(STACKBY_TABLES.contacts, contacts, 'contacts', progress);

  // Migrar oportunidades
  await migrateRecords(STACKBY_TABLES.opportunities, opportunities, 'opportunities', progress);

  log('=== MIGRACION COMPLETADA ===');
}

main().catch(err => {
  log(`ERROR FATAL: ${err.message}`);
  process.exit(1);
});
