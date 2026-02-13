#!/usr/bin/env node

/**
 * Validación de datos migrados (N21)
 *
 * Audita los registros de ALUMNOS en Stackby para detectar
 * problemas de calidad: campos vacíos, emails inválidos,
 * duplicados, estados inválidos, inconsistencias.
 *
 * Usage:
 *   node validar-datos.mjs                  # Informe consola
 *   node validar-datos.mjs --csv            # CSV a stdout
 *   node validar-datos.mjs --sheet          # Escribe tab "Validación" en Panel IITD
 */

import { readFileSync, existsSync } from 'fs';
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

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';
const SHEET_ID = process.env.PANEL_IITD_SHEET_ID;

const CSV_MODE = process.argv.includes('--csv');
const SHEET_MODE = process.argv.includes('--sheet');

if (!API_KEY) { console.error('Set STACKBY_API_KEY env var'); process.exit(1); }

// =====================================================
// CONSTANTS
// =====================================================

const VALID_ESTADOS = ['solicitud', 'admitido', 'pagado', 'enrolado', 'activo', 'baja'];
const VALID_PAGO = ['pendiente', 'parcial', 'pagado', ''];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// =====================================================
// STACKBY
// =====================================================

async function getAllRows() {
  let allRecords = [];
  let offset = 0;
  while (true) {
    const url = `${BASE_URL}/rowlist/${STACK_ID}/${TABLE_ID}` +
      (offset ? `?offset=${offset}` : '');
    const res = await fetch(url, { headers: { 'api-key': API_KEY } });
    const text = await res.text();
    if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);
    const data = JSON.parse(text);
    const records = Array.isArray(data) ? data : (data.records || []);
    allRecords = allRecords.concat(records);
    if (records.length < 100) break;
    offset += records.length;
  }
  return allRecords;
}

// =====================================================
// VALIDATION RULES
// =====================================================

