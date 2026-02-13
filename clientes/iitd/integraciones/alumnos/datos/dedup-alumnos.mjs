#!/usr/bin/env node

/**
 * Dedup Alumnos (N20)
 *
 * Detecta y merge registros duplicados en la tabla ALUMNOS de Stackby.
 * Agrupa por email normalizado. El registro más reciente gana para
 * campos no vacíos; se conserva la fecha de creación más antigua.
 *
 * Usage:
 *   STACKBY_API_KEY=xxx node dedup-alumnos.mjs --dry-run
 *   STACKBY_API_KEY=xxx node dedup-alumnos.mjs
 */

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';

const DRY_RUN = process.argv.includes('--dry-run');

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

async function deleteRow(rowId) {
  return stackbyFetch(`/rowdelete/${STACK_ID}/${TABLE_ID}`, {
    method: 'DELETE',
    body: JSON.stringify({ records: [rowId] }),
  });
}

async function updateRow(rowId, fields) {
  return stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: rowId, field: fields }] }),
  });
}

function normalizeEmail(email) {
  return (email || '').toLowerCase().trim();
}

function pickBest(a, b) {
  // Return whichever is non-empty; prefer b (more recent) if both have values
  if (b !== null && b !== undefined && b !== '') return b;
  if (a !== null && a !== undefined && a !== '') return a;
  return '';
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Dedup Alumnos — ${STACK_ID}/${TABLE_ID}\n`);

  const rows = await getAllRows();
  console.log(`Total registros: ${rows.length}\n`);

  // Group by normalized email
  const groups = new Map();
  for (const row of rows) {
    const email = normalizeEmail(row.field?.Email || row.field?.email);
    if (!email) {
      console.log(`  ⚠ Registro sin email: ${row.id} (${row.field?.Nombre || 'sin nombre'})`);
      continue;
    }
    if (!groups.has(email)) groups.set(email, []);
    groups.get(email).push(row);
  }

  const duplicates = [...groups.entries()].filter(([, recs]) => recs.length > 1);

  if (duplicates.length === 0) {
    console.log('No se encontraron duplicados.');
    return;
  }

  console.log(`Duplicados encontrados: ${duplicates.length} emails con registros múltiples\n`);

  let mergedCount = 0;
  let deletedCount = 0;

  for (const [email, recs] of duplicates) {
    console.log(`\n--- ${email} (${recs.length} registros) ---`);

    // Sort by creation date or ID (older first)
    recs.sort((a, b) => {
      const dateA = a.field?.['Fecha estado'] || '';
      const dateB = b.field?.['Fecha estado'] || '';
      return dateA.localeCompare(dateB);
    });

    // Keep the first record (oldest), merge data from others
    const keeper = recs[0];
    const toDelete = recs.slice(1);

    console.log(`  Conservar: ${keeper.id}`);

    // Merge fields from all duplicates into keeper
    const mergedFields = { ...keeper.field };
    const fieldsToMerge = [
      'Nombre', 'Apellidos', 'Telefono', 'DNI', 'Programa',
      'Estado', 'Docs estado', 'Estado pago', 'OCH Student ID',
      'Ultimo acceso', 'Progreso', 'Fuente', 'Notas', 'Fecha pago',
      'ID_ALUMNO'
    ];

    for (const dup of toDelete) {
      for (const field of fieldsToMerge) {
        mergedFields[field] = pickBest(mergedFields[field], dup.field?.[field]);
      }
      console.log(`  Eliminar:  ${dup.id}`);
    }

    if (!DRY_RUN) {
      // Update keeper with merged data
      await updateRow(keeper.id, mergedFields);
      mergedCount++;

      // Delete duplicates
      for (const dup of toDelete) {
        await deleteRow(dup.id);
        deletedCount++;
        await new Promise(r => setTimeout(r, 200)); // rate limit
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Resumen${DRY_RUN ? ' (DRY RUN — no se ejecutaron cambios)' : ''}:`);
  console.log(`  Registros merge: ${mergedCount}`);
  console.log(`  Registros eliminados: ${deletedCount}`);
  console.log(`  Emails con duplicados: ${duplicates.length}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
