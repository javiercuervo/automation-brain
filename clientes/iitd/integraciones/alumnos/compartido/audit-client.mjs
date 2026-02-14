#!/usr/bin/env node

/**
 * =====================================================
 * AUDIT CLIENT (N45)
 * =====================================================
 *
 * Cliente Stackby para la tabla AUDIT_LOG.
 * Registra operaciones CRUD sobre datos personales (RGPD Art. 33).
 *
 * Columnas: Fecha, Usuario, Tabla, Row ID, Operacion, Campos,
 *   Fuente, Detalles, Severidad
 *
 * Usage como modulo:
 *   import { logAudit, logBulkAudit, getAuditLog, detectAnomalies } from './audit-client.mjs';
 *   await logAudit({ tabla: 'ALUMNOS', operacion: 'UPDATE', rowId: 'rw123', usuario: 'sync-sheets.mjs' });
 *
 * Usage como CLI:
 *   node audit-client.mjs list                           # Ultimos registros
 *   node audit-client.mjs list --tabla ALUMNOS            # Filtrar por tabla
 *   node audit-client.mjs list --operacion DELETE         # Filtrar por operacion
 *   node audit-client.mjs list --days 7                   # Ultimos 7 dias
 *   node audit-client.mjs anomalies                       # Detectar anomalias (30 dias)
 *   node audit-client.mjs anomalies --days 7              # Ultimos 7 dias
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
const TABLE_ID = process.env.STACKBY_AUDIT_LOG_TABLE_ID || 'tba8MtB01pehR9WTmI';
const BASE_URL = 'https://stackby.com/api/betav1';

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    fecha: (f?.Fecha || '').trim(),
    usuario: (f?.Usuario || '').trim(),
    tabla: (f?.Tabla || '').trim(),
    rowId: (f?.['Row ID'] || '').trim(),
    operacion: (f?.Operacion || '').trim(),
    campos: (f?.Campos || '').trim(),
    fuente: (f?.Fuente || '').trim(),
    detalles: (f?.Detalles || '').trim(),
    severidad: (f?.Severidad || 'info').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.fecha !== undefined) out['Fecha'] = f.fecha;
  if (f.usuario !== undefined) out['Usuario'] = f.usuario;
  if (f.tabla !== undefined) out['Tabla'] = f.tabla;
  if (f.rowId !== undefined) out['Row ID'] = f.rowId;
  if (f.operacion !== undefined) out['Operacion'] = f.operacion;
  if (f.campos !== undefined) out['Campos'] = f.campos;
  if (f.fuente !== undefined) out['Fuente'] = f.fuente;
  if (f.detalles !== undefined) out['Detalles'] = f.detalles;
  if (f.severidad !== undefined) out['Severidad'] = f.severidad;
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

/**
 * Log a single audit entry. Fire-and-forget: never throws.
 * @param {object} entry - { tabla, operacion, rowId, usuario, campos, fuente, detalles, severidad }
 * @returns {object|null} Created record or null on error
 */
export async function logAudit(entry) {
  try {
    if (!API_KEY || !TABLE_ID) return null;

    const fields = toStackbyFields({
      fecha: new Date().toISOString(),
      usuario: entry.usuario || 'unknown',
      tabla: entry.tabla || '',
      rowId: entry.rowId || '',
      operacion: entry.operacion || '',
      campos: typeof entry.campos === 'object' ? JSON.stringify(entry.campos) : (entry.campos || ''),
      fuente: entry.fuente || 'CLI',
      detalles: entry.detalles || '',
      severidad: entry.severidad || 'info',
    });

    const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
      method: 'POST',
      body: JSON.stringify({ records: [{ field: fields }] }),
    });
    const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);
    return { id: created.id, ...parseFields(created.field) };
  } catch {
    // Fire-and-forget: never fail the caller
    return null;
  }
}

/**
 * Log multiple audit entries in batch (max 10 per API call).
 * @param {object[]} entries - Array of audit entries
 * @returns {number} Number of successfully logged entries
 */
