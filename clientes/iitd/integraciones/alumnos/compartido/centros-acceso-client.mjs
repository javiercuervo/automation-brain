#!/usr/bin/env node

/**
 * Centros Acceso Client — IITD (N38)
 *
 * CRUD para la tabla CENTROS_ACCESO en Stackby.
 * Gestion de datos para centros asociados con restriccion de campos (RGPD Art. 28).
 *
 * Columnas: Centro, Centro Contacto ID, Campos Permitidos, Programas,
 *   Drive Folder ID, Drive Folder URL, Activo, Fecha Alta,
 *   Fecha Ultima Exportacion, Responsable Email, Notas
 *
 * RGPD Art. 28: NUNCA exportar DNI, Email, Telefono a centros.
 *
 * Usage:
 *   node centros-acceso-client.mjs list                          # Listar centros
 *   node centros-acceso-client.mjs list --activo                 # Solo activos
 *   node centros-acceso-client.mjs create --centro X --programas "DECA IP,DECA ESO" --responsable email@centro.com
 *   node centros-acceso-client.mjs show "Centro X"               # Detalle de un centro
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_CENTROS_ACCESO_TABLE_ID
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
const TABLE_ID = process.env.STACKBY_CENTROS_ACCESO_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); }
if (!TABLE_ID) { console.error('Error: STACKBY_CENTROS_ACCESO_TABLE_ID no configurada en .env'); }

// =====================================================
// CONSTANTS — RGPD Art. 28
// =====================================================

/** Campos minimos que un centro puede ver. NUNCA incluye DNI, Email, Telefono. */
export const CAMPOS_MINIMOS_CENTRO = ['Nombre', 'Apellidos', 'Programa', 'Estado', 'Calificacion final'];

/** Campos que NUNCA se deben exportar a centros. */
const CAMPOS_PROHIBIDOS = ['DNI', 'Email', 'Telefono', 'Direccion', 'Fecha nacimiento', 'NIF'];

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    centro: (f?.Centro || '').trim(),
    centroContactoId: (f?.['Centro Contacto ID'] || '').trim(),
    camposPermitidos: (f?.['Campos Permitidos'] || '').trim(),
    programas: (f?.Programas || '').trim(),
    driveFolderId: (f?.['Drive Folder ID'] || '').trim(),
    driveFolderUrl: (f?.['Drive Folder URL'] || '').trim(),
    activo: (f?.Activo || 'si').trim(),
    fechaAlta: (f?.['Fecha Alta'] || '').trim(),
    fechaUltimaExportacion: (f?.['Fecha Ultima Exportacion'] || '').trim(),
    responsableEmail: (f?.['Responsable Email'] || '').trim(),
    notas: (f?.Notas || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.centro !== undefined) out['Centro'] = f.centro;
  if (f.centroContactoId !== undefined) out['Centro Contacto ID'] = f.centroContactoId;
  if (f.camposPermitidos !== undefined) out['Campos Permitidos'] = f.camposPermitidos;
  if (f.programas !== undefined) out['Programas'] = f.programas;
  if (f.driveFolderId !== undefined) out['Drive Folder ID'] = f.driveFolderId;
  if (f.driveFolderUrl !== undefined) out['Drive Folder URL'] = f.driveFolderUrl;
  if (f.activo !== undefined) out['Activo'] = f.activo;
  if (f.fechaAlta !== undefined) out['Fecha Alta'] = f.fechaAlta;
  if (f.fechaUltimaExportacion !== undefined) out['Fecha Ultima Exportacion'] = f.fechaUltimaExportacion;
  if (f.responsableEmail !== undefined) out['Responsable Email'] = f.responsableEmail;
  if (f.notas !== undefined) out['Notas'] = f.notas;
  return out;
}

// =====================================================
// API HELPERS
// =====================================================

async function stackbyFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json', ...options.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

// =====================================================
// CRUD
// =====================================================

