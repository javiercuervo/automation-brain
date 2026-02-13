#!/usr/bin/env node

/**
 * Firma digital de PDFs con certificado PKCS#12
 *
 * Usa @signpdf para firmar PDFs generados con PDFKit.
 * El certificado self-signed genera firma válida en Adobe (identidad "desconocida").
 * Para firma "verde": reemplazar iitd-cert.p12 por certificado de CA.
 *
 * Usage (módulo):
 *   import { addSignaturePlaceholder, signPdf, isSigningAvailable } from './pdf-signer.mjs';
 *
 *   // 1. Antes de doc.end():
 *   addSignaturePlaceholder(doc);
 *   doc.end();
 *
 *   // 2. Después de recoger el buffer:
 *   const signedBuffer = await signPdf(buffer);
 *
 * Usage (CLI):
 *   node pdf-signer.mjs --test    # Genera y firma un PDF de prueba
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load .env
if (existsSync(resolve(__dirname, '../.env'))) {
  const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const CERT_PATH = resolve(__dirname, '../certs/iitd-cert.p12');
const CERT_PASSWORD = process.env.CERT_P12_PASSWORD || '';

// Synchronous import of CJS placeholder module (needed because addSignaturePlaceholder is sync)
const { pdfkitAddPlaceholder } = require('@signpdf/placeholder-pdfkit');

/**
 * Check if signing certificate is available
 */
export function isSigningAvailable() {
  return existsSync(CERT_PATH);
}

/**
 * Add signature placeholder to a PDFKit document.
 * Must be called BEFORE doc.end().
 * @param {PDFDocument} doc - PDFKit document instance
 */
export function addSignaturePlaceholder(doc) {
  return pdfkitAddPlaceholder({
    pdf: doc,
    reason: 'Certificado emitido por el IITD',
    contactInfo: 'secretaria@iitdistancia.org',
    name: 'Instituto Internacional de Teología a Distancia',
    location: 'España',
  });
}

/**
 * Sign a PDF buffer with the IITD PKCS#12 certificate.
 * The PDF must already contain a signature placeholder (via addSignaturePlaceholder).
 * @param {Buffer} pdfBuffer
 * @returns {Promise<Buffer>} Signed PDF buffer
 */
export async function signPdf(pdfBuffer) {
  const signpdfModule = await import('@signpdf/signpdf');
  const { P12Signer } = await import('@signpdf/signer-p12');

  // Handle CJS→ESM double-wrapping: default.default is the singleton instance
  const signpdf = signpdfModule.default?.default || signpdfModule.default;

  const p12Buffer = readFileSync(CERT_PATH);
  const signer = new P12Signer(p12Buffer, { passphrase: CERT_PASSWORD });
  return signpdf.sign(pdfBuffer, signer);
}

// =====================================================
// CLI
// =====================================================

async function main() {
  if (!process.argv.includes('--test')) {
    console.log('Usage:');
    console.log('  node pdf-signer.mjs --test');
    return;
  }

  console.log('Testing PDF digital signature...');
  console.log(`  Certificate: ${CERT_PATH}`);
  console.log(`  Available: ${isSigningAvailable()}`);

  if (!isSigningAvailable()) {
    console.error('  Certificate not found. Run:');
    console.error('  cd certs && openssl req -x509 -newkey rsa:2048 ...');
    process.exit(1);
  }

  // Create a test PDF with PDFKit
  const PDFDocument = (await import('pdfkit')).default;

  const doc = new PDFDocument({ size: 'A4' });
  const chunks = [];
  doc.on('data', chunk => chunks.push(chunk));

  doc.fontSize(20).text('Test de firma digital IITD', 50, 100);
  doc.fontSize(12).text(`Fecha: ${new Date().toISOString()}`, 50, 140);
  doc.fontSize(10).text('Este PDF ha sido firmado digitalmente.', 50, 170);

  // Add placeholder before doc.end()
  addSignaturePlaceholder(doc);

  doc.end();

  const pdfBuffer = await new Promise((res) => {
    doc.on('end', () => res(Buffer.concat(chunks)));
  });

  console.log(`  PDF buffer: ${pdfBuffer.length} bytes`);

  // Sign
  const signedBuffer = await signPdf(pdfBuffer);
  console.log(`  Signed buffer: ${signedBuffer.length} bytes`);

  // Write test file
  const testPath = resolve(__dirname, '../certificados/test-signed.pdf');
  mkdirSync(dirname(testPath), { recursive: true });
  writeFileSync(testPath, signedBuffer);
  console.log(`  ✓ Written to: ${testPath}`);
  console.log('  Open in Adobe Reader to verify signature panel.');
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('pdf-signer.mjs') ||
  process.argv[1].endsWith('pdf-signer')
);
if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
