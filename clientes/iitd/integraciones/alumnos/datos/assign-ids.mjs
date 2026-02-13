#!/usr/bin/env node

/**
 * Assign Student IDs (N04 + N20)
 *
 * Assigns IITD-NNNN expedition numbers to all ALUMNOS records
 * that don't have one yet. Continues the PolarDoc sequence.
 *
 * Usage:
 *   STACKBY_API_KEY=xxx node assign-ids.mjs --dry-run            # Preview
 *   STACKBY_API_KEY=xxx node assign-ids.mjs --start-from 1234    # Continue from PolarDoc nº 1234
 *   STACKBY_API_KEY=xxx node assign-ids.mjs                      # Run (auto-detect last ID)
 */

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';

const PREFIX = 'IITD';
const DRY_RUN = process.argv.includes('--dry-run');

// Parse --start-from flag
const startFromIdx = process.argv.indexOf('--start-from');
const EXPLICIT_START = startFromIdx !== -1 ? parseInt(process.argv[startFromIdx + 1]) : null;

if (!API_KEY) {
  console.error('Set STACKBY_API_KEY env var');
  process.exit(1);
}

async function stackbyFetch(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json', ...options.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function getAllRows() {
  const result = await stackbyFetch(`/rowlist/${STACK_ID}/${TABLE_ID}?maxRecords=5000`);
  return result.records || [];
}

async function updateRow(rowId, fields) {
  return stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: rowId, field: fields }] }),
  });
}

/**
 * Format ID with zero-padding: IITD-0001
 */
// Último nº expediente PolarDoc
const POLAR_LAST_ID = 110000;

function formatId(num) {
  return `${PREFIX}-${String(num).padStart(6, '0')}`;
}

/**
 * Extract the numeric part from an ID like "IITD-0042" → 42
 */
function parseIdNumber(id) {
  if (!id) return null;
  const match = String(id).match(/(\d+)$/);
  return match ? parseInt(match[1]) : null;
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Assign Student IDs — ${STACK_ID}/${TABLE_ID}\n`);

  const rows = await getAllRows();
  console.log(`Total registros: ${rows.length}`);

  // Find existing IDs to determine the highest number
  let maxId = 0;
  const withId = [];
  const withoutId = [];

  for (const row of rows) {
    const existingId = row.field?.ID_ALUMNO || row.field?.['Nº Expediente'] || null;
    const num = parseIdNumber(existingId);

    if (num !== null) {
      maxId = Math.max(maxId, num);
      withId.push({ row, id: existingId, num });
    } else {
      withoutId.push(row);
    }
  }

  console.log(`  Con ID: ${withId.length}`);
  console.log(`  Sin ID: ${withoutId.length}`);
  console.log(`  Mayor ID encontrado: ${maxId > 0 ? formatId(maxId) : '(ninguno)'}`);

  // Determine starting number
  let nextNum;
  if (EXPLICIT_START !== null) {
    nextNum = EXPLICIT_START + 1;
    console.log(`  Continuando desde: ${EXPLICIT_START} (flag --start-from)`);
  } else {
    // Use max of: found IDs, PolarDoc last ID
    const base = Math.max(maxId, POLAR_LAST_ID);
    nextNum = base + 1;
    console.log(`  Base PolarDoc: ${POLAR_LAST_ID}`);
    console.log(`  Siguiente ID: ${formatId(nextNum)}`);
  }

  if (withoutId.length === 0) {
    console.log('\nTodos los registros ya tienen ID.');
    return;
  }

  // Sort records without ID by email (deterministic order)
  withoutId.sort((a, b) => {
    const emailA = (a.field?.Email || '').toLowerCase();
    const emailB = (b.field?.Email || '').toLowerCase();
    return emailA.localeCompare(emailB);
  });

  console.log(`\nAsignando IDs ${formatId(nextNum)} — ${formatId(nextNum + withoutId.length - 1)}:\n`);

  let assigned = 0;
  for (const row of withoutId) {
    const newId = formatId(nextNum);
    const email = row.field?.Email || '(sin email)';
    const nombre = ((row.field?.Nombre || '') + ' ' + (row.field?.Apellidos || '')).trim() || '(sin nombre)';

    console.log(`  ${newId} → ${nombre} <${email}>`);

    if (!DRY_RUN) {
      await updateRow(row.id, { ID_ALUMNO: newId });
      await new Promise(r => setTimeout(r, 200)); // rate limit
    }

    nextNum++;
    assigned++;
  }

  console.log(`\n========================================`);
  console.log(`Resumen${DRY_RUN ? ' (DRY RUN — no se ejecutaron cambios)' : ''}:`);
  console.log(`  IDs asignados: ${assigned}`);
  console.log(`  Rango: ${formatId(nextNum - assigned)} — ${formatId(nextNum - 1)}`);
  console.log(`  Siguiente ID disponible: ${formatId(nextNum)}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