export async function listarCentros(filters = {}) {
  let all = [], offset = 0;
  while (true) {
    const data = await stackbyFetch(
      `/rowlist/${STACK_ID}/${TABLE_ID}` + (offset ? `?offset=${offset}` : '')
    );
    const records = Array.isArray(data) ? data : (data.records || []);
    const parsed = records.map(r => ({ id: r.id, ...parseFields(r.field) }));
    all = all.concat(parsed);
    if (records.length < 100) break;
    offset += records.length;
  }

  if (filters.activo !== undefined) {
    all = all.filter(c => c.activo.toLowerCase() === (filters.activo ? 'si' : 'no'));
  }

  return all;
}

export async function findCentro(nombre) {
  const all = await listarCentros();
  const target = nombre.toLowerCase().trim();
  return all.find(c => c.centro.toLowerCase() === target) || null;
}

export async function crearCentro(data) {
  const campos = data.camposPermitidos || JSON.stringify(CAMPOS_MINIMOS_CENTRO);

  // Validate no prohibited fields
  let camposArr;
  try { camposArr = typeof campos === 'string' ? JSON.parse(campos) : campos; } catch { camposArr = CAMPOS_MINIMOS_CENTRO; }
  const prohibited = camposArr.filter(c => CAMPOS_PROHIBIDOS.includes(c));
  if (prohibited.length > 0) {
    throw new Error(`RGPD Art. 28: Campos prohibidos para centros: ${prohibited.join(', ')}`);
  }

  const fields = toStackbyFields({
    centro: data.centro,
    centroContactoId: data.centroContactoId || '',
    camposPermitidos: typeof campos === 'object' ? JSON.stringify(campos) : campos,
    programas: data.programas || '',
    activo: 'si',
    fechaAlta: new Date().toISOString().split('T')[0],
    responsableEmail: data.responsableEmail || '',
    notas: data.notas || '',
  });

  const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: fields }] }),
  });
  const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);

  // Audit log
  try {
    const { logAudit } = await import('./audit-client.mjs');
    await logAudit({
      tabla: 'CENTROS_ACCESO', operacion: 'CREATE', rowId: created.id,
      usuario: 'centros-acceso-client.mjs', fuente: 'CLI',
      campos: JSON.stringify({ centro: data.centro, programas: data.programas }),
      detalles: `Centro creado: ${data.centro}`,
    });
  } catch { /* fire-and-forget */ }

  return { id: created.id, ...parseFields(created.field) };
}

export async function actualizarCentro(rowId, fields) {
  // Validate no prohibited fields if updating camposPermitidos
  if (fields.camposPermitidos) {
    let camposArr;
    try { camposArr = typeof fields.camposPermitidos === 'string' ? JSON.parse(fields.camposPermitidos) : fields.camposPermitidos; } catch { camposArr = []; }
    const prohibited = camposArr.filter(c => CAMPOS_PROHIBIDOS.includes(c));
    if (prohibited.length > 0) {
      throw new Error(`RGPD Art. 28: Campos prohibidos para centros: ${prohibited.join(', ')}`);
    }
  }

  const stackbyFields = toStackbyFields(fields);
  return stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: rowId, field: stackbyFields }] }),
  });
}

export function getCamposPermitidos(centro) {
  try {
    return JSON.parse(centro.camposPermitidos || '[]');
  } catch {
    return [...CAMPOS_MINIMOS_CENTRO];
  }
}

export async function registrarExportacion(centroNombre) {
  const centro = await findCentro(centroNombre);
  if (!centro) throw new Error(`Centro no encontrado: ${centroNombre}`);

  await actualizarCentro(centro.id, {
    fechaUltimaExportacion: new Date().toISOString().split('T')[0],
  });

  // Audit log
  try {
    const { logAudit } = await import('./audit-client.mjs');
    await logAudit({
      tabla: 'CENTROS_ACCESO', operacion: 'EXPORT', rowId: centro.id,
      usuario: 'centros-exportar.mjs', fuente: 'CLI',
      detalles: `Exportacion registrada: ${centroNombre}`,
    });
  } catch { /* fire-and-forget */ }

  return { success: true };
}

