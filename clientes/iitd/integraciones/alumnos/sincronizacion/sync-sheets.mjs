#!/usr/bin/env node

/**
 * Sincronización Stackby ALUMNOS → Google Sheet "Panel IITD" (N05 revisado)
 *
 * Lee todos los alumnos de Stackby y los escribe en un Google Sheet con
 * una pestaña por programa. Miriam y los profesores usan este Sheet como interfaz.
 *
 * Usage:
 *   STACKBY_API_KEY=xxx node sync-sheets.mjs                         # Sync completo
 *   STACKBY_API_KEY=xxx node sync-sheets.mjs --create-sheet          # Crear Sheet nuevo
 *   STACKBY_API_KEY=xxx node sync-sheets.mjs --sheet-id XXXXX        # Usar Sheet existente
 *   STACKBY_API_KEY=xxx node sync-sheets.mjs --dry-run               # Preview sin escribir
 *
 * Env vars:
 *   STACKBY_API_KEY          — API key de Stackby
 *   PANEL_IITD_SHEET_ID      — ID del Google Sheet "Panel IITD" (o usar --sheet-id)
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getSheetsClient } from './google-auth.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '.env'))) {
  for (const line of readFileSync(resolve(__dirname, '.env'), 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// =====================================================
// CONFIG
// =====================================================

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';

const SHEET_ID = (() => {
  const idx = process.argv.indexOf('--sheet-id');
  return idx !== -1 ? process.argv[idx + 1] : (process.env.PANEL_IITD_SHEET_ID || '');
})();

const CREATE_SHEET = process.argv.includes('--create-sheet');
const DRY_RUN = process.argv.includes('--dry-run');

// Mapeo de programas a pestañas
const PROGRAMA_TABS = {
  'DECLARACIÓN ECLESIÁSTICA COMPETENCIA ACADEMICA (DECA)': 'DECA',
  'ESCUELA DE EVANGELIZADORES': 'Evangelizadores',
  'FORMACIÓN SISTEMÁTICA': 'Formación Sistemática',
  'FORMACIÓN BÍBLICA': 'Formación Bíblica',
  'COMPROMISO LAICAL Y DOCTRINA SOCIAL': 'Compromiso Laical',
  'GENERAL': 'Otros',
};

// Columnas que mostramos en cada pestaña de programa
const HEADERS = [
  'Apellidos', 'Nombre', 'Email', 'Teléfono', 'Programa',
  'Estado', 'Estado pago', 'Fecha estado', 'Expediente', 'Fuente',
];

if (!API_KEY) {
  console.error('Set STACKBY_API_KEY env var');
  process.exit(1);
}

if (!SHEET_ID && !CREATE_SHEET) {
  console.error('Usa --sheet-id XXXXX o --create-sheet');
  console.error('También puedes set PANEL_IITD_SHEET_ID env var');
  process.exit(1);
}

// =====================================================
// STACKBY API
// =====================================================

async function getAllRows() {
  let allRecords = [];
  let offset = 0;
  const PAGE_SIZE = 100;

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

// =====================================================
// DATA PROCESSING
// =====================================================

function parseAlumnos(rows) {
  return rows.map(r => {
    const notas = r.field?.Notas || '';
    const expMatch = notas.match(/Nº Exp: (IITD-\d+)/);

    return {
      email: r.field?.Email || '',
      nombre: r.field?.Nombre || '',
      apellidos: r.field?.Apellidos || '',
      telefono: r.field?.Telefono || '',
      programa: r.field?.Programa || '',
      estado: r.field?.Estado || '',
      fechaEstado: r.field?.['Fecha estado'] || '',
      estadoPago: r.field?.['Estado pago'] || '',
      fuente: r.field?.Fuente || '',
      expediente: expMatch ? expMatch[1] : '',
    };
  });
}

function getTabName(programa) {
  // Check exact match first
  if (PROGRAMA_TABS[programa]) return PROGRAMA_TABS[programa];

  // Check partial match
  for (const [key, tab] of Object.entries(PROGRAMA_TABS)) {
    if (programa.toUpperCase().includes(key.split(' ')[0])) return tab;
  }

  return 'Otros';
}

function groupByPrograma(alumnos) {
  const groups = {};

  // Initialize all tabs
  for (const tab of Object.values(PROGRAMA_TABS)) {
    groups[tab] = [];
  }
  if (!groups['Otros']) groups['Otros'] = [];

  for (const a of alumnos) {
    const programs = a.programa.split(',').map(p => p.trim()).filter(Boolean);
    if (programs.length === 0) programs.push('');

    for (const prog of programs) {
      const tab = getTabName(prog);
      groups[tab].push(a);
    }
  }

  // Sort each group by apellidos
  for (const tab of Object.keys(groups)) {
    groups[tab].sort((a, b) => a.apellidos.localeCompare(b.apellidos, 'es'));
  }

  return groups;
}

function alumnoToRow(a) {
  return [
    a.apellidos, a.nombre, a.email, a.telefono, a.programa,
    a.estado, a.estadoPago, a.fechaEstado, a.expediente, a.fuente,
  ];
}

// =====================================================
// GOOGLE SHEETS
// =====================================================

async function createNewSheet(sheets) {
  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: 'Panel IITD — Listados de alumnos',
        locale: 'es_ES',
      },
      sheets: [
        ...[...new Set([...Object.values(PROGRAMA_TABS), 'Otros'])].map(name => ({
          properties: { title: name },
        })),
        { properties: { title: 'Resumen' } },
        { properties: { title: 'Recibos' } },
        { properties: { title: 'Certificados' } },
      ],
    },
  });

  const newId = res.data.spreadsheetId;
  console.log(`  Sheet creado: ${newId}`);
  console.log(`  URL: https://docs.google.com/spreadsheets/d/${newId}`);
  return newId;
}

async function ensureTabsExist(sheets, sheetId, tabNames) {
  // Get existing tabs
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const existingTabs = new Set(meta.data.sheets.map(s => s.properties.title));

  const toCreate = tabNames.filter(t => !existingTabs.has(t));
  if (toCreate.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      requests: toCreate.map(title => ({
        addSheet: { properties: { title } },
      })),
    },
  });
  console.log(`  Pestañas creadas: ${toCreate.join(', ')}`);
}

async function writeTab(sheets, sheetId, tabName, alumnos) {
  const values = [HEADERS, ...alumnos.map(alumnoToRow)];

  // Clear then write (ensures old data is removed)
  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A:Z`,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `'${tabName}'!A1`,
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

async function writeResumen(sheets, sheetId, groups, totalAlumnos) {
  const now = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  const values = [
    ['RESUMEN — Panel IITD'],
    [`Última actualización: ${now}`],
    [],
    ['Programa', 'Alumnos'],
  ];

  const sortedGroups = Object.entries(groups)
    .filter(([, alumnos]) => alumnos.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  for (const [tab, alumnos] of sortedGroups) {
    values.push([tab, alumnos.length]);
  }

  values.push([]);
  values.push(['TOTAL', totalAlumnos]);

  await sheets.spreadsheets.values.clear({
    spreadsheetId: sheetId,
    range: "'Resumen'!A:Z",
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "'Resumen'!A1",
    valueInputOption: 'RAW',
    requestBody: { values },
  });
}

async function initRecibosTab(sheets, sheetId) {
  // Check if tab has headers already
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'Recibos'!A1:A1",
  });

  if (existing.data.values && existing.data.values.length > 0) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "'Recibos'!A1",
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Email', 'Nombre', 'Apellidos', 'Programa', 'Importe', 'Fecha', 'Enlace PDF', 'Estado']],
    },
  });
}

async function initCertificadosTab(sheets, sheetId) {
  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'Certificados'!A1:A1",
  });

  if (existing.data.values && existing.data.values.length > 0) return;

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: "'Certificados'!A1",
    valueInputOption: 'RAW',
    requestBody: {
      values: [['Email', 'Nombre', 'Apellidos', 'Expediente', 'Programa', 'Modelo', 'Fecha', 'URL diploma', 'URL corta (QR)', 'Firma digital', 'Estado']],
    },
  });
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('Sync Stackby ALUMNOS → Google Sheet "Panel IITD"');
  console.log(`  ${DRY_RUN ? '[DRY RUN] ' : ''}Leyendo alumnos de Stackby...`);

  // 1. Read from Stackby
  const rows = await getAllRows();
  const alumnos = parseAlumnos(rows);
  console.log(`  Total alumnos: ${alumnos.length}`);

  // 2. Group by program
  const groups = groupByPrograma(alumnos);

  console.log();
  console.log('  Distribución:');
  for (const [tab, list] of Object.entries(groups)) {
    if (list.length > 0) {
      console.log(`    ${tab}: ${list.length}`);
    }
  }

  if (DRY_RUN) {
    console.log('\n[DRY RUN] No se escribió nada en Google Sheets.');
    return;
  }

  // 3. Google Sheets auth
  const sheets = await getSheetsClient();

  // 4. Get or create Sheet
  let sheetId = SHEET_ID;
  if (CREATE_SHEET) {
    sheetId = await createNewSheet(sheets);
  } else {
    // Ensure all tabs exist
    const allTabs = [...new Set([
      ...Object.values(PROGRAMA_TABS),
      'Otros', 'Resumen', 'Recibos', 'Certificados',
    ])];
    await ensureTabsExist(sheets, sheetId, allTabs);
  }

  // 5. Write each program tab
  console.log('\n  Escribiendo pestañas...');
  for (const [tab, list] of Object.entries(groups)) {
    if (list.length > 0) {
      await writeTab(sheets, sheetId, tab, list);
      console.log(`    ✓ ${tab}: ${list.length} alumnos`);
    }
  }

  // 6. Write Resumen
  await writeResumen(sheets, sheetId, groups, alumnos.length);
  console.log('    ✓ Resumen');

  // 7. Initialize Recibos + Certificados tabs (headers only)
  await initRecibosTab(sheets, sheetId);
  await initCertificadosTab(sheets, sheetId);
  console.log('    ✓ Recibos (cabeceras)');
  console.log('    ✓ Certificados (cabeceras)');

  console.log();
  console.log('Sincronización completada.');
  console.log(`Sheet: https://docs.google.com/spreadsheets/d/${sheetId}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