export async function logBulkAudit(entries) {
  if (!API_KEY || !TABLE_ID || !entries.length) return 0;

  let logged = 0;
  // Stackby accepts max 10 records per rowcreate call
  for (let i = 0; i < entries.length; i += 10) {
    const batch = entries.slice(i, i + 10);
    try {
      const records = batch.map(entry => ({
        field: toStackbyFields({
          fecha: new Date().toISOString(),
          usuario: entry.usuario || 'unknown',
          tabla: entry.tabla || '',
          rowId: entry.rowId || '',
          operacion: entry.operacion || '',
          campos: typeof entry.campos === 'object' ? JSON.stringify(entry.campos) : (entry.campos || ''),
          fuente: entry.fuente || 'CLI',
          detalles: entry.detalles || '',
          severidad: entry.severidad || 'info',
        }),
      }));

      await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
        method: 'POST',
        body: JSON.stringify({ records }),
      });
      logged += batch.length;
    } catch {
      // Continue with next batch
    }
  }
  return logged;
}

/**
 * Fetch audit log with optional filters.
 * @param {object} filters - { tabla, operacion, desde, hasta, days, limit }
 * @returns {object[]} Parsed audit records
 */
export async function getAuditLog(filters = {}) {
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
  let filtered = all;

  if (filters.tabla) {
    filtered = filtered.filter(r => r.tabla.toLowerCase().includes(filters.tabla.toLowerCase()));
  }
  if (filters.operacion) {
    filtered = filtered.filter(r => r.operacion.toLowerCase() === filters.operacion.toLowerCase());
  }
  if (filters.days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filters.days);
    filtered = filtered.filter(r => r.fecha && new Date(r.fecha) >= cutoff);
  }
  if (filters.desde) {
    filtered = filtered.filter(r => r.fecha && r.fecha >= filters.desde);
  }
  if (filters.hasta) {
    filtered = filtered.filter(r => r.fecha && r.fecha <= filters.hasta);
  }
  if (filters.limit) {
    filtered = filtered.slice(0, filters.limit);
  }

  // Sort by fecha descending (most recent first)
  filtered.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  return filtered;
}

/**
 * Detect anomalies in the audit log.
 * @param {object} options - { days }
 * @returns {object[]} Array of { type, severity, description, records }
 */
