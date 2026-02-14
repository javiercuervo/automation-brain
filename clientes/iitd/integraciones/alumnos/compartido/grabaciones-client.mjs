#!/usr/bin/env node

/**
 * =====================================================
 * GRABACIONES CLIENT (N46)
 * =====================================================
 *
 * Cliente Stackby para la tabla GRABACIONES.
 * Gestion de grabaciones con caducidad y control de acceso (RGPD Art. 5.1.e).
 *
 * Columnas: Curso, Programa, Titulo sesion, Fecha grabacion, URL,
 *   Fecha caducidad, Estado, Consentimiento promocional,
 *   Emails autorizados, Profesores, Notas, Fecha creacion
 *
 * Estados: activa -> caducada -> archivada / eliminada
 *
 * Usage como modulo:
 *   import { listarGrabaciones, crearGrabacion, verificarAcceso } from './grabaciones-client.mjs';
 *
 * Usage como CLI:
 *   node grabaciones-client.mjs list                                # Listar todas
 *   node grabaciones-client.mjs list --estado activa                # Filtrar por estado
 *   node grabaciones-client.mjs list --curso "Teologia Fund"        # Filtrar por curso
 *   node grabaciones-client.mjs create --curso "X" --url "Y" --caducidad 2026-06-01
 *   node grabaciones-client.mjs check-access --email alumno@x.com --grabacion-id rwXXX
 *   node grabaciones-client.mjs revoke-consent --grabacion-id rwXXX
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
const TABLE_ID = process.env.STACKBY_GRABACIONES_TABLE_ID || 'tbhn4nStaTSYHPXzZF';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) {
  console.error('Set STACKBY_API_KEY env var');
}

// =====================================================
// ESTADOS
// =====================================================

export const ESTADOS_GRABACION = {
  ACTIVA: 'activa',
  CADUCADA: 'caducada',
  ARCHIVADA: 'archivada',
  ELIMINADA: 'eliminada',
};

const TRANSICIONES = {
  [ESTADOS_GRABACION.ACTIVA]: [ESTADOS_GRABACION.CADUCADA],
  [ESTADOS_GRABACION.CADUCADA]: [ESTADOS_GRABACION.ARCHIVADA, ESTADOS_GRABACION.ELIMINADA, ESTADOS_GRABACION.ACTIVA],
  [ESTADOS_GRABACION.ARCHIVADA]: [ESTADOS_GRABACION.ELIMINADA, ESTADOS_GRABACION.ACTIVA],
  [ESTADOS_GRABACION.ELIMINADA]: [],
};

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    curso: (f?.Curso || '').trim(),
    programa: (f?.Programa || '').trim(),
    tituloSesion: (f?.['Titulo sesion'] || '').trim(),
    fechaGrabacion: (f?.['Fecha grabacion'] || '').trim(),
    url: (f?.URL || '').trim(),
    fechaCaducidad: (f?.['Fecha caducidad'] || '').trim(),
    estado: (f?.Estado || ESTADOS_GRABACION.ACTIVA).trim(),
    consentimientoPromocional: (f?.['Consentimiento promocional'] || 'no').trim(),
    emailsAutorizados: (f?.['Emails autorizados'] || '').trim(),
    profesores: (f?.Profesores || '').trim(),
    notas: (f?.Notas || '').trim(),
    fechaCreacion: (f?.['Fecha creacion'] || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.curso !== undefined) out['Curso'] = f.curso;
  if (f.programa !== undefined) out['Programa'] = f.programa;
  if (f.tituloSesion !== undefined) out['Titulo sesion'] = f.tituloSesion;
  if (f.fechaGrabacion !== undefined) out['Fecha grabacion'] = f.fechaGrabacion;
  if (f.url !== undefined) out['URL'] = f.url;
  if (f.fechaCaducidad !== undefined) out['Fecha caducidad'] = f.fechaCaducidad;
  if (f.estado !== undefined) out['Estado'] = f.estado;
  if (f.consentimientoPromocional !== undefined) out['Consentimiento promocional'] = f.consentimientoPromocional;
  if (f.emailsAutorizados !== undefined) out['Emails autorizados'] = f.emailsAutorizados;
  if (f.profesores !== undefined) out['Profesores'] = f.profesores;
  if (f.notas !== undefined) out['Notas'] = f.notas;
  if (f.fechaCreacion !== undefined) out['Fecha creacion'] = f.fechaCreacion;
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

export async function listarGrabaciones(filters = {}) {
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

  // Apply filters
  if (filters.estado) {
    all = all.filter(g => g.estado.toLowerCase() === filters.estado.toLowerCase());
  }
  if (filters.curso) {
    all = all.filter(g => g.curso.toLowerCase().includes(filters.curso.toLowerCase()));
  }
  if (filters.programa) {
    all = all.filter(g => g.programa.toLowerCase().includes(filters.programa.toLowerCase()));
  }

  return all;
}

export async function crearGrabacion(fields) {
  const stackbyFields = toStackbyFields({
    ...fields,
    estado: fields.estado || ESTADOS_GRABACION.ACTIVA,
    consentimientoPromocional: fields.consentimientoPromocional || 'no',
    fechaCreacion: fields.fechaCreacion || new Date().toISOString().split('T')[0],
  });
  const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: stackbyFields }] }),
  });
  const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);
  return { id: created.id, ...parseFields(created.field) };
}

export async function actualizarGrabacion(rowId, fields) {
  const stackbyFields = toStackbyFields(fields);
  return stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: rowId, field: stackbyFields }] }),
  });
}

export async function buscarPorCurso(cursoNombre) {
  const grabaciones = await listarGrabaciones();
  return grabaciones.filter(g => g.curso.toLowerCase().includes(cursoNombre.toLowerCase()));
}

/**
 * Verify if an email has access to a recording.
 * Checks both Emails autorizados and Profesores fields.
 * Logs the access check to AUDIT_LOG.
 */
