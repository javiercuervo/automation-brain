#!/usr/bin/env node

/**
 * Test Suite — IITD Alumnos
 *
 * Bateria de pruebas para verificar que todos los scripts,
 * integraciones y datos del Panel IITD funcionan correctamente.
 *
 * Usage:
 *   node test-suite.mjs              # Ejecutar todos los tests
 *   node test-suite.mjs --fast       # Solo tests locales (sin API)
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, readdirSync } from 'fs';
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

const FAST_MODE = process.argv.includes('--fast');
const SHEET_ID = process.env.PANEL_IITD_SHEET_ID;

// =====================================================
// TEST RUNNER
// =====================================================

let testNum = 0;
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

function ok(name) {
  testNum++;
  passed++;
  console.log(`ok ${testNum} - ${name}`);
}

function notOk(name, reason) {
  testNum++;
  failed++;
  console.log(`not ok ${testNum} - ${name}`);
  console.log(`  # ${reason}`);
  failures.push({ num: testNum, name, reason });
}

function skip(name, reason) {
  testNum++;
  skipped++;
  console.log(`ok ${testNum} - ${name} # SKIP ${reason}`);
}

// =====================================================
// T01 — SYNTAX CHECKS
// =====================================================

const MJS_FILES = [
  'compartido/google-auth.mjs', 'compartido/email-sender.mjs',
  'compartido/pxl-client.mjs', 'compartido/breezedoc-client.mjs',
  'compartido/siteground-upload.mjs', 'compartido/calificaciones-client.mjs',
  'sincronizacion/sync-sheets.mjs', 'sincronizacion/sync-calificaciones.mjs',
  'sincronizacion/sheets-profesores.mjs',
  'generacion/recibo-pdf.mjs', 'generacion/certificado-pdf.mjs',
  'generacion/breezedoc-enrollment.mjs',
  'operaciones/dashboard.mjs', 'operaciones/kpis-deca.mjs',
  'operaciones/rgpd-retencion.mjs', 'operaciones/reorganizar-drive.mjs',
  'datos/validar-datos.mjs', 'datos/listados.mjs',
  'compartido/contactos-client.mjs',
  'generacion/pdf-signer.mjs',
  'datos/assign-ids.mjs', 'datos/dedup-alumnos.mjs',
  'datos/exportar-alumno.mjs', 'datos/import-polar.mjs',
  'compartido/cursos-client.mjs', 'operaciones/curso-publicar.mjs',
  'compartido/audit-client.mjs', 'operaciones/breach-notification.mjs',
  'compartido/grabaciones-client.mjs', 'operaciones/grabaciones-expiracion.mjs',
  'compartido/productos-client.mjs', 'compartido/facturas-client.mjs',
  'generacion/factura-centro-pdf.mjs', 'operaciones/grabaciones-compliance.mjs',
  'compartido/newsletter-client.mjs', 'compartido/tickets-client.mjs',
  'compartido/faq-responder.mjs', 'compartido/centros-acceso-client.mjs',
  'operaciones/newsletter-consent-report.mjs', 'operaciones/ticket-processor.mjs',
  'operaciones/centros-exportar.mjs',
  // Sprint 10 — N18, N31, N32, N33, N37
  'compartido/leads-client.mjs', 'compartido/tutorias-client.mjs',
  'compartido/videos-client.mjs', 'compartido/holded-client.mjs',
  'compartido/campaigns-client.mjs',
  'operaciones/onboarding-funnel.mjs', 'operaciones/tutorias-upsell.mjs',
  'operaciones/videos-publicar.mjs', 'operaciones/migracion-holded.mjs',
  'operaciones/google-grants-report.mjs',
  // Sprint 11 — N15/N17/N23 (OCH)
  'compartido/och-client.mjs',
  'sincronizacion/och-enrollment.mjs',
  'datos/och-csv-import.mjs',
  // Diploma OCH — diseño corporativo
  'generacion/diploma-och.mjs',
];

console.log('TAP version 14');
console.log('# T01 — Syntax checks');

for (const file of MJS_FILES) {
  const path = resolve(__dirname, file);
  if (!existsSync(path)) {
    skip(`Syntax: ${file}`, 'file not found');
    continue;
  }
  try {
    execSync(`node --check "${path}"`, { stdio: 'pipe' });
    ok(`Syntax: ${file}`);
  } catch (err) {
    notOk(`Syntax: ${file}`, err.stderr?.toString().trim() || 'syntax error');
  }
}

// JS files too
const JS_FILES = ['compartido/alumnos-client.js'];
for (const file of JS_FILES) {
  const path = resolve(__dirname, file);
  if (!existsSync(path)) {
    skip(`Syntax: ${file}`, 'file not found');
    continue;
  }
  try {
    execSync(`node --check "${path}"`, { stdio: 'pipe' });
    ok(`Syntax: ${file}`);
  } catch (err) {
    notOk(`Syntax: ${file}`, err.stderr?.toString().trim() || 'syntax error');
  }
}

// =====================================================
// T02 — IMPORTS
// =====================================================

console.log('# T02 — Module imports');

try {
  const mod = await import('./compartido/google-auth.mjs');
  const exports = ['getAuth', 'getSheetsClient', 'getDriveClient', 'getGoogleServices'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  if (missing.length === 0) {
    ok('Import: google-auth.mjs (4 exports)');
  } else {
    notOk('Import: google-auth.mjs', `missing: ${missing.join(', ')}`);
  }
} catch (err) {
  notOk('Import: google-auth.mjs', err.message);
}

try {
  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const mod = require('./compartido/alumnos-client.js');
  const exports = ['getAllRecords', 'findByEmail', 'createAlumno', 'updateAlumno',
    'upsertByEmail', 'listarAlumnos', 'filtrarPorEstado', 'getNextAlumnoId',
    'normalizeEmail', 'ESTADOS', 'FUENTES'];
  const missing = exports.filter(e => !mod[e]);
  if (missing.length === 0) {
    ok('Import: alumnos-client.js (11 exports)');
  } else {
    notOk('Import: alumnos-client.js', `missing: ${missing.join(', ')}`);
  }
} catch (err) {
  notOk('Import: alumnos-client.js', err.message);
}

// =====================================================
// T03 — ENV VARS
// =====================================================

console.log('# T03 — Environment variables');

const REQUIRED_VARS = [
  'STACKBY_API_KEY', 'STACKBY_STACK_ID', 'STACKBY_ALUMNOS_TABLE_ID',
  'PANEL_IITD_SHEET_ID', 'PXL_API_TOKEN',
  'DRIVE_RECIBOS_FOLDER_ID', 'DRIVE_DOCUMENTOS_FOLDER_ID',
];

const missingVars = REQUIRED_VARS.filter(v => !process.env[v]);
if (missingVars.length === 0) {
  ok(`Env: ${REQUIRED_VARS.length} vars criticas definidas`);
} else {
  notOk(`Env: vars criticas`, `missing: ${missingVars.join(', ')}`);
}

// =====================================================
// T04-T05 — STACKBY PAGINATION
// =====================================================

if (FAST_MODE) {
  skip('Stackby: paginacion getAllRecords()', 'fast mode');
  skip('Stackby: findByEmail en fila >500', 'fast mode');
} else {
  console.log('# T04-T05 — Stackby pagination');

  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { getAllRecords, findByEmail } = require('./compartido/alumnos-client.js');

    // T04: pagination returns all records
    const records = await getAllRecords();
    if (records.length >= 1500) {
      ok(`Stackby: getAllRecords() = ${records.length} registros (>= 1500)`);
    } else {
      notOk(`Stackby: getAllRecords()`, `solo ${records.length} registros (esperado >= 1500)`);
    }

    // T05: findByEmail on a record beyond row 500
    // Pick an email from the last batch
    const lastRecord = records[records.length - 1];
    const testEmail = lastRecord?.field?.Email;
    if (testEmail) {
      const found = await findByEmail(testEmail);
      if (found) {
        ok(`Stackby: findByEmail('${testEmail}') encontrado (fila ${records.length})`);
      } else {
        notOk(`Stackby: findByEmail`, `no encontro '${testEmail}' de fila ${records.length}`);
      }
    } else {
      skip('Stackby: findByEmail en fila >500', 'ultimo registro sin email');
    }
  } catch (err) {
    notOk('Stackby: paginacion', err.message);
    skip('Stackby: findByEmail en fila >500', 'depende de T04');
  }
}

// =====================================================
// T06 — GOOGLE AUTH
// =====================================================

if (FAST_MODE) {
  skip('Google Auth: SA sheets + drive', 'fast mode');
} else {
  console.log('# T06 — Google Auth');

  try {
    const { getSheetsClient, getDriveClient, getGoogleServices } = await import('./compartido/google-auth.mjs');

    const sheets = await getSheetsClient();
    const drive = await getDriveClient();
    const services = await getGoogleServices();

    if (sheets && drive && services.sheets && services.drive) {
      ok('Google Auth: SA → sheets + drive + getGoogleServices');
    } else {
      notOk('Google Auth', 'alguno de los clientes es null');
    }
  } catch (err) {
    notOk('Google Auth: SA', err.message);
  }
}

// =====================================================
// T07-T10 — SHEET STRUCTURE & DATA
// =====================================================

if (FAST_MODE || !SHEET_ID) {
  skip('Sheet: estructura 14 tabs', FAST_MODE ? 'fast mode' : 'PANEL_IITD_SHEET_ID no definido');
  skip('Sheet: datos Resumen', 'depende de T07');
  skip('Sheet: datos Dashboard', 'depende de T07');
  skip('Sheet: datos KPIs DECA', 'depende de T07');
} else {
  console.log('# T07-T10 — Sheet structure & data');

  try {
    const { getSheetsClient } = await import('./compartido/google-auth.mjs');
    const sheets = await getSheetsClient();

    // T07: 14 tabs
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const tabs = meta.data.sheets.map(s => s.properties.title);

    const EXPECTED_TABS = [
      'DECA', 'Evangelizadores', 'Formación Sistemática', 'Formación Bíblica',
      'Compromiso Laical', 'Otros', 'Resumen', 'Recibos', 'Certificados',
      'Dashboard', 'KPIs DECA', 'Validación', 'Retención RGPD',
    ];

    const missingTabs = EXPECTED_TABS.filter(t => !tabs.includes(t));
    if (missingTabs.length === 0) {
      ok(`Sheet: ${EXPECTED_TABS.length} tabs esperadas presentes (total: ${tabs.length})`);
    } else {
      notOk('Sheet: tabs', `faltan: ${missingTabs.join(', ')}`);
    }

    // T08: Resumen has data
    const resumen = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID, range: "'Resumen'!A1:B10",
    });
    if (resumen.data.values && resumen.data.values.length > 3) {
      ok(`Sheet: Resumen tiene ${resumen.data.values.length} filas`);
    } else {
      notOk('Sheet: Resumen', 'vacia o menos de 3 filas');
    }

    // T09: Dashboard has data
    const dashboard = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID, range: "'Dashboard'!A1:C5",
    });
    if (dashboard.data.values && dashboard.data.values.length >= 3) {
      ok(`Sheet: Dashboard tiene datos`);
    } else {
      notOk('Sheet: Dashboard', 'vacia o sin datos');
    }

    // T10: KPIs DECA has data
    const kpis = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID, range: "'KPIs DECA'!A1:B5",
    });
    if (kpis.data.values && kpis.data.values.length >= 3) {
      ok('Sheet: KPIs DECA tiene datos');
    } else {
      notOk('Sheet: KPIs DECA', 'vacia o sin datos');
    }
  } catch (err) {
    notOk('Sheet: estructura', err.message);
    skip('Sheet: datos Resumen', 'depende de T07');
    skip('Sheet: datos Dashboard', 'depende de T07');
    skip('Sheet: datos KPIs DECA', 'depende de T07');
  }
}

// =====================================================
// T11-T15 — DRY-RUN SCRIPTS
// =====================================================

console.log('# T11-T15 — Script dry-runs');

const DRY_RUN_SCRIPTS = [
  { file: 'sincronizacion/sync-sheets.mjs', args: '--dry-run', name: 'sync-sheets' },
  { file: 'operaciones/dashboard.mjs', args: '--dry-run', name: 'dashboard' },
  { file: 'operaciones/kpis-deca.mjs', args: '--dry-run', name: 'kpis-deca' },
  { file: 'datos/validar-datos.mjs', args: '', name: 'validar-datos' },
  { file: 'operaciones/rgpd-retencion.mjs', args: '', name: 'rgpd-retencion' },
];

for (const { file, args, name } of DRY_RUN_SCRIPTS) {
  if (FAST_MODE) {
    skip(`Dry-run: ${name}`, 'fast mode');
    continue;
  }

  try {
    const output = execSync(`node "${resolve(__dirname, file)}" ${args}`, {
      cwd: __dirname,
      stdio: 'pipe',
      timeout: 60000,
    });
    const text = output.toString();
    // Check it produced meaningful output (at least some lines with data)
    if (text.length > 50) {
      ok(`Dry-run: ${name}`);
    } else {
      notOk(`Dry-run: ${name}`, 'output too short');
    }
  } catch (err) {
    const stderr = err.stderr?.toString() || err.message;
    notOk(`Dry-run: ${name}`, stderr.split('\n')[0]);
  }
}

// =====================================================
// T16 — DATA CONSISTENCY
// =====================================================

if (FAST_MODE || !SHEET_ID) {
  skip('Consistencia: Stackby total == Sheet Resumen total', FAST_MODE ? 'fast mode' : 'no SHEET_ID');
} else {
  console.log('# T16 — Data consistency');

  try {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { getAllRecords } = require('./compartido/alumnos-client.js');
    const { getSheetsClient } = await import('./compartido/google-auth.mjs');

    const records = await getAllRecords();
    const sheets = await getSheetsClient();
    const resumen = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID, range: "'Resumen'!A:B",
    });

    const rows = resumen.data.values || [];
    const totalRow = rows.find(r => r[0] === 'TOTAL');
    const sheetTotal = totalRow ? parseInt(totalRow[1]) : -1;

    if (sheetTotal === records.length) {
      ok(`Consistencia: Stackby (${records.length}) == Sheet Resumen (${sheetTotal})`);
    } else {
      notOk('Consistencia', `Stackby=${records.length}, Sheet=${sheetTotal}`);
    }
  } catch (err) {
    notOk('Consistencia', err.message);
  }
}

// =====================================================
// T17-T18 — HEADER VALIDATION
// =====================================================

if (FAST_MODE || !SHEET_ID) {
  skip('Headers: Recibos (8 cols)', FAST_MODE ? 'fast mode' : 'no SHEET_ID');
  skip('Headers: Certificados (11 cols)', FAST_MODE ? 'fast mode' : 'no SHEET_ID');
} else {
  console.log('# T17-T18 — Header validation');

  try {
    const { getSheetsClient } = await import('./compartido/google-auth.mjs');
    const sheets = await getSheetsClient();

    // T17: Recibos headers
    const recibos = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID, range: "'Recibos'!A1:H1",
    });
    const rHeaders = recibos.data.values?.[0] || [];
    const EXPECTED_R = ['Email', 'Nombre', 'Apellidos', 'Programa', 'Importe', 'Fecha', 'Enlace PDF', 'Estado'];
    const rMatch = EXPECTED_R.every((h, i) => rHeaders[i] === h);
    if (rMatch) {
      ok(`Headers: Recibos (${rHeaders.length} cols)`);
    } else {
      notOk('Headers: Recibos', `got: [${rHeaders.join(', ')}]`);
    }

    // T18: Certificados headers
    const certs = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID, range: "'Certificados'!A1:K1",
    });
    const cHeaders = certs.data.values?.[0] || [];
    const EXPECTED_C = ['Email', 'Nombre', 'Apellidos', 'Expediente', 'Programa', 'Modelo',
      'Fecha', 'URL diploma', 'URL corta (QR)', 'Firma digital', 'Estado'];
    const cMatch = EXPECTED_C.every((h, i) => cHeaders[i] === h);
    if (cMatch) {
      ok(`Headers: Certificados (${cHeaders.length} cols)`);
    } else {
      notOk('Headers: Certificados', `got: [${cHeaders.join(', ')}]`);
    }
  } catch (err) {
    notOk('Headers', err.message);
  }
}

// =====================================================
// T20-T26 — SHEETS PROFESORES
// =====================================================

console.log('# T20-T26 — Sheets Profesores');

// T20: State file exists and has valid structure
const profStatePath = resolve(__dirname, 'sincronizacion/sheets-profesores-state.json');
if (existsSync(profStatePath)) {
  try {
    const profState = JSON.parse(readFileSync(profStatePath, 'utf-8'));
    const profCount = Object.keys(profState.sheets || {}).length;
    if (profCount === 3 && profState.lastRun) {
      ok(`Profesores: state.json válido (${profCount} profesores)`);
    } else {
      notOk('Profesores: state.json', `sheets: ${profCount}, lastRun: ${profState.lastRun || 'missing'}`);
    }
  } catch (err) {
    notOk('Profesores: state.json', err.message);
  }
} else {
  notOk('Profesores: state.json', 'file not found');
}

// T21: Init --dry-run completes without error
if (FAST_MODE) {
  skip('Profesores: init --dry-run', 'fast mode');
} else {
  try {
    const out = execSync(`node "${resolve(__dirname, 'sincronizacion/sheets-profesores.mjs')}" --init --dry-run`, {
      cwd: __dirname, stdio: 'pipe', timeout: 60000,
    }).toString();
    if (out.includes('alumnos activos') && out.includes('Init completado')) {
      ok('Profesores: init --dry-run');
    } else {
      notOk('Profesores: init --dry-run', 'output missing expected markers');
    }
  } catch (err) {
    notOk('Profesores: init --dry-run', err.stderr?.toString().split('\n')[0] || err.message);
  }
}

// T22-T24: Professor Sheet structure (tabs, headers, data count)
if (FAST_MODE) {
  skip('Profesores: Sheet tabs correctas', 'fast mode');
  skip('Profesores: Sheet headers (8 cols)', 'fast mode');
  skip('Profesores: Sheet data count > 0', 'fast mode');
} else {
  try {
    const { getSheetsClient: getProfSheets } = await import('./compartido/google-auth.mjs');
    const profSheets = await getProfSheets();

    // Use Javier Sánchez (has 2 tabs: DECA + Formación Sistemática)
    const testSheetId = '1rXbSOxqbbtNftrllnuzJcQnHGlU3RRjgHTk0ViiTqQs';
    const meta = await profSheets.spreadsheets.get({ spreadsheetId: testSheetId });
    const tabs = meta.data.sheets.map(s => s.properties.title);

    // T22: Correct tabs exist
    if (tabs.includes('DECA') && tabs.includes('Formación Sistemática')) {
      ok(`Profesores: Sheet Javier tabs correctas (${tabs.join(', ')})`);
    } else {
      notOk('Profesores: Sheet tabs', `esperadas DECA + Formación Sistemática, tiene: ${tabs.join(', ')}`);
    }

    // T23: Headers are the expected 8 columns
    const headerData = await profSheets.spreadsheets.values.get({
      spreadsheetId: testSheetId, range: "'DECA'!A1:H1",
    });
    const profHeaders = headerData.data.values?.[0] || [];
    const EXPECTED_PROF_H = [
      'Email alumno', 'Nombre', 'Apellidos', 'Asignatura',
      'Nota evaluación', 'Nota examen', 'Calificación final', 'Convalidada',
    ];
    const profHMatch = EXPECTED_PROF_H.every((h, i) => profHeaders[i] === h);
    if (profHMatch) {
      ok(`Profesores: headers DECA correctas (${profHeaders.length} cols)`);
    } else {
      notOk('Profesores: headers DECA', `got: [${profHeaders.join(', ')}]`);
    }

    // T24: Data count > 0 rows
    const allData = await profSheets.spreadsheets.values.get({
      spreadsheetId: testSheetId, range: "'DECA'!A:A",
    });
    const dataRows = (allData.data.values || []).length - 1;
    if (dataRows > 0) {
      ok(`Profesores: DECA tiene ${dataRows} filas de datos`);
    } else {
      notOk('Profesores: DECA data', `solo ${dataRows} filas`);
    }
  } catch (err) {
    notOk('Profesores: Sheet tabs', err.message);
    skip('Profesores: headers', 'depende de T22');
    skip('Profesores: data count', 'depende de T22');
  }
}

// T25: Sync --dry-run completes without error
if (FAST_MODE) {
  skip('Profesores: sync --dry-run', 'fast mode');
} else {
  try {
    const syncOut = execSync(`node "${resolve(__dirname, 'sincronizacion/sheets-profesores.mjs')}" --sync --dry-run`, {
      cwd: __dirname, stdio: 'pipe', timeout: 60000,
    }).toString();
    if (syncOut.includes('Total:')) {
      ok('Profesores: sync --dry-run');
    } else {
      notOk('Profesores: sync --dry-run', 'output missing "Total:" marker');
    }
  } catch (err) {
    notOk('Profesores: sync --dry-run', err.stderr?.toString().split('\n')[0] || err.message);
  }
}

// T26: Refresh --dry-run completes without error
if (FAST_MODE) {
  skip('Profesores: refresh --dry-run', 'fast mode');
} else {
  try {
    const refreshOut = execSync(`node "${resolve(__dirname, 'sincronizacion/sheets-profesores.mjs')}" --refresh --dry-run`, {
      cwd: __dirname, stdio: 'pipe', timeout: 60000,
    }).toString();
    if (refreshOut.includes('Refresh completado')) {
      ok('Profesores: refresh --dry-run');
    } else {
      notOk('Profesores: refresh --dry-run', 'output missing "Refresh completado" marker');
    }
  } catch (err) {
    notOk('Profesores: refresh --dry-run', err.stderr?.toString().split('\n')[0] || err.message);
  }
}

// =====================================================
// T27-T28 — N45/N46 MODULE IMPORTS
// =====================================================

console.log('# T27-T28 — N45/N46 module imports');

try {
  const mod = await import('./compartido/audit-client.mjs');
  const exports = ['logAudit', 'logBulkAudit', 'getAuditLog', 'detectAnomalies'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  if (missing.length === 0) {
    ok('Import: audit-client.mjs (4 exports)');
  } else {
    notOk('Import: audit-client.mjs', `missing: ${missing.join(', ')}`);
  }
} catch (err) {
  notOk('Import: audit-client.mjs', err.message);
}

try {
  const mod = await import('./compartido/grabaciones-client.mjs');
  const fnExports = ['listarGrabaciones', 'crearGrabacion', 'actualizarGrabacion', 'verificarAcceso', 'getExpired'];
  const missing = fnExports.filter(e => typeof mod[e] !== 'function');
  const hasEstados = mod.ESTADOS_GRABACION && typeof mod.ESTADOS_GRABACION === 'object';
  if (missing.length === 0 && hasEstados) {
    ok('Import: grabaciones-client.mjs (5 fn + ESTADOS_GRABACION)');
  } else {
    notOk('Import: grabaciones-client.mjs', `missing fn: ${missing.join(', ')}${!hasEstados ? ', ESTADOS_GRABACION' : ''}`);
  }
} catch (err) {
  notOk('Import: grabaciones-client.mjs', err.message);
}

// =====================================================
// T29 — N45/N46 ENV VARS
// =====================================================

console.log('# T29 — N45/N46 env vars');

const N45_N46_VARS = ['STACKBY_AUDIT_LOG_TABLE_ID', 'STACKBY_GRABACIONES_TABLE_ID', 'IITD_DIRECTOR_EMAIL'];
const missingN45 = N45_N46_VARS.filter(v => !process.env[v]);
if (missingN45.length === 0) {
  ok(`Env: N45/N46 vars definidas (${N45_N46_VARS.length})`);
} else {
  notOk('Env: N45/N46 vars', `missing: ${missingN45.join(', ')}`);
}

// =====================================================
// T30-T31 — N45/N46 DRY-RUNS
// =====================================================

console.log('# T30-T31 — N45/N46 dry-runs');

if (FAST_MODE) {
  skip('Dry-run: breach-notification --report', 'fast mode');
  skip('Dry-run: grabaciones-expiracion', 'fast mode');
} else {
  try {
    const out = execSync(`node "${resolve(__dirname, 'operaciones/breach-notification.mjs')}" --report`, {
      cwd: __dirname, stdio: 'pipe', timeout: 60000,
    }).toString();
    if (out.includes('Informe de anomalias') || out.includes('anomal')) {
      ok('Dry-run: breach-notification --report');
    } else {
      notOk('Dry-run: breach-notification --report', 'output missing expected markers');
    }
  } catch (err) {
    notOk('Dry-run: breach-notification --report', err.stderr?.toString().split('\n')[0] || err.message);
  }

  try {
    const out = execSync(`node "${resolve(__dirname, 'operaciones/grabaciones-expiracion.mjs')}"`, {
      cwd: __dirname, stdio: 'pipe', timeout: 60000,
    }).toString();
    if (out.includes('Informe de grabaciones') || out.includes('Total:')) {
      ok('Dry-run: grabaciones-expiracion');
    } else {
      notOk('Dry-run: grabaciones-expiracion', 'output missing expected markers');
    }
  } catch (err) {
    notOk('Dry-run: grabaciones-expiracion', err.stderr?.toString().split('\n')[0] || err.message);
  }
}

// =====================================================
// T32-T33 — N10/N28/N30 MODULE IMPORTS
// =====================================================

console.log('# T32-T33 — N10/N28/N30 module imports');

try {
  const mod = await import('./compartido/productos-client.mjs');
  const exports = ['listarProductos', 'crearProducto', 'calcularPrecioBundle'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  if (missing.length === 0) {
    ok('Import: productos-client.mjs (3 exports)');
  } else {
    notOk('Import: productos-client.mjs', `missing: ${missing.join(', ')}`);
  }
} catch (err) {
  notOk('Import: productos-client.mjs', err.message);
}

try {
  const mod = await import('./compartido/facturas-client.mjs');
  const exports = ['listarFacturas', 'crearFactura', 'getNextFacturaNumber'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  const hasEstados = mod.ESTADOS_FACTURA && typeof mod.ESTADOS_FACTURA === 'object';
  if (missing.length === 0 && hasEstados) {
    ok('Import: facturas-client.mjs (3 fn + ESTADOS_FACTURA)');
  } else {
    notOk('Import: facturas-client.mjs', `missing fn: ${missing.join(', ')}${!hasEstados ? ', ESTADOS_FACTURA' : ''}`);
  }
} catch (err) {
  notOk('Import: facturas-client.mjs', err.message);
}

// =====================================================
// T34 — N10/N30 ENV VARS
// =====================================================

console.log('# T34 — N10/N30 env vars');

const N10_N30_VARS = ['STACKBY_PRODUCTOS_TABLE_ID', 'STACKBY_FACTURAS_CENTROS_TABLE_ID'];
const missingN10 = N10_N30_VARS.filter(v => !process.env[v]);
if (missingN10.length === 0) {
  ok(`Env: N10/N30 vars definidas (${N10_N30_VARS.length})`);
} else {
  notOk('Env: N10/N30 vars', `missing: ${missingN10.join(', ')}`);
}

// =====================================================
// T35 — N28 GRABACIONES COMPLIANCE DRY-RUN
// =====================================================

console.log('# T35 — N28 grabaciones-compliance');

if (FAST_MODE) {
  skip('Dry-run: grabaciones-compliance', 'fast mode');
} else {
  try {
    const out = execSync(`node "${resolve(__dirname, 'operaciones/grabaciones-compliance.mjs')}"`, {
      cwd: __dirname, stdio: 'pipe', timeout: 60000,
    }).toString();
    if (out.includes('COMPLIANCE GRABACIONES') || out.includes('Total grabaciones')) {
      ok('Dry-run: grabaciones-compliance');
    } else {
      notOk('Dry-run: grabaciones-compliance', 'output missing expected markers');
    }
  } catch (err) {
    notOk('Dry-run: grabaciones-compliance', err.stderr?.toString().split('\n')[0] || err.message);
  }
}

// =====================================================
// T36-T39 — N34/N35/N38 MODULE IMPORTS
// =====================================================

console.log('# T36-T39 — N34/N35/N38 module imports');

try {
  const mod = await import('./compartido/newsletter-client.mjs');
  const exports = ['listSubscribers', 'subscribe', 'unsubscribe'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  const hasConst = mod.CONSENTIMIENTO_ESTADOS && mod.BASES_LEGALES;
  if (missing.length === 0 && hasConst) {
    ok('Import: newsletter-client.mjs (3 fn + CONSENTIMIENTO_ESTADOS + BASES_LEGALES)');
  } else {
    notOk('Import: newsletter-client.mjs', `missing fn: ${missing.join(', ')}${!hasConst ? ', constants' : ''}`);
  }
} catch (err) {
  notOk('Import: newsletter-client.mjs', err.message);
}

try {
  const mod = await import('./compartido/tickets-client.mjs');
  const exports = ['listarTickets', 'crearTicket', 'validarTransicion'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  const hasConst = mod.ESTADOS_TICKET && mod.CATEGORIAS;
  if (missing.length === 0 && hasConst) {
    ok('Import: tickets-client.mjs (3 fn + ESTADOS_TICKET + CATEGORIAS)');
  } else {
    notOk('Import: tickets-client.mjs', `missing fn: ${missing.join(', ')}${!hasConst ? ', constants' : ''}`);
  }
} catch (err) {
  notOk('Import: tickets-client.mjs', err.message);
}

try {
  const mod = await import('./compartido/faq-responder.mjs');
  const exports = ['matchFAQ'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  const hasConst = Array.isArray(mod.FAQ_ENTRIES) && typeof mod.CONFIDENCE_THRESHOLD === 'number';
  if (missing.length === 0 && hasConst) {
    ok(`Import: faq-responder.mjs (matchFAQ + ${mod.FAQ_ENTRIES.length} FAQs + threshold=${mod.CONFIDENCE_THRESHOLD})`);
  } else {
    notOk('Import: faq-responder.mjs', `missing fn: ${missing.join(', ')}${!hasConst ? ', constants' : ''}`);
  }
} catch (err) {
  notOk('Import: faq-responder.mjs', err.message);
}

try {
  const mod = await import('./compartido/centros-acceso-client.mjs');
  const exports = ['listarCentros', 'crearCentro', 'getCamposPermitidos'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  const hasCampos = Array.isArray(mod.CAMPOS_MINIMOS_CENTRO);
  if (missing.length === 0 && hasCampos) {
    ok(`Import: centros-acceso-client.mjs (3 fn + CAMPOS_MINIMOS_CENTRO=[${mod.CAMPOS_MINIMOS_CENTRO.join(',')}])`);
  } else {
    notOk('Import: centros-acceso-client.mjs', `missing fn: ${missing.join(', ')}${!hasCampos ? ', CAMPOS_MINIMOS_CENTRO' : ''}`);
  }
} catch (err) {
  notOk('Import: centros-acceso-client.mjs', err.message);
}

// =====================================================
// T40 — N34/N35/N38 ENV VARS
// =====================================================

console.log('# T40 — N34/N35/N38 env vars');

const N34_N38_VARS = ['STACKBY_NEWSLETTER_CONSENT_TABLE_ID', 'STACKBY_TICKETS_TABLE_ID', 'STACKBY_CENTROS_ACCESO_TABLE_ID'];
const missingN34 = N34_N38_VARS.filter(v => !process.env[v]);
if (missingN34.length === 0) {
  ok(`Env: N34/N35/N38 vars definidas (${N34_N38_VARS.length})`);
} else {
  notOk('Env: N34/N35/N38 vars', `missing: ${missingN34.join(', ')}`);
}

// =====================================================
// T41 — FAQ OFFLINE TEST
// =====================================================

console.log('# T41 — FAQ offline test');

try {
  const { matchFAQ, CONFIDENCE_THRESHOLD } = await import('./compartido/faq-responder.mjs');
  const result = matchFAQ('matricula DECA', 'quiero matricularme en DECA infantil');
  if (result.matched && result.confianza >= CONFIDENCE_THRESHOLD && result.categoria === 'matricula') {
    ok(`FAQ: matchFAQ('matricula DECA') → matched=true, confianza=${result.confianza}, cat=${result.categoria}`);
  } else {
    notOk('FAQ: matchFAQ', `matched=${result.matched}, confianza=${result.confianza}, cat=${result.categoria}`);
  }
} catch (err) {
  notOk('FAQ: matchFAQ', err.message);
}

// =====================================================
// T42 — RGPD CAMPOS PROHIBIDOS
// =====================================================

console.log('# T42 — RGPD campos prohibidos');

try {
  const { CAMPOS_MINIMOS_CENTRO } = await import('./compartido/centros-acceso-client.mjs');
  const PROHIBIDOS = ['DNI', 'Email', 'Telefono'];
  const violations = PROHIBIDOS.filter(p => CAMPOS_MINIMOS_CENTRO.includes(p));
  if (violations.length === 0) {
    ok(`RGPD: CAMPOS_MINIMOS_CENTRO no incluye ${PROHIBIDOS.join(', ')}`);
  } else {
    notOk('RGPD: CAMPOS_MINIMOS_CENTRO', `incluye campos prohibidos: ${violations.join(', ')}`);
  }
} catch (err) {
  notOk('RGPD: CAMPOS_MINIMOS_CENTRO', err.message);
}

// =====================================================
// T43-T47 — SPRINT 10 MODULE IMPORTS (N18/N31/N32/N33/N37)
// =====================================================

console.log('# T43-T47 — Sprint 10 module imports');

try {
  const mod = await import('./compartido/leads-client.mjs');
  const exports = ['listLeads', 'findByEmail', 'createLead', 'updateLead', 'getStats'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  const hasConst = mod.LEAD_ESTADOS && mod.LEAD_ORIGENES;
  if (missing.length === 0 && hasConst) {
    ok('Import: leads-client.mjs (5 fn + LEAD_ESTADOS + LEAD_ORIGENES)');
  } else {
    notOk('Import: leads-client.mjs', `missing fn: ${missing.join(', ')}${!hasConst ? ', constants' : ''}`);
  }
} catch (err) {
  notOk('Import: leads-client.mjs', err.message);
}

try {
  const mod = await import('./compartido/tutorias-client.mjs');
  const exports = ['listOfertas', 'findByEmail', 'createOferta', 'updateOferta', 'getStats'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  const hasConst = mod.OFERTA_ESTADOS && typeof mod.OFERTA_ESTADOS === 'object';
  if (missing.length === 0 && hasConst) {
    ok('Import: tutorias-client.mjs (5 fn + OFERTA_ESTADOS)');
  } else {
    notOk('Import: tutorias-client.mjs', `missing fn: ${missing.join(', ')}${!hasConst ? ', OFERTA_ESTADOS' : ''}`);
  }
} catch (err) {
  notOk('Import: tutorias-client.mjs', err.message);
}

try {
  const mod = await import('./compartido/videos-client.mjs');
  const exports = ['listVideos', 'findByTitulo', 'createVideo', 'updateVideo', 'getStats', 'generateEmbed'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  const hasConst = mod.VIDEO_ESTADOS && mod.IDIOMAS;
  if (missing.length === 0 && hasConst) {
    ok('Import: videos-client.mjs (6 fn + VIDEO_ESTADOS + IDIOMAS)');
  } else {
    notOk('Import: videos-client.mjs', `missing fn: ${missing.join(', ')}${!hasConst ? ', constants' : ''}`);
  }
} catch (err) {
  notOk('Import: videos-client.mjs', err.message);
}

try {
  const mod = await import('./compartido/holded-client.mjs');
  const exports = ['listAllContacts', 'listAllProducts', 'listAllInvoices',
    'createContact', 'createProduct', 'createInvoice', 'alumnoToHoldedContact', 'getAccountInfo'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  if (missing.length === 0) {
    ok('Import: holded-client.mjs (8 exports)');
  } else {
    notOk('Import: holded-client.mjs', `missing: ${missing.join(', ')}`);
  }
} catch (err) {
  notOk('Import: holded-client.mjs', err.message);
}

try {
  const mod = await import('./compartido/campaigns-client.mjs');
  const exports = ['listCampaigns', 'createCampaign', 'updateCampaign', 'getStats'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  const hasConst = mod.CAMPAIGN_ESTADOS && mod.PLATAFORMAS;
  if (missing.length === 0 && hasConst) {
    ok('Import: campaigns-client.mjs (4 fn + CAMPAIGN_ESTADOS + PLATAFORMAS)');
  } else {
    notOk('Import: campaigns-client.mjs', `missing fn: ${missing.join(', ')}${!hasConst ? ', constants' : ''}`);
  }
} catch (err) {
  notOk('Import: campaigns-client.mjs', err.message);
}

// =====================================================
// T48-T52 — SPRINT 10 --help CHECKS
// =====================================================

console.log('# T48-T52 — Sprint 10 --help checks');

const SPRINT10_HELP_SCRIPTS = [
  { file: 'compartido/leads-client.mjs', args: '--help', name: 'leads-client', marker: 'Leads Client' },
  { file: 'operaciones/onboarding-funnel.mjs', args: '--help', name: 'onboarding-funnel', marker: 'Onboarding Funnel' },
  { file: 'operaciones/tutorias-upsell.mjs', args: '--help', name: 'tutorias-upsell', marker: 'Tutorias Upsell' },
  { file: 'operaciones/videos-publicar.mjs', args: '--help', name: 'videos-publicar', marker: 'Videos Publicar' },
  { file: 'operaciones/google-grants-report.mjs', args: '--help', name: 'google-grants-report', marker: 'Google Grants' },
];

for (const { file, args, name, marker } of SPRINT10_HELP_SCRIPTS) {
  try {
    const out = execSync(`node "${resolve(__dirname, file)}" ${args}`, {
      cwd: __dirname, stdio: 'pipe', timeout: 15000,
    }).toString();
    if (out.includes(marker)) {
      ok(`Help: ${name} --help`);
    } else {
      notOk(`Help: ${name}`, `output missing "${marker}"`);
    }
  } catch (err) {
    notOk(`Help: ${name}`, err.stderr?.toString().split('\n')[0] || err.message);
  }
}

// =====================================================
// T53-T54 — SPRINT 11 MODULE IMPORTS (OCH)
// =====================================================

console.log('# T53-T54 — Sprint 11 module imports (OCH)');

try {
  const mod = await import('./compartido/och-client.mjs');
  const exports = ['listCourses', 'findCourse', 'enrollStudent', 'enrollByCourseName', 'testConnection'];
  const missing = exports.filter(e => typeof mod[e] !== 'function');
  if (missing.length === 0) {
    ok('Import: och-client.mjs (5 exports)');
  } else {
    notOk('Import: och-client.mjs', `missing: ${missing.join(', ')}`);
  }
} catch (err) {
  notOk('Import: och-client.mjs', err.message);
}

// T54: OCH_API_KEY check (informational — not required to pass)
{
  const hasKey = !!process.env.OCH_API_KEY || !!process.env.OCH_INTEGRATION_TOKEN;
  if (hasKey) {
    ok('Env: OCH_API_KEY configurada');
  } else {
    skip('Env: OCH_API_KEY', 'no configurada (obtener de OCH Admin > Settings > Pabbly Integrations)');
  }
}

// =====================================================
// T55-T57 — SPRINT 11 --help CHECKS
// =====================================================

console.log('# T55-T57 — Sprint 11 --help checks');

const SPRINT11_HELP_SCRIPTS = [
  { file: 'compartido/och-client.mjs', args: '--help', name: 'och-client', marker: 'OCH Client' },
  { file: 'sincronizacion/och-enrollment.mjs', args: '--help', name: 'och-enrollment', marker: 'OCH Auto-Enrollment' },
  { file: 'datos/och-csv-import.mjs', args: '--help', name: 'och-csv-import', marker: 'OCH CSV Import' },
];

for (const { file, args, name, marker } of SPRINT11_HELP_SCRIPTS) {
  try {
    const out = execSync(`node "${resolve(__dirname, file)}" ${args}`, {
      cwd: __dirname, stdio: 'pipe', timeout: 15000,
    }).toString();
    if (out.includes(marker)) {
      ok(`Help: ${name} --help`);
    } else {
      notOk(`Help: ${name}`, `output missing "${marker}"`);
    }
  } catch (err) {
    notOk(`Help: ${name}`, err.stderr?.toString().split('\n')[0] || err.message);
  }
}

// =====================================================
// T58-T59 — Diploma OCH
// =====================================================

console.log('# T58-T59 — Diploma OCH');

// T58: --help
try {
  const helpOut = execSync(`node "${resolve(__dirname, 'generacion/diploma-och.mjs')}" --help`, {
    cwd: __dirname, stdio: 'pipe', timeout: 15000,
  }).toString();
  if (helpOut.includes('Diplomas OCH') || helpOut.includes('diploma-och')) {
    ok('Help: diploma-och --help');
  } else {
    notOk('Help: diploma-och', 'output missing marker');
  }
} catch (err) {
  notOk('Help: diploma-och', err.stderr?.toString().split('\n')[0] || err.message);
}

// T59: --mock dry-run (generates PDF)
try {
  const mockOut = execSync(`node "${resolve(__dirname, 'generacion/diploma-och.mjs')}" --mock --no-sign -o /tmp/test-diploma-och-suite`, {
    cwd: __dirname, stdio: 'pipe', timeout: 30000,
  }).toString();
  if (mockOut.includes('Diploma OCH') && mockOut.includes('Hash:')) {
    ok('Mock: diploma-och --mock (PDF generated)');
  } else {
    notOk('Mock: diploma-och --mock', 'output missing expected markers');
  }
} catch (err) {
  notOk('Mock: diploma-och --mock', err.stderr?.toString().split('\n')[0] || err.message);
}

// =====================================================
// SUMMARY
// =====================================================

console.log();
console.log(`1..${testNum}`);
console.log(`# ${passed} passed, ${skipped} skipped, ${failed} failed`);

if (failures.length > 0) {
  console.log();
  console.log('# FAILURES:');
  for (const f of failures) {
    console.log(`#   ${f.num}. ${f.name}: ${f.reason}`);
  }
}

process.exit(failed > 0 ? 1 : 0);
