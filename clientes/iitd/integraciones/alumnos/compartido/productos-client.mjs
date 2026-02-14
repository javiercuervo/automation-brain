#!/usr/bin/env node

/**
 * Productos Client — IITD (N30)
 *
 * CRUD para la tabla PRODUCTOS en Stackby.
 * Catalogo de productos/servicios con precios y descuentos por bundle.
 *
 * Columnas: Nombre, SKU, Tipo, Programa, Precio, Descuento pack, Activo,
 *   Descripcion, ID Stripe, ID OCH, Notas, Fecha creacion
 *
 * Tipos: modulo, curso, pack, tutoria, material, servicio
 *
 * Usage:
 *   node productos-client.mjs list                              # Listar todos
 *   node productos-client.mjs list --tipo modulo                # Filtrar por tipo
 *   node productos-client.mjs list --programa "DECA IP"         # Filtrar por programa
 *   node productos-client.mjs list --activo                     # Solo activos
 *   node productos-client.mjs get MOD-001                       # Buscar por SKU
 *   node productos-client.mjs create --nombre "X" --sku "MOD-001" --tipo modulo --precio 50
 *   node productos-client.mjs bundle --skus MOD-001,MOD-002     # Calcular precio bundle
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_PRODUCTOS_TABLE_ID
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
const TABLE_ID = process.env.STACKBY_PRODUCTOS_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); }
if (!TABLE_ID) { console.error('Error: STACKBY_PRODUCTOS_TABLE_ID no configurada en .env'); }

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    nombre: (f?.Nombre || '').trim(),
    sku: (f?.SKU || '').trim(),
    tipo: (f?.Tipo || '').trim(),
    programa: (f?.Programa || '').trim(),
    precio: (f?.Precio || '').trim(),
    descuentoPack: (f?.['Descuento pack'] || '').trim(),
    activo: (f?.Activo || 'si').trim(),
    descripcion: (f?.Descripcion || '').trim(),
    idStripe: (f?.['ID Stripe'] || '').trim(),
    idOCH: (f?.['ID OCH'] || '').trim(),
    notas: (f?.Notas || '').trim(),
    fechaCreacion: (f?.['Fecha creacion'] || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.nombre !== undefined) out['Nombre'] = f.nombre;
  if (f.sku !== undefined) out['SKU'] = f.sku;
  if (f.tipo !== undefined) out['Tipo'] = f.tipo;
  if (f.programa !== undefined) out['Programa'] = f.programa;
  if (f.precio !== undefined) out['Precio'] = f.precio;
  if (f.descuentoPack !== undefined) out['Descuento pack'] = f.descuentoPack;
  if (f.activo !== undefined) out['Activo'] = f.activo;
  if (f.descripcion !== undefined) out['Descripcion'] = f.descripcion;
  if (f.idStripe !== undefined) out['ID Stripe'] = f.idStripe;
  if (f.idOCH !== undefined) out['ID OCH'] = f.idOCH;
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

export async function listarProductos(filters = {}) {
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
    all = all.filter(p => p.tipo.toLowerCase() === filters.tipo.toLowerCase());
  }
  if (filters.programa) {
    all = all.filter(p => p.programa.toLowerCase().includes(filters.programa.toLowerCase()));
  }
  if (filters.activo) {
    all = all.filter(p => p.activo.toLowerCase() === 'si');
  }

  return all;
}

export async function getProducto(rowId) {
  const all = await listarProductos();
  return all.find(p => p.id === rowId) || null;
}

export async function getProductosBySKU(sku) {
  const all = await listarProductos();
  return all.find(p => p.sku.toLowerCase() === sku.toLowerCase()) || null;
}

export async function getProductosByPrograma(programa) {
  return listarProductos({ programa });
}

export async function crearProducto(fields) {
  const stackbyFields = toStackbyFields({
    ...fields,
    activo: fields.activo || 'si',
    fechaCreacion: fields.fechaCreacion || new Date().toISOString().split('T')[0],
  });
  const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: stackbyFields }] }),
  });
  const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);
  return { id: created.id, ...parseFields(created.field) };
}

export async function actualizarProducto(rowId, fields) {
  const stackbyFields = toStackbyFields(fields);
  return stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id: rowId, field: stackbyFields }] }),
  });
}

/**
 * Calculate bundle price for a set of SKUs.
 * If products share the same programa, apply the highest descuentoPack among them.
 */
