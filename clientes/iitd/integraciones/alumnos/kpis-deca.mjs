#!/usr/bin/env node

/**
 * KPIs DECA automáticos (N19)
 *
 * Calcula métricas de conversión del programa DECA:
 *   - Funnel: solicitud → admitido → pagado → enrolado → activo
 *   - Tasas de conversión entre etapas
 *   - Split por variante (Infantil vs ESO)
 *   - Comparativa semana sobre semana
 *   - Histórico acumulativo
 *
 * Usage:
 *   node kpis-deca.mjs                  # Consola + Sheet
 *   node kpis-deca.mjs --dry-run        # Solo consola
 *   node kpis-deca.mjs --all-programs   # Incluir todos los programas
 *   node kpis-deca.mjs --sheet-id XXX   # Override Sheet ID
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
const ALL_PROGRAMS = process.argv.includes('--all-programs');

if (!API_KEY) { console.error('Set STACKBY_API_KEY env var'); process.exit(1); }

// =====================================================
// CONSTANTS
// =====================================================

const FUNNEL_STAGES = ['solicitud', 'admitido', 'pagado', 'enrolado', 'activo'];
const STAGE_LABELS = {
  solicitud: 'Solicitudes',
  admitido: 'Admitidos',
  pagado: 'Pagados',
  enrolado: 'Enrolados',
  activo: 'Activos',
  baja: 'Bajas',
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
// FUNNEL METRICS
// =====================================================

function isDeca(programa) {
  return programa.toUpperCase().includes('DECA');
}

function decaVariant(programa) {
  if (programa.includes('Infantil') || programa.includes('Primaria')) return 'Infantil y Primaria';
  if (programa.includes('ESO') || programa.includes('Bachillerato')) return 'ESO y Bachillerato';
  return 'DECA (otro)';
}

function computeFunnel(alumnos) {
  // Funnel counts: each stage includes students who have passed through it
  // A student with estado='activo' has been through solicitud→admitido→pagado→enrolado→activo
  const stageOrder = { solicitud: 0, admitido: 1, pagado: 2, enrolado: 3, activo: 4, baja: -1 };

  const funnel = {};
  for (const stage of FUNNEL_STAGES) funnel[stage] = 0;
  funnel.baja = 0;

  for (const a of alumnos) {
    const currentIdx = stageOrder[a.estado] ?? -1;
    if (a.estado === 'baja') {
      funnel.baja++;
      continue;
    }
    // Count in current stage and all stages they've passed through
    for (const stage of FUNNEL_STAGES) {
      if (stageOrder[stage] <= currentIdx) funnel[stage]++;
    }
  }

  return funnel;
}

function computeSnapshotCounts(alumnos) {
  // Simple current-state counts (how many are IN each state right now)
  const counts = {};
  for (const stage of [...FUNNEL_STAGES, 'baja']) counts[stage] = 0;
  for (const a of alumnos) {
    if (counts[a.estado] !== undefined) counts[a.estado]++;
  }
  return counts;
}

function computeConversionRates(funnel) {
  const rates = {};
  for (let i = 1; i < FUNNEL_STAGES.length; i++) {
    const from = FUNNEL_STAGES[i - 1];
    const to = FUNNEL_STAGES[i];
    rates[`${from}→${to}`] = funnel[from] > 0
      ? ((funnel[to] / funnel[from]) * 100).toFixed(1)
      : 'N/A';
  }
  // Overall
  const first = FUNNEL_STAGES[0];
  const last = FUNNEL_STAGES[FUNNEL_STAGES.length - 1];
  rates[`${first}→${last} (total)`] = funnel[first] > 0
    ? ((funnel[last] / funnel[first]) * 100).toFixed(1)
    : 'N/A';
  return rates;
}

function computeVariantSplit(alumnos) {
  const variants = {};
  for (const a of alumnos) {
    const v = decaVariant(a.programa);
    if (!variants[v]) variants[v] = { total: 0, activos: 0 };
    variants[v].total++;
    if (a.estado === 'activo') variants[v].activos++;
  }
  return variants;
}

function recentActivity(alumnos, days = 7) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return {
    nuevas_solicitudes: alumnos.filter(a => a.estado === 'solicitud' && a.fechaEstado && new Date(a.fechaEstado) >= cutoff).length,
    nuevos_activos: alumnos.filter(a => a.estado === 'activo' && a.fechaEstado && new Date(a.fechaEstado) >= cutoff).length,
    nuevas_bajas: alumnos.filter(a => a.estado === 'baja' && a.fechaEstado && new Date(a.fechaEstado) >= cutoff).length,
  };
}

// =====================================================
// CONSOLE OUTPUT
// =====================================================

function printKPIs(alumnos, label) {
  const funnel = computeFunnel(alumnos);
  const snapshot = computeSnapshotCounts(alumnos);
  const rates = computeConversionRates(funnel);
  const variants = computeVariantSplit(alumnos);
  const recent = recentActivity(alumnos);
  const now = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

  console.log();
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log(`║  KPIs ${label.padEnd(47)} ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`  ${now}    Total: ${alumnos.length} alumnos`);
  console.log();

  // Funnel (cumulative)
  console.log('  FUNNEL (acumulativo — han pasado por cada etapa)');
  console.log('  ' + '─'.repeat(55));
  const maxCount = Math.max(...Object.values(funnel));
  for (const stage of FUNNEL_STAGES) {
    const count = funnel[stage];
    const barLen = maxCount > 0 ? Math.round((count / maxCount) * 25) : 0;
    const bar = '█'.repeat(barLen);
    console.log(`  ${STAGE_LABELS[stage].padEnd(14)} ${count.toString().padStart(5)}  ${bar}`);
  }
  console.log(`  ${'Bajas'.padEnd(14)} ${funnel.baja.toString().padStart(5)}`);
  console.log();

  // Snapshot (current state)
  console.log('  ESTADO ACTUAL (en qué etapa están ahora)');
  console.log('  ' + '─'.repeat(40));
  for (const stage of [...FUNNEL_STAGES, 'baja']) {
    if (snapshot[stage] > 0) {
      console.log(`  ${STAGE_LABELS[stage].padEnd(14)} ${snapshot[stage].toString().padStart(5)}`);
    }
  }
  console.log();

  // Conversion rates
  console.log('  TASAS DE CONVERSIÓN');
  console.log('  ' + '─'.repeat(40));
  for (const [transition, rate] of Object.entries(rates)) {
    console.log(`  ${transition.padEnd(28)} ${rate}%`);
  }
  console.log();

  // Variant split (only for DECA)
  if (Object.keys(variants).length > 1 || !ALL_PROGRAMS) {
    console.log('  SPLIT POR VARIANTE');
    console.log('  ' + '─'.repeat(50));
    console.log(`  ${'Variante'.padEnd(25)} ${'Total'.padStart(6)} ${'Activos'.padStart(8)}`);
    for (const [v, data] of Object.entries(variants).sort((a, b) => b[1].total - a[1].total)) {
      console.log(`  ${v.padEnd(25)} ${data.total.toString().padStart(6)} ${data.activos.toString().padStart(8)}`);
    }
    console.log();
  }

  // Recent
  console.log('  ACTIVIDAD ÚLTIMOS 7 DÍAS');
  console.log('  ' + '─'.repeat(30));
  console.log(`    Nuevas solicitudes:  ${recent.nuevas_solicitudes}`);
  console.log(`    Nuevos activos:      ${recent.nuevos_activos}`);
  console.log(`    Nuevas bajas:        ${recent.nuevas_bajas}`);
  console.log();

  return { funnel, snapshot, rates, variants, recent };
}

// =====================================================
// SHEET OUTPUT
// =====================================================

async function writeToSheet(alumnos, label, computed) {
  if (!SHEET_ID) {
    console.error('Set PANEL_IITD_SHEET_ID para modo Sheet');
    return;
  }

  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({ scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth: await auth.getClient() });

  const TAB = ALL_PROGRAMS ? 'KPIs General' : 'KPIs DECA';
  const { funnel, snapshot, rates, variants, recent } = computed;
  const now = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const dateKey = new Date().toISOString().slice(0, 10);

  // Ensure tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  }

  // Build snapshot section (will be overwritten each time)
  const rows = [];
  rows.push([`KPIs ${label}`]);
  rows.push([`Última actualización: ${now}`]);
  rows.push([`Total alumnos: ${alumnos.length}`]);
  rows.push([]);

  rows.push(['FUNNEL ACUMULATIVO']);
  rows.push(['Etapa', 'Cantidad']);
  for (const stage of FUNNEL_STAGES) {
    rows.push([STAGE_LABELS[stage], funnel[stage]]);
  }
  rows.push(['Bajas', funnel.baja]);
  rows.push([]);

  rows.push(['TASAS DE CONVERSIÓN']);
  rows.push(['Transición', 'Tasa']);
  for (const [transition, rate] of Object.entries(rates)) {
    rows.push([transition, `${rate}%`]);
  }
  rows.push([]);

  if (!ALL_PROGRAMS) {
    rows.push(['SPLIT POR VARIANTE']);
    rows.push(['Variante', 'Total', 'Activos']);
    for (const [v, data] of Object.entries(variants).sort((a, b) => b[1].total - a[1].total)) {
      rows.push([v, data.total, data.activos]);
    }
    rows.push([]);
  }

  rows.push(['ACTIVIDAD ÚLTIMOS 7 DÍAS']);
  rows.push(['Métrica', 'Cantidad']);
  rows.push(['Nuevas solicitudes', recent.nuevas_solicitudes]);
  rows.push(['Nuevos activos', recent.nuevos_activos]);
  rows.push(['Nuevas bajas', recent.nuevas_bajas]);
  rows.push([]);

  // Historical tracking header
  const HIST_HEADER = ['Fecha', 'Solicitudes', 'Admitidos', 'Pagados', 'Enrolados', 'Activos', 'Bajas', 'Tasa total'];
  const histStartRow = rows.length + 1; // 1-indexed

  rows.push(['HISTÓRICO SEMANAL']);
  rows.push(HIST_HEADER);

  // Read existing historical data
  let existingHist = [];
  try {
    const histRange = `'${TAB}'!A${histStartRow + 2}:H1000`;
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: histRange,
    });
    existingHist = (existing.data.values || []).filter(r => r[0] && r[0] !== 'Fecha' && r[0] !== 'HISTÓRICO SEMANAL');
  } catch {
    // Tab is new or empty
  }

  // Check if today already has a row
  const todayIdx = existingHist.findIndex(r => r[0] === dateKey);
  const totalRate = rates[`${FUNNEL_STAGES[0]}→${FUNNEL_STAGES[FUNNEL_STAGES.length - 1]} (total)`];
  const newRow = [dateKey, funnel.solicitud, funnel.admitido, funnel.pagado, funnel.enrolado, funnel.activo, funnel.baja, `${totalRate}%`];

  if (todayIdx >= 0) {
    existingHist[todayIdx] = newRow; // Update today's row
  } else {
    existingHist.push(newRow); // Append new row
  }

  for (const histRow of existingHist) {
    rows.push(histRow);
  }

  // Write everything
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

  console.log(`✓ Pestaña "${TAB}" actualizada en Panel IITD (${existingHist.length} filas históricas)`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.error('Leyendo registros de Stackby...');
  const rows = await getAllRows();
  console.error(`  ${rows.length} registros leídos\n`);

  let alumnos = rows.map(r => ({
    email: (r.field?.Email || '').trim(),
    nombre: (r.field?.Nombre || '').trim(),
    apellidos: (r.field?.Apellidos || '').trim(),
    programa: (r.field?.Programa || '').trim(),
    estado: (r.field?.Estado || '').trim().toLowerCase(),
    fechaEstado: r.field?.['Fecha estado'] || '',
    estadoPago: (r.field?.['Estado pago'] || '').trim().toLowerCase(),
    fechaPago: r.field?.['Fecha pago'] || '',
  }));

  const label = ALL_PROGRAMS ? 'TODOS LOS PROGRAMAS' : 'DECA';

  if (!ALL_PROGRAMS) {
    alumnos = alumnos.filter(a => isDeca(a.programa));
  }

  if (alumnos.length === 0) {
    console.log(`No se encontraron alumnos ${ALL_PROGRAMS ? '' : 'DECA'}.`);
    return;
  }

  const computed = printKPIs(alumnos, label);

  if (!DRY_RUN) {
    try {
      await writeToSheet(alumnos, label, computed);
    } catch (err) {
      console.error(`⚠ No se pudo escribir al Sheet: ${err.message}`);
    }
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
