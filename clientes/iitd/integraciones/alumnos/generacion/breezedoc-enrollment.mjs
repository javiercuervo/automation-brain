#!/usr/bin/env node

/**
 * Envío de contratos de matrícula via BreezeDoc (e-signature)
 *
 * Crea un documento desde un template de BreezeDoc y lo envía al alumno
 * para que lo firme digitalmente. Útil para:
 *   - Contrato de matrícula DECA
 *   - Convenio con centro asociado
 *   - Consentimiento RGPD explícito
 *
 * Usage:
 *   node breezedoc-enrollment.mjs --email juan@email.com --template matricula
 *   node breezedoc-enrollment.mjs --email juan@email.com --template convenio
 *   node breezedoc-enrollment.mjs --email juan@email.com --template rgpd
 *   node breezedoc-enrollment.mjs --list-templates                             # Ver templates disponibles
 *   node breezedoc-enrollment.mjs --status <docId>                             # Comprobar estado de firma
 *
 * Env vars (.env):
 *   BREEZEDOC_ACCESS_TOKEN
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_ALUMNOS_TABLE_ID
 *
 * Requisito previo: crear los templates en la UI web de BreezeDoc y
 * configurar sus IDs en TEMPLATE_MAP (abajo) o en .env.
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

import {
  getTemplate,
  createFromTemplate,
  sendDocument,
  getDocument,
} from './breezedoc-client.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '.env'))) {
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// =====================================================
// CONFIG
// =====================================================

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';

// Map alias → BreezeDoc template ID
// Actualizar estos IDs una vez creados los templates en BreezeDoc UI
const TEMPLATE_MAP = {
  matricula:  process.env.BREEZEDOC_TEMPLATE_MATRICULA  || '',
  convenio:   process.env.BREEZEDOC_TEMPLATE_CONVENIO   || '',
  rgpd:       process.env.BREEZEDOC_TEMPLATE_RGPD       || '',
};

// =====================================================
// CLI ARGS
// =====================================================

const EMAIL_ARG = (() => {
  const idx = process.argv.indexOf('--email');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const TEMPLATE_ARG = (() => {
  const idx = process.argv.indexOf('--template');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const STATUS_ARG = (() => {
  const idx = process.argv.indexOf('--status');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const LIST_TEMPLATES = process.argv.includes('--list-templates');

// =====================================================
// STACKBY — buscar alumno
// =====================================================

async function getAlumno(email) {
  let allRecords = [];
  let offset = 0;

  while (true) {
    const url = `${BASE_URL}/rowlist/${STACK_ID}/${TABLE_ID}` +
      (offset ? `?offset=${offset}` : '');

    const res = await fetch(url, { headers: { 'api-key': API_KEY } });
    const text = await res.text();
    if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);

    const data = JSON.parse(text);
    const records = Array.isArray(data) ? data : (data.records || []);
    allRecords = allRecords.concat(records);

    if (records.length < 100) break;
    offset += records.length;
  }

  const target = email.toLowerCase().trim();
  const row = allRecords.find(r =>
    (r.field?.Email || '').toLowerCase().trim() === target
  );
  if (!row) return null;

  return {
    email: row.field?.Email || '',
    nombre: row.field?.Nombre || '',
    apellidos: row.field?.Apellidos || '',
    programa: row.field?.Programa || '',
  };
}

// =====================================================
// COMMANDS
// =====================================================

async function cmdListTemplates() {
  console.log('Templates configurados:\n');
  for (const [alias, id] of Object.entries(TEMPLATE_MAP)) {
    if (!id) {
      console.log(`  ${alias}: (sin configurar)`);
      continue;
    }
    try {
      const t = await getTemplate(id);
      console.log(`  ${alias}: [${t.id}] "${t.title}" — OK`);
    } catch {
      console.log(`  ${alias}: [${id}] — ERROR (no accesible)`);
    }
  }
}

async function cmdCheckStatus(docId) {
  console.log(`Consultando estado del documento ${docId}...`);
  const doc = await getDocument(docId);
  console.log(`  Titulo: ${doc.title}`);
  console.log(`  Creado: ${doc.created_at}`);
  console.log(`  Completado: ${doc.completed_at || 'NO (pendiente de firma)'}`);
  if (doc.recipients) {
    for (const r of doc.recipients) {
      console.log(`  Destinatario: ${r.name} <${r.email}> — ${r.signed_at ? 'FIRMADO ' + r.signed_at : 'pendiente'}`);
    }
  }
}

async function cmdSendEnrollment(email, templateAlias) {
  // Resolve template ID
  const templateId = TEMPLATE_MAP[templateAlias];
  if (!templateId) {
    console.error(`Template "${templateAlias}" no configurado.`);
    console.error(`Configura BREEZEDOC_TEMPLATE_${templateAlias.toUpperCase()} en .env`);
    console.error(`\nTemplates disponibles como alias: ${Object.keys(TEMPLATE_MAP).join(', ')}`);
    console.error('Usa --list-templates para ver los templates en BreezeDoc.');
    process.exit(1);
  }

  // Get student data from Stackby
  if (!API_KEY) {
    console.error('Set STACKBY_API_KEY env var');
    process.exit(1);
  }

  console.log(`Buscando alumno: ${email}`);
  const alumno = await getAlumno(email);
  if (!alumno) {
    console.error(`No se encontro alumno con email: ${email}`);
    process.exit(1);
  }

  const fullName = `${alumno.nombre} ${alumno.apellidos}`.trim();
  console.log(`  Alumno: ${fullName}`);
  console.log(`  Programa: ${alumno.programa}`);

  // Create document from template
  console.log(`\nCreando documento desde template "${templateAlias}" (ID: ${templateId})...`);
  const doc = await createFromTemplate(templateId);
  console.log(`  Documento creado: ID ${doc.id} — "${doc.title}"`);

  // Send to student for signature
  console.log(`\nEnviando a ${fullName} <${email}> para firma...`);
  const recipients = [{ name: fullName, email, party: 1 }];
  await sendDocument(doc.id, recipients);

  console.log(`\n  Enviado. El alumno recibira un email de BreezeDoc para firmar.`);
  console.log(`  Para comprobar el estado: node breezedoc-enrollment.mjs --status ${doc.id}`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  if (LIST_TEMPLATES) {
    return cmdListTemplates();
  }

  if (STATUS_ARG) {
    return cmdCheckStatus(STATUS_ARG);
  }

  if (EMAIL_ARG && TEMPLATE_ARG) {
    return cmdSendEnrollment(EMAIL_ARG, TEMPLATE_ARG);
  }

  console.log('Usage:');
  console.log('  node breezedoc-enrollment.mjs --email <email> --template <alias>');
  console.log('  node breezedoc-enrollment.mjs --list-templates');
  console.log('  node breezedoc-enrollment.mjs --status <docId>');
  console.log();
  console.log('Templates disponibles: matricula, convenio, rgpd');
  console.log('(Deben crearse primero en la UI de BreezeDoc y configurar IDs en .env)');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
