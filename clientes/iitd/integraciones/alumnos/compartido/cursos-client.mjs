/**
 * =====================================================
 * CURSOS CLIENT (N29)
 * =====================================================
 *
 * Cliente para gestión de la tabla CURSOS en Stackby.
 * Workflow de publicación con revisión COEO.
 *
 * Columnas: Nombre curso, Descripcion, Estado, URL slug,
 *   Keywords SEO, Programa, Enlace LMS, Enlace Landing,
 *   Revisor COEO, Checklist COEO, Fecha publicacion, Responsable
 *
 * Estados: Borrador → Revisión COEO → Validado → Publicado
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

// =====================================================
// CONFIG
// =====================================================

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_CURSOS_TABLE_ID || 'tbTBbpuwzMo13SWCps';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) {
  console.error('Set STACKBY_API_KEY env var');
}

// =====================================================
// ESTADOS DEL WORKFLOW
// =====================================================

export const ESTADOS_CURSO = {
  BORRADOR: 'Borrador',
  REVISION_COEO: 'Revisión COEO',
  VALIDADO: 'Validado',
  PUBLICADO: 'Publicado',
};

// Transiciones válidas
const TRANSICIONES = {
  [ESTADOS_CURSO.BORRADOR]: [ESTADOS_CURSO.REVISION_COEO],
  [ESTADOS_CURSO.REVISION_COEO]: [ESTADOS_CURSO.VALIDADO, ESTADOS_CURSO.BORRADOR],
  [ESTADOS_CURSO.VALIDADO]: [ESTADOS_CURSO.PUBLICADO, ESTADOS_CURSO.BORRADOR],
  [ESTADOS_CURSO.PUBLICADO]: [ESTADOS_CURSO.BORRADOR],
};

// =====================================================
// CHECKLIST COEO
// =====================================================

export const CHECKLIST_COEO = [
  { id: 'titulo', label: 'Título optimizado (50-60 chars)', check: (c) => c.nombre && c.nombre.length >= 20 && c.nombre.length <= 80 },
  { id: 'url', label: 'URL slug definido', check: (c) => !!c.urlSlug },
  { id: 'descripcion', label: 'Descripción (120-160 chars)', check: (c) => c.descripcion && c.descripcion.length >= 50 },
  { id: 'keywords', label: 'Keywords SEO definidas', check: (c) => !!c.keywordsSeo },
  { id: 'programa', label: 'Programa asignado', check: (c) => !!c.programa },
  { id: 'enlace_lms', label: 'Enlace LMS configurado', check: (c) => !!c.enlaceLms },
];

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    nombre: (f?.['Nombre curso'] || '').trim(),
    descripcion: (f?.Descripcion || '').trim(),
    estado: (f?.Estado || ESTADOS_CURSO.BORRADOR).trim(),
    urlSlug: (f?.['URL slug'] || '').trim(),
    keywordsSeo: (f?.['Keywords SEO'] || '').trim(),
    programa: (f?.Programa || '').trim(),
    enlaceLms: (f?.['Enlace LMS'] || '').trim(),
    enlaceLanding: (f?.['Enlace Landing'] || '').trim(),
    revisorCoeo: (f?.['Revisor COEO'] || '').trim(),
    checklistCoeo: (f?.['Checklist COEO'] || '').trim(),
    fechaPublicacion: (f?.['Fecha publicacion'] || '').trim(),
    responsable: (f?.Responsable || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.nombre !== undefined) out['Nombre curso'] = f.nombre;
  if (f.descripcion !== undefined) out['Descripcion'] = f.descripcion;
  if (f.estado !== undefined) out['Estado'] = f.estado;
  if (f.urlSlug !== undefined) out['URL slug'] = f.urlSlug;
  if (f.keywordsSeo !== undefined) out['Keywords SEO'] = f.keywordsSeo;
  if (f.programa !== undefined) out['Programa'] = f.programa;
  if (f.enlaceLms !== undefined) out['Enlace LMS'] = f.enlaceLms;
  if (f.enlaceLanding !== undefined) out['Enlace Landing'] = f.enlaceLanding;
  if (f.revisorCoeo !== undefined) out['Revisor COEO'] = f.revisorCoeo;
  if (f.checklistCoeo !== undefined) out['Checklist COEO'] = f.checklistCoeo;
  if (f.fechaPublicacion !== undefined) out['Fecha publicacion'] = f.fechaPublicacion;
  if (f.responsable !== undefined) out['Responsable'] = f.responsable;
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

export async function listarCursos() {
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
  return all;
}

export async function crearCurso(fields) {
  const stackbyFields = toStackbyFields({
    ...fields,
    estado: fields.estado || ESTADOS_CURSO.BORRADOR,
  });
  const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: stackbyFields }] }),
  });
  const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);
  return { id: created.id, ...parseFields(created.field) };
}

export async function actualizarCurso(rowId, fields) {
  const stackbyFields = toStackbyFields(fields);
  return stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: rowId, field: stackbyFields }] }),
  });
}

export async function buscarCursoPorNombre(nombre) {
  const cursos = await listarCursos();
  return cursos.find(c => c.nombre.toLowerCase() === nombre.toLowerCase()) || null;
}

// =====================================================
// WORKFLOW
// =====================================================

export function validarTransicion(estadoActual, estadoNuevo) {
  const permitidos = TRANSICIONES[estadoActual];
  if (!permitidos) return { ok: false, error: `Estado "${estadoActual}" no reconocido` };
  if (!permitidos.includes(estadoNuevo)) {
    return { ok: false, error: `No se puede pasar de "${estadoActual}" a "${estadoNuevo}". Permitidos: ${permitidos.join(', ')}` };
  }
  return { ok: true };
}

export function ejecutarChecklist(curso) {
  return CHECKLIST_COEO.map(item => ({
    id: item.id,
    label: item.label,
    passed: item.check(curso),
  }));
}

export async function cambiarEstado(rowId, nuevoEstado, options = {}) {
  const cursos = await listarCursos();
  const curso = cursos.find(c => c.id === rowId);
  if (!curso) throw new Error(`Curso ${rowId} no encontrado`);

  const transicion = validarTransicion(curso.estado, nuevoEstado);
  if (!transicion.ok) throw new Error(transicion.error);

  // Si pasa a Revisión COEO, ejecutar checklist
  if (nuevoEstado === ESTADOS_CURSO.REVISION_COEO) {
    const checklist = ejecutarChecklist(curso);
    const failed = checklist.filter(c => !c.passed);
    if (failed.length > 0 && !options.force) {
      throw new Error(
        `Checklist COEO no superado:\n` +
        failed.map(f => `  ✗ ${f.label}`).join('\n') +
        `\nUsa --force para enviar igualmente.`
      );
    }
    const summary = checklist.map(c => `${c.passed ? '✓' : '✗'} ${c.id}`).join(', ');
    await actualizarCurso(rowId, {
      estado: nuevoEstado,
      checklistCoeo: summary,
      revisorCoeo: options.revisor || '',
    });
    return { action: 'revision', checklist, curso };
  }

  // Si pasa a Publicado, poner fecha
  const updates = { estado: nuevoEstado };
  if (nuevoEstado === ESTADOS_CURSO.PUBLICADO) {
    updates.fechaPublicacion = new Date().toISOString().split('T')[0];
  }

  await actualizarCurso(rowId, updates);
  return { action: 'transicion', from: curso.estado, to: nuevoEstado, curso };
}
