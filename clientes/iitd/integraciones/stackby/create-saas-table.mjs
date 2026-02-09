#!/usr/bin/env node

/**
 * Create SaaS Inventory Table (N13)
 *
 * Creates an INVENTARIO_SAAS table in Stackby and pre-populates
 * with known SaaS services used by IITD.
 *
 * NOTE: Stackby API doesn't support creating tables programmatically.
 * This script creates ROWS in an already-existing table.
 *
 * Steps:
 *   1. Create the table manually in Stackby with columns below
 *   2. Set STACKBY_SAAS_TABLE_ID env var
 *   3. Run this script to populate
 *
 * Usage:
 *   STACKBY_API_KEY=xxx STACKBY_SAAS_TABLE_ID=xxx node create-saas-table.mjs
 *   STACKBY_API_KEY=xxx STACKBY_SAAS_TABLE_ID=xxx node create-saas-table.mjs --dry-run
 *
 * Table columns to create manually:
 *   | Columna            | Tipo          |
 *   |--------------------|---------------|
 *   | Servicio           | Text          |
 *   | Proveedor          | Text          |
 *   | Categoría          | Single Select |
 *   | Datos tratados     | Long Text     |
 *   | DPA firmado        | Checkbox      |
 *   | Fecha contrato     | Date          |
 *   | Fecha renovación   | Date          |
 *   | Responsable        | Text          |
 *   | URL                | URL           |
 *   | Notas              | Long Text     |
 */

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_SAAS_TABLE_ID;
const BASE_URL = 'https://stackby.com/api/betav1';
const DRY_RUN = process.argv.includes('--dry-run');

if (!API_KEY || !TABLE_ID) {
  console.error('Required env vars: STACKBY_API_KEY, STACKBY_SAAS_TABLE_ID');
  console.error('\nPrimero crea la tabla INVENTARIO_SAAS manualmente en Stackby.');
  console.error('Luego ejecuta con: STACKBY_SAAS_TABLE_ID=tbXXX node create-saas-table.mjs');
  process.exit(1);
}

const SAAS_INVENTORY = [
  {
    Servicio: 'OnlineCourseHost (OCH)',
    Proveedor: 'OnlineCourseHost Ltd',
    'Categoría': 'LMS',
    'Datos tratados': 'Nombre, email, progreso cursos, trabajos, notas',
    'DPA firmado': false,
    Responsable: 'Josete',
    Notas: 'Plataforma principal de cursos. API limitada (2 endpoints).',
  },
  {
    Servicio: 'Stackby',
    Proveedor: 'Stackby Inc',
    'Categoría': 'Base de datos',
    'Datos tratados': 'Nombre, email, teléfono, DNI, programa, notas, estados',
    'DPA firmado': false,
    Responsable: 'Proportione',
    Notas: 'Base de datos operativa (SOLICITUDES_DECA, ALUMNOS). API betav1.',
  },
  {
    Servicio: 'Stripe',
    Proveedor: 'Stripe Inc',
    'Categoría': 'Pagos',
    'Datos tratados': 'Email, datos de pago, importes, fechas',
    'DPA firmado': false,
    Responsable: 'Proportione',
    Notas: 'Procesador de pagos. Webhook parcialmente implementado.',
  },
  {
    Servicio: 'Google Workspace',
    Proveedor: 'Google LLC',
    'Categoría': 'Productividad',
    'Datos tratados': 'Email, documentos, hojas de cálculo, calendarios',
    'DPA firmado': false,
    Responsable: 'Miriam',
    Notas: 'Gmail, Sheets, Drive, Apps Script. Dominio institutoteologia.org.',
  },
  {
    Servicio: 'Getformly',
    Proveedor: 'Getformly',
    'Categoría': 'Formularios',
    'Datos tratados': 'Nombre, email, teléfono, DNI, dirección, datos académicos',
    'DPA firmado': false,
    Responsable: 'Proportione',
    Notas: 'Formularios de inscripción DECA y pre-matrícula.',
  },
  {
    Servicio: 'Pabbly Connect',
    Proveedor: 'Pabbly',
    'Categoría': 'Automatización',
    'Datos tratados': 'Datos de alumnos en tránsito (no almacena)',
    'DPA firmado': false,
    Responsable: 'Proportione',
    Notas: 'Orquestador de workflows. WF_001 DECA Inscripción.',
  },
  {
    Servicio: 'Acumbamail',
    Proveedor: 'Acumbamail SL',
    'Categoría': 'Email marketing',
    'Datos tratados': 'Email, nombre, consentimiento marketing',
    'DPA firmado': false,
    Responsable: 'Sonia',
    Notas: 'Newsletter y campañas email. Integración parcial.',
  },
  {
    Servicio: 'WordPress',
    Proveedor: 'Automattic / Self-hosted',
    'Categoría': 'Web',
    'Datos tratados': 'Formularios contacto, cookies, analytics',
    'DPA firmado': false,
    Responsable: 'Proportione',
    Notas: 'Web institucional institutoteologia.org.',
  },
  {
    Servicio: 'FlipBooklets',
    Proveedor: 'FlipBooklets.com',
    'Categoría': 'Contenidos',
    'Datos tratados': 'PDFs educativos (no datos personales)',
    'DPA firmado': false,
    Responsable: 'Proportione',
    Notas: 'Publicación de materiales educativos digitales.',
  },
  {
    Servicio: 'PolarDoc',
    Proveedor: 'PolarDoc',
    'Categoría': 'Gestión académica (legacy)',
    'Datos tratados': 'Expedientes completos: nombre, DNI, notas, certificados',
    'DPA firmado': false,
    Responsable: 'Miriam',
    Notas: 'Sistema legacy. Objetivo: migrar todo y apagar.',
  },
  {
    Servicio: 'Golden Soft',
    Proveedor: 'Golden Soft',
    'Categoría': 'Contabilidad (legacy)',
    'Datos tratados': 'Datos contables, facturación',
    'DPA firmado': false,
    Responsable: 'Gema',
    Notas: 'Licencia caduca junio 2026. Migrar a Holded (N18).',
  },
  {
    Servicio: 'Holded',
    Proveedor: 'Holded Technologies SL',
    'Categoría': 'Contabilidad',
    'Datos tratados': 'Facturación, contabilidad, datos fiscales',
    'DPA firmado': false,
    Responsable: 'Josete / Gema',
    Notas: 'Destino de migración desde Golden Soft. Pendiente de setup.',
  },
];

async function createRow(fields) {
  const res = await fetch(`${BASE_URL}/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records: [{ field: fields }] }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Crear Inventario SaaS (N13)\n`);
  console.log(`Stack: ${STACK_ID} / Table: ${TABLE_ID}\n`);

  let created = 0;
  for (const service of SAAS_INVENTORY) {
    console.log(`  + ${service.Servicio} (${service['Categoría']})`);

    if (!DRY_RUN) {
      await createRow(service);
      await new Promise(r => setTimeout(r, 300));
    }
    created++;
  }

  console.log(`\n${created} servicios ${DRY_RUN ? '(se crearían)' : 'creados'}.`);
  console.log('El equipo debe completar: DPA firmado, Fecha contrato, Fecha renovación.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
