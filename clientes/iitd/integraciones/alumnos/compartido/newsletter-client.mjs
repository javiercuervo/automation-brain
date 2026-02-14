#!/usr/bin/env node

/**
 * Newsletter Client — IITD (N34)
 *
 * CRUD para la tabla NEWSLETTER_CONSENT en Stackby.
 * Gestion de consentimiento trazable para newsletter (RGPD Art. 6.1).
 *
 * Modelo dual de consentimiento:
 *   - Alumnos: interes_legitimo (Art. 6.1.f) — comunicaciones academicas
 *   - Leads: consentimiento_expreso (Art. 6.1.a) — comunicaciones comerciales
 *
 * Columnas: Email, Nombre, Tipo, Base Legal, Consentimiento,
 *   Fecha Consentimiento, Texto Consentimiento, Origen,
 *   Fecha Baja, Acumbamail ID, Notas
 *
 * Usage:
 *   node newsletter-client.mjs list                           # Listar suscriptores
 *   node newsletter-client.mjs list --tipo alumno             # Filtrar por tipo
 *   node newsletter-client.mjs subscribe --email X --tipo alumno
 *   node newsletter-client.mjs unsubscribe --email X
 *   node newsletter-client.mjs sync-alumnos [--dry-run]       # Importar alumnos activos
 *   node newsletter-client.mjs export-acumbamail              # CSV para Acumbamail
 *   node newsletter-client.mjs stats                          # Estadisticas
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_NEWSLETTER_CONSENT_TABLE_ID
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
const TABLE_ID = process.env.STACKBY_NEWSLETTER_CONSENT_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); }
if (!TABLE_ID) { console.error('Error: STACKBY_NEWSLETTER_CONSENT_TABLE_ID no configurada en .env'); }

// =====================================================
// ENUMS
// =====================================================

export const CONSENTIMIENTO_ESTADOS = {
  SUSCRITO: 'suscrito',
  BAJA: 'baja',
  PENDIENTE: 'pendiente',
};

export const BASES_LEGALES = {
  INTERES_LEGITIMO: 'interes_legitimo',
  CONSENTIMIENTO_EXPRESO: 'consentimiento_expreso',
};

const TEXTOS_LEGALES = {
  [BASES_LEGALES.INTERES_LEGITIMO]:
    'Base legal: interes legitimo para comunicaciones relacionadas con su programa academico (Art. 6.1.f RGPD)',
  [BASES_LEGALES.CONSENTIMIENTO_EXPRESO]:
    'Consiento expresamente recibir comunicaciones comerciales del IITD (Art. 6.1.a RGPD)',
};

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    email: (f?.Email || '').trim().toLowerCase(),
    nombre: (f?.Nombre || '').trim(),
    tipo: (f?.Tipo || '').trim(),
    baseLegal: (f?.['Base Legal'] || '').trim(),
    consentimiento: (f?.Consentimiento || CONSENTIMIENTO_ESTADOS.PENDIENTE).trim(),
    fechaConsentimiento: (f?.['Fecha Consentimiento'] || '').trim(),
    textoConsentimiento: (f?.['Texto Consentimiento'] || '').trim(),
    origen: (f?.Origen || '').trim(),
    fechaBaja: (f?.['Fecha Baja'] || '').trim(),
    acumbamailId: (f?.['Acumbamail ID'] || '').trim(),
    notas: (f?.Notas || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.email !== undefined) out['Email'] = f.email;
  if (f.nombre !== undefined) out['Nombre'] = f.nombre;
  if (f.tipo !== undefined) out['Tipo'] = f.tipo;
  if (f.baseLegal !== undefined) out['Base Legal'] = f.baseLegal;
  if (f.consentimiento !== undefined) out['Consentimiento'] = f.consentimiento;
  if (f.fechaConsentimiento !== undefined) out['Fecha Consentimiento'] = f.fechaConsentimiento;
  if (f.textoConsentimiento !== undefined) out['Texto Consentimiento'] = f.textoConsentimiento;
  if (f.origen !== undefined) out['Origen'] = f.origen;
  if (f.fechaBaja !== undefined) out['Fecha Baja'] = f.fechaBaja;
  if (f.acumbamailId !== undefined) out['Acumbamail ID'] = f.acumbamailId;
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

export async function listSubscribers(filters = {}) {
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

  if (filters.tipo) {
    all = all.filter(s => s.tipo.toLowerCase() === filters.tipo.toLowerCase());
  }
  if (filters.consentimiento) {
    all = all.filter(s => s.consentimiento.toLowerCase() === filters.consentimiento.toLowerCase());
  }
  if (filters.baseLegal) {
    all = all.filter(s => s.baseLegal.toLowerCase() === filters.baseLegal.toLowerCase());
  }

  return all;
}

export async function findByEmail(email) {
  const all = await listSubscribers();
  const target = email.toLowerCase().trim();
  return all.find(s => s.email === target) || null;
}

export async function subscribe(data) {
  const email = data.email.toLowerCase().trim();
  const tipo = data.tipo || 'lead';
  const baseLegal = tipo === 'alumno'
    ? BASES_LEGALES.INTERES_LEGITIMO
    : BASES_LEGALES.CONSENTIMIENTO_EXPRESO;

  const fields = toStackbyFields({
    email,
    nombre: data.nombre || '',
    tipo,
    baseLegal: data.baseLegal || baseLegal,
    consentimiento: CONSENTIMIENTO_ESTADOS.SUSCRITO,
    fechaConsentimiento: new Date().toISOString(),
    textoConsentimiento: data.textoConsentimiento || TEXTOS_LEGALES[baseLegal] || '',
    origen: data.origen || 'manual',
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
      tabla: 'NEWSLETTER_CONSENT', operacion: 'CREATE', rowId: created.id,
      usuario: 'newsletter-client.mjs', fuente: 'CLI',
      campos: JSON.stringify({ email, tipo, baseLegal }),
      detalles: `Suscripcion: ${email} (${tipo})`,
    });
  } catch { /* fire-and-forget */ }

  return { id: created.id, ...parseFields(created.field) };
}

