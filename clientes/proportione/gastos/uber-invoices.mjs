#!/usr/bin/env node

/**
 * Uber Invoices → SparkReceipt
 *
 * Playwright automation that:
 * 1. Logs in to riders.uber.com (reuses stored auth)
 * 2. Fetches business trips (profile=BUSINESS)
 * 3. Downloads invoice PDFs for new trips
 * 4. Emails PDFs to SparkReceipt
 *
 * Usage:
 *   node uber-invoices.mjs              # Process new invoices
 *   node uber-invoices.mjs --auth       # Login and save auth state (headed)
 *   node uber-invoices.mjs --dry-run    # Show what would be processed
 *   node uber-invoices.mjs --all        # Re-process all (ignore state)
 *
 * SparkReceipt has NO public API — email forwarding is the only
 * programmatic ingestion method. Deduplication is handled locally
 * via uber-invoices-state.json (trip IDs already processed).
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

// ============================================================
// CONFIG
// ============================================================

const CONFIG = {
  // SparkReceipt forwarding email
  SPARKRECEIPT_EMAIL: 'proportione-97ymp+expense@to.sparkreceipt.com',

  // Uber trips URL with business filter
  TRIPS_URL: 'https://riders.uber.com/trips',
  TRIPS_BUSINESS_URL: 'https://riders.uber.com/trips?profile=BUSINESS',

  // Auth state persistence
  STORAGE_STATE_PATH: path.join(__dirname, 'uber-storage-state.json'),

  // State tracking (processed trip IDs) — prevents duplicates
  STATE_PATH: path.join(__dirname, 'uber-invoices-state.json'),

  // Downloaded PDFs folder
  DOWNLOADS_PATH: path.join(__dirname, 'downloads'),

  // Gmail SMTP for sending (App Password needed)
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER || 'drematec@gmail.com',
  SMTP_PASS: process.env.SMTP_PASS, // Gmail App Password

  // Timeouts
  NAV_TIMEOUT: 20000,
  ACTION_DELAY: 2000,
};

// Bilingual selectors (page can render in ES or EN depending on session)
const TEXT = {
  pastTrips: /Past|Anteriores/,
  downloadInvoice: /Download invoice|Descarga la factura/,
  download: /^Download$|^Descargar$/,
};

// ============================================================
// AUTH SETUP (run with --auth)
// ============================================================

async function setupAuth() {
  console.log('🔐 Abriendo navegador para login en Uber...');
  console.log('   Inicia sesión con tu cuenta de Uber (drematec).');
  console.log('   Navega hasta que veas tus viajes, luego cierra el navegador.\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(CONFIG.TRIPS_URL);

  console.log('⏳ Esperando a que inicies sesión...');
  try {
    await page.waitForURL(/riders\.uber\.com\/trips/, { timeout: 300000 });
    // Wait for trips heading (ES or EN)
    await page.waitForSelector(`text=/${TEXT.pastTrips.source}/`, { timeout: 60000 });
    console.log('✅ Login detectado. Guardando estado de autenticación...');
  } catch {
    console.log('⚠️  Timeout esperando login. Guardando estado actual...');
  }

  await context.storageState({ path: CONFIG.STORAGE_STATE_PATH });
  await browser.close();

  console.log(`💾 Auth guardada en: ${CONFIG.STORAGE_STATE_PATH}`);
  console.log('   Ejecuta sin --auth para procesar facturas.');
}

// ============================================================
// STATE MANAGEMENT
// ============================================================

function loadState() {
  if (fs.existsSync(CONFIG.STATE_PATH)) {
    return JSON.parse(fs.readFileSync(CONFIG.STATE_PATH, 'utf-8'));
  }
  return { processedTrips: {}, lastRun: null };
}

function saveState(state) {
  state.lastRun = new Date().toISOString();
  fs.writeFileSync(CONFIG.STATE_PATH, JSON.stringify(state, null, 2));
}

// ============================================================
// MAIN: PROCESS INVOICES
// ============================================================

async function processInvoices(opts = {}) {
  const { dryRun = false, reprocessAll = false } = opts;

  if (!fs.existsSync(CONFIG.STORAGE_STATE_PATH)) {
    console.error('❌ No hay auth guardada. Ejecuta primero: node uber-invoices.mjs --auth');
    process.exit(1);
  }

  if (!fs.existsSync(CONFIG.DOWNLOADS_PATH)) {
    fs.mkdirSync(CONFIG.DOWNLOADS_PATH, { recursive: true });
  }

  const state = loadState();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: CONFIG.STORAGE_STATE_PATH,
  });
  const page = await context.newPage();

  try {
    // Navigate to business trips
    console.log('🚗 Cargando viajes de empresa...');
    await page.goto(CONFIG.TRIPS_BUSINESS_URL, { timeout: CONFIG.NAV_TIMEOUT });

    // Wait for "Past" or "Anteriores" heading
    await page.waitForFunction(
      (pattern) => {
        const body = document.body?.textContent || '';
        return new RegExp(pattern).test(body);
      },
      TEXT.pastTrips.source,
      { timeout: 15000 }
    );
    await sleep(1500); // let trip cards render

    // Scroll down to load more trips
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(1000);

    // Collect trip IDs from page
    const trips = await collectTrips(page);
    console.log(`📋 Encontrados ${trips.length} viajes de empresa.`);

    if (trips.length === 0) {
      console.log('   (Si esperabas viajes, puede que la auth haya expirado: npm run auth)');
      await browser.close();
      return;
    }

    // Filter out already processed
    const newTrips = reprocessAll
      ? trips
      : trips.filter(t => !state.processedTrips[t.id]);

    if (newTrips.length === 0) {
      console.log('✅ No hay facturas nuevas por procesar.');
      await browser.close();
      return;
    }

    console.log(`📥 ${newTrips.length} facturas nuevas por descargar${dryRun ? ' (DRY RUN)' : ''}.\n`);

    const results = [];

    for (const trip of newTrips) {
      console.log(`  → ${trip.date} | ${trip.destination} | ${trip.amount}`);

      if (dryRun) {
        results.push({ ...trip, status: 'SKIP (dry-run)' });
        continue;
      }

      try {
        const result = await downloadInvoice(page, trip);

        // Send to SparkReceipt
        if (CONFIG.SMTP_PASS && result.pdfPath) {
          await sendToSparkReceipt(result.pdfPath, result.pdfFilename, trip);
          console.log(`    📧 Enviada a SparkReceipt`);
        } else if (!CONFIG.SMTP_PASS && result.pdfPath) {
          console.log(`    ⚠️  SMTP_PASS no configurado — PDF guardado localmente`);
        }

        // Mark as processed (prevents duplicates on next run)
        state.processedTrips[trip.id] = {
          date: trip.date,
          amount: trip.amount,
          destination: trip.destination,
          pdfFile: result.pdfFilename,
          sentToSparkReceipt: !!CONFIG.SMTP_PASS,
          processedAt: new Date().toISOString(),
        };
        saveState(state);

        results.push({ ...trip, status: 'OK', pdfFile: result.pdfFilename });
      } catch (err) {
        console.log(`    ❌ Error: ${err.message}`);
        results.push({ ...trip, status: 'ERROR', error: err.message });
      }
    }

    // Summary
    const ok = results.filter(r => r.status === 'OK').length;
    const errors = results.filter(r => r.status === 'ERROR').length;
    console.log(`\n📊 Resumen: ${ok} OK, ${errors} errores, ${results.length} total.`);

    // Update auth state (session may have refreshed)
    await context.storageState({ path: CONFIG.STORAGE_STATE_PATH });
  } catch (err) {
    console.error(`❌ Error general: ${err.message}`);
    const screenshotPath = path.join(__dirname, 'error-screenshot.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`   Screenshot guardado: ${screenshotPath}`);
  } finally {
    await browser.close();
  }
}

// ============================================================
// DOWNLOAD SINGLE INVOICE
// ============================================================

async function downloadInvoice(page, trip) {
  // Navigate to trip detail
  await page.goto(`https://riders.uber.com/trips/${trip.id}`, {
    timeout: CONFIG.NAV_TIMEOUT,
  });

  // Wait for the invoice download button (ES or EN)
  const invoiceBtn = await page.waitForSelector(
    `button:has-text("Download invoice"), button:has-text("Descarga la factura")`,
    { timeout: 10000 }
  ).catch(() => null);

  if (!invoiceBtn) {
    throw new Error('Boton "Descarga la factura" no encontrado (viaje cancelado?)');
  }

  await sleep(CONFIG.ACTION_DELAY);
  await invoiceBtn.click();

  // Wait for dialog with download link
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
  await sleep(800);

  // Get the PDF download URL from the dialog
  const pdfUrl = await page.$eval(
    '[role="dialog"] a[href*="invoices"], [role="dialog"] a[href*="invoice"]',
    el => el.href
  ).catch(() => null);

  if (!pdfUrl) {
    // Close dialog and throw
    await page.$eval('[role="dialog"] button', btn => btn.click()).catch(() => {});
    throw new Error('No se encontró URL de la factura en el diálogo');
  }

  // Download the PDF
  const pdfFilename = `uber-${trip.date.replace(/[^0-9a-zA-Z]/g, '-')}-${trip.id.slice(0, 8)}.pdf`;
  const pdfPath = path.join(CONFIG.DOWNLOADS_PATH, pdfFilename);

  const response = await page.request.get(pdfUrl);
  const pdfBuffer = await response.body();
  fs.writeFileSync(pdfPath, pdfBuffer);

  console.log(`    ✅ Descargada: ${pdfFilename} (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);

  // Close the dialog
  await page.$eval('[role="dialog"] button', btn => btn.click()).catch(() => {});

  return { pdfPath, pdfFilename };
}

// ============================================================
// COLLECT TRIPS FROM PAGE
// ============================================================

async function collectTrips(page) {
  // Extract all trip UUIDs from page HTML (most reliable method)
  const pageContent = await page.content();
  const tripIdPattern = /\/trips\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/g;
  const foundIds = new Map(); // id → context text
  let match;

  while ((match = tripIdPattern.exec(pageContent)) !== null) {
    const id = match[1];
    // Skip help.uber.com URLs
    const surrounding = pageContent.substring(Math.max(0, match.index - 100), match.index);
    if (surrounding.includes('help.uber.com')) continue;
    if (!foundIds.has(id)) foundIds.set(id, '');
  }

  // Extract trip metadata from visible cards
  const tripData = await page.$$eval(
    'a[href*="/trips/"]',
    anchors => {
      const results = [];
      const seen = new Set();
      for (const a of anchors) {
        const href = a.getAttribute('href') || '';
        const idMatch = href.match(/\/trips\/([a-f0-9-]{36})/);
        if (!idMatch || href.includes('help.uber.com') || seen.has(idMatch[1])) continue;
        seen.add(idMatch[1]);

        // Walk up to find the trip card container
        let container = a;
        for (let i = 0; i < 5; i++) {
          if (container.parentElement) container = container.parentElement;
        }
        const text = container.textContent || '';

        results.push({ id: idMatch[1], text: text.trim().substring(0, 300) });
      }
      return results;
    }
  );

  const trips = [];
  const seen = new Set();

  for (const card of tripData) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);

    // Skip cancelled trips (0.00€ / $0.00 / Cancelado / Cancelled)
    if (/cancel|0[.,]00/i.test(card.text)) continue;

    // Parse date: "Feb 12 • 4:09 PM" or "12 feb • 16:09"
    const dateMatch = card.text.match(
      /(\w{3}\s+\d{1,2}\s*[•·]\s*\d{1,2}:\d{2}\s*(?:AM|PM)?|\d{1,2}\s+\w{3}\s*[•·]\s*\d{1,2}:\d{2})/i
    );
    // Parse amount: "€24.95" or "24,95€" or "$12.50"
    const amountMatch = card.text.match(/(€[\d.,]+|[\d.,]+€|\$[\d.,]+)/);
    // Parse destination: text before the date
    const destMatch = card.text.match(/^([\s\S]*?)(?=\w{3}\s+\d{1,2}\s*[•·]|\d{1,2}\s+\w{3}\s*[•·])/i);

    trips.push({
      id: card.id,
      date: dateMatch?.[1]?.trim() || 'unknown',
      amount: amountMatch?.[1]?.trim() || 'unknown',
      destination: destMatch?.[1]?.replace(/\s+/g, ' ').trim().split('\n').pop()?.trim() || 'unknown',
    });
  }

  // Fallback: if card parsing failed, use raw IDs
  if (trips.length === 0) {
    for (const [id] of foundIds) {
      if (seen.has(id)) continue;
      trips.push({ id, date: 'unknown', amount: 'unknown', destination: 'unknown' });
    }
  }

  return trips;
}

// ============================================================
// EMAIL TO SPARKRECEIPT
// ============================================================

async function sendToSparkReceipt(pdfPath, pdfFilename, trip) {
  const transporter = nodemailer.createTransport({
    host: CONFIG.SMTP_HOST,
    port: CONFIG.SMTP_PORT,
    secure: false,
    auth: {
      user: CONFIG.SMTP_USER,
      pass: CONFIG.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: `Uber Auto-Invoice <${CONFIG.SMTP_USER}>`,
    to: CONFIG.SPARKRECEIPT_EMAIL,
    subject: `Factura Uber - ${trip.date} - ${trip.amount}`,
    text: [
      'Factura Uber descargada automaticamente.',
      '',
      `Viaje: ${trip.destination}`,
      `Fecha: ${trip.date}`,
      `Importe: ${trip.amount}`,
      `Trip ID: ${trip.id}`,
    ].join('\n'),
    attachments: [
      {
        filename: pdfFilename,
        path: pdfPath,
      },
    ],
  });
}

// ============================================================
// UTILS
// ============================================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// CLI
// ============================================================

const args = process.argv.slice(2);

if (args.includes('--auth')) {
  setupAuth();
} else {
  processInvoices({
    dryRun: args.includes('--dry-run'),
    reprocessAll: args.includes('--all'),
  });
}
