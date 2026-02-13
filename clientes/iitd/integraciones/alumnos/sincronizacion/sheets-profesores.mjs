#!/usr/bin/env node

/**
 * Sheets por Profesor — IITD
 *
 * Crea un Google Sheet por profesor con solo sus alumnos y asignaturas.
 * Soporta sync bidireccional con Stackby CALIFICACIONES.
 *
 * Usage:
 *   node sheets-profesores.mjs --init                          # Crea Sheets + comparte
 *   node sheets-profesores.mjs --init --profesor javier-sanchez # Solo uno
 *   node sheets-profesores.mjs --sync                          # Sheets → Stackby
 *   node sheets-profesores.mjs --sync --dry-run                # Preview
 *   node sheets-profesores.mjs --refresh                       # Stackby → Sheets
 *   node sheets-profesores.mjs --refresh --dry-run             # Preview
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '../.env'))) {
  for (const line of readFileSync(resolve(__dirname, '../.env'), 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

import {
  PLAN_ESTUDIOS,
  listarCalificaciones,
  findByAsignatura,
  updateCalificacion,
  createCalificacion,
} from '../compartido/calificaciones-client.mjs';
import { getSheetsClient, getDriveClient } from '../compartido/google-auth.mjs';

// Pre-created sheet IDs (created via Apps Script as administracion@institutoteologia.org,
// shared with SA as editor)
const SHEET_IDS = {
  'avelino-revilla': '19iNZX1iynhYBe8dyg_Hms0c-N4oz_cTqMknCFTiCEwc',
  'javier-sanchez': '1rXbSOxqbbtNftrllnuzJcQnHGlU3RRjgHTk0ViiTqQs',
  'antonio-salas': '1wytYZqMDvE4t3a4HNqvDCwNoGezmsQzUWLPebu7u3bk',
};

// Map short tab names → full Stackby programa values
const PROGRAMA_MAP = {
  'DECA': 'DECLARACIÓN ECLESIÁSTICA COMPETENCIA ACADEMICA (DECA)',
  'Formación Sistemática': 'FORMACIÓN SISTEMÁTICA',
};

// =====================================================
// CONFIG
// =====================================================

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const ALUMNOS_TABLE = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';
const FORMACION_FOLDER_ID = process.env.IITD_FORMACION_FOLDER_ID;

const STATE_PATH = resolve(__dirname, 'sheets-profesores-state.json');

const DRY_RUN = process.argv.includes('--dry-run');
const INIT = process.argv.includes('--init');
const SYNC = process.argv.includes('--sync');
const REFRESH = process.argv.includes('--refresh');
const SHARE = process.argv.includes('--share');
const PROF_FILTER = (() => {
  const idx = process.argv.indexOf('--profesor');
  return idx >= 0 ? process.argv[idx + 1] : null;
})();

// =====================================================
// PROFESORES — mapeo módulos CEE → asignaturas IITD
// =====================================================

const PROFESORES = {
  'avelino-revilla': {
    nombre: 'Avelino Revilla',
    email: 'avelino.revilla@institutoteologia.org',
    asignaturas: [
      'Teología Fundamental',
      'Sagrada Escritura: Antiguo Testamento',
      'Sagrada Escritura: Nuevo Testamento',
    ],
    programas: ['DECA'],
  },
  'javier-sanchez': {
    nombre: 'Javier Sánchez',
    email: 'javier.sanchez@institutoteologia.org',
    asignaturas: [
      'Cristología y Pneumatología',
      'Eclesiología y Mariología',
      'Moral Fundamental y Bioética',
      'Moral Social y Doctrina Social de la Iglesia',
      'Liturgia y Sacramentos',
    ],
    programas: ['DECA', 'Formación Sistemática'],
  },
  'antonio-salas': {
    nombre: 'Antonio Salas',
    email: 'antonio.salas@institutoteologia.org',
    asignaturas: [
      'Pedagogía y Didáctica de la Religión (Infantil y Primaria)',
      'Pedagogía y Didáctica de la Religión (ESO y Bachillerato)',
    ],
    programas: ['DECA'],
  },
};

const HEADERS = [
  'Email alumno',
  'Nombre',
  'Apellidos',
  'Asignatura',
  'Nota evaluación',
  'Nota examen',
  'Calificación final',
  'Convalidada',
];

// =====================================================
// STATE MANAGEMENT
// =====================================================

function loadState() {
  if (existsSync(STATE_PATH)) {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8'));
  }
  return { sheets: {} };
}

function saveState(state) {
  state.lastRun = new Date().toISOString();
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

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
// HELPERS
// =====================================================

/** Return the asignaturas for a professor in a given programa */
function getAsignaturasForPrograma(prof, programa) {
  // DECA: Stackby doesn't distinguish Infantil vs ESO — return all professor asignaturas
  if (programa === 'DECA') return prof.asignaturas;
  // Non-DECA: single row with program name as asignatura
  return [programa];
}

