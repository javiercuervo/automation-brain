#!/usr/bin/env node

/**
 * Informe de Compliance de Grabaciones — RGPD (N28)
 *
 * Genera informe completo de compliance para grabaciones:
 *   - Resumen por estado y programa
 *   - Control de acceso (emails autorizados, profesores)
 *   - Consentimiento promocional
 *   - Caducidad y proximas a caducar
 *   - Audit trail (ultimos accesos)
 *
 * Usage:
 *   node grabaciones-compliance.mjs                 # Informe consola
 *   node grabaciones-compliance.mjs --csv           # CSV a stdout
 *   node grabaciones-compliance.mjs --sheet         # Pestana "Grabaciones Compliance" en Panel IITD
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

const TODAY = new Date().toISOString().split('T')[0];

// =====================================================
// DATA LOADING
// =====================================================

async function loadGrabaciones() {
  const { listarGrabaciones } = await import('../compartido/grabaciones-client.mjs');
  return listarGrabaciones();
}

async function loadRecentAudit() {
  try {
    const { listarAudit } = await import('../compartido/audit-client.mjs');
    const all = await listarAudit({ tabla: 'GRABACIONES' });
    // Sort by most recent and take last 30
    return all
      .filter(a => a.operacion === 'READ')
      .sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''))
      .slice(0, 30);
  } catch {
    return [];
  }
}

// =====================================================
// ANALYSIS
// =====================================================

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function analyzeCompliance(grabaciones) {
  const result = {
    total: grabaciones.length,
    porEstado: {},
    porPrograma: {},
    sinEmailsAutorizados: [],
    sinProfesores: [],
    consentimiento: { si: 0, no: 0, revocado: 0 },
    proximasACaducar: [],
    sinCaducidad: [],
    expiradas: [],
  };

  for (const g of grabaciones) {
    // Por estado
    result.porEstado[g.estado] = (result.porEstado[g.estado] || 0) + 1;

    // Por programa
    const prog = g.programa || 'Sin programa';
    result.porPrograma[prog] = (result.porPrograma[prog] || 0) + 1;

    // Acceso
    if (g.estado === 'activa') {
      if (!g.emailsAutorizados || g.emailsAutorizados.trim() === '') {
        result.sinEmailsAutorizados.push(g);
      }
      if (!g.profesores || g.profesores.trim() === '') {
        result.sinProfesores.push(g);
      }
    }

    // Consentimiento
    const consent = (g.consentimientoPromocional || 'no').toLowerCase();
    if (consent === 'si') result.consentimiento.si++;
    else if (consent === 'revocado') result.consentimiento.revocado++;
    else result.consentimiento.no++;

    // Caducidad (solo activas)
    if (g.estado === 'activa') {
      if (!g.fechaCaducidad) {
        result.sinCaducidad.push(g);
      } else {
        const dias = daysBetween(TODAY, g.fechaCaducidad);
        if (dias < 0) {
          result.expiradas.push({ ...g, diasRestantes: dias });
        } else if (dias <= 30) {
          result.proximasACaducar.push({ ...g, diasRestantes: dias });
        }
      }
    }
  }

  return result;
}

// =====================================================
// CONSOLE OUTPUT
// =====================================================

function printConsole(analysis, auditEntries) {
  console.log(`\n========================================`);
  console.log(`  COMPLIANCE GRABACIONES — ${TODAY}`);
  console.log(`========================================\n`);

  // Resumen
  console.log(`Total grabaciones: ${analysis.total}\n`);
  console.log(`  Por estado:`);
  for (const [estado, count] of Object.entries(analysis.porEstado)) {
    console.log(`    ${estado}: ${count}`);
  }

  console.log(`\n  Por programa:`);
  for (const [prog, count] of Object.entries(analysis.porPrograma)) {
    console.log(`    ${prog}: ${count}`);
  }

  // Acceso
  console.log(`\n--- Control de acceso ---`);
  console.log(`  Sin emails autorizados: ${analysis.sinEmailsAutorizados.length}`);
  for (const g of analysis.sinEmailsAutorizados) {
    console.log(`    - ${g.curso}: "${g.tituloSesion}"`);
  }
  console.log(`  Sin profesores asignados: ${analysis.sinProfesores.length}`);
  for (const g of analysis.sinProfesores) {
    console.log(`    - ${g.curso}: "${g.tituloSesion}"`);
  }

  // Consentimiento
  console.log(`\n--- Consentimiento promocional ---`);
  console.log(`  Si: ${analysis.consentimiento.si}`);
  console.log(`  No: ${analysis.consentimiento.no}`);
  console.log(`  Revocado: ${analysis.consentimiento.revocado}`);

  // Caducidad
  console.log(`\n--- Caducidad ---`);
  console.log(`  Expiradas (activas pasadas de fecha): ${analysis.expiradas.length}`);
  for (const g of analysis.expiradas) {
    console.log(`    - ${g.curso}: "${g.tituloSesion}" — caduco hace ${-g.diasRestantes} dias`);
  }
  console.log(`  Proximas a caducar (<30 dias): ${analysis.proximasACaducar.length}`);
  for (const g of analysis.proximasACaducar) {
    console.log(`    - ${g.curso}: "${g.tituloSesion}" — caduca en ${g.diasRestantes} dias`);
  }
  console.log(`  Sin fecha de caducidad: ${analysis.sinCaducidad.length}`);
  for (const g of analysis.sinCaducidad) {
    console.log(`    - ${g.curso}: "${g.tituloSesion}"`);
  }

  // Audit trail
  if (auditEntries.length > 0) {
    console.log(`\n--- Ultimos accesos (${auditEntries.length}) ---`);
    for (const a of auditEntries.slice(0, 10)) {
      console.log(`  ${a.timestamp || '-'} | ${a.usuario || '-'} | ${a.detalles || '-'}`);
    }
    if (auditEntries.length > 10) {
      console.log(`  ... y ${auditEntries.length - 10} mas`);
    }
  }

  console.log();
}

// =====================================================
// CSV OUTPUT
// =====================================================

function csvEscape(s) {
  if (!s) return '';
  if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function printCSV(grabaciones, analysis) {
  console.log('Curso,Programa,Titulo,Estado,Emails autorizados,Profesores,Consentimiento,Fecha caducidad,Problema');
  for (const g of grabaciones) {
    const problemas = [];
    if (g.estado === 'activa' && (!g.emailsAutorizados || !g.emailsAutorizados.trim())) problemas.push('sin_emails');
    if (g.estado === 'activa' && (!g.profesores || !g.profesores.trim())) problemas.push('sin_profesores');
    if (g.estado === 'activa' && !g.fechaCaducidad) problemas.push('sin_caducidad');
    if (g.estado === 'activa' && g.fechaCaducidad && g.fechaCaducidad < TODAY) problemas.push('expirada');

    console.log([
      csvEscape(g.curso), csvEscape(g.programa), csvEscape(g.tituloSesion),
      g.estado, csvEscape(g.emailsAutorizados), csvEscape(g.profesores),
      g.consentimientoPromocional, g.fechaCaducidad || '',
      problemas.join(';'),
    ].join(','));
  }
}

// =====================================================
// SHEET OUTPUT
// =====================================================

async function writeSheet(grabaciones, analysis, auditEntries) {
  if (!SHEET_ID) {
    console.error('Error: PANEL_IITD_SHEET_ID no configurado');
    process.exit(1);
  }

  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();
  const TAB = 'Grabaciones Compliance';

  // Ensure tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  }

  const rows = [
    ['Compliance Grabaciones RGPD', '', '', '', '', `Generado: ${new Date().toISOString()}`],
    [],
    ['RESUMEN'],
    ['Total grabaciones', String(analysis.total)],
    [],
    ['Por estado'],
    ...Object.entries(analysis.porEstado).map(([k, v]) => [k, String(v)]),
    [],
    ['Por programa'],
    ...Object.entries(analysis.porPrograma).map(([k, v]) => [k, String(v)]),
    [],
    ['CONTROL DE ACCESO'],
    ['Sin emails autorizados', String(analysis.sinEmailsAutorizados.length)],
    ['Sin profesores asignados', String(analysis.sinProfesores.length)],
    [],
    ['CONSENTIMIENTO PROMOCIONAL'],
    ['Si', String(analysis.consentimiento.si)],
    ['No', String(analysis.consentimiento.no)],
    ['Revocado', String(analysis.consentimiento.revocado)],
    [],
    ['CADUCIDAD'],
    ['Expiradas', String(analysis.expiradas.length)],
    ['Proximas (<30d)', String(analysis.proximasACaducar.length)],
    ['Sin caducidad', String(analysis.sinCaducidad.length)],
    [],
    ['DETALLE'],
    ['Curso', 'Programa', 'Titulo', 'Estado', 'Emails autorizados', 'Profesores', 'Consentimiento', 'Caducidad', 'Problemas'],
  ];

  for (const g of grabaciones) {
    const problemas = [];
    if (g.estado === 'activa' && (!g.emailsAutorizados || !g.emailsAutorizados.trim())) problemas.push('sin_emails');
    if (g.estado === 'activa' && (!g.profesores || !g.profesores.trim())) problemas.push('sin_profesores');
    if (g.estado === 'activa' && !g.fechaCaducidad) problemas.push('sin_caducidad');
    if (g.estado === 'activa' && g.fechaCaducidad && g.fechaCaducidad < TODAY) problemas.push('expirada');

    rows.push([
      g.curso, g.programa || '', g.tituloSesion, g.estado,
      g.emailsAutorizados || '', g.profesores || '',
      g.consentimientoPromocional, g.fechaCaducidad || '',
      problemas.join(', '),
    ]);
  }

  if (auditEntries.length > 0) {
    rows.push([]);
    rows.push(['ULTIMOS ACCESOS']);
    rows.push(['Timestamp', 'Usuario', 'Operacion', 'Detalles']);
    for (const a of auditEntries) {
      rows.push([a.timestamp || '', a.usuario || '', a.operacion || '', a.detalles || '']);
    }
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `'${TAB}'!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  console.log(`  Pestana "${TAB}" actualizada en Panel IITD (${rows.length} filas)`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`
Compliance de Grabaciones — RGPD (N28)

Comandos:
  (sin flags)    Informe consola
  --csv          CSV a stdout
  --sheet        Pestana "Grabaciones Compliance" en Panel IITD
`);
    return;
  }

  const grabaciones = await loadGrabaciones();
  const auditEntries = await loadRecentAudit();
  const analysis = analyzeCompliance(grabaciones);

  if (CSV_MODE) {
    printCSV(grabaciones, analysis);
  } else if (SHEET_MODE) {
    printConsole(analysis, auditEntries);
    await writeSheet(grabaciones, analysis, auditEntries);
  } else {
    printConsole(analysis, auditEntries);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
