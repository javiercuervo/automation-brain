/**
 * Deduplicar oportunidades en Stackby.
 * Hay ~53 duplicados por el proceso de delete+recreate.
 * Mantiene la versión más reciente (que podría tener el link a contactos).
 */

require('dotenv').config();

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const OPPORTUNITIES_TABLE = 'tbl17700770258658046c6';

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
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
  if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
    throw new Error(`HTML response: HTTP ${response.status}`);
  }
  return JSON.parse(text);
}

async function getAllRows() {
  const all = [];
  let offset = 0;
  while (true) {
    const data = await stackbyFetch(
      `/rowlist/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}?maxRecords=100&offset=${offset}`
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
  log('=== DEDUPLICANDO OPORTUNIDADES ===\n');

  const rows = await getAllRows();
  log(`Total oportunidades: ${rows.length}`);

  // Agrupar por nombre
  const byName = new Map();
  for (const row of rows) {
    const name = row.field['Deal Name'];
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(row);
  }

  // Encontrar duplicados
  const toDelete = [];
  let duplicateGroups = 0;

  for (const [name, group] of byName) {
    if (group.length > 1) {
      duplicateGroups++;
      // Ordenar por createdAt DESC (mantener el más reciente)
      group.sort((a, b) => new Date(b.field.createdAt) - new Date(a.field.createdAt));

      // Mantener el primero (más reciente), borrar el resto
      const keep = group[0];
      const remove = group.slice(1);
      log(`  "${name}": ${group.length} copias → mantener ${keep.field.rowId} (${keep.field.createdAt})`);
      for (const r of remove) {
        toDelete.push(r.field.rowId);
      }
    }
  }

  log(`\nGrupos duplicados: ${duplicateGroups}`);
  log(`Registros a borrar: ${toDelete.length}`);
  log(`Registros que quedarán: ${rows.length - toDelete.length}`);

  if (toDelete.length === 0) {
    log('No hay duplicados.');
    return;
  }

  // Borrar en batches de 10 (usando query params)
  for (let i = 0; i < toDelete.length; i += 10) {
    const batch = toDelete.slice(i, i + 10);
    const params = batch.map(id => `rowIds=${id}`).join('&');

    try {
      await stackbyFetch(
        `/rowdelete/${STACKBY_STACK_ID}/${OPPORTUNITIES_TABLE}?${params}`,
        { method: 'DELETE' }
      );
      log(`  ✓ Borrados ${i + batch.length}/${toDelete.length}`);
    } catch (err) {
      log(`  ✗ Error en batch: ${err.message}`);
    }
    await sleep(3000);
  }

  // Verificar
  await sleep(2000);
  const remaining = await getAllRows();
  log(`\n=== RESULTADO ===`);
  log(`Oportunidades finales: ${remaining.length} (objetivo: 62)`);
}

main().catch(err => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
