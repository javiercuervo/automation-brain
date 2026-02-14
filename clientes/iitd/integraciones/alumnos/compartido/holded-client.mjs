#!/usr/bin/env node

/**
 * Holded Client — IITD (N18)
 *
 * Wrapper ESM del cliente Holded con helpers para migración.
 * Importa el client base de comunes/apis/holded/client.js y añade:
 *   - Rate limiting (5 req/s)
 *   - Paginación automática
 *   - Mapping Stackby → Holded
 *
 * Usage:
 *   node holded-client.mjs info                    # Info cuenta
 *   node holded-client.mjs contacts [--search X]   # Listar contactos
 *   node holded-client.mjs products                # Listar productos
 *   node holded-client.mjs invoices [--status X]   # Listar facturas
 *
 * Env vars (.env):
 *   HOLDED_API_KEY
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

const HOLDED_API_KEY = process.env.HOLDED_API_KEY || '';

// =====================================================
// CLIENT INIT
// =====================================================

let _client = null;

async function getClient() {
  if (_client) return _client;

  if (!HOLDED_API_KEY) {
    throw new Error('HOLDED_API_KEY no configurada en .env. Obtener de Holded > Configuración > API.');
  }

  const { HoldedClient } = await import('../../../../../../comunes/apis/holded/client.js');
  _client = new HoldedClient(HOLDED_API_KEY);
  return _client;
}

// =====================================================
// RATE LIMITING
// =====================================================

let lastRequest = 0;
const MIN_INTERVAL_MS = 200; // 5 req/s max

async function rateLimited(fn) {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequest));
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequest = Date.now();
  return fn();
}

// =====================================================
// PAGINATED HELPERS
// =====================================================

export async function listAllContacts(options = {}) {
  const client = await getClient();
  let all = [], page = 1;
  while (true) {
    const batch = await rateLimited(() => client.listContacts({ ...options, page }));
    if (!batch || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < 50) break; // Holded default page size
    page++;
  }
  return all;
}

export async function listAllProducts() {
  const client = await getClient();
  let all = [], page = 1;
  while (true) {
    const batch = await rateLimited(() => client.listProducts({ page }));
    if (!batch || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < 50) break;
    page++;
  }
  return all;
}

export async function listAllInvoices(options = {}) {
  const client = await getClient();
  let all = [], page = 1;
  while (true) {
    const batch = await rateLimited(() => client.listInvoices({ ...options, page }));
    if (!batch || batch.length === 0) break;
    all = all.concat(batch);
    if (batch.length < 50) break;
    page++;
  }
  return all;
}

// =====================================================
// MAPPING: Stackby alumno → Holded contacto
// =====================================================

export function alumnoToHoldedContact(alumno) {
  const f = alumno.field || alumno;
  return {
    name: `${f.Nombre || ''} ${f.Apellidos || ''}`.trim(),
    email: f.Email || '',
    phone: f.Telefono || '',
    type: 'client',
    vatnumber: f.NIF || f.DNI || '',
    billAddress: {
      address: f.Direccion || '',
      city: f.Ciudad || '',
      postalCode: f.CP || '',
      province: f.Provincia || '',
      country: 'ES',
    },
    tags: [f.Programa || 'IITD'],
    notes: `Importado de Stackby. Expediente: ${f.Expediente || ''}`,
  };
}

// =====================================================
// DIRECT EXPORTS (for migration script)
// =====================================================

export async function createContact(data) {
  const client = await getClient();
  return rateLimited(() => client.createContact(data));
}

export async function updateContact(id, data) {
  const client = await getClient();
  return rateLimited(() => client.updateContact(id, data));
}

export async function createProduct(data) {
  const client = await getClient();
  return rateLimited(() => client.createProduct(data));
}

export async function createInvoice(data) {
  const client = await getClient();
  return rateLimited(() => client.createInvoice(data));
}

export async function getAccountInfo() {
  const client = await getClient();
  return rateLimited(() => client.getAccountInfo());
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
Holded Client IITD (N18) — Wrapper con rate limiting

Comandos:
  info                        Información de cuenta
  contacts [--search X]       Listar contactos
  products                    Listar productos
  invoices [--status X]       Listar facturas

Requiere: HOLDED_API_KEY en .env
`);
    return;
  }

  if (!HOLDED_API_KEY) {
    console.error('Error: HOLDED_API_KEY no configurada en .env');
    console.error('Obtener de: Holded > Configuración > API > Generar clave');
    process.exit(1);
  }

  if (command === 'info') {
    const info = await getAccountInfo();
    console.log('\nCuenta Holded:');
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  if (command === 'contacts') {
    const search = getArg('--search');
    const contacts = await listAllContacts(search ? { search } : {});
    console.log(`\nContactos (${contacts.length}):\n`);
    for (const c of contacts.slice(0, 50)) {
      console.log(`  ${(c.name || '').padEnd(35)}  ${(c.email || '').padEnd(30)}  ${c.type || ''}`);
    }
    if (contacts.length > 50) console.log(`  ... y ${contacts.length - 50} más`);
    console.log();
    return;
  }

  if (command === 'products') {
    const products = await listAllProducts();
    console.log(`\nProductos (${products.length}):\n`);
    for (const p of products) {
      console.log(`  ${(p.name || '').padEnd(40)}  ${String(p.price || 0).padStart(10)} EUR`);
    }
    console.log();
    return;
  }

  if (command === 'invoices') {
    const status = getArg('--status');
    const invoices = await listAllInvoices(status ? { status } : {});
    console.log(`\nFacturas (${invoices.length}):\n`);
    for (const i of invoices.slice(0, 50)) {
      console.log(`  ${(i.docNumber || '').padEnd(15)}  ${(i.contactName || '').padEnd(30)}  ${String(i.total || 0).padStart(10)} EUR  ${i.status || ''}`);
    }
    if (invoices.length > 50) console.log(`  ... y ${invoices.length - 50} más`);
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}".`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('holded-client.mjs') ||
  process.argv[1].endsWith('holded-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