/**
 * Match alumno.Programa field (can be comma-separated) against target.
 * Stackby values: "DECLARACIÓN ECLESIÁSTICA COMPETENCIA ACADEMICA (DECA)",
 *   "FORMACIÓN SISTEMÁTICA", "FORMACIÓN BÍBLICA", "ESCUELA DE EVANGELIZADORES", etc.
 */
function alumnoMatchesPrograma(alumnoPrograma, targetPrograma) {
  const parts = alumnoPrograma.split(',').map(p => p.trim().toLowerCase());
  const target = targetPrograma.toLowerCase();
  return parts.some(p => {
    if (target === 'deca') return p.includes('deca');
    if (target.includes('formación sistemática')) return p.includes('formación sistemática') || p.includes('formacion sistematica');
    if (target.includes('formación bíblica')) return p.includes('formación bíblica') || p.includes('formacion biblica');
    return p.includes(target);
  });
}

// =====================================================
// --init: CREAR SHEETS POR PROFESOR
// =====================================================

async function init() {
  if (!API_KEY) { console.error('Set STACKBY_API_KEY'); process.exit(1); }

  console.log('Leyendo alumnos de Stackby...');
  const rawAlumnos = await fetchAllAlumnos();
  const alumnos = rawAlumnos
    .map(r => ({
      email: (r.field?.Email || '').trim(),
      nombre: (r.field?.Nombre || '').trim(),
      apellidos: (r.field?.Apellidos || '').trim(),
      programa: (r.field?.Programa || '').trim(),
      estado: (r.field?.Estado || '').trim(),
    }))
    .filter(a => a.email && a.estado !== 'baja');
  console.log(`  ${alumnos.length} alumnos activos`);

  const state = loadState();
  const sheets = DRY_RUN ? null : await getSheetsClient();
  const profKeys = PROF_FILTER ? [PROF_FILTER] : Object.keys(PROFESORES);

  for (const key of profKeys) {
    const prof = PROFESORES[key];
    if (!prof) { console.error(`Profesor "${key}" no encontrado`); continue; }

    console.log(`\n📋 ${prof.nombre} (${prof.email})`);

    const sheetId = SHEET_IDS[key];
    if (!sheetId) { console.error(`  ❌ No hay Sheet ID para "${key}"`); continue; }

    // Save to state
    if (!state.sheets[key]) {
      state.sheets[key] = { sheetId, nombre: prof.nombre, email: prof.email, createdAt: new Date().toISOString() };
      saveState(state);
    }

    // Build tabs with data
    let totalRows = 0;

    for (let i = 0; i < prof.programas.length; i++) {
      const programa = prof.programas[i];
      const asignaturas = getAsignaturasForPrograma(prof, programa);

      // Filter students for this program
      const studentsInProg = alumnos.filter(a => alumnoMatchesPrograma(a.programa, programa));

      // Build rows: one per (student, asignatura)
      const rows = [HEADERS];
      for (const s of studentsInProg) {
        for (const asig of asignaturas) {
          rows.push([s.email, s.nombre, s.apellidos, asig, '', '', '', '']);
        }
      }

      const dataCount = rows.length - 1;
      totalRows += dataCount;
      console.log(`  Tab "${programa}": ${studentsInProg.length} alumnos × ${asignaturas.length} asignaturas = ${dataCount} filas`);

      if (DRY_RUN) {
        for (const row of rows.slice(0, 4)) {
          console.log(`    ${row.join(' | ')}`);
        }
        if (rows.length > 4) console.log(`    ... (${rows.length - 4} más)`);
        continue;
      }

      // Create or rename tab
      if (i === 0) {
        // Rename default Sheet1 tab
        const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const defaultTabId = meta.data.sheets[0].properties.sheetId;
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: sheetId,
          requestBody: {
            requests: [{
              updateSheetProperties: {
                properties: { sheetId: defaultTabId, title: programa },
                fields: 'title',
              },
            }],
          },
        });
      } else {
        // Check if tab already exists
        const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
        const existing = meta.data.sheets.find(s => s.properties.title === programa);
        if (!existing) {
          await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: { requests: [{ addSheet: { properties: { title: programa } } }] },
          });
        }
      }

      // Write data
      await sheets.spreadsheets.values.clear({
        spreadsheetId: sheetId,
        range: `'${programa}'!A:Z`,
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `'${programa}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    }

    if (!DRY_RUN) {
      console.log(`  ✅ ${totalRows} filas totales`);
      console.log(`  URL: https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
    } else {
      console.log(`  [DRY] ${totalRows} filas totales`);
    }
  }

  console.log('\n✅ Init completado.');
}

