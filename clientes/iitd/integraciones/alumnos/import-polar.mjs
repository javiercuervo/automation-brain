#!/usr/bin/env node

/**
 * Import PolarDoc → Stackby ALUMNOS (N07)
 *
 * Lee el xlsx de PolarDoc, filtra activos recientes, dedup por email
 * y sube a la tabla ALUMNOS de Stackby.
 *
 * El xlsx completo queda en Google Sheets como archivo consultable.
 * Solo los alumnos operativos (activos + matrícula reciente) van a Stackby.
 *
 * Usage:
 *   STACKBY_API_KEY=xxx node import-polar.mjs --dry-run                    # Preview
 *   STACKBY_API_KEY=xxx node import-polar.mjs --cutoff-year 2020           # Solo desde 2020
 *   STACKBY_API_KEY=xxx node import-polar.mjs --cutoff-year 2020 --run     # Ejecutar
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';

// Lazy import xlsx (install with: npm i xlsx)
let XLSX;
try {
  const mod = await import('xlsx');
  XLSX = mod.default || mod;
} catch {
  console.error('Instala xlsx: npm install xlsx');
  process.exit(1);
}

// =====================================================
// CONFIG
// =====================================================

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';

const DRY_RUN = !process.argv.includes('--run');
const CUTOFF_YEAR = (() => {
  const idx = process.argv.indexOf('--cutoff-year');
  return idx !== -1 ? parseInt(process.argv[idx + 1]) : 2020;
})();

const XLSX_PATH = process.argv.find(a => a.endsWith('.xlsx')) ||
  resolve(new URL('../../datos', import.meta.url).pathname, 'Base datos Polar España_Version3.xlsx');

const POLAR_LAST_ID = 110000;

if (!API_KEY && !DRY_RUN) {
  console.error('Set STACKBY_API_KEY env var (or use --dry-run)');
  process.exit(1);
}

// =====================================================
// STACKBY API
// =====================================================

async function stackbyFetch(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json', ...options.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function getExistingEmails() {
  const result = await stackbyFetch(`/rowlist/${STACK_ID}/${TABLE_ID}?maxRecords=5000`);
  const map = new Map();
  for (const row of (result.records || [])) {
    const email = (row.field?.Email || '').toLowerCase().trim();
    if (email) map.set(email, row);
  }
  return map;
}

async function createRows(records) {
  // Stackby API accepts max 10 records per request
  const BATCH = 10;
  let created = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
      method: 'POST',
      body: JSON.stringify({ records: batch.map(r => ({ field: r })) }),
    });
    created += batch.length;
    process.stdout.write(`\r  Creados: ${created}/${records.length}`);
    await sleep(300);
  }
  console.log();
  return created;
}

async function updateRows(records) {
  const BATCH = 10;
  let updated = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    await stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
      method: 'PATCH',
      body: JSON.stringify({ records: batch.map(r => ({ id: r._rowId, field: r.fields })) }),
    });
    updated += batch.length;
    process.stdout.write(`\r  Actualizados: ${updated}/${records.length}`);
    await sleep(300);
  }
  console.log();
  return updated;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// =====================================================
// PARSE XLSX
// =====================================================

function excelSerialToDate(serial) {
  // Excel serial date → JS Date
  // Excel epoch: 1900-01-01 (with the 1900 leap year bug)
  const epoch = new Date(1899, 11, 30); // Dec 30, 1899
  return new Date(epoch.getTime() + serial * 86400000);
}

function parseDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  if (typeof val === 'number' && val > 1000) {
    const d = excelSerialToDate(val);
    return d.toISOString().split('T')[0];
  }
  return String(val).split(' ')[0];
}

function getYear(val) {
  if (!val) return null;
  if (typeof val === 'number' && val > 1000) {
    return excelSerialToDate(val).getFullYear();
  }
  const s = String(val);
  const m = s.match(/(\d{4})/);
  return m ? parseInt(m[1]) : null;
}

function normalizeEmail(email) {
  if (!email) return null;
  return String(email).toLowerCase().trim().replace(/\s+/g, '');
}

function formatId(num) {
  return `IITD-${String(num).padStart(6, '0')}`;
}

function readXlsx(path) {
  console.log(`Leyendo: ${path}`);
  const workbook = XLSX.readFile(path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  console.log(`  Filas totales: ${rows.length}`);
  return rows;
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Import PolarDoc → Stackby ALUMNOS`);
  console.log(`  Corte: última matrícula >= ${CUTOFF_YEAR}`);
  console.log(`  Stack: ${STACK_ID} / Tabla: ${TABLE_ID}`);
  console.log();

  // 1. Read xlsx
  const rawRows = readXlsx(XLSX_PATH);

  // 2. Filter: active + recent
  const filtered = rawRows.filter(row => {
    const baja = String(row['DEBAJA'] || '').trim().toUpperCase();
    if (baja !== 'N') return false;

    const year = getYear(row['Fecha última Matricula'] || row['Fecha ultima Matricula']);
    if (!year || year < CUTOFF_YEAR) return false;

    return true;
  });
  console.log(`  Activos desde ${CUTOFF_YEAR}: ${filtered.length} filas`);

  // 3. Dedup by email — keep the row with most recent matrícula
  const byEmail = new Map();
  for (const row of filtered) {
    const email = normalizeEmail(row['EMAIL']);
    if (!email) continue;

    const year = getYear(row['Fecha última Matricula'] || row['Fecha ultima Matricula']) || 0;
    const existing = byEmail.get(email);

    if (!existing || year > (existing._year || 0)) {
      row._year = year;
      // Collect all study programs for this email
      row._estudios = existing?._estudios || [];
      const estudio = String(row['NOMBREESTUDIO'] || '').trim();
      if (estudio && !row._estudios.includes(estudio)) {
        row._estudios.push(estudio);
      }
      byEmail.set(email, row);
    } else {
      // Add study program to existing
      const estudio = String(row['NOMBREESTUDIO'] || '').trim();
      if (estudio && !existing._estudios.includes(estudio)) {
        existing._estudios.push(estudio);
      }
    }
  }
  console.log(`  Emails únicos: ${byEmail.size}`);

  // 4. Map to Stackby fields
  const alumnos = [];
  let nextId = POLAR_LAST_ID + 1;

  for (const [email, row] of byEmail) {
    const numexp = String(row['NUMEXP'] || '').trim();
    const numexpNum = parseInt(numexp) || 0;

    // Use PolarDoc expedition number if it exists, otherwise assign new
    let idAlumno;
    if (numexpNum > 0) {
      idAlumno = formatId(numexpNum);
    } else {
      idAlumno = formatId(nextId++);
    }

    const apellidos = String(row['APELLI'] || '').trim();
    const nombre = String(row['NOMBRE'] || '').trim();
    const fechaPrimera = parseDate(row['Fecha 1ª Matricula'] || row['Fecha 1a Matricula']);
    const fechaUltima = parseDate(row['Fecha última Matricula'] || row['Fecha ultima Matricula']);

    alumnos.push({
      'ID_ALUMNO': idAlumno,
      'Email': email,
      'Nombre': nombre,
      'Apellidos': apellidos,
      'Telefono': String(row['TELEF1'] || '').trim(),
      'DNI': '', // PolarDoc no exporta DNI en este fichero
      'Programa': row._estudios.join(', '),
      'Estado': 'activo',
      'Fecha estado': fechaUltima || '',
      'Docs estado': 'verificado', // asumimos completo si vienen de PolarDoc
      'Estado pago': 'pagado',     // asumimos pagado si están activos
      'Fuente': 'polar',
      'Notas': [
        `Importado de PolarDoc (exp. ${numexp})`,
        `Centro: ${String(row['CENTRO'] || '').trim()}`,
        `1ª matrícula: ${fechaPrimera || '?'}`,
        `Título civil: ${String(row['Titulo Civil'] || row['Titulo civil'] || '').trim()}`,
      ].join('\n'),
    });
  }

  // Sort by expedition number
  alumnos.sort((a, b) => a.ID_ALUMNO.localeCompare(b.ID_ALUMNO));

  console.log(`  Alumnos a importar: ${alumnos.length}`);
  console.log();

  // 5. Preview
  console.log('Muestra (primeros 10):');
  for (const a of alumnos.slice(0, 10)) {
    console.log(`  ${a.ID_ALUMNO} | ${a.Nombre} ${a.Apellidos} | ${a.Email} | ${a.Programa.substring(0, 40)}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log('========================================');
    console.log('[DRY RUN] No se ejecutaron cambios.');
    console.log(`Para ejecutar: STACKBY_API_KEY=xxx node import-polar.mjs --cutoff-year ${CUTOFF_YEAR} --run`);
    console.log('========================================');
    return;
  }

  // 6. Get existing records from Stackby
  console.log('Consultando registros existentes en Stackby...');
  const existingMap = await getExistingEmails();
  console.log(`  Registros existentes: ${existingMap.size}`);

  // 7. Split into creates and updates
  const toCreate = [];
  const toUpdate = [];

  for (const alumno of alumnos) {
    const existing = existingMap.get(alumno.Email);
    if (existing) {
      // Update: don't overwrite fields that may have been manually changed
      toUpdate.push({
        _rowId: existing.id,
        fields: {
          'ID_ALUMNO': alumno.ID_ALUMNO,
          'Nombre': alumno.Nombre,
          'Apellidos': alumno.Apellidos,
          'Telefono': alumno.Telefono,
          'Programa': alumno.Programa,
          'Fuente': alumno.Fuente,
          // Don't overwrite Estado, Docs estado, Estado pago — may have been updated
        },
      });
    } else {
      toCreate.push(alumno);
    }
  }

  console.log(`  A crear: ${toCreate.length}`);
  console.log(`  A actualizar: ${toUpdate.length}`);
  console.log();

  // 8. Execute
  if (toCreate.length > 0) {
    console.log('Creando registros...');
    await createRows(toCreate);
  }

  if (toUpdate.length > 0) {
    console.log('Actualizando registros...');
    await updateRows(toUpdate);
  }

  console.log();
  console.log('========================================');
  console.log('Importación completada.');
  console.log(`  Creados: ${toCreate.length}`);
  console.log(`  Actualizados: ${toUpdate.length}`);
  console.log(`  Total en Stackby: ~${existingMap.size + toCreate.length}`);
  console.log('========================================');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
