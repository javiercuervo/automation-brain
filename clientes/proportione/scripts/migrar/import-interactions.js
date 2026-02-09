/**
 * Importar Interactions a Stackby (versión batch + persistente)
 *
 * Importa los engagements exportados de HubSpot a la tabla Interactions.
 * Optimizado: batch creates (10 registros/llamada) + persistencia + rate limit handling.
 *
 * Con batch de 10: ~711 interacciones → ~72 llamadas API (en vez de 711)
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const TABLES = {
  interactions: 'tbl1770077025865d62b5f'
};

const PROGRESS_FILE = './import-interactions-progress.json';
const LOG_FILE = './interactions.log';

const BATCH_SIZE = 10;
const REQUEST_DELAY = 6000;

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
  return { batchIndex: 0, stats: { imported: 0, errors: 0 } };
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

  const text = await response.text();

  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html') || response.status === 429) {
    throw new Error('RATE_LIMIT');
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    log(`Response inesperada: ${text.substring(0, 300)}`);
    throw new Error(`Invalid JSON: ${text.substring(0, 100)}`);
  }
}

async function batchCreateRows(tableId, records) {
  return stackbyFetch(
    `/rowcreate/${STACKBY_STACK_ID}/${tableId}`,
    {
      method: 'POST',
      body: JSON.stringify({ records: records.map(r => ({ field: r })) })
    }
  );
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

function transformInteraction(interaction) {
  const notes = stripHtml(interaction.notes || '');
  return {
    'Task Name': interaction.title || `${interaction.type} - Sin título`,
    'Type': interaction.type,
    'Notes': notes.substring(0, 5000),
    'Date': formatDate(interaction.date),
    ...(interaction.status ? { 'Done?': interaction.status === 'COMPLETED' } : {})
  };
}

async function executeBatchWithRetry(tableId, batch, description) {
  let waitTime = 15 * 60 * 1000;

  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await batchCreateRows(tableId, batch);
    } catch (err) {
      const isRetryable = err.message === 'RATE_LIMIT' || err.message.includes('fetch failed') || err.message.includes('ECONNRESET');
      if (isRetryable) {
        log(`  ${err.message} en ${description} (intento ${attempt + 1}/8)`);
        await sleep(waitTime);
        waitTime = Math.min(waitTime * 2, 60 * 60 * 1000);
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Max reintentos en ${description}`);
}

async function main() {
  log('=== IMPORTANDO INTERACTIONS A STACKBY (BATCH) ===\n');

  const interactions = JSON.parse(fs.readFileSync('./CSVs/hubspot-interactions.json', 'utf8'));
  log(`Total interactions: ${interactions.length}`);

  // Transformar todas las interacciones
  const records = interactions.map(transformInteraction);

  // Crear batches
  const batches = [];
  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }

  log(`Batches: ${batches.length} (de ${BATCH_SIZE} registros cada uno)`);

  const progress = loadProgress();

  if (progress.batchIndex > 0) {
    log(`Continuando desde batch ${progress.batchIndex + 1}/${batches.length}`);
  }

  for (let i = progress.batchIndex; i < batches.length; i++) {
    try {
      await executeBatchWithRetry(
        TABLES.interactions,
        batches[i],
        `batch ${i + 1}/${batches.length}`
      );
      progress.stats.imported += batches[i].length;
      progress.batchIndex = i + 1;
      saveProgress(progress);
      log(`  ✓ Batch ${i + 1}/${batches.length} (${batches[i].length} registros, total: ${progress.stats.imported})`);
      await sleep(REQUEST_DELAY);
    } catch (err) {
      log(`  ✗ Batch ${i + 1} error fatal: ${err.message}. Guardando progreso y saliendo.`);
      saveProgress(progress);
      throw err;
    }
  }

  log(`\n=== RESUMEN INTERACTIONS ===`);
  log(`Importados: ${progress.stats.imported}`);
  log(`Errores: ${progress.stats.errors}`);
  log(`Llamadas API: ~${batches.length} (en vez de ${interactions.length})`);
  log(`=== IMPORTACIÓN COMPLETADA ===`);

  if (fs.existsSync(PROGRESS_FILE)) {
    fs.unlinkSync(PROGRESS_FILE);
  }
}

main().catch(err => {
  log(`ERROR FATAL: ${err.message}`);
  process.exit(1);
});