// =====================================================
// --sync: SHEETS PROFESORES → STACKBY
// =====================================================

async function sync() {
  if (!API_KEY) { console.error('Set STACKBY_API_KEY'); process.exit(1); }

  const state = loadState();
  const sheets = await getSheetsClient();
  const profKeys = PROF_FILTER ? [PROF_FILTER] : Object.keys(PROFESORES);

  let totalSynced = 0, totalSkipped = 0, totalErrors = 0;

  for (const key of profKeys) {
    const prof = PROFESORES[key];
    if (!prof) { console.error(`Profesor "${key}" no encontrado`); continue; }

    const sheetId = state.sheets[key]?.sheetId;
    if (!sheetId) { console.error(`⚠ ${prof.nombre}: sin Sheet (ejecuta --init primero)`); continue; }

    console.log(`\n📋 ${prof.nombre}`);

    for (const programa of prof.programas) {
      let data;
      try {
        data = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: `'${programa}'!A:H`,
        });
      } catch (err) {
        console.error(`  ⚠ Tab "${programa}" no encontrada: ${err.message}`);
        continue;
      }

      const rows = data.data.values || [];
      if (rows.length <= 1) { console.log(`  Tab "${programa}": vacía`); continue; }

      const headers = rows[0];
      const emailIdx = headers.indexOf('Email alumno');
      const asigIdx = headers.indexOf('Asignatura');
      const noteIdx = headers.indexOf('Nota evaluación');
      const examIdx = headers.indexOf('Nota examen');
      const califIdx = headers.indexOf('Calificación final');
      const convIdx = headers.indexOf('Convalidada');

      // Validate headers
      const idxMap = { emailIdx, asigIdx, noteIdx, examIdx, califIdx, convIdx };
      const missing = Object.entries(idxMap).filter(([, v]) => v < 0);
      if (missing.length > 0) {
        console.error(`  ❌ Columnas no encontradas en "${programa}": ${missing.map(([k]) => k).join(', ')}`);
        console.error(`     Headers: ${headers.join(', ')}`);
        continue;
      }

      let synced = 0, skipped = 0, errors = 0;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const email = (row[emailIdx] || '').trim();
        const asignatura = (row[asigIdx] || '').trim();
        if (!email || !asignatura) { skipped++; continue; }

        const nota = (row[noteIdx] || '').trim();
        const examen = (row[examIdx] || '').trim();
        const calif = (row[califIdx] || '').trim();
        const conv = (row[convIdx] || '').trim();

        if (!nota && !examen && !calif && !conv) { skipped++; continue; }

        // Grade fields only (no programa — avoid overwriting correct Stackby value)
        const gradeFields = {
          curso: '2025/26',
          profesor: prof.nombre,
        };
        if (nota) gradeFields.notaEvaluacion = nota;
        if (examen) gradeFields.notaExamen = examen;
        if (calif) gradeFields.calificacion = calif;
        if (conv) gradeFields.convalidada = ['sí', 'si', 'true'].includes(conv.toLowerCase());

        if (DRY_RUN) {
          console.log(`  [DRY] ${email} | ${asignatura} → ${calif || nota || '(parcial)'}`);
          synced++;
          continue;
        }

        try {
          const existing = await findByAsignatura(email, asignatura);
          if (existing) {
            await updateCalificacion(existing.rowId, gradeFields);
            console.log(`  updated: ${email} | ${asignatura}`);
          } else {
            const fullPrograma = PROGRAMA_MAP[programa] || programa;
            await createCalificacion({ email, asignatura, programa: fullPrograma, ...gradeFields });
            console.log(`  created: ${email} | ${asignatura}`);
          }
          synced++;
        } catch (err) {
          console.error(`  ✗ ${email} | ${asignatura}: ${err.message}`);
          errors++;
        }
      }

      console.log(`  "${programa}": ${synced} sync, ${skipped} sin nota, ${errors} err`);
      totalSynced += synced;
      totalSkipped += skipped;
      totalErrors += errors;
    }
  }

  console.log(`\n${DRY_RUN ? 'DRY RUN — ' : ''}Total: ${totalSynced} sync, ${totalSkipped} sin nota, ${totalErrors} errores`);
}

// =====================================================
// --refresh: STACKBY → SHEETS PROFESORES
// =====================================================