export async function calcularPrecioBundle(skus) {
  const all = await listarProductos();
  const productos = skus.map(sku => all.find(p => p.sku.toLowerCase() === sku.toLowerCase())).filter(Boolean);

  if (productos.length === 0) return { total: 0, productos: [], descuento: 0 };

  const precioTotal = productos.reduce((sum, p) => sum + (parseFloat(p.precio) || 0), 0);

  // Group by programa to determine bundle discount
  const porPrograma = {};
  for (const p of productos) {
    const prog = p.programa || 'sin_programa';
    if (!porPrograma[prog]) porPrograma[prog] = [];
    porPrograma[prog].push(p);
  }

  // Apply discount per programa group (only if >1 product in same programa)
  let totalConDescuento = 0;
  const detalle = [];

  for (const [programa, prods] of Object.entries(porPrograma)) {
    const subtotal = prods.reduce((s, p) => s + (parseFloat(p.precio) || 0), 0);
    let descuento = 0;

    if (prods.length > 1) {
      // Use the highest pack discount among products in the same programa
      descuento = Math.max(...prods.map(p => parseFloat(p.descuentoPack) || 0));
    }

    const subtotalDesc = subtotal * (1 - descuento / 100);
    totalConDescuento += subtotalDesc;

    detalle.push({ programa, productos: prods.length, subtotal, descuento, subtotalDesc });
  }

  return {
    productos: productos.map(p => ({ sku: p.sku, nombre: p.nombre, precio: parseFloat(p.precio) || 0 })),
    precioSinDescuento: precioTotal,
    total: Math.round(totalConDescuento * 100) / 100,
    ahorro: Math.round((precioTotal - totalConDescuento) * 100) / 100,
    detalle,
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
Productos Client IITD (N30)

Comandos:
  list [--tipo X] [--programa X] [--activo]    Listar productos
  get <SKU>                                     Buscar por SKU
  create --nombre X --sku X --tipo X --precio X Crear producto
  bundle --skus MOD-001,MOD-002                 Calcular precio bundle

Tipos: modulo, curso, pack, tutoria, material, servicio
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
  if (!TABLE_ID) { console.error('Error: STACKBY_PRODUCTOS_TABLE_ID no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--tipo')) filters.tipo = getArg('--tipo');
    if (getArg('--programa')) filters.programa = getArg('--programa');
    if (args.includes('--activo')) filters.activo = true;

    const productos = await listarProductos(filters);

    if (productos.length === 0) {
      console.log('No hay productos' +
        (filters.tipo ? ` de tipo "${filters.tipo}"` : '') +
        (filters.programa ? ` del programa "${filters.programa}"` : '') + '.');
      return;
    }

    console.log(`\nProductos (${productos.length}):\n`);
    const maxNombre = Math.max(...productos.map(p => p.nombre.length), 10);
    console.log(`  ${'SKU'.padEnd(12)}  ${'Nombre'.padEnd(maxNombre)}  ${'Tipo'.padEnd(10)}  ${'Precio'.padEnd(8)}  Activo`);
    console.log(`  ${'-'.repeat(12)}  ${'-'.repeat(maxNombre)}  ${'-'.repeat(10)}  ${'-'.repeat(8)}  ------`);
    for (const p of productos) {
      console.log(`  ${p.sku.padEnd(12)}  ${p.nombre.padEnd(maxNombre)}  ${p.tipo.padEnd(10)}  ${(p.precio || '-').padEnd(8)}  ${p.activo}`);
    }
    console.log();
    return;
  }

  if (command === 'get') {
    const sku = args.find(a => !a.startsWith('--') && a !== 'get');
    if (!sku) { console.error('Usage: node productos-client.mjs get <SKU>'); process.exit(1); }
    const producto = await getProductosBySKU(sku);
    if (!producto) { console.log(`No se encontro producto con SKU: ${sku}`); return; }
    console.log(JSON.stringify(producto, null, 2));
    return;
  }

  if (command === 'create') {
    const fields = {
      nombre: getArg('--nombre'),
      sku: getArg('--sku'),
      tipo: getArg('--tipo'),
      precio: getArg('--precio'),
      programa: getArg('--programa') || '',
      descuentoPack: getArg('--descuento') || '0',
      descripcion: getArg('--descripcion') || '',
    };
    if (!fields.nombre || !fields.sku || !fields.tipo || !fields.precio) {
      console.error('Usage: node productos-client.mjs create --nombre X --sku X --tipo X --precio X [--programa X]');
      process.exit(1);
    }
    const result = await crearProducto(fields);
    console.log(`Producto creado (ID: ${result.id})`);
    console.log(`  Nombre: ${result.nombre}`);
    console.log(`  SKU: ${result.sku}`);
    console.log(`  Tipo: ${result.tipo}`);
    console.log(`  Precio: ${result.precio}`);
    return;
  }

  if (command === 'bundle') {
    const skusRaw = getArg('--skus');
    if (!skusRaw) { console.error('Usage: node productos-client.mjs bundle --skus MOD-001,MOD-002'); process.exit(1); }
    const skus = skusRaw.split(',').map(s => s.trim());
    const result = await calcularPrecioBundle(skus);

    console.log(`\nCalculo de bundle (${skus.length} SKUs):\n`);
    for (const p of result.productos) {
      console.log(`  ${p.sku}: ${p.nombre} — ${p.precio} EUR`);
    }
    console.log(`\n  Precio sin descuento: ${result.precioSinDescuento} EUR`);
    if (result.ahorro > 0) {
      console.log(`  Ahorro: -${result.ahorro} EUR`);
    }
    console.log(`  TOTAL: ${result.total} EUR\n`);

    if (result.detalle.length > 1) {
      console.log('  Detalle por programa:');
      for (const d of result.detalle) {
        console.log(`    ${d.programa}: ${d.productos} productos, ${d.descuento}% dto → ${d.subtotalDesc} EUR`);
      }
      console.log();
    }
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

// Run CLI if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('productos-client.mjs') ||
  process.argv[1].endsWith('productos-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