// =====================================================
// CLI
// =====================================================

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.find(a => !a.startsWith('--'));

  if (!command || command === 'help' || args.includes('--help')) {
    console.log(`
Centros Acceso Client IITD (N38) — RGPD Art. 28

Comandos:
  list [--activo]                              Listar centros
  show <centro-nombre>                         Detalle de un centro
  create --centro X --programas "DECA IP,DECA ESO" --responsable email@centro.com
  update <rowId> [--campos '["Nombre","Apellidos","Programa"]']

Campos minimos (por defecto): ${CAMPOS_MINIMOS_CENTRO.join(', ')}
Campos PROHIBIDOS: ${CAMPOS_PROHIBIDOS.join(', ')}
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
  if (!TABLE_ID) { console.error('Error: STACKBY_CENTROS_ACCESO_TABLE_ID no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (args.includes('--activo')) filters.activo = true;

    const centros = await listarCentros(filters);
    if (centros.length === 0) { console.log('No hay centros.'); return; }

    console.log(`\nCentros (${centros.length}):\n`);
    const maxNombre = Math.max(...centros.map(c => c.centro.length), 10);
    console.log(`  ${'Centro'.padEnd(maxNombre)}  ${'Activo'.padEnd(8)}  ${'Programas'.padEnd(30)}  Responsable`);
    console.log(`  ${'-'.repeat(maxNombre)}  ${'-'.repeat(8)}  ${'-'.repeat(30)}  -----------`);
    for (const c of centros) {
      const icon = c.activo === 'si' ? '>' : 'x';
      console.log(`  ${c.centro.padEnd(maxNombre)}  ${icon} ${c.activo.padEnd(6)}  ${c.programas.substring(0, 30).padEnd(30)}  ${c.responsableEmail}`);
    }
    console.log();
    return;
  }

  if (command === 'show') {
    const nombre = args.find(a => !a.startsWith('--') && a !== 'show');
    if (!nombre) { console.error('Usage: centros-acceso-client.mjs show "Centro X"'); process.exit(1); }

    const centro = await findCentro(nombre);
    if (!centro) { console.log(`Centro no encontrado: ${nombre}`); return; }

    console.log(`\nCentro: ${centro.centro}\n`);
    console.log(`  Activo: ${centro.activo}`);
    console.log(`  Programas: ${centro.programas}`);
    console.log(`  Responsable: ${centro.responsableEmail}`);
    console.log(`  Campos permitidos: ${centro.camposPermitidos}`);
    console.log(`  Drive Folder: ${centro.driveFolderUrl || '(sin configurar)'}`);
    console.log(`  Fecha alta: ${centro.fechaAlta}`);
    console.log(`  Ultima exportacion: ${centro.fechaUltimaExportacion || '(nunca)'}`);
    console.log();
    return;
  }

  if (command === 'create') {
    const centro = getArg('--centro');
    if (!centro) { console.error('Error: --centro es requerido'); process.exit(1); }

    const result = await crearCentro({
      centro,
      programas: getArg('--programas') || '',
      responsableEmail: getArg('--responsable') || '',
      notas: getArg('--notas') || '',
    });
    console.log(`Centro creado: ${result.centro}`);
    console.log(`  Campos permitidos: ${result.camposPermitidos}`);
    console.log(`  Programas: ${result.programas}`);
    return;
  }

  if (command === 'update') {
    const rowId = args.find(a => !a.startsWith('--') && a !== 'update');
    if (!rowId) { console.error('Usage: centros-acceso-client.mjs update <rowId> [--campos ...]'); process.exit(1); }

    const data = {};
    if (getArg('--campos')) data.camposPermitidos = getArg('--campos');
    if (getArg('--programas')) data.programas = getArg('--programas');
    if (getArg('--responsable')) data.responsableEmail = getArg('--responsable');
    if (getArg('--activo')) data.activo = getArg('--activo');

    await actualizarCentro(rowId, data);
    console.log(`Centro actualizado: ${rowId}`);
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('centros-acceso-client.mjs') ||
  process.argv[1].endsWith('centros-acceso-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
