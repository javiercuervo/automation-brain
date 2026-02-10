#!/usr/bin/env node

/**
 * Cliente BreezeDoc — API de e-signature
 *
 * NOTA: BreezeDoc es una plataforma de e-signature (tipo DocuSign).
 * NO tiene endpoint para subir PDFs vía API ni para firma digital automática.
 * Los PDFs se suben manualmente por la UI web.
 *
 * Este cliente cubre los endpoints disponibles:
 * - GET /me — info del usuario
 * - GET/POST /documents — listar/crear documentos
 * - POST /documents/{id}/send — enviar a destinatarios
 * - GET /templates — listar templates
 * - POST /templates/{id}/create-document — crear doc desde template
 *
 * Para firma digital automatizada de los diplomas, usamos una firma visual
 * embebida en el PDF (imagen del rector + hash de verificación) en lugar de
 * BreezeDoc. Ver certificado-pdf.mjs.
 *
 * Usage (módulo):
 *   import { getMe, listDocuments, createDocument } from './breezedoc-client.mjs';
 *
 * Usage (CLI):
 *   node breezedoc-client.mjs --test           # Test API connection
 *   node breezedoc-client.mjs --docs           # List documents
 *   node breezedoc-client.mjs --templates      # List templates
 *
 * Env:
 *   BREEZEDOC_ACCESS_TOKEN — Bearer token (OAuth 2.0 / Personal Access Token)
 *
 * Rate limit: 60 req/min
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

const API_BASE = 'https://breezedoc.com/api';
const TOKEN = process.env.BREEZEDOC_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('Set BREEZEDOC_ACCESS_TOKEN env var');
  process.exit(1);
}

// =====================================================
// API HELPERS
// =====================================================

async function apiRequest(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${TOKEN}`,
      'Accept': 'application/json',
    },
  };

  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`BreezeDoc ${method} ${path} → ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

// =====================================================
// PUBLIC API
// =====================================================

/** Get current user info */
export async function getMe() {
  return apiRequest('GET', '/me');
}

/** List documents (paginated) */
export async function listDocuments(opts = {}) {
  const params = new URLSearchParams();
  if (opts.orderBy) params.set('order_by', opts.orderBy);
  if (opts.direction) params.set('direction', opts.direction);
  const qs = params.toString();
  return apiRequest('GET', `/documents${qs ? '?' + qs : ''}`);
}

/** Get a specific document */
export async function getDocument(id) {
  return apiRequest('GET', `/documents/${id}`);
}

/**
 * Create a new document
 * @param {string} title
 * @param {Array<{name: string, email: string, party: number}>} recipients
 *   party: 1 = signer
 */
export async function createDocument(title, recipients) {
  return apiRequest('POST', '/documents', { title, recipients });
}

/**
 * Send a document to its recipients
 * @param {number} docId
 * @param {Array<{name: string, email: string, party: number}>} recipients
 */
export async function sendDocument(docId, recipients) {
  return apiRequest('POST', `/documents/${docId}/send`, { recipients });
}

/** Get recipients for a document */
export async function getRecipients(docId) {
  return apiRequest('GET', `/documents/${docId}/recipients`);
}

/** List templates */
export async function listTemplates() {
  return apiRequest('GET', '/templates');
}

/** Get a specific template */
export async function getTemplate(id) {
  return apiRequest('GET', `/templates/${id}`);
}

/** Create a document from a template */
export async function createFromTemplate(templateId) {
  return apiRequest('POST', `/templates/${templateId}/create-document`);
}

// =====================================================
// CLI
// =====================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    console.log('Testing BreezeDoc API...');
    try {
      const user = await getMe();
      console.log(`  ✓ Connected as: ${user.name} (${user.email})`);
      console.log(`  Account created: ${user.created_at}`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  if (args.includes('--docs')) {
    const result = await listDocuments();
    console.log(`Documents (${result.total}):`);
    for (const d of result.data) {
      const status = d.completed_at ? 'completed' : 'pending';
      console.log(`  [${d.id}] ${d.title} — ${status}`);
    }
    return;
  }

  if (args.includes('--templates')) {
    const result = await listTemplates();
    console.log(`Templates (${result.total}):`);
    for (const t of result.data) {
      console.log(`  [${t.id}] ${t.title}`);
    }
    return;
  }

  console.log('Usage:');
  console.log('  node breezedoc-client.mjs --test');
  console.log('  node breezedoc-client.mjs --docs');
  console.log('  node breezedoc-client.mjs --templates');
  console.log();
  console.log('NOTA: BreezeDoc no tiene API para subir PDFs ni firma digital automática.');
  console.log('Los diplomas usan firma visual embebida (imagen + hash). Ver certificado-pdf.mjs.');
}

// Only run CLI if executed directly (not imported)
const isMain = process.argv[1] && (
  process.argv[1].endsWith('breezedoc-client.mjs') ||
  process.argv[1].endsWith('breezedoc-client')
);
if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