const RULES = [
  {
    id: 'email_vacio',
    label: 'Email vacío',
    check: a => !a.email,
  },
  {
    id: 'email_invalido',
    label: 'Email formato inválido',
    check: a => a.email && !EMAIL_RE.test(a.email),
  },
  {
    id: 'nombre_vacio',
    label: 'Nombre vacío',
    check: a => !a.nombre,
  },
  {
    id: 'apellidos_vacio',
    label: 'Apellidos vacío',
    check: a => !a.apellidos,
  },
  {
    id: 'estado_invalido',
    label: 'Estado inválido',
    check: a => a.estado && !VALID_ESTADOS.includes(a.estado.toLowerCase()),
  },
  {
    id: 'estado_vacio',
    label: 'Estado vacío',
    check: a => !a.estado,
  },
  {
    id: 'programa_vacio',
    label: 'Sin programa',
    check: a => !a.programa,
  },
  {
    id: 'pago_invalido',
    label: 'Estado pago inválido',
    check: a => a.estadoPago && !VALID_PAGO.includes(a.estadoPago.toLowerCase()),
  },
  {
    id: 'activo_sin_programa',
    label: 'Activo sin programa',
    check: a => a.estado?.toLowerCase() === 'activo' && !a.programa,
  },
  {
    id: 'pagado_sin_fecha',
    label: 'Pagado sin fecha de pago (no Polar)',
    check: a => a.estadoPago?.toLowerCase() === 'pagado' && !a.fechaPago && a.fuente !== 'polar',
  },
];

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.error('Leyendo registros de Stackby...');
  const rows = await getAllRows();
  console.error(`  ${rows.length} registros leídos\n`);

  const alumnos = rows.map(r => ({
    rowId: r.id,
    email: (r.field?.Email || '').trim(),
    nombre: (r.field?.Nombre || '').trim(),
    apellidos: (r.field?.Apellidos || '').trim(),
    telefono: r.field?.Telefono || '',
    programa: (r.field?.Programa || '').trim(),
    estado: (r.field?.Estado || '').trim(),
    fechaEstado: r.field?.['Fecha estado'] || '',
    estadoPago: (r.field?.['Estado pago'] || '').trim(),
    fechaPago: r.field?.['Fecha pago'] || '',
    fuente: r.field?.Fuente || '',
    notas: r.field?.Notas || '',
  }));

  // Run rules
  const issues = []; // { alumno, ruleId, ruleLabel }
  for (const a of alumnos) {
    for (const rule of RULES) {
      if (rule.check(a)) {
        issues.push({ alumno: a, ruleId: rule.id, ruleLabel: rule.label });
      }
    }
  }

  // Detect duplicates by email
  const emailMap = {};
  for (const a of alumnos) {
    if (!a.email) continue;
    const key = a.email.toLowerCase();
    if (!emailMap[key]) emailMap[key] = [];
    emailMap[key].push(a);
  }
  const duplicates = Object.entries(emailMap).filter(([, list]) => list.length > 1);
  for (const [email, list] of duplicates) {
    for (const a of list) {
      issues.push({ alumno: a, ruleId: 'duplicado', ruleLabel: `Duplicado (${list.length}x)` });
    }
  }

  // Count by rule
  const countByRule = {};
  for (const i of issues) {
    countByRule[i.ruleId] = (countByRule[i.ruleId] || 0) + 1;
  }

  // Unique alumnos with issues
  const alumnosConProblemas = new Set(issues.map(i => i.alumno.email || i.alumno.rowId));
  const validCount = alumnos.length - alumnosConProblemas.size;

  // ---- CSV MODE ----
  if (CSV_MODE) {
    const headers = ['Email', 'Nombre', 'Apellidos', 'Programa', 'Estado', 'Estado pago', 'Problema'];
    console.log(headers.join(','));
    for (const i of issues) {
      const a = i.alumno;
      console.log([
        esc(a.email), esc(a.nombre), esc(a.apellidos),
        esc(a.programa), esc(a.estado), esc(a.estadoPago),
        esc(i.ruleLabel),
      ].join(','));
    }
    return;
  }

  // ---- SHEET MODE ----
  if (SHEET_MODE) {
    await writeSheet(alumnos, issues, countByRule, validCount, duplicates);
    return;
  }

  // ---- CONSOLE MODE ----
  console.log('═══════════════════════════════════════════════════════');
  console.log('  VALIDACIÓN DE DATOS — ALUMNOS IITD');
  console.log('═══════════════════════════════════════════════════════');
  console.log();
  console.log(`  Total registros:   ${alumnos.length}`);
  console.log(`  ✓ Válidos:         ${validCount}`);
  console.log(`  ✗ Con problemas:   ${alumnosConProblemas.size}`);
  console.log();

  if (Object.keys(countByRule).length === 0) {
    console.log('  Sin problemas detectados.');
    return;
  }

  console.log('  Problemas encontrados:');
  console.log('  ' + '─'.repeat(50));
  const sortedRules = Object.entries(countByRule).sort((a, b) => b[1] - a[1]);
  for (const [ruleId, count] of sortedRules) {
    const label = RULES.find(r => r.id === ruleId)?.label || ruleId;
    console.log(`    ${count.toString().padStart(5)}  ${label}`);
  }
  console.log();

  // Duplicates detail
  if (duplicates.length > 0) {
    console.log(`  Duplicados por email (${duplicates.length} emails):`);
    console.log('  ' + '─'.repeat(50));
    for (const [email, list] of duplicates.slice(0, 20)) {
      console.log(`    ${email} — ${list.length} registros`);
    }
    if (duplicates.length > 20) {
      console.log(`    ... y ${duplicates.length - 20} más`);
    }
    console.log();
  }

  // Top issues detail (first 15)
  const nonDupIssues = issues.filter(i => i.ruleId !== 'duplicado');
  if (nonDupIssues.length > 0) {
    console.log('  Detalle (primeros 15):');
    console.log('  ' + '─'.repeat(50));
    for (const i of nonDupIssues.slice(0, 15)) {
      const a = i.alumno;
      const name = `${a.apellidos}, ${a.nombre}`.trim() || '(sin nombre)';
      console.log(`    ${i.ruleLabel}`);
      console.log(`      ${name} <${a.email || '(vacío)'}>`);
    }
    if (nonDupIssues.length > 15) {
      console.log(`    ... y ${nonDupIssues.length - 15} más`);
    }
  }

  // Summary by estado
  console.log();
  console.log('  Distribución por Estado:');
  console.log('  ' + '─'.repeat(50));
  const byEstado = {};
  for (const a of alumnos) {
    const e = a.estado || '(vacío)';
    byEstado[e] = (byEstado[e] || 0) + 1;
  }
  for (const [estado, count] of Object.entries(byEstado).sort((a, b) => b[1] - a[1])) {
    const marker = (estado !== '(vacío)' && VALID_ESTADOS.includes(estado.toLowerCase())) ? '  ' : '⚠ ';
    console.log(`  ${marker}${count.toString().padStart(5)}  ${estado}`);
  }

  // Summary by programa
  console.log();
  console.log('  Distribución por Programa:');
  console.log('  ' + '─'.repeat(50));
  const byProg = {};
  for (const a of alumnos) {
    const progs = a.programa.split(',').map(p => p.trim()).filter(Boolean);
    if (progs.length === 0) progs.push('(sin programa)');
    for (const p of progs) byProg[p] = (byProg[p] || 0) + 1;
  }
  for (const [prog, count] of Object.entries(byProg).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${count.toString().padStart(5)}  ${prog}`);
  }

  console.log();
  console.log('Para CSV: node validar-datos.mjs --csv > validacion.csv');
  console.log('Para Sheet: node validar-datos.mjs --sheet');
}

function esc(val) {
  const s = String(val || '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

// =====================================================
// SHEET OUTPUT
// =====================================================

async function writeSheet(alumnos, issues, countByRule, validCount, duplicates) {
  if (!SHEET_ID) {
    console.error('Set PANEL_IITD_SHEET_ID env var para modo --sheet');
    process.exit(1);
  }

  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();

  const TAB = 'Validación';

  // Ensure tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  }

  // Build data
  const rows = [];
  const now = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  rows.push(['VALIDACIÓN DE DATOS — ALUMNOS IITD']);
  rows.push([`Generado: ${now}`]);
  rows.push([]);
  rows.push(['Total registros', alumnos.length]);
  rows.push(['Válidos', validCount]);
  rows.push(['Con problemas', alumnos.length - validCount]);
  rows.push([]);

  rows.push(['PROBLEMAS POR TIPO']);
  rows.push(['Tipo', 'Cantidad']);
  const sortedRules = Object.entries(countByRule).sort((a, b) => b[1] - a[1]);
  for (const [ruleId, count] of sortedRules) {
    const label = RULES.find(r => r.id === ruleId)?.label || ruleId;
    rows.push([label, count]);
  }
  rows.push([]);

  rows.push(['DETALLE DE PROBLEMAS']);
  rows.push(['Email', 'Nombre', 'Apellidos', 'Programa', 'Estado', 'Estado pago', 'Problema']);
  for (const i of issues) {
    const a = i.alumno;
    rows.push([a.email, a.nombre, a.apellidos, a.programa, a.estado, a.estadoPago, i.ruleLabel]);
  }

  // Write
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A:Z`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  console.log(`✓ Pestaña "${TAB}" actualizada en Panel IITD (${issues.length} problemas, ${duplicates.length} duplicados)`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
