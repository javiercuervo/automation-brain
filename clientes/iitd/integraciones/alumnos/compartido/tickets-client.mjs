#!/usr/bin/env node

/**
 * Tickets Client — IITD (N35)
 *
 * CRUD para la tabla TICKETS en Stackby.
 * Sistema de tickets con state machine y FAQ auto-respuesta.
 *
 * Columnas: Ticket ID, Fecha Creacion, Email Remitente, Nombre Remitente,
 *   Asunto, Mensaje, Categoria, Confianza Categoria, Estado, Respuesta,
 *   Fuente Respuesta, Asignado A, Fecha Escalado, Fecha Resolucion,
 *   SLA Horas, Prioridad, Notas Internas
 *
 * Estados: nuevo -> auto_respondido|escalado -> resuelto -> cerrado
 *
 * Usage:
 *   node tickets-client.mjs list                                # Listar todos
 *   node tickets-client.mjs list --estado nuevo                 # Filtrar por estado
 *   node tickets-client.mjs create --email X --asunto Y --mensaje Z
 *   node tickets-client.mjs escalate <rowId> --to staff@email.com
 *   node tickets-client.mjs resolve <rowId> --respuesta "..."
 *   node tickets-client.mjs stats
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_TICKETS_TABLE_ID
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
const TABLE_ID = process.env.STACKBY_TICKETS_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); }
if (!TABLE_ID) { console.error('Error: STACKBY_TICKETS_TABLE_ID no configurada en .env'); }

// =====================================================
// ENUMS
// =====================================================

export const ESTADOS_TICKET = {
  NUEVO: 'nuevo',
  AUTO_RESPONDIDO: 'auto_respondido',
  ESCALADO: 'escalado',
  RESUELTO: 'resuelto',
  CERRADO: 'cerrado',
};

export const CATEGORIAS = [
  'matricula', 'calificaciones', 'certificados', 'pagos', 'tecnico', 'general',
];

const TRANSICIONES = {
  [ESTADOS_TICKET.NUEVO]: [ESTADOS_TICKET.AUTO_RESPONDIDO, ESTADOS_TICKET.ESCALADO],
  [ESTADOS_TICKET.AUTO_RESPONDIDO]: [ESTADOS_TICKET.ESCALADO, ESTADOS_TICKET.RESUELTO],
  [ESTADOS_TICKET.ESCALADO]: [ESTADOS_TICKET.RESUELTO],
  [ESTADOS_TICKET.RESUELTO]: [ESTADOS_TICKET.CERRADO],
  [ESTADOS_TICKET.CERRADO]: [],
};

export function validarTransicion(estadoActual, estadoNuevo) {
  const permitidos = TRANSICIONES[estadoActual];
  if (!permitidos) return { ok: false, error: `Estado "${estadoActual}" no reconocido` };
  if (!permitidos.includes(estadoNuevo)) {
    return { ok: false, error: `No se puede pasar de "${estadoActual}" a "${estadoNuevo}". Permitidos: ${permitidos.join(', ')}` };
  }
  return { ok: true };
}

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    ticketId: (f?.['Ticket ID'] || '').trim(),
    fechaCreacion: (f?.['Fecha Creacion'] || '').trim(),
    emailRemitente: (f?.['Email Remitente'] || '').trim(),
    nombreRemitente: (f?.['Nombre Remitente'] || '').trim(),
    asunto: (f?.Asunto || '').trim(),
    mensaje: (f?.Mensaje || '').trim(),
    categoria: (f?.Categoria || '').trim(),
    confianzaCategoria: (f?.['Confianza Categoria'] || '').trim(),
    estado: (f?.Estado || ESTADOS_TICKET.NUEVO).trim(),
    respuesta: (f?.Respuesta || '').trim(),
    fuenteRespuesta: (f?.['Fuente Respuesta'] || '').trim(),
    asignadoA: (f?.['Asignado A'] || '').trim(),
    fechaEscalado: (f?.['Fecha Escalado'] || '').trim(),
    fechaResolucion: (f?.['Fecha Resolucion'] || '').trim(),
    slaHoras: (f?.['SLA Horas'] || '').trim(),
    prioridad: (f?.Prioridad || 'media').trim(),
    notasInternas: (f?.['Notas Internas'] || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.ticketId !== undefined) out['Ticket ID'] = f.ticketId;
  if (f.fechaCreacion !== undefined) out['Fecha Creacion'] = f.fechaCreacion;
  if (f.emailRemitente !== undefined) out['Email Remitente'] = f.emailRemitente;
  if (f.nombreRemitente !== undefined) out['Nombre Remitente'] = f.nombreRemitente;
  if (f.asunto !== undefined) out['Asunto'] = f.asunto;
  if (f.mensaje !== undefined) out['Mensaje'] = f.mensaje;
  if (f.categoria !== undefined) out['Categoria'] = f.categoria;
  if (f.confianzaCategoria !== undefined) out['Confianza Categoria'] = f.confianzaCategoria;
  if (f.estado !== undefined) out['Estado'] = f.estado;
  if (f.respuesta !== undefined) out['Respuesta'] = f.respuesta;
  if (f.fuenteRespuesta !== undefined) out['Fuente Respuesta'] = f.fuenteRespuesta;
  if (f.asignadoA !== undefined) out['Asignado A'] = f.asignadoA;
  if (f.fechaEscalado !== undefined) out['Fecha Escalado'] = f.fechaEscalado;
  if (f.fechaResolucion !== undefined) out['Fecha Resolucion'] = f.fechaResolucion;
  if (f.slaHoras !== undefined) out['SLA Horas'] = f.slaHoras;
  if (f.prioridad !== undefined) out['Prioridad'] = f.prioridad;
  if (f.notasInternas !== undefined) out['Notas Internas'] = f.notasInternas;
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

export async function listarTickets(filters = {}) {
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

  if (filters.estado) {
    all = all.filter(t => t.estado.toLowerCase() === filters.estado.toLowerCase());
  }
  if (filters.categoria) {
    all = all.filter(t => t.categoria.toLowerCase() === filters.categoria.toLowerCase());
  }
  if (filters.prioridad) {
    all = all.filter(t => t.prioridad.toLowerCase() === filters.prioridad.toLowerCase());
  }
  if (filters.email) {
    all = all.filter(t => t.emailRemitente.toLowerCase().includes(filters.email.toLowerCase()));
  }

  return all;
}

export async function getNextTicketId() {
  const all = await listarTickets();
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const prefix = `TK-${today}`;

  let max = 0;
  for (const t of all) {
    if (t.ticketId.startsWith(prefix)) {
      const num = parseInt(t.ticketId.split('-').pop(), 10);
      if (num > max) max = num;
    }
  }

  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

export async function crearTicket(data) {
  const ticketId = data.ticketId || await getNextTicketId();

  const fields = toStackbyFields({
    ticketId,
    fechaCreacion: new Date().toISOString(),
    emailRemitente: data.emailRemitente || '',
    nombreRemitente: data.nombreRemitente || '',
    asunto: data.asunto || '',
    mensaje: data.mensaje || '',
    categoria: data.categoria || '',
    confianzaCategoria: data.confianzaCategoria || '',
    estado: ESTADOS_TICKET.NUEVO,
    prioridad: data.prioridad || 'media',
    notasInternas: data.notasInternas || '',
  });

  const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: fields }] }),
  });
  const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);
  return { id: created.id, ...parseFields(created.field) };
}

export async function actualizarTicket(rowId, fields) {
  const stackbyFields = toStackbyFields(fields);
  return stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: rowId, field: stackbyFields }] }),
  });
}

export async function resolverTicket(rowId, respuesta, fuente = 'manual') {
  const now = new Date().toISOString();
  const all = await listarTickets();
  const ticket = all.find(t => t.id === rowId);
  if (!ticket) throw new Error(`Ticket no encontrado: ${rowId}`);

  const check = validarTransicion(ticket.estado, ESTADOS_TICKET.RESUELTO);
  if (!check.ok) throw new Error(check.error);

  // Calculate SLA hours
  let slaHoras = '';
  if (ticket.fechaCreacion) {
    const diff = Date.now() - new Date(ticket.fechaCreacion).getTime();
    slaHoras = String(Math.round(diff / (1000 * 60 * 60) * 10) / 10);
  }

  await actualizarTicket(rowId, {
    estado: ESTADOS_TICKET.RESUELTO,
    respuesta,
    fuenteRespuesta: fuente,
    fechaResolucion: now,
    slaHoras,
  });

  return { success: true, ticketId: ticket.ticketId, slaHoras };
}

export async function escalarTicket(rowId, asignadoA, prioridad) {
  const all = await listarTickets();
  const ticket = all.find(t => t.id === rowId);
  if (!ticket) throw new Error(`Ticket no encontrado: ${rowId}`);

  const check = validarTransicion(ticket.estado, ESTADOS_TICKET.ESCALADO);
  if (!check.ok) throw new Error(check.error);

  const updates = {
    estado: ESTADOS_TICKET.ESCALADO,
    asignadoA,
    fechaEscalado: new Date().toISOString(),
  };
  if (prioridad) updates.prioridad = prioridad;

  await actualizarTicket(rowId, updates);
  return { success: true, ticketId: ticket.ticketId, asignadoA };
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
Tickets Client IITD (N35)

Comandos:
  list [--estado X] [--categoria X] [--prioridad X]
  create --email X --asunto Y --mensaje Z [--prioridad baja|media|alta|urgente]
  escalate <rowId> --to staff@email.com [--prioridad alta]
  resolve <rowId> --respuesta "..."
  stats

Estados: nuevo -> auto_respondido|escalado -> resuelto -> cerrado
Categorias: matricula, calificaciones, certificados, pagos, tecnico, general
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
  if (!TABLE_ID) { console.error('Error: STACKBY_TICKETS_TABLE_ID no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--estado')) filters.estado = getArg('--estado');
    if (getArg('--categoria')) filters.categoria = getArg('--categoria');
    if (getArg('--prioridad')) filters.prioridad = getArg('--prioridad');

    const tickets = await listarTickets(filters);
    if (tickets.length === 0) { console.log('No hay tickets.'); return; }

    console.log(`\nTickets (${tickets.length}):\n`);
    console.log(`  ${'ID'.padEnd(22)}  ${'Estado'.padEnd(16)}  ${'Prioridad'.padEnd(10)}  ${'Categoria'.padEnd(14)}  Asunto`);
    console.log(`  ${'-'.repeat(22)}  ${'-'.repeat(16)}  ${'-'.repeat(10)}  ${'-'.repeat(14)}  ------`);
    for (const t of tickets) {
      const icon = { nuevo: '*', auto_respondido: 'A', escalado: '!', resuelto: '>', cerrado: '-' }[t.estado] || '?';
      console.log(`  ${t.ticketId.padEnd(22)}  ${icon} ${t.estado.padEnd(14)}  ${t.prioridad.padEnd(10)}  ${t.categoria.padEnd(14)}  ${t.asunto.substring(0, 40)}`);
    }
    console.log();
    return;
  }

  if (command === 'create') {
    const email = getArg('--email');
    const asunto = getArg('--asunto');
    const mensaje = getArg('--mensaje');
    if (!email || !asunto) { console.error('Error: --email y --asunto son requeridos'); process.exit(1); }

    const result = await crearTicket({
      emailRemitente: email,
      nombreRemitente: getArg('--nombre') || '',
      asunto,
      mensaje: mensaje || '',
      prioridad: getArg('--prioridad') || 'media',
    });
    console.log(`Ticket creado: ${result.ticketId}`);
    console.log(`  Email: ${result.emailRemitente}`);
    console.log(`  Asunto: ${result.asunto}`);
    console.log(`  Estado: ${result.estado}`);
    return;
  }

  if (command === 'escalate') {
    const rowId = args.find(a => !a.startsWith('--') && a !== 'escalate');
    const to = getArg('--to');
    if (!rowId || !to) { console.error('Usage: tickets-client.mjs escalate <rowId> --to staff@email.com'); process.exit(1); }

    const result = await escalarTicket(rowId, to, getArg('--prioridad'));
    console.log(`Ticket ${result.ticketId} escalado a ${result.asignadoA}`);
    return;
  }

  if (command === 'resolve') {
    const rowId = args.find(a => !a.startsWith('--') && a !== 'resolve');
    const respuesta = getArg('--respuesta');
    if (!rowId || !respuesta) { console.error('Usage: tickets-client.mjs resolve <rowId> --respuesta "..."'); process.exit(1); }

    const result = await resolverTicket(rowId, respuesta);
    console.log(`Ticket ${result.ticketId} resuelto (SLA: ${result.slaHoras}h)`);
    return;
  }

  if (command === 'stats') {
    const all = await listarTickets();
    const byEstado = {}, byCat = {}, byPrioridad = {};
    let totalSla = 0, countSla = 0;
    for (const t of all) {
      byEstado[t.estado] = (byEstado[t.estado] || 0) + 1;
      if (t.categoria) byCat[t.categoria] = (byCat[t.categoria] || 0) + 1;
      byPrioridad[t.prioridad] = (byPrioridad[t.prioridad] || 0) + 1;
      if (t.slaHoras) { totalSla += parseFloat(t.slaHoras); countSla++; }
    }

    console.log(`\nTickets — Estadisticas\n`);
    console.log(`  Total: ${all.length}`);
    console.log(`  SLA medio: ${countSla ? (totalSla / countSla).toFixed(1) + 'h' : 'N/A'}`);
    console.log(`\n  Por estado:`);
    for (const [k, v] of Object.entries(byEstado)) console.log(`    ${k}: ${v}`);
    console.log(`\n  Por categoria:`);
    for (const [k, v] of Object.entries(byCat)) console.log(`    ${k}: ${v}`);
    console.log(`\n  Por prioridad:`);
    for (const [k, v] of Object.entries(byPrioridad)) console.log(`    ${k}: ${v}`);
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('tickets-client.mjs') ||
  process.argv[1].endsWith('tickets-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
