#!/usr/bin/env node

/**
 * Facturas Client — IITD (N10)
 *
 * CRUD para la tabla FACTURAS_CENTROS en Stackby.
 * Facturacion a centros asociados (diocesis, colegios, etc.).
 *
 * Columnas: Numero factura, Centro, NIF centro, Fecha emision, Concepto,
 *   Lineas, Base imponible, IVA, Total, Estado, Fecha pago, PDF URL, Notas
 *
 * Estados: borrador -> emitida -> pagada / anulada
 *
 * Usage:
 *   node facturas-client.mjs list                               # Listar todas
 *   node facturas-client.mjs list --centro "Centro Lugo"        # Filtrar por centro
 *   node facturas-client.mjs list --estado emitida              # Filtrar por estado
 *   node facturas-client.mjs create --centro "Centro X" --lineas '[{"concepto":"Mat DECA","cantidad":5,"precio":350}]'
 *   node facturas-client.mjs status <rowId> --estado emitida    # Cambiar estado
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_FACTURAS_CENTROS_TABLE_ID
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
const TABLE_ID = process.env.STACKBY_FACTURAS_CENTROS_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); }
if (!TABLE_ID) { console.error('Error: STACKBY_FACTURAS_CENTROS_TABLE_ID no configurada en .env'); }

// =====================================================
// ESTADOS
// =====================================================

export const ESTADOS_FACTURA = {
  BORRADOR: 'borrador',
  EMITIDA: 'emitida',
  PAGADA: 'pagada',
  ANULADA: 'anulada',
};

const TRANSICIONES = {
  [ESTADOS_FACTURA.BORRADOR]: [ESTADOS_FACTURA.EMITIDA, ESTADOS_FACTURA.ANULADA],
  [ESTADOS_FACTURA.EMITIDA]: [ESTADOS_FACTURA.PAGADA, ESTADOS_FACTURA.ANULADA],
  [ESTADOS_FACTURA.PAGADA]: [],
  [ESTADOS_FACTURA.ANULADA]: [],
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
    numeroFactura: (f?.['Numero factura'] || '').trim(),
    centro: (f?.Centro || '').trim(),
    nifCentro: (f?.['NIF centro'] || '').trim(),
    fechaEmision: (f?.['Fecha emision'] || '').trim(),
    concepto: (f?.Concepto || '').trim(),
    lineas: (f?.Lineas || '').trim(),
    baseImponible: (f?.['Base imponible'] || '').trim(),
    iva: (f?.IVA || '').trim(),
    total: (f?.Total || '').trim(),
    estado: (f?.Estado || ESTADOS_FACTURA.BORRADOR).trim(),
    fechaPago: (f?.['Fecha pago'] || '').trim(),
    pdfUrl: (f?.['PDF URL'] || '').trim(),
    notas: (f?.Notas || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.numeroFactura !== undefined) out['Numero factura'] = f.numeroFactura;
  if (f.centro !== undefined) out['Centro'] = f.centro;
  if (f.nifCentro !== undefined) out['NIF centro'] = f.nifCentro;
  if (f.fechaEmision !== undefined) out['Fecha emision'] = f.fechaEmision;
  if (f.concepto !== undefined) out['Concepto'] = f.concepto;
  if (f.lineas !== undefined) out['Lineas'] = f.lineas;
  if (f.baseImponible !== undefined) out['Base imponible'] = f.baseImponible;
  if (f.iva !== undefined) out['IVA'] = f.iva;
  if (f.total !== undefined) out['Total'] = f.total;
  if (f.estado !== undefined) out['Estado'] = f.estado;
  if (f.fechaPago !== undefined) out['Fecha pago'] = f.fechaPago;
  if (f.pdfUrl !== undefined) out['PDF URL'] = f.pdfUrl;
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

export async function listarFacturas(filters = {}) {
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

  if (filters.centro) {
    all = all.filter(f => f.centro.toLowerCase().includes(filters.centro.toLowerCase()));
  }
  if (filters.estado) {
    all = all.filter(f => f.estado.toLowerCase() === filters.estado.toLowerCase());
  }
  if (filters.desde) {
    all = all.filter(f => f.fechaEmision >= filters.desde);
  }
  if (filters.hasta) {
    all = all.filter(f => f.fechaEmision <= filters.hasta);
  }

  return all;
}

export async function getNextFacturaNumber() {
  const all = await listarFacturas();
  const now = new Date();
  const prefix = `FAC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Find highest number with this prefix
  let max = 0;
  for (const f of all) {
    if (f.numeroFactura.startsWith(prefix)) {
      const num = parseInt(f.numeroFactura.split('-').pop(), 10);
      if (num > max) max = num;
    }
  }

  return `${prefix}-${String(max + 1).padStart(4, '0')}`;
}

export async function crearFactura(fields) {
  const numero = fields.numeroFactura || await getNextFacturaNumber();

  // Calculate totals from lineas if provided
  let baseImponible = fields.baseImponible;
  let iva = fields.iva;
  let total = fields.total;

  if (fields.lineas && !baseImponible) {
    let lineasArr;
    try {
      lineasArr = typeof fields.lineas === 'string' ? JSON.parse(fields.lineas) : fields.lineas;
    } catch { lineasArr = []; }

    const base = lineasArr.reduce((sum, l) => sum + ((l.cantidad || 1) * (l.precio || 0)), 0);
    baseImponible = String(Math.round(base * 100) / 100);
    iva = String(Math.round(base * 0.21 * 100) / 100);
    total = String(Math.round(base * 1.21 * 100) / 100);
  }

  const stackbyFields = toStackbyFields({
    ...fields,
    numeroFactura: numero,
    lineas: typeof fields.lineas === 'object' ? JSON.stringify(fields.lineas) : (fields.lineas || ''),
    baseImponible: baseImponible || '',
    iva: iva || '',
    total: total || '',
    estado: fields.estado || ESTADOS_FACTURA.BORRADOR,
    fechaEmision: fields.fechaEmision || new Date().toISOString().split('T')[0],
  });

  const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: stackbyFields }] }),
  });
  const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);
  return { id: created.id, ...parseFields(created.field) };
}

export async function actualizarFactura(rowId, fields) {
  const stackbyFields = toStackbyFields(fields);
  return stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: rowId, field: stackbyFields }] }),
  });
}

export async function getFacturasPorCentro(centroNombre) {
  return listarFacturas({ centro: centroNombre });
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
Facturas Client IITD (N10)

Comandos:
  list [--centro X] [--estado X] [--desde YYYY-MM-DD] [--hasta YYYY-MM-DD]
  create --centro X --lineas '[{"concepto":"...","cantidad":N,"precio":N}]' [--nif X]
  status <rowId> --estado emitida|pagada|anulada

Estados: borrador -> emitida -> pagada / anulada
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
  if (!TABLE_ID) { console.error('Error: STACKBY_FACTURAS_CENTROS_TABLE_ID no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--centro')) filters.centro = getArg('--centro');
    if (getArg('--estado')) filters.estado = getArg('--estado');
    if (getArg('--desde')) filters.desde = getArg('--desde');
    if (getArg('--hasta')) filters.hasta = getArg('--hasta');

    const facturas = await listarFacturas(filters);

    if (facturas.length === 0) {
      console.log('No hay facturas' +
        (filters.centro ? ` para centro "${filters.centro}"` : '') +
        (filters.estado ? ` con estado "${filters.estado}"` : '') + '.');
      return;
    }

    console.log(`\nFacturas (${facturas.length}):\n`);
    const maxCentro = Math.max(...facturas.map(f => f.centro.length), 10);
    console.log(`  ${'Numero'.padEnd(18)}  ${'Centro'.padEnd(maxCentro)}  ${'Estado'.padEnd(10)}  ${'Total'.padEnd(10)}  Fecha`);
    console.log(`  ${'-'.repeat(18)}  ${'-'.repeat(maxCentro)}  ${'-'.repeat(10)}  ${'-'.repeat(10)}  ----------`);
    for (const f of facturas) {
      const icon = { borrador: '.', emitida: '>', pagada: '$', anulada: 'x' }[f.estado] || '?';
      console.log(`  ${f.numeroFactura.padEnd(18)}  ${f.centro.padEnd(maxCentro)}  ${icon} ${f.estado.padEnd(8)}  ${(f.total ? f.total + ' EUR' : '-').padEnd(10)}  ${f.fechaEmision || '-'}`);
    }
    console.log();
    return;
  }

  if (command === 'create') {
    const centro = getArg('--centro');
    const lineas = getArg('--lineas');
    if (!centro) { console.error('Error: --centro es requerido'); process.exit(1); }

    // Try to get NIF from CONTACTOS
    let nifCentro = getArg('--nif') || '';
    if (!nifCentro) {
      try {
        const { list: listContactos } = await import('./contactos-client.mjs');
        const contactos = await listContactos('centro_asociado');
        const match = contactos.find(c =>
          c.organizacion.toLowerCase().includes(centro.toLowerCase()) ||
          c.nombre.toLowerCase().includes(centro.toLowerCase())
        );
        if (match && match.notas) {
          const nifMatch = match.notas.match(/NIF[:\s]+([A-Z0-9-]+)/i);
          if (nifMatch) nifCentro = nifMatch[1];
        }
      } catch { /* ignore */ }
    }

    const fields = {
      centro,
      nifCentro,
      concepto: getArg('--concepto') || '',
      lineas: lineas || '[]',
      notas: getArg('--notas') || '',
    };

    const result = await crearFactura(fields);
    console.log(`Factura creada (ID: ${result.id})`);
    console.log(`  Numero: ${result.numeroFactura}`);
    console.log(`  Centro: ${result.centro}`);
    console.log(`  Base: ${result.baseImponible} EUR`);
    console.log(`  IVA: ${result.iva} EUR`);
    console.log(`  Total: ${result.total} EUR`);
    console.log(`  Estado: ${result.estado}`);
    return;
  }

  if (command === 'status') {
    const rowId = args.find(a => !a.startsWith('--') && a !== 'status');
    const nuevoEstado = getArg('--estado');
    if (!rowId || !nuevoEstado) {
      console.error('Usage: node facturas-client.mjs status <rowId> --estado emitida');
      process.exit(1);
    }

    // Get current state
    const facturas = await listarFacturas();
    const factura = facturas.find(f => f.id === rowId);
    if (!factura) { console.error(`Factura no encontrada: ${rowId}`); process.exit(1); }

    const check = validarTransicion(factura.estado, nuevoEstado);
    if (!check.ok) { console.error(`Error: ${check.error}`); process.exit(1); }

    const updates = { estado: nuevoEstado };
    if (nuevoEstado === ESTADOS_FACTURA.PAGADA) {
      updates.fechaPago = new Date().toISOString().split('T')[0];
    }

    await actualizarFactura(rowId, updates);
    console.log(`Factura ${factura.numeroFactura}: ${factura.estado} -> ${nuevoEstado}`);
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

// Run CLI if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('facturas-client.mjs') ||
  process.argv[1].endsWith('facturas-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
