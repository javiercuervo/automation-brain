#!/usr/bin/env node

/**
 * Tutorías Client — IITD (N33)
 *
 * CRUD para la tabla TUTORIAS_UPSELLS en Stackby.
 * Gestiona ofertas de tutorías personalizadas a alumnos que completan curso.
 *
 * Columnas: Email, Nombre, Curso_Completado, Programa, Fecha_Completado,
 *   Fecha_Oferta, Estado_Oferta, Fecha_Conversion, Notas
 *
 * Usage:
 *   node tutorias-client.mjs list                          # Listar ofertas
 *   node tutorias-client.mjs list --estado pendiente       # Filtrar
 *   node tutorias-client.mjs create --email X --curso Y    # Crear oferta
 *   node tutorias-client.mjs find --email X                # Buscar
 *   node tutorias-client.mjs stats                         # Estadísticas
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_TUTORIAS_UPSELLS_TABLE_ID
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
const TABLE_ID = process.env.STACKBY_TUTORIAS_UPSELLS_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); }
if (!TABLE_ID) { console.error('Error: STACKBY_TUTORIAS_UPSELLS_TABLE_ID no configurada en .env'); }

// =====================================================
// ENUMS
// =====================================================

export const OFERTA_ESTADOS = {
  PENDIENTE: 'pendiente',
  ENVIADA: 'enviada',
  ACEPTADA: 'aceptada',
  RECHAZADA: 'rechazada',
  EXPIRADA: 'expirada',
};

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    email: (f?.Email || '').trim().toLowerCase(),
    nombre: (f?.Nombre || '').trim(),
    cursoCompletado: (f?.Curso_Completado || '').trim(),
    programa: (f?.Programa || '').trim(),
    fechaCompletado: (f?.Fecha_Completado || '').trim(),
    fechaOferta: (f?.Fecha_Oferta || '').trim(),
    estadoOferta: (f?.Estado_Oferta || OFERTA_ESTADOS.PENDIENTE).trim(),
    fechaConversion: (f?.Fecha_Conversion || '').trim(),
    notas: (f?.Notas || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.email !== undefined) out['Email'] = f.email;
  if (f.nombre !== undefined) out['Nombre'] = f.nombre;
  if (f.cursoCompletado !== undefined) out['Curso_Completado'] = f.cursoCompletado;
  if (f.programa !== undefined) out['Programa'] = f.programa;
  if (f.fechaCompletado !== undefined) out['Fecha_Completado'] = f.fechaCompletado;
  if (f.fechaOferta !== undefined) out['Fecha_Oferta'] = f.fechaOferta;
  if (f.estadoOferta !== undefined) out['Estado_Oferta'] = f.estadoOferta;
  if (f.fechaConversion !== undefined) out['Fecha_Conversion'] = f.fechaConversion;
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

export async function listOfertas(filters = {}) {
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

  if (filters.estadoOferta) {
    all = all.filter(o => o.estadoOferta.toLowerCase() === filters.estadoOferta.toLowerCase());
  }
  if (filters.programa) {
    all = all.filter(o => o.programa.toLowerCase().includes(filters.programa.toLowerCase()));
  }

  return all;
}

export async function findByEmail(email) {
  const all = await listOfertas();
  const target = email.toLowerCase().trim();
  return all.filter(o => o.email === target);
}

export async function createOferta(data) {
  const email = data.email.toLowerCase().trim();

  const fields = toStackbyFields({
    email,
    nombre: data.nombre || '',
    cursoCompletado: data.cursoCompletado || '',
    programa: data.programa || '',
    fechaCompletado: data.fechaCompletado || '',
    fechaOferta: '',
    estadoOferta: OFERTA_ESTADOS.PENDIENTE,
    notas: data.notas || '',
  });

  const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: fields }] }),
  });
  const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);

  // Audit log (fire-and-forget)
  try {
    const { logAudit } = await import('./audit-client.mjs');
    await logAudit({
      tabla: 'TUTORIAS_UPSELLS', operacion: 'CREATE', rowId: created.id,
      usuario: 'tutorias-client.mjs', fuente: 'CLI',
      campos: JSON.stringify({ email, cursoCompletado: data.cursoCompletado }),
      detalles: `Oferta tutoria creada: ${email}`,
    });
  } catch { /* fire-and-forget */ }

  return { id: created.id, ...parseFields(created.field) };
}

