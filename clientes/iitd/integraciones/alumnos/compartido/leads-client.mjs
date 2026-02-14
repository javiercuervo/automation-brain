#!/usr/bin/env node

/**
 * Leads Client — IITD (N32)
 *
 * CRUD para la tabla LEADS en Stackby.
 * Gestiona leads capturados desde blog/curso gratuito → funnel de conversión.
 *
 * Columnas: Email, Nombre, Origen, UTM_Source, UTM_Campaign, Curso_Gratuito,
 *   Fecha_Captura, Estado, Fecha_Conversion, Curso_Pagado, Notas
 *
 * Usage:
 *   node leads-client.mjs list                          # Listar leads
 *   node leads-client.mjs list --estado nuevo           # Filtrar por estado
 *   node leads-client.mjs create --email X --nombre Y   # Crear lead
 *   node leads-client.mjs update --email X --estado secuencia_dia_1
 *   node leads-client.mjs find --email X                # Buscar por email
 *   node leads-client.mjs stats                         # Estadísticas de conversión
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_LEADS_TABLE_ID
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
const TABLE_ID = process.env.STACKBY_LEADS_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); }
if (!TABLE_ID) { console.error('Error: STACKBY_LEADS_TABLE_ID no configurada en .env'); }

// =====================================================
// ENUMS
// =====================================================

export const LEAD_ESTADOS = {
  NUEVO: 'nuevo',
  SECUENCIA_DIA_1: 'secuencia_dia_1',
  SECUENCIA_DIA_2: 'secuencia_dia_2',
  SECUENCIA_DIA_3: 'secuencia_dia_3',
  SECUENCIA_DIA_4: 'secuencia_dia_4',
  SECUENCIA_DIA_5: 'secuencia_dia_5',
  SECUENCIA_DIA_6: 'secuencia_dia_6',
  SECUENCIA_COMPLETA: 'secuencia_completa',
  UPSELL_ENVIADO: 'upsell_enviado',
  CONVERTIDO: 'convertido',
  BAJA: 'baja',
};

export const LEAD_ORIGENES = {
  BLOG: 'blog',
  LANDING: 'landing',
  FORMULARIO_WEB: 'formulario_web',
  REDES_SOCIALES: 'redes_sociales',
  MANUAL: 'manual',
};

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    email: (f?.Email || '').trim().toLowerCase(),
    nombre: (f?.Nombre || '').trim(),
    origen: (f?.Origen || '').trim(),
    utmSource: (f?.UTM_Source || '').trim(),
    utmCampaign: (f?.UTM_Campaign || '').trim(),
    cursoGratuito: (f?.Curso_Gratuito || '').trim(),
    fechaCaptura: (f?.Fecha_Captura || '').trim(),
    estado: (f?.Estado || LEAD_ESTADOS.NUEVO).trim(),
    fechaConversion: (f?.Fecha_Conversion || '').trim(),
    cursoPagado: (f?.Curso_Pagado || '').trim(),
    notas: (f?.Notas || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.email !== undefined) out['Email'] = f.email;
  if (f.nombre !== undefined) out['Nombre'] = f.nombre;
  if (f.origen !== undefined) out['Origen'] = f.origen;
  if (f.utmSource !== undefined) out['UTM_Source'] = f.utmSource;
  if (f.utmCampaign !== undefined) out['UTM_Campaign'] = f.utmCampaign;
  if (f.cursoGratuito !== undefined) out['Curso_Gratuito'] = f.cursoGratuito;
  if (f.fechaCaptura !== undefined) out['Fecha_Captura'] = f.fechaCaptura;
  if (f.estado !== undefined) out['Estado'] = f.estado;
  if (f.fechaConversion !== undefined) out['Fecha_Conversion'] = f.fechaConversion;
  if (f.cursoPagado !== undefined) out['Curso_Pagado'] = f.cursoPagado;
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

export async function listLeads(filters = {}) {
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
    all = all.filter(l => l.estado.toLowerCase() === filters.estado.toLowerCase());
  }
  if (filters.origen) {
    all = all.filter(l => l.origen.toLowerCase() === filters.origen.toLowerCase());
  }
  if (filters.cursoGratuito) {
    all = all.filter(l => l.cursoGratuito.toLowerCase().includes(filters.cursoGratuito.toLowerCase()));
  }

  return all;
}

export async function findByEmail(email) {
  const all = await listLeads();
  const target = email.toLowerCase().trim();
  return all.find(l => l.email === target) || null;
}

export async function createLead(data) {
  const email = data.email.toLowerCase().trim();

  const fields = toStackbyFields({
    email,
    nombre: data.nombre || '',
    origen: data.origen || LEAD_ORIGENES.MANUAL,
    utmSource: data.utmSource || '',
    utmCampaign: data.utmCampaign || '',
    cursoGratuito: data.cursoGratuito || '',
    fechaCaptura: new Date().toISOString(),
    estado: LEAD_ESTADOS.NUEVO,
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
      tabla: 'LEADS', operacion: 'CREATE', rowId: created.id,
      usuario: 'leads-client.mjs', fuente: 'CLI',
      campos: JSON.stringify({ email, origen: data.origen }),
      detalles: `Lead capturado: ${email}`,
    });
  } catch { /* fire-and-forget */ }

  return { id: created.id, ...parseFields(created.field) };
}

