#!/usr/bin/env node

/**
 * Migración Golden Soft → Holded — IITD (N18)
 *
 * URGENTE: Golden Soft caduca junio 2026
 *
 * Script principal de migración contable. Importa contactos, productos
 * y facturas históricas desde datos exportados de Golden Soft a Holded.
 *
 * Flujo:
 *   1. Exportar datos de Golden Soft (CSV manual por Gema)
 *   2. --contacts [--dry-run] → importar contactos (alumnos + centros)
 *   3. --products [--dry-run] → importar productos/servicios
 *   4. --invoices [--dry-run] → importar facturas históricas
 *   5. --validate → comparar totales
 *   6. --report → informe de migración
 *
 * Usage:
 *   node migracion-holded.mjs --contacts [--dry-run] [--file datos.csv]
 *   node migracion-holded.mjs --products [--dry-run] [--file productos.csv]
 *   node migracion-holded.mjs --invoices [--dry-run] [--file facturas.csv]
 *   node migracion-holded.mjs --validate
 *   node migracion-holded.mjs --report
 *   node migracion-holded.mjs --backup
 *
 * Env vars (.env):
 *   HOLDED_API_KEY, STACKBY_API_KEY, STACKBY_STACK_ID
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
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
// IMPORTS (lazy)
// =====================================================

let holdedClient = null;
let alumnosClient = null;

async function loadDeps() {
  if (!holdedClient) {
    holdedClient = await import('../compartido/holded-client.mjs');
  }
}

async function loadAlumnos() {
  if (!alumnosClient) {
    alumnosClient = await import('../compartido/alumnos-client.js');
  }
}

// =====================================================
// CSV PARSER (simple — for Golden Soft exports)
// =====================================================

function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(';').map(h => h.trim().replace(/^"/, '').replace(/"$/, ''));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';').map(v => v.trim().replace(/^"/, '').replace(/"$/, ''));
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }

  return rows;
}

// =====================================================
// CONTACTS — Importar alumnos como contactos Holded
// =====================================================

async function migrateContacts(options = {}) {
  await loadDeps();
  const dryRun = options.dryRun || false;

  let contacts = [];

  if (options.file && existsSync(options.file)) {
    // From CSV export
    console.log(`Leyendo CSV: ${options.file}`);
    const csv = readFileSync(options.file, 'utf-8');
    contacts = parseCSV(csv);
    console.log(`  ${contacts.length} contactos en CSV`);
  } else {
    // From Stackby alumnos
    console.log('Cargando alumnos desde Stackby...');
    await loadAlumnos();
    const alumnos = await alumnosClient.getAllAlumnos();
    contacts = alumnos.map(a => holdedClient.alumnoToHoldedContact(a));
    console.log(`  ${contacts.length} alumnos en Stackby`);
  }

  // Check existing in Holded
  console.log('Verificando contactos existentes en Holded...');
  const existing = await holdedClient.listAllContacts();
  const existingEmails = new Set(existing.map(c => (c.email || '').toLowerCase()));
  console.log(`  ${existing.length} contactos ya en Holded`);

  const nuevos = contacts.filter(c => c.email && !existingEmails.has(c.email.toLowerCase()));
  console.log(`\nNuevos a importar: ${nuevos.length}\n`);

  let created = 0, errors = 0;
  for (const contact of nuevos) {
    if (dryRun) {
      console.log(`  [DRY-RUN] Crear: ${contact.name} (${contact.email})`);
      created++;
      continue;
    }

    try {
      await holdedClient.createContact(contact);
      console.log(`  Creado: ${contact.name} (${contact.email})`);
      created++;
    } catch (err) {
      console.error(`  ERROR: ${contact.email} — ${err.message}`);
      errors++;
    }
  }

  console.log(`\nContactos: ${created} creados, ${errors} errores, ${contacts.length - nuevos.length} existentes`);
  return { created, errors, skipped: contacts.length - nuevos.length };
}

// =====================================================
// PRODUCTS — Importar servicios/productos
// =====================================================

async function migrateProducts(options = {}) {
  await loadDeps();
  const dryRun = options.dryRun || false;

  // IITD standard products (matriculas por programa)
  const PRODUCTOS_IITD = [
    { name: 'Matrícula DECA Infantil y Primaria', price: 0, sku: 'DECA-IP' },
    { name: 'Matrícula DECA ESO y Bachillerato', price: 0, sku: 'DECA-ESO' },
    { name: 'Matrícula Formación Sistemática', price: 0, sku: 'FORM-SIS' },
    { name: 'Matrícula Formación Bíblica', price: 0, sku: 'FORM-BIB' },
    { name: 'Matrícula Compromiso Laical', price: 0, sku: 'COMP-LAI' },
    { name: 'Matrícula Curso Monográfico', price: 0, sku: 'MONO' },
    { name: 'Tutorías personalizadas', price: 0, sku: 'TUT' },
    { name: 'Tasas expedición título', price: 0, sku: 'TASAS' },
  ];

  let products = PRODUCTOS_IITD;
  if (options.file && existsSync(options.file)) {
    console.log(`Leyendo CSV: ${options.file}`);
    products = parseCSV(readFileSync(options.file, 'utf-8'));
  }

  console.log('Verificando productos existentes en Holded...');
  const existing = await holdedClient.listAllProducts();
  const existingNames = new Set(existing.map(p => (p.name || '').toLowerCase()));

  const nuevos = products.filter(p => !existingNames.has(p.name.toLowerCase()));
  console.log(`Nuevos a importar: ${nuevos.length}\n`);

  let created = 0, errors = 0;
  for (const product of nuevos) {
    if (dryRun) {
      console.log(`  [DRY-RUN] Crear: ${product.name} (${product.sku || ''})`);
      created++;
      continue;
    }

    try {
      await holdedClient.createProduct(product);
      console.log(`  Creado: ${product.name}`);
      created++;
    } catch (err) {
      console.error(`  ERROR: ${product.name} — ${err.message}`);
      errors++;
    }
  }

  console.log(`\nProductos: ${created} creados, ${errors} errores`);
  return { created, errors };
}

// =====================================================
// INVOICES — Importar facturas históricas
// =====================================================

async function migrateInvoices(options = {}) {
  await loadDeps();
  const dryRun = options.dryRun || false;

  if (!options.file || !existsSync(options.file)) {
    console.error('Error: Se requiere --file con el CSV de facturas exportado de Golden Soft');
    console.error('Ejemplo: node migracion-holded.mjs --invoices --file facturas-golden.csv');
    process.exit(1);
  }

  console.log(`Leyendo CSV: ${options.file}`);
  const facturas = parseCSV(readFileSync(options.file, 'utf-8'));
  console.log(`  ${facturas.length} facturas en CSV`);

  // Need existing contacts to map
  console.log('Cargando contactos de Holded...');
  const contacts = await holdedClient.listAllContacts();
  const contactsByEmail = {};
  for (const c of contacts) {
    if (c.email) contactsByEmail[c.email.toLowerCase()] = c.id;
  }

  let created = 0, errors = 0, skipped = 0;
  for (const f of facturas) {
    const email = (f.Email || f.email || '').toLowerCase();
    const contactId = contactsByEmail[email];

    if (!contactId) {
      console.log(`  SKIP: ${f.Numero || '?'} — contacto no encontrado (${email})`);
      skipped++;
      continue;
    }

    const invoiceData = {
      contactId,
      desc: f.Concepto || f.Descripcion || '',
      date: f.Fecha ? Math.floor(new Date(f.Fecha).getTime() / 1000) : undefined,
      items: [{
        name: f.Concepto || f.Descripcion || 'Servicio',
        units: 1,
        subtotal: parseFloat(f.Total || f.Importe || 0),
      }],
      notes: `Importada de Golden Soft. Nº original: ${f.Numero || ''}`,
    };

    if (dryRun) {
      console.log(`  [DRY-RUN] Factura: ${f.Numero || '?'} — ${email} — ${f.Total || f.Importe || 0} EUR`);
      created++;
      continue;
    }

    try {
      await holdedClient.createInvoice(invoiceData);
      console.log(`  Creada: ${f.Numero || '?'} — ${email}`);
      created++;
    } catch (err) {
      console.error(`  ERROR: ${f.Numero || '?'} — ${err.message}`);
      errors++;
    }
  }

  console.log(`\nFacturas: ${created} creadas, ${errors} errores, ${skipped} sin contacto`);
  return { created, errors, skipped };
}

// =====================================================
// VALIDATE — Comparar totales
// =====================================================

async function validate() {
  await loadDeps();

  console.log('Comparando datos Holded...\n');

  const contacts = await holdedClient.listAllContacts();
  const products = await holdedClient.listAllProducts();
  const invoices = await holdedClient.listAllInvoices();

  const totalFacturado = invoices.reduce((sum, i) => sum + (i.total || 0), 0);

  console.log(`  Contactos en Holded:   ${contacts.length}`);
  console.log(`  Productos en Holded:   ${products.length}`);
  console.log(`  Facturas en Holded:    ${invoices.length}`);
  console.log(`  Total facturado:       ${totalFacturado.toFixed(2)} EUR`);
  console.log(`\n  Comparar estos totales con los de Golden Soft para verificar migración.`);

  return { contacts: contacts.length, products: products.length, invoices: invoices.length, totalFacturado };
}

// =====================================================
// BACKUP — Exportar datos actuales de Holded
// =====================================================

async function backup() {
  await loadDeps();

  console.log('Exportando backup de Holded...');

  const contacts = await holdedClient.listAllContacts();
  const products = await holdedClient.listAllProducts();
  const invoices = await holdedClient.listAllInvoices();

  const backupFile = resolve(__dirname, `../holded-backup-${new Date().toISOString().split('T')[0]}.json`);
  writeFileSync(backupFile, JSON.stringify({ contacts, products, invoices, exportedAt: new Date().toISOString() }, null, 2));

  console.log(`Backup guardado: ${backupFile}`);
  console.log(`  Contactos: ${contacts.length}`);
  console.log(`  Productos: ${products.length}`);
  console.log(`  Facturas: ${invoices.length}`);
}

// =====================================================
// REPORT — Informe de migración
// =====================================================

async function generateReport() {
  await loadDeps();
  await loadAlumnos();

  const stackbyAlumnos = await alumnosClient.getAllAlumnos();
  const holdedContacts = await holdedClient.listAllContacts();
  const holdedProducts = await holdedClient.listAllProducts();
  const holdedInvoices = await holdedClient.listAllInvoices();

  console.log(`
========================================
  MIGRACIÓN GOLDEN SOFT → HOLDED
  ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
========================================

  FUENTE (Stackby):
    Alumnos:             ${stackbyAlumnos.length}

  DESTINO (Holded):
    Contactos:           ${holdedContacts.length}
    Productos:           ${holdedProducts.length}
    Facturas:            ${holdedInvoices.length}

  COBERTURA:
    Alumnos migrados:    ${holdedContacts.filter(c => c.type === 'client').length} / ${stackbyAlumnos.length}

  DEADLINE: Golden Soft caduca junio 2026

========================================
`);
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
  const dryRun = args.includes('--dry-run');
  const file = getArg('--file');

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Migración Golden Soft → Holded — IITD (N18)

URGENTE: Golden Soft caduca junio 2026

Comandos:
  --contacts [--dry-run] [--file X.csv]   Importar contactos (alumnos)
  --products [--dry-run] [--file X.csv]   Importar productos
  --invoices [--dry-run] --file X.csv     Importar facturas históricas
  --validate                              Comparar totales
  --backup                                Exportar datos Holded actuales
  --report                                Informe de migración

Flujo recomendado:
  1. Gema exporta datos de Golden Soft (CSV separado por ;)
  2. --contacts --dry-run → verificar mapeo
  3. --contacts → importar
  4. --products → importar catálogo
  5. --invoices --file facturas.csv → importar histórico
  6. --validate → verificar totales coinciden
`);
    return;
  }

  if (!process.env.HOLDED_API_KEY) {
    console.error('Error: HOLDED_API_KEY no configurada en .env');
    console.error('Pendiente: solicitar API key a Holded');
    console.error('Estado: Script listo, pendiente de API key para ejecutar');
    process.exit(1);
  }

  if (args.includes('--contacts')) {
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Migrando contactos...\n`);
    await migrateContacts({ dryRun, file });
    return;
  }

  if (args.includes('--products')) {
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Migrando productos...\n`);
    await migrateProducts({ dryRun, file });
    return;
  }

  if (args.includes('--invoices')) {
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Migrando facturas...\n`);
    await migrateInvoices({ dryRun, file });
    return;
  }

  if (args.includes('--validate')) {
    await validate();
    return;
  }

  if (args.includes('--backup')) {
    await backup();
    return;
  }

  if (args.includes('--report')) {
    await generateReport();
    return;
  }

  console.error('Opción no reconocida. Usa --help.');
  process.exit(1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
