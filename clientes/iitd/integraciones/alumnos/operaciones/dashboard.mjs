#!/usr/bin/env node

/**
 * Dashboard operativo diario (N16)
 *
 * Consulta Stackby ALUMNOS y genera un dashboard con:
 *   - Resumen por estado del pipeline
 *   - Resumen por programa
 *   - Estado de pagos
 *   - Alertas (solicitudes pendientes, pagos atrasados, etc.)
 *   - Actividad reciente (últimos 7 días)
 *
 * Usage:
 *   node dashboard.mjs                  # Consola + Sheet
 *   node dashboard.mjs --dry-run        # Solo consola
 *   node dashboard.mjs --sheet-id XXX   # Override Sheet ID
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

const SHEET_ID_ARG = (() => {
  const idx = process.argv.indexOf('--sheet-id');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();
const SHEET_ID = SHEET_ID_ARG || process.env.PANEL_IITD_SHEET_ID;
const DRY_RUN = process.argv.includes('--dry-run');

if (!API_KEY) { console.error('Set STACKBY_API_KEY env var'); process.exit(1); }

// =====================================================
// CONSTANTS
// =====================================================

const VALID_ESTADOS = ['solicitud', 'admitido', 'pagado', 'enrolado', 'activo', 'baja'];
const VALID_PAGO = ['pendiente', 'parcial', 'pagado'];

const PROGRAMA_SHORT = {
  'DECLARACIÓN ECLESIÁSTICA COMPETENCIA ACADEMICA (DECA)': 'DECA',
  'ESCUELA DE EVANGELIZADORES': 'Evangelizadores',
  'FORMACIÓN SISTEMÁTICA': 'Form. Sistemática',
  'FORMACIÓN BÍBLICA': 'Form. Bíblica',
  'COMPROMISO LAICAL Y DOCTRINA SOCIAL': 'Compromiso Laical',
  'GENERAL': 'General',
};

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
// METRICS
// =====================================================

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d)) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function shortProg(prog) {
  return PROGRAMA_SHORT[prog] || prog || '(sin programa)';
}

function computeMetrics(alumnos) {
  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // By estado
  const byEstado = {};
  for (const e of VALID_ESTADOS) byEstado[e] = 0;
  byEstado['(vacío)'] = 0;
  byEstado['(otro)'] = 0;
  for (const a of alumnos) {
    const e = a.estado?.toLowerCase() || '';
    if (VALID_ESTADOS.includes(e)) byEstado[e]++;
    else if (!e) byEstado['(vacío)']++;
    else byEstado['(otro)']++;
  }

  // By programa (split multi-program)
  const byPrograma = {};
  for (const a of alumnos) {
    const progs = a.programa.split(',').map(p => p.trim()).filter(Boolean);
    if (progs.length === 0) progs.push('');
    for (const p of progs) {
      const key = shortProg(p);
      if (!byPrograma[key]) byPrograma[key] = { total: 0, activos: 0, solicitudes: 0, pagados: 0 };
      byPrograma[key].total++;
      if (a.estado === 'activo') byPrograma[key].activos++;
      if (a.estado === 'solicitud') byPrograma[key].solicitudes++;
      if (a.estadoPago === 'pagado') byPrograma[key].pagados++;
    }
  }

  // By pago
  const byPago = {};
  for (const p of VALID_PAGO) byPago[p] = 0;
  byPago['(vacío)'] = 0;
  for (const a of alumnos) {
    const p = a.estadoPago?.toLowerCase() || '';
    if (VALID_PAGO.includes(p)) byPago[p]++;
    else byPago['(vacío)']++;
  }

  // Alerts
  const alerts = {
    solicitud_7d: alumnos.filter(a => a.estado === 'solicitud' && daysSince(a.fechaEstado) > 7),
    admitido_sin_pago_14d: alumnos.filter(a => a.estado === 'admitido' && a.estadoPago !== 'pagado' && daysSince(a.fechaEstado) > 14),
    activo_sin_programa: alumnos.filter(a => a.estado === 'activo' && !a.programa),
    email_invalido: alumnos.filter(a => !a.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email)),
  };

  // Recent activity (last 7 days)
  const recent = {
    nuevas_solicitudes: alumnos.filter(a => a.estado === 'solicitud' && a.fechaEstado && new Date(a.fechaEstado) >= sevenDaysAgo).length,
    nuevos_pagos: alumnos.filter(a => a.estadoPago === 'pagado' && a.fechaPago && new Date(a.fechaPago) >= sevenDaysAgo).length,
    nuevas_bajas: alumnos.filter(a => a.estado === 'baja' && a.fechaEstado && new Date(a.fechaEstado) >= sevenDaysAgo).length,
  };

  return { byEstado, byPrograma, byPago, alerts, recent };
}

// =====================================================
// CONSOLE OUTPUT
// =====================================================

function printDashboard(alumnos, metrics) {
  const { byEstado, byPrograma, byPago, alerts, recent } = metrics;
  const now = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  console.log();
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         DASHBOARD OPERATIVO — IITD                   ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`  ${now}    Total: ${alumnos.length} registros`);
  console.log();

  // Estado pipeline
  console.log('  PIPELINE POR ESTADO');
  console.log('  ' + '─'.repeat(45));
  for (const e of VALID_ESTADOS) {
    const count = byEstado[e];
    const pct = ((count / alumnos.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.round(count / alumnos.length * 30));
    console.log(`  ${e.padEnd(12)} ${count.toString().padStart(5)}  ${pct.padStart(5)}%  ${bar}`);
  }
  if (byEstado['(vacío)'] > 0) console.log(`  (vacío)      ${byEstado['(vacío)'].toString().padStart(5)}`);
  console.log();

  // Programa
  console.log('  ALUMNOS POR PROGRAMA');
  console.log('  ' + '─'.repeat(65));
  console.log(`  ${'Programa'.padEnd(22)} ${'Total'.padStart(6)} ${'Activos'.padStart(8)} ${'Pagados'.padStart(8)} ${'Solic.'.padStart(7)}`);
  const sortedProgs = Object.entries(byPrograma).sort((a, b) => b[1].total - a[1].total);
  for (const [prog, data] of sortedProgs) {
    console.log(`  ${prog.padEnd(22)} ${data.total.toString().padStart(6)} ${data.activos.toString().padStart(8)} ${data.pagados.toString().padStart(8)} ${data.solicitudes.toString().padStart(7)}`);
  }
  console.log();

  // Pago
  console.log('  ESTADO DE PAGO');
  console.log('  ' + '─'.repeat(30));
  for (const [estado, count] of Object.entries(byPago)) {
    if (count > 0) console.log(`  ${estado.padEnd(12)} ${count.toString().padStart(5)}`);
  }
  console.log();

  // Alerts
  const totalAlerts = Object.values(alerts).reduce((s, a) => s + a.length, 0);
  if (totalAlerts > 0) {
    console.log(`  ⚠ ALERTAS (${totalAlerts})`);
    console.log('  ' + '─'.repeat(50));
    if (alerts.solicitud_7d.length > 0) {
      console.log(`    Solicitud pendiente >7 días: ${alerts.solicitud_7d.length}`);
      for (const a of alerts.solicitud_7d.slice(0, 5)) {
        console.log(`      ${a.apellidos}, ${a.nombre} <${a.email}> (${daysSince(a.fechaEstado)}d)`);
      }
      if (alerts.solicitud_7d.length > 5) console.log(`      ... y ${alerts.solicitud_7d.length - 5} más`);
    }
    if (alerts.admitido_sin_pago_14d.length > 0) {
      console.log(`    Admitido sin pago >14 días: ${alerts.admitido_sin_pago_14d.length}`);
      for (const a of alerts.admitido_sin_pago_14d.slice(0, 5)) {
        console.log(`      ${a.apellidos}, ${a.nombre} <${a.email}> (${daysSince(a.fechaEstado)}d)`);
      }
    }
    if (alerts.activo_sin_programa.length > 0) {
      console.log(`    Activo sin programa: ${alerts.activo_sin_programa.length}`);
    }
    if (alerts.email_invalido.length > 0) {
      console.log(`    Email inválido/vacío: ${alerts.email_invalido.length}`);
      for (const a of alerts.email_invalido.slice(0, 3)) {
        console.log(`      ${a.apellidos}, ${a.nombre} <${a.email || '(vacío)'}>`);
      }
    }
    console.log();
  }

  // Recent
  console.log('  ACTIVIDAD ÚLTIMOS 7 DÍAS');
  console.log('  ' + '─'.repeat(30));
  console.log(`    Nuevas solicitudes:  ${recent.nuevas_solicitudes}`);
  console.log(`    Nuevos pagos:        ${recent.nuevos_pagos}`);
  console.log(`    Nuevas bajas:        ${recent.nuevas_bajas}`);
  console.log();
}

// =====================================================
// SHEET OUTPUT
// =====================================================

async function writeToSheet(alumnos, metrics) {
  if (!SHEET_ID) {
    console.error('Set PANEL_IITD_SHEET_ID env var para modo Sheet');
    return;
  }

  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();

  const TAB = 'Dashboard';
  const { byEstado, byPrograma, byPago, alerts, recent } = metrics;
  const now = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  // Ensure tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  }

  const rows = [];
  rows.push(['DASHBOARD OPERATIVO — IITD']);
  rows.push([`Última actualización: ${now}`]);
  rows.push([`Total registros: ${alumnos.length}`]);
  rows.push([]);

  // Estado
  rows.push(['PIPELINE POR ESTADO']);
  rows.push(['Estado', 'Cantidad', '%']);
  for (const e of VALID_ESTADOS) {
    const count = byEstado[e];
    rows.push([e, count, `${((count / alumnos.length) * 100).toFixed(1)}%`]);
  }
  rows.push([]);

  // Programa
  rows.push(['ALUMNOS POR PROGRAMA']);
  rows.push(['Programa', 'Total', 'Activos', 'Pagados', 'Solicitudes']);
  const sortedProgs = Object.entries(byPrograma).sort((a, b) => b[1].total - a[1].total);
  for (const [prog, data] of sortedProgs) {
    rows.push([prog, data.total, data.activos, data.pagados, data.solicitudes]);
  }
  rows.push([]);

  // Pago
  rows.push(['ESTADO DE PAGO']);
  rows.push(['Estado', 'Cantidad']);
  for (const [estado, count] of Object.entries(byPago)) {
    if (count > 0) rows.push([estado, count]);
  }
  rows.push([]);

  // Alerts
  rows.push(['ALERTAS']);
  rows.push(['Tipo', 'Cantidad']);
  rows.push(['Solicitud pendiente >7 días', alerts.solicitud_7d.length]);
  rows.push(['Admitido sin pago >14 días', alerts.admitido_sin_pago_14d.length]);
  rows.push(['Activo sin programa', alerts.activo_sin_programa.length]);
  rows.push(['Email inválido/vacío', alerts.email_invalido.length]);
  rows.push([]);

  // Alert detail
  if (alerts.solicitud_7d.length > 0 || alerts.admitido_sin_pago_14d.length > 0) {
    rows.push(['DETALLE ALERTAS']);
    rows.push(['Tipo', 'Email', 'Nombre', 'Apellidos', 'Días']);
    for (const a of alerts.solicitud_7d) {
      rows.push(['Solicitud >7d', a.email, a.nombre, a.apellidos, daysSince(a.fechaEstado)]);
    }
    for (const a of alerts.admitido_sin_pago_14d) {
      rows.push(['Sin pago >14d', a.email, a.nombre, a.apellidos, daysSince(a.fechaEstado)]);
    }
    rows.push([]);
  }

  // Recent
  rows.push(['ACTIVIDAD ÚLTIMOS 7 DÍAS']);
  rows.push(['Métrica', 'Cantidad']);
  rows.push(['Nuevas solicitudes', recent.nuevas_solicitudes]);
  rows.push(['Nuevos pagos', recent.nuevos_pagos]);
  rows.push(['Nuevas bajas', recent.nuevas_bajas]);

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

  console.log(`✓ Pestaña "${TAB}" actualizada en Panel IITD`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.error('Leyendo registros de Stackby...');
  const rows = await getAllRows();
  console.error(`  ${rows.length} registros leídos\n`);

  const alumnos = rows.map(r => ({
    email: (r.field?.Email || '').trim(),
    nombre: (r.field?.Nombre || '').trim(),
    apellidos: (r.field?.Apellidos || '').trim(),
    programa: (r.field?.Programa || '').trim(),
    estado: (r.field?.Estado || '').trim().toLowerCase(),
    fechaEstado: r.field?.['Fecha estado'] || '',
    estadoPago: (r.field?.['Estado pago'] || '').trim().toLowerCase(),
    fechaPago: r.field?.['Fecha pago'] || '',
    fuente: r.field?.Fuente || '',
  }));

  const metrics = computeMetrics(alumnos);

  printDashboard(alumnos, metrics);

  if (!DRY_RUN) {
    try {
      await writeToSheet(alumnos, metrics);
    } catch (err) {
      console.error(`⚠ No se pudo escribir al Sheet: ${err.message}`);
      console.error('  El dashboard de consola se generó correctamente.');
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
