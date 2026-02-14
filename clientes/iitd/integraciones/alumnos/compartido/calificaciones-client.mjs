#!/usr/bin/env node

/**
 * CALIFICACIONES CLIENT (N06)
 *
 * Cliente Stackby para la tabla CALIFICACIONES.
 * Mismo patrón que alumnos-client.js pero ESM.
 *
 * Campos esperados en Stackby:
 *   Email alumno, Nombre, Apellidos, Asignatura, Programa, Curso académico,
 *   Nota evaluación, Nota examen, Calificación final,
 *   Fecha evaluación, Profesor, Convalidada, Notas
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
const TABLE_ID = process.env.STACKBY_CALIFICACIONES_TABLE_ID;
const BASE_URL = 'https://stackby.com/api/betav1';

// =====================================================
// PLAN DE ESTUDIOS — módulos DECA
// =====================================================

export const PLAN_ESTUDIOS = {
  'DECA Infantil y Primaria': [
    'Teología Fundamental',
    'Cristología y Pneumatología',
    'Eclesiología y Mariología',
    'Moral Fundamental y Bioética',
    'Moral Social y Doctrina Social de la Iglesia',
    'Sagrada Escritura: Antiguo Testamento',
    'Sagrada Escritura: Nuevo Testamento',
    'Pedagogía y Didáctica de la Religión (Infantil y Primaria)',
    'Liturgia y Sacramentos',
  ],
  'DECA ESO y Bachillerato': [
    'Teología Fundamental',
    'Cristología y Pneumatología',
    'Eclesiología y Mariología',
    'Moral Fundamental y Bioética',
    'Moral Social y Doctrina Social de la Iglesia',
    'Sagrada Escritura: Antiguo Testamento',
    'Sagrada Escritura: Nuevo Testamento',
    'Pedagogía y Didáctica de la Religión (ESO y Bachillerato)',
    'Liturgia y Sacramentos',
  ],
};

// =====================================================
// STACKBY HELPERS
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

async function fetchAllRows() {
  if (!TABLE_ID) throw new Error('STACKBY_CALIFICACIONES_TABLE_ID no configurado en .env');
  let all = [], offset = 0;
  while (true) {
    const url = `/rowlist/${STACK_ID}/${TABLE_ID}` + (offset ? `?offset=${offset}` : '');
    const data = await stackbyFetch(url);
    const records = Array.isArray(data) ? data : (data.records || []);
    all = all.concat(records);
    if (records.length < 100) break;
    offset += records.length;
  }
  return all;
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Todas las calificaciones de un alumno por email
 */
export async function findByEmail(email) {
  const rows = await fetchAllRows();
  const target = email.toLowerCase().trim();
  return rows
    .filter(r => (r.field?.['Email alumno'] || '').toLowerCase().trim() === target)
    .map(r => ({ rowId: r.id, ...parseFields(r.field) }));
}

/**
 * Una calificación específica (email + asignatura)
 */
export async function findByAsignatura(email, asignatura) {
  const rows = await fetchAllRows();
  const target = email.toLowerCase().trim();
  const asigNorm = asignatura.toLowerCase().trim();
  const match = rows.find(r =>
    (r.field?.['Email alumno'] || '').toLowerCase().trim() === target &&
    (r.field?.Asignatura || '').toLowerCase().trim() === asigNorm
  );
  return match ? { rowId: match.id, ...parseFields(match.field) } : null;
}

/**
 * Todas las calificaciones (paginadas desde Stackby)
 */
export async function listarCalificaciones() {
  const rows = await fetchAllRows();
  return rows.map(r => ({ rowId: r.id, ...parseFields(r.field) }));
}

/**
 * Crear una calificación
 */
export async function createCalificacion(fields) {
  if (!TABLE_ID) throw new Error('STACKBY_CALIFICACIONES_TABLE_ID no configurado');
  return stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: toStackbyFields(fields) }] }),
  });
}

/**
 * Actualizar una calificación existente
 */
export async function updateCalificacion(rowId, fields) {
  if (!TABLE_ID) throw new Error('STACKBY_CALIFICACIONES_TABLE_ID no configurado');
  return stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: rowId, field: toStackbyFields(fields) }] }),
  });
}

/**
 * Upsert: busca por email+asignatura, crea o actualiza
 */
export async function upsertCalificacion(email, asignatura, fields) {
  const existing = await findByAsignatura(email, asignatura);
  if (existing) {
    await updateCalificacion(existing.rowId, fields);
    return { action: 'updated', rowId: existing.rowId };
  }
  const result = await createCalificacion({ email, asignatura, ...fields });
  return { action: 'created', result };
}

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    email: (f?.['Email alumno'] || '').trim(),
    nombre: (f?.Nombre || '').trim(),
    apellidos: (f?.Apellidos || '').trim(),
    asignatura: (f?.Asignatura || '').trim(),
    programa: (f?.Programa || '').trim(),
    curso: (f?.['Curso académico'] || '').trim(),
    notaEvaluacion: f?.['Nota evaluación'] ?? '',
    notaExamen: f?.['Nota examen'] ?? '',
    calificacion: (f?.['Calificación final'] || '').trim(),
    fecha: f?.['Fecha evaluación'] || '',
    profesor: (f?.Profesor || '').trim(),
    convalidada: f?.Convalidada || false,
    notas: f?.Notas || '',
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.email !== undefined)          out['Email alumno'] = f.email;
  if (f.nombre !== undefined)         out['Nombre'] = f.nombre;
  if (f.apellidos !== undefined)      out['Apellidos'] = f.apellidos;
  if (f.asignatura !== undefined)     out['Asignatura'] = f.asignatura;
  if (f.programa !== undefined)       out['Programa'] = f.programa;
  if (f.curso !== undefined)          out['Curso académico'] = f.curso;
  if (f.notaEvaluacion !== undefined) out['Nota evaluación'] = f.notaEvaluacion;
  if (f.notaExamen !== undefined)     out['Nota examen'] = f.notaExamen;
  if (f.calificacion !== undefined)   out['Calificación final'] = f.calificacion;
  if (f.fecha !== undefined)          out['Fecha evaluación'] = f.fecha;
  if (f.profesor !== undefined)       out['Profesor'] = f.profesor;
  if (f.convalidada !== undefined)    out['Convalidada'] = f.convalidada;
  if (f.notas !== undefined)          out['Notas'] = f.notas;
  return out;
}

// =====================================================
// CLI
// =====================================================

if (process.argv[1] && process.argv[1].endsWith('calificaciones-client.mjs')) {
  const cmd = process.argv[2];
  if (!API_KEY) { console.error('Set STACKBY_API_KEY'); process.exit(1); }
  if (!TABLE_ID) { console.error('Set STACKBY_CALIFICACIONES_TABLE_ID'); process.exit(1); }

  if (cmd === 'list') {
    const rows = await listarCalificaciones();
    console.log(`${rows.length} calificaciones:`);
    for (const r of rows.slice(0, 20)) {
      console.log(`  ${r.email} | ${r.asignatura} | ${r.calificacion || '(sin nota)'}`);
    }
  } else if (cmd === 'find' && process.argv[3]) {
    const rows = await findByEmail(process.argv[3]);
    console.log(`${rows.length} calificaciones para ${process.argv[3]}:`);
    for (const r of rows) {
      console.log(`  ${r.asignatura}: ${r.calificacion || '(sin nota)'} — eval:${r.notaEvaluacion} exam:${r.notaExamen}`);
    }
  } else {
    console.log('Usage:');
    console.log('  node calificaciones-client.mjs list');
    console.log('  node calificaciones-client.mjs find <email>');
  }
}
