#!/usr/bin/env node

/**
 * Centros Exportar — IITD (N38)
 *
 * Exportacion de datos de alumnos para centros asociados.
 * RGPD Art. 28: SOLO exporta campos en Campos Permitidos del centro.
 *
 * Usage:
 *   node centros-exportar.mjs --centro "X" [--dry-run]          # Preview
 *   node centros-exportar.mjs --centro "X" --csv                # CSV a stdout
 *   node centros-exportar.mjs --centro "X" --drive [--confirm]  # Exportar + subir a Drive
 *   node centros-exportar.mjs --all [--dry-run]                 # Todos los centros activos
 *   node centros-exportar.mjs --report                          # Informe de accesos
 *   node centros-exportar.mjs --sheet                           # Tab "Centros Asociados" en Panel
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

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

const CENTRO_NAME = getArg('--centro');
const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');
const CSV_MODE = process.argv.includes('--csv');
const DRIVE_MODE = process.argv.includes('--drive');
const ALL_MODE = process.argv.includes('--all');
const REPORT_MODE = process.argv.includes('--report');
const SHEET_MODE = process.argv.includes('--sheet');

// =====================================================
// EXPORT LOGIC
// =====================================================

async function getAlumnosForCentro(centro) {
  const { getCamposPermitidos } = await import('../compartido/centros-acceso-client.mjs');

  // Get alumnos
  const alumnosModule = await import('../compartido/alumnos-client.js');
  const allAlumnos = await alumnosModule.getAllAlumnos();

  // Filter by centro programs
  const programas = centro.programas.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
  const camposPermitidos = getCamposPermitidos(centro);

  const filtered = allAlumnos.filter(a => {
    const programa = (a.field?.Programa || '').toLowerCase();
    return programas.some(p => programa.includes(p));
  });

  // Strip non-permitted fields (RGPD Art. 28)
  const stripped = filtered.map(a => {
    const out = {};
    for (const campo of camposPermitidos) {
      out[campo] = a.field?.[campo] || '';
    }
    return out;
  });

  return { alumnos: stripped, camposPermitidos, totalRaw: filtered.length };
}

async function exportCentro(centroName, options = {}) {
  const { findCentro, registrarExportacion } = await import('../compartido/centros-acceso-client.mjs');

  const centro = await findCentro(centroName);
  if (!centro) throw new Error(`Centro no encontrado: ${centroName}`);
  if (centro.activo !== 'si') throw new Error(`Centro "${centroName}" no esta activo`);

  const { alumnos, camposPermitidos, totalRaw } = await getAlumnosForCentro(centro);

  console.log(`  Centro: ${centro.centro}`);
  console.log(`  Programas: ${centro.programas}`);
  console.log(`  Campos permitidos: ${camposPermitidos.join(', ')}`);
  console.log(`  Alumnos encontrados: ${totalRaw}`);
  console.log(`  Alumnos exportados (campos filtrados): ${alumnos.length}`);

  if (options.dryRun) {
    if (alumnos.length > 0) {
      console.log(`\n  Preview (primeros 5):`);
      for (const a of alumnos.slice(0, 5)) {
        console.log(`    ${JSON.stringify(a)}`);
      }
      if (alumnos.length > 5) console.log(`    ... y ${alumnos.length - 5} mas`);
    }
    return { centro: centro.centro, count: alumnos.length, dryRun: true };
  }

  if (options.csv) {
    const lines = [camposPermitidos.join(',')];
    for (const a of alumnos) {
      lines.push(camposPermitidos.map(c => esc(a[c])).join(','));
    }
    console.log(lines.join('\n'));
    return { centro: centro.centro, count: alumnos.length };
  }

  if (options.drive) {
    // Upload CSV to Drive
    const csvContent = [camposPermitidos.join(','), ...alumnos.map(a =>
      camposPermitidos.map(c => esc(a[c])).join(',')
    )].join('\n');

    const fecha = new Date().toISOString().split('T')[0];
    const fileName = `export-${centro.centro.replace(/\s+/g, '-')}-${fecha}.csv`;

    // Use Apps Script proxy to upload
    const UPLOAD_URL = process.env.APPS_SCRIPT_UPLOAD_URL;
    if (!UPLOAD_URL) throw new Error('APPS_SCRIPT_UPLOAD_URL no configurada');

    let folderId = centro.driveFolderId;

    // Create folder if needed
    if (!folderId) {
      const { getDriveClient } = await import('../compartido/google-auth.mjs');
      const drive = await getDriveClient();
      const folder = await drive.files.create({
        requestBody: {
          name: `Centro - ${centro.centro}`,
          mimeType: 'application/vnd.google-apps.folder',
        },
      });
      folderId = folder.data.id;

      // Update centro with folder ID
      const { actualizarCentro } = await import('../compartido/centros-acceso-client.mjs');
      await actualizarCentro(centro.id, {
        driveFolderId: folderId,
        driveFolderUrl: `https://drive.google.com/drive/folders/${folderId}`,
      });
      console.log(`  Carpeta Drive creada: ${folderId}`);

      // Share with responsable
      if (centro.responsableEmail) {
        try {
          await drive.permissions.create({
            fileId: folderId,
            requestBody: { type: 'user', role: 'reader', emailAddress: centro.responsableEmail },
          });
          console.log(`  Compartida con ${centro.responsableEmail}`);
        } catch (err) {
          console.log(`  Aviso: No se pudo compartir: ${err.message}`);
        }
      }
    }

    // Upload via proxy
    const uploadRes = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        mimeType: 'text/csv',
        content: Buffer.from(csvContent).toString('base64'),
        folderId,
      }),
    });
    if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`);

    await registrarExportacion(centro.centro);
    console.log(`  Archivo subido: ${fileName}`);
    return { centro: centro.centro, count: alumnos.length, fileName };
  }

  // Default: JSON output
  console.log(JSON.stringify(alumnos, null, 2));
  return { centro: centro.centro, count: alumnos.length };
}

function esc(val) {
  const s = String(val || '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

// =====================================================
// REPORT
// =====================================================

async function reportAccesos() {
  const { listarCentros } = await import('../compartido/centros-acceso-client.mjs');
  const centros = await listarCentros();

  console.log(`\n=== INFORME CENTROS ASOCIADOS ===`);
  console.log(`Fecha: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Total centros: ${centros.length}`);
  console.log(`Activos: ${centros.filter(c => c.activo === 'si').length}`);
  console.log();

  for (const c of centros) {
    const icon = c.activo === 'si' ? '>' : 'x';
    console.log(`  ${icon} ${c.centro}`);
    console.log(`    Programas: ${c.programas || '(sin definir)'}`);
    console.log(`    Responsable: ${c.responsableEmail || '(sin definir)'}`);
    console.log(`    Ultima exportacion: ${c.fechaUltimaExportacion || '(nunca)'}`);
  }
}

// =====================================================
// SHEET
// =====================================================

async function writeSheet() {
  if (!SHEET_ID) { console.error('PANEL_IITD_SHEET_ID no configurado'); return; }

  const { listarCentros } = await import('../compartido/centros-acceso-client.mjs');
  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();
  const centros = await listarCentros();

  const fecha = new Date().toISOString().split('T')[0];
  const rows = [
    ['CENTROS ASOCIADOS', '', '', '', '', fecha],
    [],
    ['Total', centros.length, 'Activos', centros.filter(c => c.activo === 'si').length],
    [],
    ['Centro', 'Activo', 'Programas', 'Responsable', 'Campos Permitidos', 'Ultima Exportacion', 'Fecha Alta'],
    ...centros.map(c => [
      c.centro, c.activo, c.programas, c.responsableEmail,
      c.camposPermitidos, c.fechaUltimaExportacion, c.fechaAlta,
    ]),
  ];

  const TAB = 'Centros Asociados';
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
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
Centros Exportar IITD (N38) — RGPD Art. 28

Usage:
  node centros-exportar.mjs --centro "X" [--dry-run]           Preview
  node centros-exportar.mjs --centro "X" --csv                 CSV a stdout
  node centros-exportar.mjs --centro "X" --drive [--confirm]   Subir a Drive
  node centros-exportar.mjs --all [--dry-run]                  Todos los centros
  node centros-exportar.mjs --report                           Informe de accesos
  node centros-exportar.mjs --sheet                            Tab "Centros Asociados"
`);
    return;
  }

  if (REPORT_MODE) {
    await reportAccesos();
    return;
  }

  if (SHEET_MODE) {
    await writeSheet();
    return;
  }

  if (ALL_MODE) {
    const { listarCentros } = await import('../compartido/centros-acceso-client.mjs');
    const centros = await listarCentros({ activo: true });
    console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}Exportando ${centros.length} centros activos...\n`);
    for (const c of centros) {
      console.log(`\n--- ${c.centro} ---`);
      await exportCentro(c.centro, { dryRun: DRY_RUN, drive: DRIVE_MODE && CONFIRM });
    }
    return;
  }

  if (CENTRO_NAME) {
    await exportCentro(CENTRO_NAME, { dryRun: DRY_RUN, csv: CSV_MODE, drive: DRIVE_MODE && CONFIRM });
    return;
  }

  console.error('Especifica --centro, --all, --report o --sheet. Usa --help.');
  process.exit(1);
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
