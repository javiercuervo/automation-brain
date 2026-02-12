#!/usr/bin/env node

/**
 * Política de conservación y borrado — RGPD (N12)
 *
 * Art. 5.1.e RGPD: los datos personales no se conservarán
 * más tiempo del necesario para los fines del tratamiento.
 *
 * Plazos de retención (libro-registro RGPD — Patricia):
 * - Alumnos activos/enrolados: sin límite mientras dure la relación
 * - Alumnos baja: 5 años desde la baja (prescripción contractual)
 * - Solicitudes no convertidas: 1 año desde la solicitud
 * - Datos fiscales (recibos): 4 años (Ley General Tributaria)
 * - Certificados académicos: conservación permanente
 *
 * Usage:
 *   node rgpd-retencion.mjs                          # Informe consola
 *   node rgpd-retencion.mjs --csv                    # CSV a stdout
 *   node rgpd-retencion.mjs --sheet                  # Pestaña "Retención RGPD" en Panel IITD
 *   node rgpd-retencion.mjs --purge --dry-run        # Preview anonimización
 *   node rgpd-retencion.mjs --purge --confirm        # Ejecuta anonimización en Stackby
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
const SHEET_ID = process.env.PANEL_IITD_SHEET_ID;

// CLI args
const CSV_MODE = process.argv.includes('--csv');
const SHEET_MODE = process.argv.includes('--sheet');
const PURGE_MODE = process.argv.includes('--purge');
const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
if (PURGE_MODE && !DRY_RUN && !CONFIRM) {
  console.error('Error: --purge requiere --dry-run o --confirm');
  console.error('  --purge --dry-run    Preview sin modificar datos');
  console.error('  --purge --confirm    Ejecutar anonimización (IRREVERSIBLE)');
  process.exit(1);
}

// =====================================================
// CONSTANTS
// =====================================================

// Plazos en días
const PLAZOS = {
  baja: 5 * 365,            // 5 años
  solicitud: 365,            // 1 año
  admitido: 365,             // 1 año (solicitud no convertida)
  fiscal: 4 * 365            // 4 años (LGT)
};

// Campos a anonimizar (NO borrar registro, reemplazar datos personales)
const CAMPOS_PERSONALES = ['Email', 'Nombre', 'Apellidos', 'DNI', 'Telefono', 'Direccion'];

// Estados que implican relación vigente (no se tocan)
const ESTADOS_VIGENTES = ['pagado', 'enrolado', 'activo'];

// =====================================================
// STACKBY HELPERS
// =====================================================

async function getAllRows() {
  let all = [];
  let offset = 0;
  while (true) {
    const url = `${BASE_URL}/rowlist/${STACK_ID}/${TABLE_ID}${offset ? '?offset=' + offset : ''}`;
    const res = await fetch(url, { headers: { 'api-key': API_KEY } });
    if (!res.ok) throw new Error(`Stackby ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const records = Array.isArray(data) ? data : (data.records || []);
    all.push(...records);
    if (records.length < 100) break;
    offset += records.length;
  }
  return all;
}

async function updateRow(rowId, fields) {
  const url = `${BASE_URL}/rowupdate/${STACK_ID}/${TABLE_ID}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ id: rowId, field: fields }] })
  });
  if (!res.ok) throw new Error(`Stackby update ${res.status}: ${await res.text()}`);
  return res.json();
}

// =====================================================
// RETENTION ANALYSIS
// =====================================================

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function analyzeRecord(record) {
  const f = record.field || {};
  const estado = (f.Estado || '').toLowerCase();
  const fechaEstado = f['Fecha estado'] || '';
  const dias = daysSince(fechaEstado);

  // Relación vigente → no caduca
  if (ESTADOS_VIGENTES.includes(estado)) {
    return { expired: false, reason: 'Relación vigente', dias, plazo: null };
  }

  // Baja → 5 años
  if (estado === 'baja') {
    if (dias > PLAZOS.baja) {
      return { expired: true, reason: `Baja hace ${dias} días (límite: ${PLAZOS.baja})`, dias, plazo: PLAZOS.baja };
    }
    const restantes = PLAZOS.baja - dias;
    return { expired: false, reason: `Baja — caduca en ${restantes} días`, dias, plazo: PLAZOS.baja };
  }

  // Solicitud / admitido sin avanzar → 1 año
  if (estado === 'solicitud' || estado === 'admitido') {
    if (dias > PLAZOS.solicitud) {
      return { expired: true, reason: `${estado} hace ${dias} días (límite: ${PLAZOS.solicitud})`, dias, plazo: PLAZOS.solicitud };
    }
    const restantes = PLAZOS.solicitud - dias;
    return { expired: false, reason: `${estado} — caduca en ${restantes} días`, dias, plazo: PLAZOS.solicitud };
  }

  // Sin estado → tratar como solicitud
  if (!estado) {
    if (dias > PLAZOS.solicitud) {
      return { expired: true, reason: `Sin estado hace ${dias} días (límite: ${PLAZOS.solicitud})`, dias, plazo: PLAZOS.solicitud };
    }
    return { expired: false, reason: 'Sin estado — plazo solicitud', dias, plazo: PLAZOS.solicitud };
  }

  return { expired: false, reason: `Estado "${estado}" no tiene regla de retención`, dias, plazo: null };
}

// =====================================================
// OUTPUT
// =====================================================

function printConsole(results) {
  const expired = results.filter(r => r.analysis.expired);
  const vigentes = results.filter(r => !r.analysis.expired && ESTADOS_VIGENTES.includes((r.field.Estado || '').toLowerCase()));
  const enPlazo = results.filter(r => !r.analysis.expired && !ESTADOS_VIGENTES.includes((r.field.Estado || '').toLowerCase()));

  console.log('=== INFORME DE RETENCIÓN RGPD ===');
  console.log(`Fecha: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Total registros: ${results.length}`);
  console.log('');
  console.log(`  Relación vigente:    ${vigentes.length}`);
  console.log(`  En plazo:            ${enPlazo.length}`);
  console.log(`  CADUCADOS:           ${expired.length}`);
  console.log('');

  if (expired.length > 0) {
    console.log('--- REGISTROS CADUCADOS ---');
    for (const r of expired) {
      const f = r.field;
      console.log(`  ${f.Email || '(sin email)'} | ${f.Nombre || ''} ${f.Apellidos || ''} | ${f.Estado || '?'} | ${r.analysis.reason}`);
    }
  }

  // Próximos a caducar (< 90 días)
  const proximos = enPlazo.filter(r => {
    const restantes = (r.analysis.plazo || Infinity) - r.analysis.dias;
    return restantes > 0 && restantes < 90;
  });
  if (proximos.length > 0) {
    console.log('');
    console.log('--- PRÓXIMOS A CADUCAR (< 90 días) ---');
    for (const r of proximos) {
      const f = r.field;
      const restantes = r.analysis.plazo - r.analysis.dias;
      console.log(`  ${f.Email || '(sin email)'} | ${f.Estado || '?'} | Caduca en ${restantes} días`);
    }
  }
}

function toCSV(results) {
  const lines = ['Email,Nombre,Apellidos,Estado,Fecha estado,Días,Caducado,Motivo'];
  for (const r of results) {
    const f = r.field;
    lines.push([
      esc(f.Email), esc(f.Nombre), esc(f.Apellidos),
      esc(f.Estado), esc(f['Fecha estado']),
      r.analysis.dias === Infinity ? '' : r.analysis.dias,
      r.analysis.expired ? 'SÍ' : 'No',
      esc(r.analysis.reason)
    ].join(','));
  }
  return lines.join('\n');
}

function esc(val) {
  const s = String(val || '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

// =====================================================
// PURGE (ANONYMIZE)
// =====================================================

async function purgeExpired(results) {
  const expired = results.filter(r => r.analysis.expired);

  if (expired.length === 0) {
    console.log('No hay registros caducados para anonimizar.');
    return;
  }

  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}Anonimizando ${expired.length} registros...`);

  const fecha = new Date().toISOString().split('T')[0];
  let count = 0;

  for (const r of expired) {
    const f = r.field;
    const updates = {};

    for (const campo of CAMPOS_PERSONALES) {
      if (f[campo]) {
        updates[campo] = `ANONIMIZADO-${fecha}`;
      }
    }

    // Registrar en Notas
    const notaExistente = f.Notas || '';
    updates.Notas = `${notaExistente}\n[${fecha}] RGPD: Datos personales anonimizados. Motivo: ${r.analysis.reason}`.trim();

    if (DRY_RUN) {
      console.log(`  [DRY-RUN] ${f.Email || '?'} → anonimizar ${Object.keys(updates).length - 1} campos`);
    } else {
      await updateRow(r.id, updates);
      console.log(`  ✓ ${f.Email || '?'} anonimizado`);
    }
    count++;
  }

  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}${count} registros ${DRY_RUN ? 'se anonimizarían' : 'anonimizados'}.`);
}

// =====================================================
// SHEET OUTPUT
// =====================================================

async function writeSheet(results) {
  if (!SHEET_ID) {
    console.error('PANEL_IITD_SHEET_ID no configurado');
    return;
  }

  const { getSheetsClient } = await import('./google-auth.mjs');
  const sheets = await getSheetsClient();

  const expired = results.filter(r => r.analysis.expired);
  const proximos = results.filter(r => {
    if (r.analysis.expired) return false;
    const restantes = (r.analysis.plazo || Infinity) - r.analysis.dias;
    return restantes > 0 && restantes < 90;
  });

  const rows = [
    ['INFORME RETENCIÓN RGPD', '', '', '', '', '', new Date().toISOString().split('T')[0]],
    [],
    ['Total registros', results.length, '', 'Vigentes', results.filter(r => !r.analysis.expired).length, '', 'Caducados', expired.length],
    [],
    ['REGISTROS CADUCADOS'],
    ['Email', 'Nombre', 'Apellidos', 'Estado', 'Fecha estado', 'Días', 'Motivo'],
    ...expired.map(r => [
      r.field.Email || '', r.field.Nombre || '', r.field.Apellidos || '',
      r.field.Estado || '', r.field['Fecha estado'] || '',
      r.analysis.dias === Infinity ? '' : r.analysis.dias,
      r.analysis.reason
    ]),
    [],
    ['PRÓXIMOS A CADUCAR (< 90 días)'],
    ['Email', 'Nombre', 'Estado', 'Días restantes'],
    ...proximos.map(r => [
      r.field.Email || '', r.field.Nombre || '',
      r.field.Estado || '',
      r.analysis.plazo - r.analysis.dias
    ])
  ];

  const TAB = 'Retención RGPD';

  // Ensure tab exists (auto-create if missing)
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    console.log(`  Pestaña "${TAB}" creada.`);
  }

  // Clear + write
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `'${TAB}'!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows }
  });
  console.log(`Pestaña "${TAB}" actualizada en Panel IITD.`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.error('Leyendo registros de Stackby...');
  const rows = await getAllRows();
  console.error(`${rows.length} registros leídos.`);

  const results = rows.map(r => ({
    id: r.id,
    field: r.field || {},
    analysis: analyzeRecord(r)
  }));

  if (PURGE_MODE) {
    await purgeExpired(results);
  } else if (CSV_MODE) {
    console.log(toCSV(results));
  } else if (SHEET_MODE) {
    printConsole(results);
    await writeSheet(results);
  } else {
    printConsole(results);
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