export async function updateLead(email, updates) {
  const lead = await findByEmail(email);
  if (!lead) throw new Error(`Lead no encontrado: ${email}`);

  const fields = toStackbyFields(updates);

  await stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: lead.id, field: fields }] }),
  });

  // Audit log
  try {
    const { logAudit } = await import('./audit-client.mjs');
    await logAudit({
      tabla: 'LEADS', operacion: 'UPDATE', rowId: lead.id,
      usuario: 'leads-client.mjs', fuente: 'CLI',
      campos: JSON.stringify(updates),
      detalles: `Lead actualizado: ${email}`,
    });
  } catch { /* fire-and-forget */ }

  return { success: true, email, ...updates };
}

export async function getStats() {
  const all = await listLeads();
  const byEstado = {}, byOrigen = {}, byCurso = {};
  let conversiones = 0;

  for (const l of all) {
    byEstado[l.estado] = (byEstado[l.estado] || 0) + 1;
    byOrigen[l.origen] = (byOrigen[l.origen] || 0) + 1;
    if (l.cursoGratuito) byCurso[l.cursoGratuito] = (byCurso[l.cursoGratuito] || 0) + 1;
    if (l.estado === LEAD_ESTADOS.CONVERTIDO) conversiones++;
  }

  const secuenciaCompleta = all.filter(l =>
    l.estado === LEAD_ESTADOS.SECUENCIA_COMPLETA ||
    l.estado === LEAD_ESTADOS.UPSELL_ENVIADO ||
    l.estado === LEAD_ESTADOS.CONVERTIDO
  ).length;

  return {
    total: all.length,
    conversiones,
    tasaConversion: all.length > 0 ? ((conversiones / all.length) * 100).toFixed(1) + '%' : '0%',
    secuenciaCompleta,
    byEstado,
    byOrigen,
    byCurso,
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
Leads Client IITD (N32) — Funnel curso gratuito

Comandos:
  list [--estado X] [--origen X]   Listar leads
  create --email X --nombre Y      Crear lead
  update --email X --estado Y      Actualizar estado
  find --email X                   Buscar por email
  stats                            Estadísticas de conversión

Estados: nuevo, secuencia_dia_1..6, secuencia_completa, upsell_enviado, convertido, baja
Orígenes: blog, landing, formulario_web, redes_sociales, manual
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
  if (!TABLE_ID) { console.error('Error: STACKBY_LEADS_TABLE_ID no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--estado')) filters.estado = getArg('--estado');
    if (getArg('--origen')) filters.origen = getArg('--origen');
    if (getArg('--curso')) filters.cursoGratuito = getArg('--curso');

    const leads = await listLeads(filters);
    if (leads.length === 0) { console.log('No hay leads.'); return; }

    console.log(`\nLeads (${leads.length}):\n`);
    console.log(`  ${'Email'.padEnd(35)}  ${'Nombre'.padEnd(20)}  ${'Estado'.padEnd(20)}  ${'Origen'.padEnd(15)}  Fecha`);
    console.log(`  ${'-'.repeat(35)}  ${'-'.repeat(20)}  ${'-'.repeat(20)}  ${'-'.repeat(15)}  ----------`);
    for (const l of leads) {
      const fecha = l.fechaCaptura ? l.fechaCaptura.substring(0, 10) : '';
      console.log(`  ${l.email.padEnd(35)}  ${l.nombre.substring(0, 20).padEnd(20)}  ${l.estado.padEnd(20)}  ${l.origen.padEnd(15)}  ${fecha}`);
    }
    console.log();
    return;
  }

  if (command === 'create') {
    const email = getArg('--email');
    if (!email) { console.error('Error: --email es requerido'); process.exit(1); }

    const existing = await findByEmail(email);
    if (existing) {
      console.log(`Lead ya existe: ${email} (estado: ${existing.estado})`);
      return;
    }

    const result = await createLead({
      email,
      nombre: getArg('--nombre') || '',
      origen: getArg('--origen') || LEAD_ORIGENES.MANUAL,
      utmSource: getArg('--utm-source') || '',
      utmCampaign: getArg('--utm-campaign') || '',
      cursoGratuito: getArg('--curso') || '',
    });
    console.log(`Lead creado: ${result.email} (${result.origen})`);
    return;
  }

  if (command === 'update') {
    const email = getArg('--email');
    if (!email) { console.error('Error: --email es requerido'); process.exit(1); }

    const updates = {};
    if (getArg('--estado')) updates.estado = getArg('--estado');
    if (getArg('--curso-pagado')) updates.cursoPagado = getArg('--curso-pagado');
    if (getArg('--notas')) updates.notas = getArg('--notas');
    if (updates.estado === LEAD_ESTADOS.CONVERTIDO) {
      updates.fechaConversion = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      console.error('Error: especifica al menos --estado, --curso-pagado o --notas');
      process.exit(1);
    }

    const result = await updateLead(email, updates);
    console.log(`Lead actualizado: ${result.email}`);
    return;
  }

  if (command === 'find') {
    const email = getArg('--email');
    if (!email) { console.error('Error: --email es requerido'); process.exit(1); }

    const lead = await findByEmail(email);
    if (!lead) { console.log(`No encontrado: ${email}`); return; }

    console.log(`\nLead: ${lead.email}`);
    console.log(`  Nombre: ${lead.nombre}`);
    console.log(`  Estado: ${lead.estado}`);
    console.log(`  Origen: ${lead.origen}`);
    console.log(`  UTM: ${lead.utmSource} / ${lead.utmCampaign}`);
    console.log(`  Curso gratuito: ${lead.cursoGratuito}`);
    console.log(`  Capturado: ${lead.fechaCaptura}`);
    if (lead.fechaConversion) console.log(`  Conversión: ${lead.fechaConversion}`);
    if (lead.cursoPagado) console.log(`  Curso pagado: ${lead.cursoPagado}`);
    if (lead.notas) console.log(`  Notas: ${lead.notas}`);
    console.log();
    return;
  }

  if (command === 'stats') {
    const stats = await getStats();

    console.log(`\nLeads — Estadísticas de conversión\n`);
    console.log(`  Total leads: ${stats.total}`);
    console.log(`  Conversiones: ${stats.conversiones}`);
    console.log(`  Tasa conversión: ${stats.tasaConversion}`);
    console.log(`  Secuencia completa: ${stats.secuenciaCompleta}`);
    console.log(`\n  Por estado:`);
    for (const [k, v] of Object.entries(stats.byEstado)) console.log(`    ${k}: ${v}`);
    console.log(`\n  Por origen:`);
    for (const [k, v] of Object.entries(stats.byOrigen)) console.log(`    ${k}: ${v}`);
    if (Object.keys(stats.byCurso).length > 0) {
      console.log(`\n  Por curso gratuito:`);
      for (const [k, v] of Object.entries(stats.byCurso)) console.log(`    ${k}: ${v}`);
    }
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('leads-client.mjs') ||
  process.argv[1].endsWith('leads-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
