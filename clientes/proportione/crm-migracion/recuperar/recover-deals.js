/**
 * Recuperar oportunidades borradas durante el re-link fallido.
 *
 * Lee el log de relaciones para identificar cuáles fallaron,
 * luego las recrea desde el CSV original (sin linked records).
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const OPPORTUNITIES_TABLE = 'tbl17700770258658046c6';

const REQUEST_DELAY = 3000;

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync('./recover-deals.log', line + '\n');
}

async function sleep(ms) {
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
  const text = await response.text();
  if (response.status !== 200) {
    throw new Error(`HTTP ${response.status}: ${text.substring(0, 200)}`);
  }
  return JSON.parse(text);
}

async function main() {
  log('=== RECUPERANDO OPORTUNIDADES BORRADAS ===\n');

  // Leer el log para encontrar cuáles fallaron
  const logContent = fs.readFileSync('./relations.log', 'utf8');
  const failedDeals = [];
  const succeededDeals = [];

  for (const line of logContent.split('\n')) {
    // Errores en Fase 2 (Opportunity → Contact)
    const failMatch = line.match(/✗ \[\d+\] (.+?): SERVER_ERROR/);
    if (failMatch) {
      failedDeals.push(failMatch[1].trim());
    }
    const successMatch = line.match(/✓ \[\d+\/53\] (.+?) →/);
    if (successMatch) {
      succeededDeals.push(successMatch[1].trim());
    }
  }

  log(`Deals fallidos (a recuperar): ${failedDeals.length}`);
  log(`Deals exitosos (ya en Stackby): ${succeededDeals.length}`);

  // Leer el CSV original de oportunidades
  const csvContent = fs.readFileSync('./CSVs/hubspot-opportunities.csv', 'utf8');
  const lines = csvContent.split('\n').slice(1).filter(l => l.trim());

  // Parser simple de CSV (maneja campos con comillas)
  function parseCSVLine(line) {
    const fields = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    return fields;
  }

  // Construir mapa de deals del CSV
  const csvDeals = new Map();
  for (const line of lines) {
    const [dealName, stage, totalValue, closeDate] = parseCSVLine(line);
    if (dealName) {
      csvDeals.set(dealName.trim(), { dealName: dealName.trim(), stage, totalValue, closeDate });
    }
  }

  log(`Deals en CSV: ${csvDeals.size}`);

  // Leer lo que existe actualmente en Stackby
  log('Leyendo oportunidades actuales de Stackby...');
  const existing = [];
  let offset = 0;
  while (true) {
    const data = await stackbyFetch(
      `/rowlist/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}?maxRecords=100&offset=${offset}`
    );
    if (!data.length) break;
    existing.push(...data);
    if (data.length < 100) break;
    offset += 100;
    await sleep(1000);
  }

  const existingNames = new Set(existing.map(r => r.field['Deal Name']));
  log(`Oportunidades actuales en Stackby: ${existing.length}`);

  // Encontrar las que faltan
  const toRecover = [];
  for (const dealName of failedDeals) {
    if (!existingNames.has(dealName)) {
      const csvData = csvDeals.get(dealName);
      if (csvData) {
        toRecover.push(csvData);
      } else {
        // Buscar por nombre parcial
        for (const [csvName, data] of csvDeals) {
          if (csvName.includes(dealName) || dealName.includes(csvName)) {
            if (!existingNames.has(csvName)) {
              toRecover.push(data);
              break;
            }
          }
        }
      }
    }
  }

  log(`Oportunidades a recuperar: ${toRecover.length}\n`);

  if (toRecover.length === 0) {
    log('No hay nada que recuperar.');
    return;
  }

  // Recrear en batches de 10
  for (let i = 0; i < toRecover.length; i += 10) {
    const batch = toRecover.slice(i, i + 10).map(d => ({
      'Deal Name': d.dealName,
      'Stage': d.stage || '',
      'Total Value': d.totalValue || '',
      'Close Date': d.closeDate || ''
    }));

    try {
      await stackbyFetch(
        `/rowcreate/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}`,
        {
          method: 'POST',
          body: JSON.stringify({ records: batch.map(r => ({ field: r })) })
        }
      );
      log(`  ✓ Batch ${Math.floor(i / 10) + 1}: ${batch.length} oportunidades recuperadas`);
    } catch (err) {
      log(`  ✗ Batch ${Math.floor(i / 10) + 1} error: ${err.message}`);
      // Intentar una por una
      for (const record of batch) {
        try {
          await stackbyFetch(
            `/rowcreate/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}`,
            {
              method: 'POST',
              body: JSON.stringify({ records: [{ field: record }] })
            }
          );
          log(`    ✓ ${record['Deal Name']}`);
        } catch (err2) {
          log(`    ✗ ${record['Deal Name']}: ${err2.message}`);
        }
        await sleep(REQUEST_DELAY);
      }
    }
    await sleep(REQUEST_DELAY);
  }

  // Verificar resultado final
  await sleep(2000);
  let finalCount = 0;
  offset = 0;
  while (true) {
    const data = await stackbyFetch(
      `/rowlist/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}?maxRecords=100&offset=${offset}`
    );
    finalCount += data.length;
    if (data.length < 100) break;
    offset += 100;
    await sleep(1000);
  }

  log(`\n=== RESULTADO ===`);
  log(`Oportunidades en Stackby ahora: ${finalCount} (original: 62)`);
  log(`=== RECUPERACIÓN COMPLETADA ===`);
}

main().catch(err => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
