#!/usr/bin/env node

/**
 * Cliente pxl.to — Short links para diplomas/certificados
 *
 * Genera short links en pxl.to y QR codes (local con `qrcode` npm).
 * La URL del diploma es predecible: diplomas.institutoteologia.org/{expediente}.pdf
 * → creamos el short link ANTES de generar el PDF, así el QR ya está listo.
 *
 * Límite pxl.to: 500 requests/día.
 *
 * Usage (módulo):
 *   import { createShortLink, generateQR, createDiplomaLink } from './pxl-client.mjs';
 *   const { shortUrl, qrBuffer } = await createDiplomaLink('IITD-021865');
 *
 * Usage (CLI):
 *   node pxl-client.mjs --test                            # Test API
 *   node pxl-client.mjs --create https://example.com      # Create short link
 *   node pxl-client.mjs --diploma IITD-021865             # Full flow: short link + QR
 *   node pxl-client.mjs --list                            # List existing links
 *
 * Env:
 *   PXL_API_TOKEN — Bearer token (JWT)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '.env'))) {
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// =====================================================
// CONFIG
// =====================================================

const API_BASE = 'https://api.pxl.to/api/v1';
const TOKEN = process.env.PXL_API_TOKEN;
const DIPLOMAS_BASE_URL = 'https://diplomas.institutoteologia.org';

if (!TOKEN) {
  console.error('Set PXL_API_TOKEN env var');
  process.exit(1);
}

// =====================================================
// PXL.TO API
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
    throw new Error(`pxl.to ${method} ${path} → ${res.status}: ${text}`);
  }

  return JSON.parse(text);
}

/**
 * List existing short links
 * @returns {Array} Array of short link objects
 */
export async function listLinks() {
  const data = await apiRequest('GET', '/short');
  return data.data || [];
}

/**
 * Create a short link
 * @param {string} destination - Target URL
 * @param {string} [title] - Optional title
 * @returns {{ id: string, route: string, shortUrl: string, destination: string }}
 */
export async function createShortLink(destination, title = '') {
  const body = { destination };
  if (title) body.title = title;

  const data = await apiRequest('POST', '/short', body);
  const link = data.data;

  return {
    id: link.id,
    route: link.route,
    shortUrl: `https://${link.id}`,
    destination: link.destination,
  };
}

/**
 * Delete a short link
 * @param {string} id - Short link ID (e.g. "pxl.to/abc123")
 */
export async function deleteLink(id) {
  // The id format is "pxl.to/route" or "pxllnk.co/route"
  const route = id.split('/').pop();
  await apiRequest('DELETE', `/short/${route}`);
}

// =====================================================
// QR CODE GENERATION (local)
// =====================================================

/**
 * Generate QR code as PNG buffer
 * @param {string} url - URL to encode
 * @param {object} [opts] - Options
 * @param {number} [opts.width=200] - Image width in pixels
 * @param {number} [opts.margin=2] - Quiet zone margin
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateQR(url, opts = {}) {
  const QRCode = (await import('qrcode')).default;
  const buffer = await QRCode.toBuffer(url, {
    type: 'png',
    width: opts.width || 200,
    margin: opts.margin || 2,
    errorCorrectionLevel: 'M',
  });
  return buffer;
}

// =====================================================
// DIPLOMA WORKFLOW
// =====================================================

/**
 * Create a diploma short link + QR code for an expediente
 *
 * @param {string} expediente - e.g. "IITD-021865"
 * @returns {{ shortUrl: string, fullUrl: string, qrBuffer: Buffer, linkData: object }}
 */
export async function createDiplomaLink(expediente) {
  const fullUrl = `${DIPLOMAS_BASE_URL}/${expediente}.pdf`;
  const title = `Diploma ${expediente}`;

  // Create short link
  const linkData = await createShortLink(fullUrl, title);

  // Generate QR code pointing to short URL
  const qrBuffer = await generateQR(linkData.shortUrl);

  return {
    shortUrl: linkData.shortUrl,
    fullUrl,
    qrBuffer,
    linkData,
  };
}

// =====================================================
// CLI
// =====================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--test')) {
    console.log('Testing pxl.to API...');
    console.log(`  Token: ${TOKEN.substring(0, 20)}...`);
    try {
      const links = await listLinks();
      console.log(`  ✓ Connection OK — ${links.length} existing links`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message}`);
      process.exit(1);
    }
    return;
  }

  if (args.includes('--list')) {
    const links = await listLinks();
    console.log(`Short links (${links.length}):`);
    for (const l of links) {
      console.log(`  ${l.id} → ${l.destination} (${l.clicks} clicks)`);
    }
    return;
  }

  const createIdx = args.indexOf('--create');
  if (createIdx !== -1) {
    const url = args[createIdx + 1];
    if (!url) { console.error('Usage: --create <url>'); process.exit(1); }

    const result = await createShortLink(url);
    console.log(`Short link created:`);
    console.log(`  ${result.shortUrl} → ${result.destination}`);
    return;
  }

  const diplomaIdx = args.indexOf('--diploma');
  if (diplomaIdx !== -1) {
    const expediente = args[diplomaIdx + 1];
    if (!expediente) { console.error('Usage: --diploma <expediente>'); process.exit(1); }

    console.log(`Creating diploma link for ${expediente}...`);
    const result = await createDiplomaLink(expediente);
    console.log(`  Full URL: ${result.fullUrl}`);
    console.log(`  Short URL: ${result.shortUrl}`);
    console.log(`  QR PNG: ${result.qrBuffer.length} bytes`);

    // Save QR as file
    const qrPath = resolve(__dirname, `output/${expediente}-qr.png`);
    writeFileSync(qrPath, result.qrBuffer);
    console.log(`  QR saved: ${qrPath}`);
    return;
  }

  console.log('Usage:');
  console.log('  node pxl-client.mjs --test');
  console.log('  node pxl-client.mjs --list');
  console.log('  node pxl-client.mjs --create <url>');
  console.log('  node pxl-client.mjs --diploma <expediente>');
}

// Only run CLI if executed directly (not imported)
const isMain = process.argv[1] && (
  process.argv[1].endsWith('pxl-client.mjs') ||
  process.argv[1].endsWith('pxl-client')
);
if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