export async function unsubscribe(email) {
  const subscriber = await findByEmail(email);
  if (!subscriber) throw new Error(`Suscriptor no encontrado: ${email}`);

  const fields = toStackbyFields({
    consentimiento: CONSENTIMIENTO_ESTADOS.BAJA,
    fechaBaja: new Date().toISOString(),
  });

  await stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: subscriber.id, field: fields }] }),
  });

  // Audit log
  try {
    const { logAudit } = await import('./audit-client.mjs');
    await logAudit({
      tabla: 'NEWSLETTER_CONSENT', operacion: 'UPDATE', rowId: subscriber.id,
      usuario: 'newsletter-client.mjs', fuente: 'CLI',
      campos: JSON.stringify({ consentimiento: 'baja' }),
      detalles: `Baja newsletter: ${email}`,
    });
  } catch { /* fire-and-forget */ }

  return { success: true, email };
}

export async function syncFromAlumnos(options = {}) {
  const dryRun = options.dryRun || false;

  // Import alumnos client
  const alumnosModule = await import('./alumnos-client.js');
  const alumnos = await alumnosModule.getAllAlumnos();

  // Get existing subscribers
  const existing = await listSubscribers();
  const existingEmails = new Set(existing.map(s => s.email));

  // Filter active/enrolled/paid students
  const ESTADOS_ACTIVOS = ['pagado', 'enrolado', 'activo'];
  const elegibles = alumnos.filter(a => {
    const estado = (a.field?.Estado || '').toLowerCase();
    const email = (a.field?.Email || '').toLowerCase().trim();
    return email && ESTADOS_ACTIVOS.includes(estado);
  });

  let added = 0, skipped = 0;
  for (const alumno of elegibles) {
    const email = (alumno.field?.Email || '').toLowerCase().trim();
    if (existingEmails.has(email)) { skipped++; continue; }

    if (dryRun) {
      console.log(`  [DRY-RUN] Suscribir: ${email} (${alumno.field?.Nombre || ''} ${alumno.field?.Apellidos || ''})`);
      added++;
      continue;
    }

    await subscribe({
      email,
      nombre: `${alumno.field?.Nombre || ''} ${alumno.field?.Apellidos || ''}`.trim(),
      tipo: 'alumno',
      baseLegal: BASES_LEGALES.INTERES_LEGITIMO,
      origen: 'sync_alumnos',
    });
    added++;
    existingEmails.add(email);
  }

  return { added, skipped, total: elegibles.length };
}