export async function detectAnomalies(options = {}) {
  const days = options.days || 30;
  const records = await getAuditLog({ days });
  const anomalies = [];

  // Rule 1: >5 DELETE on same table in 1 hour
  const deletesByTableHour = {};
  for (const r of records.filter(r => r.operacion === 'DELETE')) {
    const hour = r.fecha ? r.fecha.substring(0, 13) : 'unknown'; // YYYY-MM-DDTHH
    const key = `${r.tabla}|${hour}`;
    if (!deletesByTableHour[key]) deletesByTableHour[key] = [];
    deletesByTableHour[key].push(r);
  }
  for (const [key, recs] of Object.entries(deletesByTableHour)) {
    if (recs.length > 5) {
      const [tabla, hour] = key.split('|');
      anomalies.push({
        type: 'bulk_delete',
        severity: 'alert',
        description: `${recs.length} DELETE en tabla ${tabla} durante ${hour}`,
        records: recs,
      });
    }
  }

  // Rule 2: >50 UPDATE on same table in 1 hour
  const updatesByTableHour = {};
  for (const r of records.filter(r => r.operacion === 'UPDATE')) {
    const hour = r.fecha ? r.fecha.substring(0, 13) : 'unknown';
    const key = `${r.tabla}|${hour}`;
    if (!updatesByTableHour[key]) updatesByTableHour[key] = [];
    updatesByTableHour[key].push(r);
  }
  for (const [key, recs] of Object.entries(updatesByTableHour)) {
    if (recs.length > 50) {
      const [tabla, hour] = key.split('|');
      anomalies.push({
        type: 'mass_update',
        severity: 'warning',
        description: `${recs.length} UPDATE en tabla ${tabla} durante ${hour}`,
        records: recs,
      });
    }
  }

  // Rule 3: Operations between 00:00-06:00 CET
  const offHours = records.filter(r => {
    if (!r.fecha) return false;
    const d = new Date(r.fecha);
    // CET = UTC+1 (simplified, no DST)
    const cetHour = (d.getUTCHours() + 1) % 24;
    return cetHour >= 0 && cetHour < 6;
  });
  if (offHours.length > 0) {
    anomalies.push({
      type: 'off_hours',
      severity: 'info',
      description: `${offHours.length} operaciones fuera de horario (00:00-06:00 CET)`,
      records: offHours,
    });
  }

  // Rule 4: Unknown usuario (not a recognized script name)
  const KNOWN_SCRIPTS = [
    'sync-sheets.mjs', 'sync-calificaciones.mjs', 'sheets-profesores.mjs',
    'dashboard.mjs', 'kpis-deca.mjs', 'rgpd-retencion.mjs',
    'recibo-pdf.mjs', 'certificado-pdf.mjs', 'exportar-alumno.mjs',
    'validar-datos.mjs', 'breach-notification.mjs', 'grabaciones-expiracion.mjs',
    'import-polar.mjs', 'dedup-alumnos.mjs', 'assign-ids.mjs',
    'audit-client.mjs', 'grabaciones-client.mjs', 'curso-publicar.mjs',
    'setup-test', 'manual', 'stripe-webhook',
  ];
  const unknownUser = records.filter(r =>
    r.usuario && !KNOWN_SCRIPTS.some(s => r.usuario.includes(s))
  );
  if (unknownUser.length > 0) {
    anomalies.push({
      type: 'unknown_user',
      severity: 'warning',
      description: `${unknownUser.length} operaciones de usuario no reconocido`,
      records: unknownUser,
    });
  }

  return anomalies;
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
Audit Client IITD (N45) — RGPD Art. 33

Comandos:
  list                                 Ultimos registros
  list --tabla ALUMNOS                 Filtrar por tabla
  list --operacion DELETE              Filtrar por operacion
  list --days 7                        Ultimos 7 dias
  anomalies                            Detectar anomalias (30 dias)
  anomalies --days 7                   Ultimos 7 dias
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--tabla')) filters.tabla = getArg('--tabla');
    if (getArg('--operacion')) filters.operacion = getArg('--operacion');
    if (getArg('--days')) filters.days = parseInt(getArg('--days'));

    const records = await getAuditLog(filters);

    if (records.length === 0) {
      console.log('No hay registros de auditoria' +
        (filters.tabla ? ` para tabla "${filters.tabla}"` : '') +
        (filters.days ? ` en los ultimos ${filters.days} dias` : '') + '.');
      return;
    }

    console.log(`\nAudit Log (${records.length} registros):\n`);
    console.log(`  ${'Fecha'.padEnd(24)}  ${'Usuario'.padEnd(28)}  ${'Tabla'.padEnd(16)}  ${'Op'.padEnd(8)}  Severidad`);
    console.log(`  ${'-'.repeat(24)}  ${'-'.repeat(28)}  ${'-'.repeat(16)}  ${'-'.repeat(8)}  ---------`);
    for (const r of records.slice(0, 100)) {
      const sev = { info: ' ', warning: '!', alert: '!!' }[r.severidad] || ' ';
      console.log(`  ${r.fecha.padEnd(24)}  ${r.usuario.padEnd(28)}  ${r.tabla.padEnd(16)}  ${r.operacion.padEnd(8)}  ${sev} ${r.severidad}`);
    }
    if (records.length > 100) console.log(`  ... y ${records.length - 100} mas`);
    console.log();
    return;
  }

  if (command === 'anomalies') {
    const days = getArg('--days') ? parseInt(getArg('--days')) : 30;
    console.log(`\nDeteccion de anomalias (ultimos ${days} dias):\n`);

    const anomalies = await detectAnomalies({ days });

    if (anomalies.length === 0) {
      console.log('  No se detectaron anomalias.');
    } else {
      for (const a of anomalies) {
        const icon = { alert: '!!', warning: '!', info: 'i' }[a.severity] || '?';
        console.log(`  [${icon}] ${a.severity.toUpperCase()}: ${a.description} (${a.records.length} registros)`);
      }
    }
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

// Run CLI if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('audit-client.mjs') ||
  process.argv[1].endsWith('audit-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
