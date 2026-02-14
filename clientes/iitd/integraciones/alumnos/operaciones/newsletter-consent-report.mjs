#!/usr/bin/env node

/**
 * Newsletter Consent Report — IITD (N34)
 *
 * Informe de consentimiento para newsletter RGPD.
 * Estadisticas de suscriptores, desglose por tipo/base_legal/estado,
 * cambios recientes.
 *
 * Usage:
 *   node newsletter-consent-report.mjs                  # Informe consola
 *   node newsletter-consent-report.mjs --csv            # CSV a stdout
 *   node newsletter-consent-report.mjs --sheet          # Tab "Newsletter RGPD" en Panel IITD
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

const SHEET_ID = process.env.PANEL_IITD_SHEET_ID;
const CSV_MODE = process.argv.includes('--csv');
const SHEET_MODE = process.argv.includes('--sheet');

// =====================================================
// DATA
// =====================================================

async function getData() {
  const { listSubscribers } = await import('../compartido/newsletter-client.mjs');
  return listSubscribers();
}

function analyze(subs) {
  const byEstado = {}, byTipo = {}, byBase = {};
  const recientes = []; // last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  for (const s of subs) {
    byEstado[s.consentimiento] = (byEstado[s.consentimiento] || 0) + 1;
    byTipo[s.tipo || 'sin_tipo'] = (byTipo[s.tipo || 'sin_tipo'] || 0) + 1;
    byBase[s.baseLegal || 'sin_base'] = (byBase[s.baseLegal || 'sin_base'] || 0) + 1;

    if (s.fechaConsentimiento && new Date(s.fechaConsentimiento) >= cutoff) {
      recientes.push(s);
    }
    if (s.fechaBaja && new Date(s.fechaBaja) >= cutoff) {
      recientes.push(s);
    }
  }

  const suscritos = subs.filter(s => s.consentimiento === 'suscrito');
  const bajas = subs.filter(s => s.consentimiento === 'baja');

  return { total: subs.length, suscritos: suscritos.length, bajas: bajas.length, byEstado, byTipo, byBase, recientes };
}

// =====================================================
// OUTPUT
// =====================================================

function printConsole(subs, analysis) {
  const { total, suscritos, bajas, byEstado, byTipo, byBase, recientes } = analysis;

  console.log('=== INFORME NEWSLETTER RGPD ===');
  console.log(`Fecha: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Total registros: ${total}`);
  console.log();
  console.log(`  Suscritos:  ${suscritos}`);
  console.log(`  Bajas:      ${bajas}`);
  console.log(`  Pendientes: ${byEstado.pendiente || 0}`);
  console.log();
  console.log('--- Por tipo ---');
  for (const [k, v] of Object.entries(byTipo)) console.log(`  ${k}: ${v}`);
  console.log();
  console.log('--- Por base legal ---');
  for (const [k, v] of Object.entries(byBase)) console.log(`  ${k}: ${v}`);

  if (recientes.length > 0) {
    console.log();
    console.log(`--- Cambios recientes (ultimos 30 dias): ${recientes.length} ---`);
    for (const s of recientes.slice(0, 20)) {
      const fecha = s.fechaBaja || s.fechaConsentimiento || '';
      const accion = s.consentimiento === 'baja' ? 'BAJA' : 'ALTA';
      console.log(`  ${fecha.substring(0, 10)}  ${accion}  ${s.email}  (${s.tipo})`);
    }
    if (recientes.length > 20) console.log(`  ... y ${recientes.length - 20} mas`);
  }
}

function toCSV(subs) {
  const lines = ['Email,Nombre,Tipo,Base Legal,Consentimiento,Fecha Consentimiento,Origen,Fecha Baja'];
  for (const s of subs) {
    lines.push([
      esc(s.email), esc(s.nombre), esc(s.tipo), esc(s.baseLegal),
      esc(s.consentimiento), esc(s.fechaConsentimiento),
      esc(s.origen), esc(s.fechaBaja),
    ].join(','));
  }
  return lines.join('\n');
}

function esc(val) {
  const s = String(val || '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

// =====================================================
// SHEET
// =====================================================

async function writeSheet(subs, analysis) {
  if (!SHEET_ID) { console.error('PANEL_IITD_SHEET_ID no configurado'); return; }

  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();

  const { total, suscritos, bajas, byEstado, byTipo, byBase } = analysis;
  const fecha = new Date().toISOString().split('T')[0];

  const rows = [
    ['INFORME NEWSLETTER RGPD', '', '', '', '', '', fecha],
    [],
    ['Total', total, '', 'Suscritos', suscritos, '', 'Bajas', bajas],
    [],
    ['POR TIPO'],
    ...Object.entries(byTipo).map(([k, v]) => [k, v]),
    [],
    ['POR BASE LEGAL'],
    ...Object.entries(byBase).map(([k, v]) => [k, v]),
    [],
    ['DETALLE SUSCRIPTORES'],
    ['Email', 'Nombre', 'Tipo', 'Base Legal', 'Consentimiento', 'Fecha', 'Origen'],
    ...subs.map(s => [
      s.email, s.nombre, s.tipo, s.baseLegal,
      s.consentimiento, (s.fechaConsentimiento || '').substring(0, 10), s.origen,
    ]),
  ];

  const TAB = 'Newsletter RGPD';
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    console.log(`  Pestana "${TAB}" creada.`);
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `'${TAB}'!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
  console.log(`Pestana "${TAB}" actualizada en Panel IITD.`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`
Newsletter Consent Report IITD (N34)

Usage:
  node newsletter-consent-report.mjs            Informe consola
  node newsletter-consent-report.mjs --csv      CSV a stdout
  node newsletter-consent-report.mjs --sheet    Tab "Newsletter RGPD" en Panel IITD
`);
    return;
  }

  console.error('Leyendo suscriptores...');
  const subs = await getData();
  console.error(`${subs.length} registros leidos.`);

  const analysis = analyze(subs);

  if (CSV_MODE) {
    console.log(toCSV(subs));
  } else if (SHEET_MODE) {
    printConsole(subs, analysis);
    await writeSheet(subs, analysis);
  } else {
    printConsole(subs, analysis);
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
