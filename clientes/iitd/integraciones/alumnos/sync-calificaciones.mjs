#!/usr/bin/env node

/**
 * Sincronización de Calificaciones (N06)
 *
 * Google Sheet ↔ Stackby CALIFICACIONES
 *
 * Usage:
 *   node sync-calificaciones.mjs                              # Sheet → Stackby
 *   node sync-calificaciones.mjs --dry-run                    # Preview sin escribir
 *   node sync-calificaciones.mjs --init-sheet                 # Crear Sheet con filas pre-pobladas
 *   node sync-calificaciones.mjs --init-sheet --programa DECA # Solo alumnos DECA
 *   node sync-calificaciones.mjs --reverse                    # Stackby → Sheet
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '.env'))) {
  for (const line of readFileSync(resolve(__dirname, '.env'), 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import {
  PLAN_ESTUDIOS,
  listarCalificaciones,
  upsertCalificacion,
} from './calificaciones-client.mjs';
import { getSheetsClient, getDriveClient } from './google-auth.mjs';

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const ALUMNOS_TABLE = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';

let CALIFICACIONES_SHEET_ID = process.env.CALIFICACIONES_SHEET_ID;
const FORMACION_FOLDER_ID = process.env.IITD_FORMACION_FOLDER_ID;

const DRY_RUN = process.argv.includes('--dry-run');
const INIT_SHEET = process.argv.includes('--init-sheet');
const REVERSE = process.argv.includes('--reverse');
const PROG_FILTER = (() => {
  const idx = process.argv.indexOf('--programa');
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

if (!API_KEY) { console.error('Set STACKBY_API_KEY env var'); process.exit(1); }

// =====================================================
// SHEET HEADERS
// =====================================================

const HEADERS = [
  'Email alumno',
  'Nombre',
  'Apellidos',
  'Programa',
  'Asignatura',
  'Nota evaluación',
  'Nota examen',
  'Calificación final',
  'Profesor',
  'Convalidada',
];

// =====================================================
// STACKBY — ALUMNOS
// =====================================================

async function fetchAllAlumnos() {
  let all = [], offset = 0;
  while (true) {
    const url = `${BASE_URL}/rowlist/${STACK_ID}/${ALUMNOS_TABLE}` +
      (offset ? `?offset=${offset}` : '');
    const res = await fetch(url, { headers: { 'api-key': API_KEY } });
    const text = await res.text();
    if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);
    const data = JSON.parse(text);
    const records = Array.isArray(data) ? data : (data.records || []);
    all = all.concat(records);
    if (records.length < 100) break;
    offset += records.length;
  }
  return all;
}

// =====================================================
// INIT SHEET — crear Sheet con filas pre-pobladas
// =====================================================

async function initSheet() {
  console.error('Leyendo alumnos de Stackby...');
  const rows = await fetchAllAlumnos();
  console.error(`  ${rows.length} registros leídos`);

  // Filter by programa if requested
  let alumnos = rows
    .map(r => ({
      email: (r.field?.Email || '').trim(),
      nombre: (r.field?.Nombre || '').trim(),
      apellidos: (r.field?.Apellidos || '').trim(),
      programa: (r.field?.Programa || '').trim(),
      estado: (r.field?.Estado || '').trim(),
    }))
    .filter(a => a.email && a.estado !== 'baja');

  if (PROG_FILTER) {
    const filter = PROG_FILTER.toLowerCase();
    alumnos = alumnos.filter(a => a.programa.toLowerCase().includes(filter));
    console.error(`  ${alumnos.length} alumnos filtrados por "${PROG_FILTER}"`);
  }

  // Determine which modules to pre-fill per student
  const sheetRows = [HEADERS];
  let count = 0;

  for (const a of alumnos) {
    const modulos = getModulosForPrograma(a.programa);
    for (const mod of modulos) {
      sheetRows.push([
        a.email,
        a.nombre,
        a.apellidos,
        a.programa,
        mod,
        '', // Nota evaluación
        '', // Nota examen
        '', // Calificación final
        '', // Profesor
        '', // Convalidada
      ]);
      count++;
    }
  }

  console.error(`  ${count} filas generadas (${alumnos.length} alumnos × módulos)`);

  if (DRY_RUN) {
    console.log('DRY RUN — primeras 20 filas:');
    for (const row of sheetRows.slice(0, 21)) {
      console.log('  ' + row.join(' | '));
    }
    return;
  }

  // Create or reuse Sheet
  const sheets = await getSheetsClient();
  const sheetId = await ensureCalificacionesSheet(sheets);

  // Write data
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: "'Calificaciones'!A:Z",
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "'Calificaciones'!A1",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: sheetRows },
  });

  console.log(`✓ Sheet "Calificaciones IITD" inicializado con ${count} filas`);
  console.log(`  URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
}

function getModulosForPrograma(programa) {
  const lower = programa.toLowerCase();
  if (lower.includes('deca')) {
    // Default to Infantil y Primaria if no variant specified
    if (lower.includes('eso') || lower.includes('bachillerato') || lower.includes('secundaria')) {
      return PLAN_ESTUDIOS['DECA ESO y Bachillerato'];
    }
    return PLAN_ESTUDIOS['DECA Infantil y Primaria'];
  }
  // Non-DECA programs: just one generic row
  return [programa || '(sin asignatura)'];
}

// =====================================================
// SHEET → STACKBY SYNC
// =====================================================

async function syncToStackby() {
  const sheets = await getSheetsClient();
  const sheetId = await ensureCalificacionesSheet(sheets);

  console.error('Leyendo Sheet de calificaciones...');
  const data = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'Calificaciones'!A:J",
  });

  const rows = data.data.values || [];
  if (rows.length <= 1) {
    console.log('Sheet vacío o solo cabecera. Usa --init-sheet primero.');
    return;
  }

  const headers = rows[0];
  const emailIdx = headers.indexOf('Email alumno');
  const asigIdx = headers.indexOf('Asignatura');
  const progIdx = headers.indexOf('Programa');
  const noteIdx = headers.indexOf('Nota evaluación');
  const examIdx = headers.indexOf('Nota examen');
  const califIdx = headers.indexOf('Calificación final');
  const profIdx = headers.indexOf('Profesor');
  const convIdx = headers.indexOf('Convalidada');

  let synced = 0, skipped = 0, errors = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const email = (row[emailIdx] || '').trim();
    const asignatura = (row[asigIdx] || '').trim();

    if (!email || !asignatura) { skipped++; continue; }

    // Only sync rows that have at least one grade field filled
    const nota = (row[noteIdx] || '').trim();
    const examen = (row[examIdx] || '').trim();
    const calif = (row[califIdx] || '').trim();
    const conv = (row[convIdx] || '').trim();

    if (!nota && !examen && !calif && !conv) { skipped++; continue; }

    const fields = {
      programa: (row[progIdx] || '').trim(),
      curso: '2025/26',
    };
    if (nota) fields.notaEvaluacion = nota;
    if (examen) fields.notaExamen = examen;
    if (calif) fields.calificacion = calif;
    if ((row[profIdx] || '').trim()) fields.profesor = row[profIdx].trim();
    if (conv) fields.convalidada = conv.toLowerCase() === 'sí' || conv.toLowerCase() === 'si' || conv === 'true';

    if (DRY_RUN) {
      console.log(`  [DRY] ${email} | ${asignatura} → ${calif || nota || '(parcial)'}`);
      synced++;
      continue;
    }

    try {
      const result = await upsertCalificacion(email, asignatura, fields);
      console.log(`  ${result.action}: ${email} | ${asignatura}`);
      synced++;
    } catch (err) {
      console.error(`  ✗ Error ${email} | ${asignatura}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n${DRY_RUN ? 'DRY RUN — ' : ''}Sync: ${synced} sincronizadas, ${skipped} sin nota, ${errors} errores`);
}

// =====================================================
// STACKBY → SHEET SYNC (reverse)
// =====================================================

async function syncToSheet() {
  console.error('Leyendo calificaciones de Stackby...');
  const califs = await listarCalificaciones();
  console.error(`  ${califs.length} calificaciones leídas`);

  if (califs.length === 0) {
    console.log('No hay calificaciones en Stackby.');
    return;
  }

  // Get alumno names for display
  console.error('Leyendo alumnos para nombres...');
  const alumnosRaw = await fetchAllAlumnos();
  const nameMap = {};
  for (const r of alumnosRaw) {
    const email = (r.field?.Email || '').toLowerCase().trim();
    if (email) nameMap[email] = { nombre: r.field?.Nombre || '', apellidos: r.field?.Apellidos || '' };
  }

  const sheetRows = [HEADERS];
  for (const c of califs) {
    const names = nameMap[c.email.toLowerCase()] || { nombre: '', apellidos: '' };
    sheetRows.push([
      c.email,
      names.nombre,
      names.apellidos,
      c.programa,
      c.asignatura,
      c.notaEvaluacion,
      c.notaExamen,
      c.calificacion,
      c.profesor,
      c.convalidada ? 'Sí' : '',
    ]);
  }

  if (DRY_RUN) {
    console.log(`DRY RUN — ${sheetRows.length - 1} filas:`);
    for (const row of sheetRows.slice(0, 21)) {
      console.log('  ' + row.join(' | '));
    }
    return;
  }

  const sheets = await getSheetsClient();
  const sheetId = await ensureCalificacionesSheet(sheets);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: "'Calificaciones'!A:Z",
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "'Calificaciones'!A1",
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: sheetRows },
  });

  console.log(`✓ Sheet actualizado con ${sheetRows.length - 1} calificaciones desde Stackby`);
}

// =====================================================
// ENSURE SHEET EXISTS
// =====================================================

async function ensureCalificacionesSheet(sheets) {
  // If we have a Sheet ID, verify it
  if (CALIFICACIONES_SHEET_ID) {
    try {
      await sheets.spreadsheets.get({ spreadsheetId: CALIFICACIONES_SHEET_ID, fields: 'properties.title' });
      return CALIFICACIONES_SHEET_ID;
    } catch {
      console.error('⚠ CALIFICACIONES_SHEET_ID inválido, creando nuevo...');
    }
  }

  // Create new Sheet via Drive API
  const drive = await getDriveClient();
  const fileRes = await drive.files.create({
    requestBody: {
      name: 'Calificaciones IITD',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      parents: FORMACION_FOLDER_ID ? [FORMACION_FOLDER_ID] : [],
    },
    fields: 'id',
  });

  CALIFICACIONES_SHEET_ID = fileRes.data.id;
  console.error(`✓ Sheet creado: ${CALIFICACIONES_SHEET_ID}`);
  console.error(`  Añade a .env: CALIFICACIONES_SHEET_ID=${CALIFICACIONES_SHEET_ID}`);

  // Rename default tab to "Calificaciones"
  const meta = await sheets.spreadsheets.get({ spreadsheetId: CALIFICACIONES_SHEET_ID });
  const defaultSheetId = meta.data.sheets[0].properties.sheetId;
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: CALIFICACIONES_SHEET_ID,
    requestBody: {
      requests: [{
        updateSheetProperties: {
          properties: { sheetId: defaultSheetId, title: 'Calificaciones' },
          fields: 'title',
        },
      }],
    },
  });

  return CALIFICACIONES_SHEET_ID;
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  if (INIT_SHEET) {
    await initSheet();
  } else if (REVERSE) {
    await syncToSheet();
  } else {
    await syncToStackby();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