export async function verificarAcceso(email, grabacionId) {
  const all = await listarGrabaciones();
  const grabacion = all.find(g => g.id === grabacionId);

  if (!grabacion) {
    return { authorized: false, reason: 'Grabacion no encontrada' };
  }

  if (grabacion.estado !== ESTADOS_GRABACION.ACTIVA) {
    return { authorized: false, reason: `Grabacion en estado "${grabacion.estado}"` };
  }

  const emailNorm = email.toLowerCase().trim();
  const autorizados = grabacion.emailsAutorizados.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  const profesores = grabacion.profesores.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

  const isAuthorized = autorizados.includes(emailNorm) || profesores.includes(emailNorm);

  // Log access attempt to audit
  try {
    const { logAudit } = await import('./audit-client.mjs');
    await logAudit({
      tabla: 'GRABACIONES',
      operacion: 'READ',
      rowId: grabacionId,
      usuario: email,
      campos: JSON.stringify({ curso: grabacion.curso }),
      fuente: 'CLI',
      detalles: isAuthorized ? 'Acceso autorizado' : 'Acceso denegado',
      severidad: isAuthorized ? 'info' : 'warning',
    });
  } catch {
    // Non-blocking
  }

  return {
    authorized: isAuthorized,
    reason: isAuthorized ? 'OK' : 'Email no esta en la lista de autorizados ni profesores',
    grabacion,
  };
}

/**
 * Revoke promotional consent for a recording.
 */
export async function revocarConsentimiento(grabacionId) {
  await actualizarGrabacion(grabacionId, { consentimientoPromocional: 'revocado' });

  try {
    const { logAudit } = await import('./audit-client.mjs');
    await logAudit({
      tabla: 'GRABACIONES',
      operacion: 'UPDATE',
      rowId: grabacionId,
      usuario: 'grabaciones-client.mjs',
      campos: JSON.stringify({ 'Consentimiento promocional': 'revocado' }),
      fuente: 'CLI',
      detalles: 'Consentimiento promocional revocado',
      severidad: 'info',
    });
  } catch {
    // Non-blocking
  }

  return { success: true };
}

/**
 * Get all recordings past their expiration date that are still active.
 */
export async function getExpired() {
  const today = new Date().toISOString().split('T')[0];
  const all = await listarGrabaciones({ estado: ESTADOS_GRABACION.ACTIVA });
  return all.filter(g => g.fechaCaducidad && g.fechaCaducidad < today);
}

