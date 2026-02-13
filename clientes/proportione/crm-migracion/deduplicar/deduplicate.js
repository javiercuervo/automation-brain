/**
 * Deduplicación de Contacts y Companies en Stackby
 *
 * Contacts: deduplica por email (conserva el más reciente)
 * Companies: deduplica por nombre normalizado (conserva el más completo)
 */

require('dotenv').config();

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const TABLES = {
  contacts: 'tbl1770077025864393853',
  companies: 'tbl17700770258657e9b69'
};

// Modo dry-run por defecto (no elimina, solo reporta)
const DRY_RUN = process.argv.includes('--execute') ? false : true;

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
    throw new Error('RATE_LIMIT');
  }

  return JSON.parse(text);
}

async function getAllRows(tableId) {
  const all = [];
  let offset = 0;

  while (true) {
    const data = await stackbyFetch(
      `/rowlist/${STACKBY_STACK_ID}/${tableId}?maxRecords=100&offset=${offset}`
    );

    if (!data.length) break;
    all.push(...data);
    if (data.length < 100) break;
    offset += 100;
    await sleep(500);
  }

  return all;
}

async function deleteRows(tableId, rowIds) {
  if (rowIds.length === 0) return;

  // Stackby acepta múltiples rowIds en el query string
  const params = rowIds.map(id => `rowIds[]=${id}`).join('&');

  await stackbyFetch(
    `/rowdelete/${STACKBY_STACK_ID}/${tableId}?${params}`,
    { method: 'DELETE' }
  );
}

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function countNonEmptyFields(record) {
  let count = 0;
  for (const [key, value] of Object.entries(record)) {
    if (value && value !== 'Untitle' && !key.startsWith('row') &&
        !['sequence', 'isConfigure', 'favourite', 'totalItems', 'completedItems',
          'dueDateTimestamp', 'checklistId', 'remainderId', 'updatedAt', 'createdAt'].includes(key)) {
      count++;
    }
  }
  return count;
}

async function deduplicateContacts() {
  console.log('\n=== DEDUPLICANDO CONTACTS ===');

  const rows = await getAllRows(TABLES.contacts);
  console.log(`Total contacts: ${rows.length}`);

  // Agrupar por email
  const byEmail = new Map();

  for (const row of rows) {
    const email = normalizeString(row.field.Email);

    if (!email || email === 'untitle') {
      // Sin email - no podemos deduplicar, pero los reportamos
      continue;
    }

    if (!byEmail.has(email)) {
      byEmail.set(email, []);
    }
    byEmail.get(email).push(row);
  }

  // Encontrar duplicados
  const toDelete = [];
  let duplicateGroups = 0;

  for (const [email, records] of byEmail) {
    if (records.length > 1) {
      duplicateGroups++;

      // Ordenar por updatedAt (más reciente primero)
      records.sort((a, b) => {
        const dateA = new Date(a.field.updatedAt || 0);
        const dateB = new Date(b.field.updatedAt || 0);
        return dateB - dateA;
      });

      // Conservar el primero (más reciente), eliminar el resto
      const keep = records[0];
      const remove = records.slice(1);

      console.log(`  Duplicados para "${email}": ${records.length} registros, conservando ${keep.field.rowId}`);

      for (const r of remove) {
        toDelete.push(r.field.rowId);
      }
    }
  }

  console.log(`\nGrupos con duplicados: ${duplicateGroups}`);
  console.log(`Registros a eliminar: ${toDelete.length}`);

  if (!DRY_RUN && toDelete.length > 0) {
    console.log('\nEliminando duplicados...');

    // Eliminar en batches de 10 para evitar rate limits
    for (let i = 0; i < toDelete.length; i += 10) {
      const batch = toDelete.slice(i, i + 10);
      try {
        await deleteRows(TABLES.contacts, batch);
        console.log(`  Eliminados ${i + batch.length}/${toDelete.length}`);
        await sleep(5000); // 5 segundos entre batches
      } catch (err) {
        if (err.message === 'RATE_LIMIT') {
          console.log('  Rate limit, esperando 5 minutos...');
          await sleep(5 * 60 * 1000);
          i -= 10; // Reintentar este batch
        } else {
          throw err;
        }
      }
    }

    console.log('Deduplicación de contacts completada.');
  }

  return { total: rows.length, duplicates: toDelete.length, groups: duplicateGroups };
}

async function deduplicateCompanies() {
  console.log('\n=== DEDUPLICANDO COMPANIES ===');

  const rows = await getAllRows(TABLES.companies);
  console.log(`Total companies: ${rows.length}`);

  // Agrupar por nombre normalizado
  const byName = new Map();

  for (const row of rows) {
    const name = normalizeString(row.field['Company Name']);

    if (!name || name === 'untitle' || name === 'sin nombre') {
      continue;
    }

    if (!byName.has(name)) {
      byName.set(name, []);
    }
    byName.get(name).push(row);
  }

  // Encontrar duplicados
  const toDelete = [];
  let duplicateGroups = 0;

  for (const [name, records] of byName) {
    if (records.length > 1) {
      duplicateGroups++;

      // Ordenar por número de campos no vacíos (más completo primero)
      records.sort((a, b) => {
        return countNonEmptyFields(b.field) - countNonEmptyFields(a.field);
      });

      // Conservar el primero (más completo), eliminar el resto
      const keep = records[0];
      const remove = records.slice(1);

      console.log(`  Duplicados para "${name}": ${records.length} registros, conservando ${keep.field.rowId}`);

      for (const r of remove) {
        toDelete.push(r.field.rowId);
      }
    }
  }

  console.log(`\nGrupos con duplicados: ${duplicateGroups}`);
  console.log(`Registros a eliminar: ${toDelete.length}`);

  if (!DRY_RUN && toDelete.length > 0) {
    console.log('\nEliminando duplicados...');

    for (let i = 0; i < toDelete.length; i += 10) {
      const batch = toDelete.slice(i, i + 10);
      try {
        await deleteRows(TABLES.companies, batch);
        console.log(`  Eliminados ${i + batch.length}/${toDelete.length}`);
        await sleep(5000);
      } catch (err) {
        if (err.message === 'RATE_LIMIT') {
          console.log('  Rate limit, esperando 5 minutos...');
          await sleep(5 * 60 * 1000);
          i -= 10;
        } else {
          throw err;
        }
      }
    }

    console.log('Deduplicación de companies completada.');
  }

  return { total: rows.length, duplicates: toDelete.length, groups: duplicateGroups };
}

async function main() {
  console.log('=== DEDUPLICACIÓN DE STACKBY CRM ===');
  console.log(`Modo: ${DRY_RUN ? 'DRY-RUN (solo reporta)' : 'EJECUTAR (elimina duplicados)'}`);

  if (DRY_RUN) {
    console.log('\nPara ejecutar la eliminación, usa: node deduplicate.js --execute\n');
  }

  const contactsResult = await deduplicateContacts();
  const companiesResult = await deduplicateCompanies();

  console.log('\n=== RESUMEN ===');
  console.log(`Contacts: ${contactsResult.total} total, ${contactsResult.duplicates} duplicados en ${contactsResult.groups} grupos`);
  console.log(`Companies: ${companiesResult.total} total, ${companiesResult.duplicates} duplicados en ${companiesResult.groups} grupos`);

  if (DRY_RUN) {
    console.log('\n>>> Ejecuta con --execute para eliminar los duplicados <<<');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
