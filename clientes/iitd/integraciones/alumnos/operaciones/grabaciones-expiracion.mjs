#!/usr/bin/env node

/**
 * Caducidad de grabaciones — RGPD Art. 5.1.e (N46)
 *
 * Job de expiracion: revisa todas las grabaciones activas,
 * marca como caducadas las que superan su fecha_caducidad.
 *
 * Plazos:
 *   - Grabaciones activas: hasta fecha_caducidad
 *   - Grabaciones caducadas >30 dias: archivado automatico
 *
 * Usage:
 *   node grabaciones-expiracion.mjs                            # Informe consola
 *   node grabaciones-expiracion.mjs --csv                      # CSV a stdout
 *   node grabaciones-expiracion.mjs --sheet                    # Pestana "Grabaciones RGPD" en Panel IITD
 *   node grabaciones-expiracion.mjs --expire --dry-run         # Preview caducidad
 *   node grabaciones-expiracion.mjs --expire --confirm         # Marcar caducadas en Stackby
 *   node grabaciones-expiracion.mjs --archive --dry-run        # Preview archivado (caducadas >30 dias)
 *   node grabaciones-expiracion.mjs --archive --confirm        # Archivar caducadas antiguas
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

// CLI args
const CSV_MODE = process.argv.includes('--csv');
const SHEET_MODE = process.argv.includes('--sheet');
const EXPIRE_MODE = process.argv.includes('--expire');
const ARCHIVE_MODE = process.argv.includes('--archive');
const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');

if ((EXPIRE_MODE || ARCHIVE_MODE) && !DRY_RUN && !CONFIRM) {
  console.error('Error: --expire/--archive requiere --dry-run o --confirm');
  console.error('  --expire --dry-run    Preview caducidad');
  console.error('  --expire --confirm    Marcar caducadas (IRREVERSIBLE)');
  process.exit(1);
}

// =====================================================
// ANALYSIS
// =====================================================

const TODAY = new Date().toISOString().split('T')[0];

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

function analyzeGrabacion(g) {
  const result = {
    id: g.id,
    curso: g.curso,
    titulo: g.tituloSesion,
    estado: g.estado,
    fechaCaducidad: g.fechaCaducidad,
    categoria: 'activa',
    diasRestantes: null,
    accion: null,
  };

  if (g.estado === 'eliminada') {
    result.categoria = 'eliminada';
    return result;
  }

  if (g.estado === 'archivada') {
    result.categoria = 'archivada';
    return result;
  }

  if (g.estado === 'caducada') {
    result.categoria = 'caducada';
    if (g.fechaCaducidad) {
      const diasDesde = daysBetween(g.fechaCaducidad, TODAY);
      if (diasDesde > 30) {
        result.accion = 'archivar';
      }
      result.diasRestantes = -diasDesde;
    }
    return result;
  }

  // estado === 'activa'
  if (!g.fechaCaducidad) {
    result.categoria = 'sin_caducidad';
    return result;
  }

  const diasRestantes = daysBetween(TODAY, g.fechaCaducidad);
  result.diasRestantes = diasRestantes;

  if (diasRestantes < 0) {
    result.categoria = 'expirada';
    result.accion = 'caducar';
  } else if (diasRestantes <= 30) {
    result.categoria = 'proxima';
  }

  return result;
}

// =====================================================
// COMMANDS
// =====================================================

async function loadGrabaciones() {
  const { listarGrabaciones } = await import('../compartido/grabaciones-client.mjs');
  return listarGrabaciones();
}

async function cmdConsole() {
  const grabaciones = await loadGrabaciones();
  const results = grabaciones.map(analyzeGrabacion);

  const activas = results.filter(r => r.categoria === 'activa');
  const proximas = results.filter(r => r.categoria === 'proxima');
  const expiradas = results.filter(r => r.categoria === 'expirada');
  const sinCaducidad = results.filter(r => r.categoria === 'sin_caducidad');
  const caducadas = results.filter(r => r.categoria === 'caducada');
  const archivadas = results.filter(r => r.categoria === 'archivada');
  const archivables = results.filter(r => r.accion === 'archivar');

  console.log(`\nInforme de grabaciones — ${TODAY}\n`);
  console.log(`  Total: ${grabaciones.length}`);
  console.log(`  Activas: ${activas.length}`);
  console.log(`  Proximas a caducar (<30 dias): ${proximas.length}`);
  console.log(`  Expiradas (activas pasadas de fecha): ${expiradas.length}`);
  console.log(`  Sin fecha caducidad: ${sinCaducidad.length}`);
  console.log(`  Caducadas: ${caducadas.length}`);
  console.log(`  Archivadas: ${archivadas.length}`);
  console.log(`  Archivables (caducadas >30 dias): ${archivables.length}`);

  if (proximas.length > 0) {
    console.log(`\nProximas a caducar:`);
    for (const r of proximas) {
      console.log(`  - ${r.curso}: "${r.titulo}" — caduca en ${r.diasRestantes} dias (${r.fechaCaducidad})`);
    }
  }

  if (expiradas.length > 0) {
    console.log(`\nExpiradas (requieren accion):`);
    for (const r of expiradas) {
      console.log(`  - ${r.curso}: "${r.titulo}" — caduco hace ${-r.diasRestantes} dias (${r.fechaCaducidad})`);
    }
    console.log(`\n  Para marcar como caducadas: node operaciones/grabaciones-expiracion.mjs --expire --dry-run`);
  }

  if (sinCaducidad.length > 0) {
    console.log(`\nSin fecha de caducidad (revisar):`);
    for (const r of sinCaducidad) {
      console.log(`  - ${r.curso}: "${r.titulo}" — sin fecha caducidad`);
    }
  }

  console.log();
}

async function cmdCsv() {
  const grabaciones = await loadGrabaciones();
  const results = grabaciones.map(analyzeGrabacion);

  console.log('ID,Curso,Titulo,Estado,Fecha caducidad,Dias restantes,Categoria,Accion');
  for (const r of results) {
    console.log(`${r.id},${csvEscape(r.curso)},${csvEscape(r.titulo)},${r.estado},${r.fechaCaducidad || ''},${r.diasRestantes ?? ''},${r.categoria},${r.accion || ''}`);
  }
}

function csvEscape(s) {
  if (!s) return '';
  if (s.includes(',') || s.includes('"')) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

async function cmdExpire() {
  const grabaciones = await loadGrabaciones();
  const results = grabaciones.map(analyzeGrabacion);
  const toExpire = results.filter(r => r.accion === 'caducar');

  if (toExpire.length === 0) {
    console.log('No hay grabaciones activas pasadas de fecha.');
    return;
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Grabaciones a marcar como caducadas: ${toExpire.length}\n`);
  for (const r of toExpire) {
    console.log(`  - ${r.curso}: "${r.titulo}" — caduco hace ${-r.diasRestantes} dias`);
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] No se ha modificado nada. Usa --confirm para ejecutar.\n`);
    return;
  }

  const { actualizarGrabacion } = await import('../compartido/grabaciones-client.mjs');
  const { logAudit } = await import('../compartido/audit-client.mjs');

  let ok = 0, errors = 0;
  for (const r of toExpire) {
    try {
      await actualizarGrabacion(r.id, { estado: 'caducada' });
      await logAudit({
        tabla: 'GRABACIONES',
        operacion: 'UPDATE',
        rowId: r.id,
        usuario: 'grabaciones-expiracion.mjs',
        campos: JSON.stringify({ Estado: 'caducada' }),
        fuente: 'CLI',
        detalles: `Expiracion automatica: ${r.curso} — ${r.titulo}`,
        severidad: 'info',
      });
      console.log(`  OK: ${r.curso} — ${r.titulo}`);
      ok++;
    } catch (err) {
      console.error(`  ERROR: ${r.curso}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResultado: ${ok} caducadas, ${errors} errores\n`);
}

async function cmdArchive() {
  const grabaciones = await loadGrabaciones();
  const results = grabaciones.map(analyzeGrabacion);
  const toArchive = results.filter(r => r.accion === 'archivar');

  if (toArchive.length === 0) {
    console.log('No hay grabaciones caducadas para archivar (>30 dias).');
    return;
  }

  console.log(`\n${DRY_RUN ? '[DRY RUN] ' : ''}Grabaciones a archivar: ${toArchive.length}\n`);
  for (const r of toArchive) {
    console.log(`  - ${r.curso}: "${r.titulo}" — caducada hace ${-r.diasRestantes} dias`);
  }

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] No se ha modificado nada. Usa --confirm para ejecutar.\n`);
    return;
  }

  const { actualizarGrabacion } = await import('../compartido/grabaciones-client.mjs');
  const { logAudit } = await import('../compartido/audit-client.mjs');

  let ok = 0, errors = 0;
  for (const r of toArchive) {
    try {
      await actualizarGrabacion(r.id, { estado: 'archivada' });
      await logAudit({
        tabla: 'GRABACIONES',
        operacion: 'UPDATE',
        rowId: r.id,
        usuario: 'grabaciones-expiracion.mjs',
        campos: JSON.stringify({ Estado: 'archivada' }),
        fuente: 'CLI',
        detalles: `Archivado automatico: ${r.curso} — ${r.titulo}`,
        severidad: 'info',
      });
      console.log(`  OK: ${r.curso} — ${r.titulo}`);
      ok++;
    } catch (err) {
      console.error(`  ERROR: ${r.curso}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResultado: ${ok} archivadas, ${errors} errores\n`);
}

async function cmdSheet() {
  if (!SHEET_ID) {
    console.error('Error: PANEL_IITD_SHEET_ID no configurado');
    process.exit(1);
  }

  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();
  const TAB = 'Grabaciones RGPD';

  const grabaciones = await loadGrabaciones();
  const results = grabaciones.map(analyzeGrabacion);

  // Ensure tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  }

  const activas = results.filter(r => r.categoria === 'activa').length;
  const proximas = results.filter(r => r.categoria === 'proxima').length;
  const expiradas = results.filter(r => r.categoria === 'expirada').length;
  const caducadas = results.filter(r => r.categoria === 'caducada').length;
  const archivadas = results.filter(r => r.categoria === 'archivada').length;

  const rows = [
    ['Control de Grabaciones RGPD', '', '', '', `Generado: ${new Date().toISOString()}`],
    [],
    ['Resumen'],
    ['Total', String(grabaciones.length)],
    ['Activas', String(activas)],
    ['Proximas a caducar (<30d)', String(proximas)],
    ['Expiradas', String(expiradas)],
    ['Caducadas', String(caducadas)],
    ['Archivadas', String(archivadas)],
    [],
    ['Detalle'],
    ['Curso', 'Titulo', 'Estado', 'Caducidad', 'Dias restantes', 'Categoria', 'Consent. promocional'],
  ];

  for (const r of results) {
    const g = grabaciones.find(x => x.id === r.id);
    rows.push([
      r.curso, r.titulo, r.estado, r.fechaCaducidad || '',
      r.diasRestantes !== null ? String(r.diasRestantes) : '',
      r.categoria, g?.consentimientoPromocional || '',
    ]);
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
Caducidad de Grabaciones — RGPD Art. 5.1.e (N46)

Comandos:
  (sin flags)            Informe consola
  --csv                  CSV a stdout
  --sheet                Pestana "Grabaciones RGPD" en Panel IITD
  --expire --dry-run     Preview caducidad
  --expire --confirm     Marcar caducadas
  --archive --dry-run    Preview archivado (caducadas >30 dias)
  --archive --confirm    Archivar caducadas antiguas
`);
    return;
  }

  if (EXPIRE_MODE) return cmdExpire();
  if (ARCHIVE_MODE) return cmdArchive();
  if (CSV_MODE) return cmdCsv();
  if (SHEET_MODE) return cmdSheet();
  return cmdConsole();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
