/**
 * Deduplicar contactos en Stackby.
 *
 * La Fase 1 del re-linking creó 236 contactos nuevos (con Company vinculada)
 * pero los deletes del original fallaron silenciosamente (HTTP 400).
 * Resultado: 1185 contactos en vez de 949.
 *
 * Estrategia: agrupar por Email, mantener el que tenga Company vinculada
 * (el más reciente), borrar el duplicado.
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';
const CONTACTS_TABLE = 'tbl1770077025864393853';

const LOG_FILE = './dedup-contacts.log';

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
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

  if (response.status === 429 || (text.startsWith('<!DOCTYPE') && response.status !== 500)) {
    throw new Error('RATE_LIMIT');
  }
  if (response.status >= 400) {
    throw new Error(`HTTP_${response.status}: ${text.substring(0, 200)}`);
  }
  return JSON.parse(text);
}

async function getAllRows() {
  const all = [];
  let offset = 0;
  while (true) {
    const data = await stackbyFetch(
      `/rowlist/${STACKBY_STACK_ID}/${CONTACTS_TABLE}?maxRecords=100&offset=${offset}`
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
  log('=== DEDUPLICANDO CONTACTOS ===\n');

  const rows = await getAllRows();
  log(`Total contactos: ${rows.length}`);

  // Agrupar por email
  const byEmail = new Map();
  const noEmail = [];

  for (const row of rows) {
    const email = (row.field.Email || '').toLowerCase().trim();
    if (!email) {
      noEmail.push(row);
      continue;
    }
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(row);
  }

  log(`Contactos con email: ${rows.length - noEmail.length}`);
  log(`Contactos sin email: ${noEmail.length}`);

  // Encontrar duplicados
  const toDelete = [];
  let duplicateGroups = 0;

  for (const [email, group] of byEmail) {
    if (group.length > 1) {
      duplicateGroups++;

      // Preferir el que tiene Company vinculada (no "Untitle")
      // Si ambos tienen Company, mantener el más reciente
      group.sort((a, b) => {
        const aHasCompany = a.field.Company && a.field.Company !== 'Untitle';
        const bHasCompany = b.field.Company && b.field.Company !== 'Untitle';
        if (aHasCompany && !bHasCompany) return -1;
        if (!aHasCompany && bHasCompany) return 1;
        return new Date(b.field.createdAt) - new Date(a.field.createdAt);
      });

      const keep = group[0];
      const remove = group.slice(1);

      if (duplicateGroups <= 5) {
        log(`  "${email}": ${group.length} copias → mantener ${keep.field.rowId} (Company: ${keep.field.Company || 'none'})`);
      }

      for (const r of remove) {
        toDelete.push(r.field.rowId);
      }
    }
  }

  // Dedup contactos sin email por Full Name
  const byName = new Map();
  for (const row of noEmail) {
    const name = (row.field['Full Name'] || '').toLowerCase().trim();
    if (!name) continue;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(row);
  }

  for (const [name, group] of byName) {
    if (group.length > 1) {
      duplicateGroups++;
      group.sort((a, b) => {
        const aHasCompany = a.field.Company && a.field.Company !== 'Untitle';
        const bHasCompany = b.field.Company && b.field.Company !== 'Untitle';
        if (aHasCompany && !bHasCompany) return -1;
        if (!aHasCompany && bHasCompany) return 1;
        return new Date(b.field.createdAt) - new Date(a.field.createdAt);
      });
      const remove = group.slice(1);
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

  // Borrar en batches de 10 (formato rowIds[]=id)
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += 10) {
    const batch = toDelete.slice(i, i + 10);
    const params = batch.map(id => `rowIds[]=${id}`).join('&');

    try {
      await stackbyFetch(
        `/rowdelete/${STACKBY_STACK_ID}/${CONTACTS_TABLE}?${params}`,
        { method: 'DELETE' }
      );
      deleted += batch.length;
      if ((deleted % 50 === 0) || i + batch.length >= toDelete.length) {
        log(`  Borrados ${deleted}/${toDelete.length}`);
      }
    } catch (err) {
      log(`  Error en batch ${Math.floor(i / 10) + 1}: ${err.message}`);
    }
    await sleep(3000);
  }

  // Verificar
  await sleep(2000);
  const remaining = await getAllRows();
  log(`\n=== RESULTADO ===`);
  log(`Contactos finales: ${remaining.length} (objetivo: 949)`);

  const withCompany = remaining.filter(r => r.field.Company && r.field.Company !== 'Untitle').length;
  log(`Con Company vinculada: ${withCompany}`);
}

main().catch(err => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});