async function refresh() {
  if (!API_KEY) { console.error('Set STACKBY_API_KEY'); process.exit(1); }

  console.log('Leyendo calificaciones de Stackby...');
  const califs = await listarCalificaciones();
  console.log(`  ${califs.length} calificaciones`);

  console.log('Leyendo alumnos para nombres...');
  const rawAlumnos = await fetchAllAlumnos();
  const nameMap = {};
  for (const r of rawAlumnos) {
    const email = (r.field?.Email || '').toLowerCase().trim();
    if (email) nameMap[email] = { nombre: r.field?.Nombre || '', apellidos: r.field?.Apellidos || '' };
  }

  const state = loadState();
  const sheets = DRY_RUN ? null : await getSheetsClient();
  const profKeys = PROF_FILTER ? [PROF_FILTER] : Object.keys(PROFESORES);

  for (const key of profKeys) {
    const prof = PROFESORES[key];
    if (!prof) continue;

    const sheetId = state.sheets[key]?.sheetId;
    if (!sheetId && !DRY_RUN) { console.error(`⚠ ${prof.nombre}: sin Sheet`); continue; }

    console.log(`\n📋 ${prof.nombre}`);

    for (const programa of prof.programas) {
      const asignaturas = getAsignaturasForPrograma(prof, programa);
      const asigSet = new Set(asignaturas.map(a => a.toLowerCase()));

      // Filter calificaciones for this professor's subjects in this program
      const matching = califs.filter(c => {
        if (!asigSet.has(c.asignatura.toLowerCase())) return false;
        return alumnoMatchesPrograma(c.programa, programa);
      });

      const rows = [HEADERS];
      for (const c of matching) {
        const names = nameMap[c.email.toLowerCase()] || { nombre: '', apellidos: '' };
        rows.push([
          c.email,
          names.nombre,
          names.apellidos,
          c.asignatura,
          c.notaEvaluacion ?? '',
          c.notaExamen ?? '',
          c.calificacion ?? '',
          c.convalidada ? 'Sí' : '',
        ]);
      }

      console.log(`  "${programa}": ${matching.length} calificaciones`);

      if (DRY_RUN) {
        for (const row of rows.slice(0, 4)) console.log(`    ${row.join(' | ')}`);
        if (rows.length > 4) console.log(`    ... (${rows.length - 4} más)`);
        continue;
      }

      try {
        await sheets.spreadsheets.values.clear({
          spreadsheetId: sheetId,
          range: `'${programa}'!A:Z`,
        });
        await sheets.spreadsheets.values.update({
          spreadsheetId: sheetId,
          range: `'${programa}'!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
      } catch (err) {
        console.error(`  ✗ Error escribiendo "${programa}": ${err.message}`);
      }
    }
  }

  console.log('\n✅ Refresh completado.');
}

// =====================================================
// --share: COMPARTIR SHEETS CON PROFESORES
// =====================================================

async function share() {
  const drive = await getDriveClient();
  const profKeys = PROF_FILTER ? [PROF_FILTER] : Object.keys(PROFESORES);

  for (const key of profKeys) {
    const prof = PROFESORES[key];
    if (!prof) { console.error(`Profesor "${key}" no encontrado`); continue; }

    const sheetId = SHEET_IDS[key];
    if (!sheetId) { console.error(`No hay Sheet ID para "${key}"`); continue; }

    console.log(`\n📋 ${prof.nombre} (${sheetId})`);

    const targets = [
      { email: prof.email, role: 'writer', label: `profesor (${prof.email})` },
      { email: 'alumnos@institutoteologia.org', role: 'writer', label: 'alumnos@institutoteologia.org' },
    ];

    for (const { email, role, label } of targets) {
      if (DRY_RUN) {
        console.log(`  [DRY] Compartir con ${label} como ${role}`);
        continue;
      }

      try {
        await drive.permissions.create({
          fileId: sheetId,
          requestBody: { type: 'user', role, emailAddress: email },
          sendNotificationEmail: false,
        });
        console.log(`  ✅ ${label} (${role})`);
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('already has access') || msg.includes('ya tiene acceso')) {
          console.log(`  ℹ Ya tiene acceso: ${label}`);
        } else {
          console.error(`  ❌ Error: ${label} — ${msg}`);
        }
      }
    }
  }

  console.log('\n✅ Share completado.');
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  if (INIT) await init();
  else if (SYNC) await sync();
  else if (REFRESH) await refresh();
  else if (SHARE) await share();
  else {
    console.log('Usage:');
    console.log('  node sheets-profesores.mjs --init              # Crear/poblar Sheets');
    console.log('  node sheets-profesores.mjs --init --dry-run    # Preview');
    console.log('  node sheets-profesores.mjs --sync              # Sheets → Stackby');
    console.log('  node sheets-profesores.mjs --sync --dry-run    # Preview');
    console.log('  node sheets-profesores.mjs --refresh           # Stackby → Sheets');
    console.log('  node sheets-profesores.mjs --share             # Compartir con profesores');
    console.log('  node sheets-profesores.mjs --share --dry-run   # Preview');
    console.log('  node sheets-profesores.mjs --profesor <key>    # Solo un profesor');
    console.log('\nProfesores:', Object.keys(PROFESORES).join(', '));
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