export async function getExportForAcumbamail() {
  const subs = await listSubscribers({ consentimiento: CONSENTIMIENTO_ESTADOS.SUSCRITO });
  const lines = ['email,nombre,tipo'];
  for (const s of subs) {
    lines.push(`${s.email},"${s.nombre.replace(/"/g, '""')}",${s.tipo}`);
  }
  return lines.join('\n');
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
Newsletter Client IITD (N34) — Consentimiento RGPD

Comandos:
  list [--tipo alumno|lead] [--consentimiento suscrito|baja|pendiente]
  subscribe --email X --tipo alumno|lead [--nombre "..."]
  unsubscribe --email X
  sync-alumnos [--dry-run]         Importar alumnos activos como interes_legitimo
  export-acumbamail                CSV para importar en Acumbamail
  stats                            Estadisticas de consentimiento

Modelo dual:
  alumno → interes_legitimo (Art. 6.1.f RGPD)
  lead   → consentimiento_expreso (Art. 6.1.a RGPD)
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
  if (!TABLE_ID) { console.error('Error: STACKBY_NEWSLETTER_CONSENT_TABLE_ID no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--tipo')) filters.tipo = getArg('--tipo');
    if (getArg('--consentimiento')) filters.consentimiento = getArg('--consentimiento');
    if (getArg('--base-legal')) filters.baseLegal = getArg('--base-legal');

    const subs = await listSubscribers(filters);
    if (subs.length === 0) { console.log('No hay suscriptores.'); return; }

    console.log(`\nSuscriptores (${subs.length}):\n`);
    console.log(`  ${'Email'.padEnd(35)}  ${'Nombre'.padEnd(20)}  ${'Tipo'.padEnd(8)}  ${'Estado'.padEnd(10)}  Base Legal`);
    console.log(`  ${'-'.repeat(35)}  ${'-'.repeat(20)}  ${'-'.repeat(8)}  ${'-'.repeat(10)}  ----------`);
    for (const s of subs) {
      const icon = { suscrito: '>', baja: 'x', pendiente: '?' }[s.consentimiento] || '?';
      console.log(`  ${s.email.padEnd(35)}  ${s.nombre.substring(0, 20).padEnd(20)}  ${s.tipo.padEnd(8)}  ${icon} ${s.consentimiento.padEnd(8)}  ${s.baseLegal}`);
    }
    console.log();
    return;
  }

  if (command === 'subscribe') {
    const email = getArg('--email');
    const tipo = getArg('--tipo') || 'lead';
    if (!email) { console.error('Error: --email es requerido'); process.exit(1); }

    const existing = await findByEmail(email);
    if (existing && existing.consentimiento === CONSENTIMIENTO_ESTADOS.SUSCRITO) {
      console.log(`${email} ya esta suscrito.`);
      return;
    }

    const result = await subscribe({ email, tipo, nombre: getArg('--nombre') || '' });
    console.log(`Suscrito: ${result.email} (${result.tipo}, ${result.baseLegal})`);
    return;
  }

  if (command === 'unsubscribe') {
    const email = getArg('--email');
    if (!email) { console.error('Error: --email es requerido'); process.exit(1); }

    await unsubscribe(email);
    console.log(`Baja procesada: ${email}`);
    return;
  }

  if (command === 'sync-alumnos') {
    const dryRun = args.includes('--dry-run');
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Sincronizando alumnos activos...\n`);
    const result = await syncFromAlumnos({ dryRun });
    console.log(`\nResultado: ${result.added} nuevos, ${result.skipped} existentes, ${result.total} elegibles`);
    return;
  }

  if (command === 'export-acumbamail') {
    const csv = await getExportForAcumbamail();
    console.log(csv);
    return;
  }

  if (command === 'stats') {
    const all = await listSubscribers();
    const byEstado = {}, byTipo = {}, byBase = {};
    for (const s of all) {
      byEstado[s.consentimiento] = (byEstado[s.consentimiento] || 0) + 1;
      byTipo[s.tipo] = (byTipo[s.tipo] || 0) + 1;
      byBase[s.baseLegal] = (byBase[s.baseLegal] || 0) + 1;
    }

    console.log(`\nNewsletter RGPD — Estadisticas\n`);
    console.log(`  Total registros: ${all.length}`);
    console.log(`\n  Por estado:`);
    for (const [k, v] of Object.entries(byEstado)) console.log(`    ${k}: ${v}`);
    console.log(`\n  Por tipo:`);
    for (const [k, v] of Object.entries(byTipo)) console.log(`    ${k}: ${v}`);
    console.log(`\n  Por base legal:`);
    for (const [k, v] of Object.entries(byBase)) console.log(`    ${k}: ${v}`);
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('newsletter-client.mjs') ||
  process.argv[1].endsWith('newsletter-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