export function validarTransicion(estadoActual, estadoNuevo) {
  const permitidos = TRANSICIONES[estadoActual];
  if (!permitidos) return { ok: false, error: `Estado "${estadoActual}" no reconocido` };
  if (!permitidos.includes(estadoNuevo)) {
    return { ok: false, error: `No se puede pasar de "${estadoActual}" a "${estadoNuevo}". Permitidos: ${permitidos.join(', ')}` };
  }
  return { ok: true };
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
Grabaciones Client IITD (N46) — RGPD Art. 5.1.e

Comandos:
  list                                         Listar grabaciones
  list --estado activa                         Filtrar por estado
  list --curso "Teologia"                      Filtrar por curso
  create --curso "X" --url "Y" --caducidad YYYY-MM-DD
  check-access --email X --grabacion-id rwXXX  Verificar acceso
  revoke-consent --grabacion-id rwXXX          Revocar consentimiento promocional

Estados: activa -> caducada -> archivada / eliminada
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--estado')) filters.estado = getArg('--estado');
    if (getArg('--curso')) filters.curso = getArg('--curso');
    if (getArg('--programa')) filters.programa = getArg('--programa');

    const grabaciones = await listarGrabaciones(filters);

    if (grabaciones.length === 0) {
      console.log('No hay grabaciones' +
        (filters.estado ? ` con estado "${filters.estado}"` : '') +
        (filters.curso ? ` para curso "${filters.curso}"` : '') + '.');
      return;
    }

    console.log(`\nGrabaciones (${grabaciones.length}):\n`);
    const maxCurso = Math.max(...grabaciones.map(g => g.curso.length), 10);
    console.log(`  ${'Curso'.padEnd(maxCurso)}  ${'Estado'.padEnd(12)}  ${'Caducidad'.padEnd(12)}  Titulo`);
    console.log(`  ${'-'.repeat(maxCurso)}  ${'-'.repeat(12)}  ${'-'.repeat(12)}  ------`);
    for (const g of grabaciones) {
      const today = new Date().toISOString().split('T')[0];
      const expired = g.fechaCaducidad && g.fechaCaducidad < today;
      const icon = { activa: '>', caducada: '!', archivada: '-', eliminada: 'x' }[g.estado] || '?';
      console.log(`  ${g.curso.padEnd(maxCurso)}  ${icon} ${g.estado.padEnd(10)}  ${(g.fechaCaducidad || '-').padEnd(12)}  ${g.tituloSesion || '-'}${expired && g.estado === 'activa' ? ' (EXPIRADA)' : ''}`);
    }
    console.log();
    return;
  }

  if (command === 'create') {
    const curso = getArg('--curso');
    const url = getArg('--url');
    const caducidad = getArg('--caducidad');
    if (!curso) { console.error('Error: --curso es requerido'); process.exit(1); }

    const fields = {
      curso,
      programa: getArg('--programa') || '',
      tituloSesion: getArg('--titulo') || '',
      fechaGrabacion: getArg('--fecha') || new Date().toISOString().split('T')[0],
      url: url || '',
      fechaCaducidad: caducidad || '',
    };

    const result = await crearGrabacion(fields);
    console.log(`Grabacion creada (ID: ${result.id})`);
    console.log(`  Curso: ${result.curso}`);
    console.log(`  Estado: ${result.estado}`);
    console.log(`  Caducidad: ${result.fechaCaducidad || '(sin definir)'}`);
    return;
  }

  if (command === 'check-access') {
    const email = getArg('--email');
    const grabacionId = getArg('--grabacion-id');
    if (!email || !grabacionId) {
      console.error('Error: --email y --grabacion-id son requeridos');
      process.exit(1);
    }

    const result = await verificarAcceso(email, grabacionId);
    console.log(`Verificacion de acceso:`);
    console.log(`  Email: ${email}`);
    console.log(`  Grabacion: ${grabacionId}`);
    console.log(`  Autorizado: ${result.authorized ? 'SI' : 'NO'}`);
    console.log(`  Motivo: ${result.reason}`);
    return;
  }

  if (command === 'revoke-consent') {
    const grabacionId = getArg('--grabacion-id');
    if (!grabacionId) { console.error('Error: --grabacion-id es requerido'); process.exit(1); }

    await revocarConsentimiento(grabacionId);
    console.log(`Consentimiento promocional revocado para ${grabacionId}`);
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

// Run CLI if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('grabaciones-client.mjs') ||
  process.argv[1].endsWith('grabaciones-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
