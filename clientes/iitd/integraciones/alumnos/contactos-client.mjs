#!/usr/bin/env node

/**
 * Contactos Client — IITD (N24)
 *
 * CRUD para la tabla CONTACTOS en Stackby.
 * CRM simple para gestionar contactos institucionales
 * (centros asociados, proveedores, colaboradores).
 *
 * Usage:
 *   node contactos-client.mjs list                           # Listar todos
 *   node contactos-client.mjs list --tipo centro_asociado    # Filtrar por tipo
 *   node contactos-client.mjs find email@example.com         # Buscar por email
 *   node contactos-client.mjs create --nombre "Juan" --email "j@e.com" --organizacion "Centro X" --tipo centro_asociado
 *   node contactos-client.mjs update <rowId> --telefono "912345678"
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_CONTACTOS_TABLE_ID
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '.env'))) {
  for (const line of readFileSync(resolve(__dirname, '.env'), 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_CONTACTOS_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
if (!TABLE_ID) { console.error('Error: STACKBY_CONTACTOS_TABLE_ID no configurada en .env'); process.exit(1); }

// =====================================================
// STACKBY API
// =====================================================

async function apiGet(path) {
  const res = await fetch(`${BASE_URL}${path}`, { headers: { 'api-key': API_KEY } });
  if (!res.ok) throw new Error(`Stackby GET ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Stackby POST ${res.status}: ${await res.text()}`);
  return res.json();
}

async function apiPatch(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Stackby PATCH ${res.status}: ${await res.text()}`);
  return res.json();
}

// =====================================================
// CRUD OPERATIONS
// =====================================================

async function getAllRows() {
  let allRecords = [];
  let offset = 0;
  while (true) {
    const data = await apiGet(`/rowlist/${STACK_ID}/${TABLE_ID}${offset ? `?offset=${offset}` : ''}`);
    const records = Array.isArray(data) ? data : (data.records || []);
    allRecords = allRecords.concat(records);
    if (records.length < 100) break;
    offset += records.length;
  }
  return allRecords;
}

export async function list(tipo = null) {
  const rows = await getAllRows();
  let contacts = rows.map(r => ({
    id: r.id,
    nombre: r.field?.Nombre || '',
    organizacion: r.field?.Organizacion || r.field?.['Organización'] || '',
    cargo: r.field?.Cargo || '',
    email: r.field?.Email || '',
    telefono: r.field?.Telefono || r.field?.['Teléfono'] || '',
    tipo: r.field?.Tipo || '',
    notas: r.field?.Notas || '',
    fechaContacto: r.field?.['Fecha Contacto'] || '',
  }));

  if (tipo) {
    contacts = contacts.filter(c => c.tipo.toLowerCase() === tipo.toLowerCase());
  }

  return contacts;
}

export async function find(email) {
  const rows = await getAllRows();
  const target = email.toLowerCase().trim();
  const row = rows.find(r => (r.field?.Email || '').toLowerCase().trim() === target);
  if (!row) return null;

  return {
    id: row.id,
    nombre: row.field?.Nombre || '',
    organizacion: row.field?.Organizacion || row.field?.['Organización'] || '',
    cargo: row.field?.Cargo || '',
    email: row.field?.Email || '',
    telefono: row.field?.Telefono || row.field?.['Teléfono'] || '',
    tipo: row.field?.Tipo || '',
    notas: row.field?.Notas || '',
    fechaContacto: row.field?.['Fecha Contacto'] || '',
  };
}

export async function create(data) {
  const record = {
    field: {
      Nombre: data.nombre,
      Email: data.email,
    },
  };
  if (data.organizacion) record.field.Organizacion = data.organizacion;
  if (data.cargo) record.field.Cargo = data.cargo;
  if (data.telefono) record.field.Telefono = data.telefono;
  if (data.tipo) record.field.Tipo = data.tipo;
  if (data.notas) record.field.Notas = data.notas;
  if (data.fechaContacto) record.field['Fecha Contacto'] = data.fechaContacto;

  return apiPost(`/rowcreate/${STACK_ID}/${TABLE_ID}`, [record]);
}

export async function update(rowId, data) {
  const field = {};
  if (data.nombre) field.Nombre = data.nombre;
  if (data.email) field.Email = data.email;
  if (data.organizacion) field.Organizacion = data.organizacion;
  if (data.cargo) field.Cargo = data.cargo;
  if (data.telefono) field.Telefono = data.telefono;
  if (data.tipo) field.Tipo = data.tipo;
  if (data.notas) field.Notas = data.notas;
  if (data.fechaContacto) field['Fecha Contacto'] = data.fechaContacto;

  return apiPatch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, [{ id: rowId, field }]);
}

// =====================================================
// CLI
// =====================================================

function getArg(flag) {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : null;
}

async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'list': {
      const tipo = getArg('--tipo');
      const contacts = await list(tipo);
      console.log(`Contactos${tipo ? ` (tipo: ${tipo})` : ''}: ${contacts.length}`);
      console.log();
      for (const c of contacts) {
        console.log(`  ${c.nombre} — ${c.organizacion || '(sin org)'} — ${c.email} — ${c.tipo || '(sin tipo)'}`);
      }
      break;
    }

    case 'find': {
      const email = process.argv[3];
      if (!email) { console.error('Usage: node contactos-client.mjs find <email>'); process.exit(1); }
      const contact = await find(email);
      if (!contact) { console.log(`No se encontró contacto con email: ${email}`); break; }
      console.log(JSON.stringify(contact, null, 2));
      break;
    }

    case 'create': {
      const data = {
        nombre: getArg('--nombre'),
        email: getArg('--email'),
        organizacion: getArg('--organizacion'),
        cargo: getArg('--cargo'),
        telefono: getArg('--telefono'),
        tipo: getArg('--tipo'),
        notas: getArg('--notas'),
      };
      if (!data.nombre || !data.email) {
        console.error('Usage: node contactos-client.mjs create --nombre "..." --email "..." [--organizacion ...] [--tipo ...]');
        process.exit(1);
      }
      const result = await create(data);
      console.log('✓ Contacto creado:', JSON.stringify(result, null, 2));
      break;
    }

    case 'update': {
      const rowId = process.argv[3];
      if (!rowId) { console.error('Usage: node contactos-client.mjs update <rowId> [--campo valor ...]'); process.exit(1); }
      const data = {};
      for (const f of ['nombre', 'email', 'organizacion', 'cargo', 'telefono', 'tipo', 'notas']) {
        const v = getArg(`--${f}`);
        if (v) data[f] = v;
      }
      const result = await update(rowId, data);
      console.log('✓ Contacto actualizado:', JSON.stringify(result, null, 2));
      break;
    }

    default:
      console.log('Contactos Client IITD (N24)');
      console.log();
      console.log('Commands:');
      console.log('  list [--tipo centro_asociado|proveedor|colaborador|institucional]');
      console.log('  find <email>');
      console.log('  create --nombre "..." --email "..." [--organizacion "..."] [--tipo "..."]');
      console.log('  update <rowId> [--nombre "..."] [--telefono "..."] ...');
  }
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('contactos-client.mjs') ||
  process.argv[1].endsWith('contactos-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
