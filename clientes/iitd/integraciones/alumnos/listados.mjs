#!/usr/bin/env node

/**
 * Listados de alumnos por programa (N05)
 *
 * Consulta la tabla ALUMNOS de Stackby y genera listados
 * filtrados por programa, exportables a CSV.
 *
 * Usage:
 *   STACKBY_API_KEY=xxx node listados.mjs                           # Resumen por programa
 *   STACKBY_API_KEY=xxx node listados.mjs --programa DECA           # Listar alumnos DECA
 *   STACKBY_API_KEY=xxx node listados.mjs --programa DECA --csv     # Exportar CSV
 *   STACKBY_API_KEY=xxx node listados.mjs --all --csv               # Todos a CSV
 *   STACKBY_API_KEY=xxx node listados.mjs --estado activo           # Filtrar por estado
 */

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';

const PROGRAMA_FILTER = (() => {
  const idx = process.argv.indexOf('--programa');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const ESTADO_FILTER = (() => {
  const idx = process.argv.indexOf('--estado');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const CSV_MODE = process.argv.includes('--csv');
const ALL_MODE = process.argv.includes('--all');

if (!API_KEY) {
  console.error('Set STACKBY_API_KEY env var');
  process.exit(1);
}

async function getAllRows() {
  let allRecords = [];
  let offset = 0;
  const PAGE_SIZE = 100; // Stackby returns max 100 per page

  while (true) {
    const url = `${BASE_URL}/rowlist/${STACK_ID}/${TABLE_ID}` +
      (offset ? `?offset=${offset}` : '');

    const res = await fetch(url, {
      headers: { 'api-key': API_KEY },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);

    const data = JSON.parse(text);
    const records = Array.isArray(data) ? data : (data.records || []);
    allRecords = allRecords.concat(records);

    if (records.length < PAGE_SIZE) break;
    offset += records.length;
  }

  return allRecords;
}

function escapeCSV(val) {
  const s = String(val || '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

async function main() {
  const rows = await getAllRows();

  // Parse and filter
  let alumnos = rows.map(r => ({
    email: r.field?.Email || '',
    nombre: r.field?.Nombre || '',
    apellidos: r.field?.Apellidos || '',
    telefono: r.field?.Telefono || '',
    programa: r.field?.Programa || '',
    estado: r.field?.Estado || '',
    fechaEstado: r.field?.['Fecha estado'] || '',
    estadoPago: r.field?.['Estado pago'] || '',
    fuente: r.field?.Fuente || '',
    notas: r.field?.Notas || '',
  }));

  if (ESTADO_FILTER) {
    alumnos = alumnos.filter(a =>
      a.estado.toLowerCase().includes(ESTADO_FILTER.toLowerCase())
    );
  }

  if (PROGRAMA_FILTER) {
    alumnos = alumnos.filter(a =>
      a.programa.toLowerCase().includes(PROGRAMA_FILTER.toLowerCase())
    );
  }

  // Sort by apellidos
  alumnos.sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es'));

  if (!PROGRAMA_FILTER && !ALL_MODE) {
    // Summary mode: count by programa
    const byPrograma = {};
    for (const a of alumnos) {
      // Split multi-program entries
      const progs = a.programa.split(',').map(p => p.trim()).filter(Boolean);
      if (progs.length === 0) progs.push('(sin programa)');
      for (const p of progs) {
        byPrograma[p] = (byPrograma[p] || 0) + 1;
      }
    }

    console.log(`Total alumnos: ${alumnos.length}`);
    console.log();
    console.log('Alumnos por programa:');
    console.log('-'.repeat(80));

    const sorted = Object.entries(byPrograma).sort((a, b) => b[1] - a[1]);
    for (const [prog, count] of sorted) {
      console.log(`  ${count.toString().padStart(5)}  ${prog}`);
    }

    console.log('-'.repeat(80));
    console.log();
    console.log('Para ver detalle: node listados.mjs --programa "DECA"');
    console.log('Para exportar:    node listados.mjs --programa "DECA" --csv > deca.csv');
    console.log('Para todo:        node listados.mjs --all --csv > todos.csv');
    return;
  }

  // Detail/CSV mode
  if (CSV_MODE) {
    const headers = ['Apellidos', 'Nombre', 'Email', 'Teléfono', 'Programa', 'Estado', 'Estado pago', 'Fecha estado'];
    console.log(headers.join(','));
    for (const a of alumnos) {
      console.log([
        escapeCSV(a.apellidos),
        escapeCSV(a.nombre),
        escapeCSV(a.email),
        escapeCSV(a.telefono),
        escapeCSV(a.programa),
        escapeCSV(a.estado),
        escapeCSV(a.estadoPago),
        escapeCSV(a.fechaEstado),
      ].join(','));
    }
  } else {
    const label = PROGRAMA_FILTER ? `Programa: ${PROGRAMA_FILTER}` : 'Todos los alumnos';
    console.log(`${label} (${alumnos.length} registros)`);
    console.log('='.repeat(80));

    for (const a of alumnos) {
      console.log(`  ${a.apellidos}, ${a.nombre}`);
      console.log(`    Email: ${a.email} | Tel: ${a.telefono}`);
      console.log(`    Programa: ${a.programa}`);
      console.log(`    Estado: ${a.estado} | Pago: ${a.estadoPago}`);
      console.log();
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