export async function updateOferta(id, updates) {
  const fields = toStackbyFields(updates);

  await stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id, field: fields }] }),
  });

  return { success: true, id, ...updates };
}

export async function getStats() {
  const all = await listOfertas();
  const byEstado = {}, byPrograma = {};
  let conversiones = 0;

  for (const o of all) {
    byEstado[o.estadoOferta] = (byEstado[o.estadoOferta] || 0) + 1;
    if (o.programa) byPrograma[o.programa] = (byPrograma[o.programa] || 0) + 1;
    if (o.estadoOferta === OFERTA_ESTADOS.ACEPTADA) conversiones++;
  }

  return {
    total: all.length,
    conversiones,
    tasaConversion: all.length > 0 ? ((conversiones / all.length) * 100).toFixed(1) + '%' : '0%',
    byEstado,
    byPrograma,
  };
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
Tutorias Client IITD (N33) — Ofertas post-curso

Comandos:
  list [--estado X] [--programa X]   Listar ofertas
  create --email X --curso Y         Crear oferta
  find --email X                     Buscar por email
  stats                              Estadisticas

Estados: pendiente, enviada, aceptada, rechazada, expirada
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
  if (!TABLE_ID) { console.error('Error: STACKBY_TUTORIAS_UPSELLS_TABLE_ID no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--estado')) filters.estadoOferta = getArg('--estado');
    if (getArg('--programa')) filters.programa = getArg('--programa');

    const ofertas = await listOfertas(filters);
    if (ofertas.length === 0) { console.log('No hay ofertas.'); return; }

    console.log(`\nOfertas (${ofertas.length}):\n`);
    console.log(`  ${'Email'.padEnd(35)}  ${'Nombre'.padEnd(18)}  ${'Programa'.padEnd(25)}  ${'Estado'.padEnd(12)}  Fecha`);
    console.log(`  ${'-'.repeat(35)}  ${'-'.repeat(18)}  ${'-'.repeat(25)}  ${'-'.repeat(12)}  ----------`);
    for (const o of ofertas) {
      const fecha = o.fechaOferta ? o.fechaOferta.substring(0, 10) : o.fechaCompletado?.substring(0, 10) || '';
      console.log(`  ${o.email.padEnd(35)}  ${o.nombre.substring(0, 18).padEnd(18)}  ${o.programa.substring(0, 25).padEnd(25)}  ${o.estadoOferta.padEnd(12)}  ${fecha}`);
    }
    console.log();
    return;
  }

  if (command === 'create') {
    const email = getArg('--email');
    if (!email) { console.error('Error: --email es requerido'); process.exit(1); }

    const result = await createOferta({
      email,
      nombre: getArg('--nombre') || '',
      cursoCompletado: getArg('--curso') || '',
      programa: getArg('--programa') || '',
      fechaCompletado: new Date().toISOString(),
    });
    console.log(`Oferta creada: ${result.email} (${result.cursoCompletado})`);
    return;
  }

  if (command === 'find') {
    const email = getArg('--email');
    if (!email) { console.error('Error: --email es requerido'); process.exit(1); }

    const ofertas = await findByEmail(email);
    if (ofertas.length === 0) { console.log(`No hay ofertas para: ${email}`); return; }

    for (const o of ofertas) {
      console.log(`\n  ${o.cursoCompletado} (${o.programa})`);
      console.log(`    Estado: ${o.estadoOferta}`);
      console.log(`    Completado: ${o.fechaCompletado}`);
      if (o.fechaOferta) console.log(`    Oferta enviada: ${o.fechaOferta}`);
      if (o.fechaConversion) console.log(`    Conversion: ${o.fechaConversion}`);
    }
    console.log();
    return;
  }

  if (command === 'stats') {
    const stats = await getStats();
    console.log(`\nTutorias — Estadisticas\n`);
    console.log(`  Total ofertas: ${stats.total}`);
    console.log(`  Conversiones: ${stats.conversiones}`);
    console.log(`  Tasa conversion: ${stats.tasaConversion}`);
    console.log(`\n  Por estado:`);
    for (const [k, v] of Object.entries(stats.byEstado)) console.log(`    ${k}: ${v}`);
    if (Object.keys(stats.byPrograma).length > 0) {
      console.log(`\n  Por programa:`);
      for (const [k, v] of Object.entries(stats.byPrograma)) console.log(`    ${k}: ${v}`);
    }
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('tutorias-client.mjs') ||
  process.argv[1].endsWith('tutorias-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
