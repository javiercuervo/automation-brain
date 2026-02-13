#!/usr/bin/env node

/**
 * FlipBooklets PDF Upload Automation
 *
 * Uploads PDFs to FlipBooklets.com with customization settings.
 * All settings are on a single create form at /pdfflipbooklets/create.
 *
 * Usage:
 *   node upload.mjs                       # headless (default, invisible)
 *   node upload.mjs --headed              # with visible browser (debugging)
 *   node upload.mjs --config custom.json  # custom config path
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { parseArgs } from 'node:util';

// ============================================================================
// CLI ARGS & CONFIG
// ============================================================================

const { values: cliArgs } = parseArgs({
  options: {
    config: { type: 'string', default: 'flipbooks.config.json' },
    headed: { type: 'boolean', default: false },
  },
});

const HEADED = process.env.HEADED === 'true' || cliArgs.headed;
const EMAIL = process.env.FLIPBOOKLETS_EMAIL;
const PASSWORD = process.env.FLIPBOOKLETS_PASSWORD;
const BASE_URL = 'https://flipbooklets.com';
const SCRIPT_DIR = import.meta.dirname;
const SCREENSHOT_DIR = resolve(SCRIPT_DIR, 'screenshots');

// ============================================================================
// HELPERS
// ============================================================================

function loadConfig(configPath) {
  const fullPath = resolve(SCRIPT_DIR, configPath);
  const raw = readFileSync(fullPath, 'utf-8');
  const config = JSON.parse(raw);
  return config.flipbooks.map((fb, index) => ({
    ...config.defaults,
    ...fb,
    ...(fb.overrides || {}),
    _index: index,
  }));
}

function validate(flipbooks) {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Missing FLIPBOOKLETS_EMAIL or FLIPBOOKLETS_PASSWORD in .env');
  }
  for (const fb of flipbooks) {
    if (!existsSync(fb.pdfPath)) {
      throw new Error(`PDF not found: ${fb.pdfPath}`);
    }
    if (!fb.title) {
      throw new Error(`Missing title for flipbook at index ${fb._index}`);
    }
  }
}

async function snap(page, label) {
  if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });
  const filename = `${Date.now()}-${label}.png`;
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, filename),
    fullPage: true,
    timeout: 60000,
  });
  console.log(`  [SNAP] screenshots/${filename}`);
}

/** Dismiss cookie banner if present */
async function dismissCookies(page) {
  const acceptBtn = page.locator('#cookiescript_accept, button:has-text("ACCEPT ALL"), button:has-text("Accept All")').first();
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.click();
    console.log('[COOKIES] Banner dismissed.');
  }
}

// ============================================================================
// STEP 1: LOGIN
// ============================================================================

async function login(page) {
  console.log('[LOGIN] Navigating...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Dismiss cookie banner before interacting with the form
  await dismissCookies(page);

  await page.fill('#email', EMAIL);
  await page.fill('#password', PASSWORD);
  await page.click('button[type="submit"]');

  await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
  console.log(`[LOGIN] OK → ${page.url()}`);
}

// ============================================================================
// STEP 2: CREATE FLIPBOOK (single form: upload + customize + publish)
// ============================================================================

async function createAndPublish(page, fb) {
  console.log(`\n[CREATE] "${fb.title}" from ${basename(fb.pdfPath)}`);

  // Go directly to the create form
  await page.goto(`${BASE_URL}/pdfflipbooklets/create`, { waitUntil: 'domcontentloaded' });

  // Dismiss cookies again if they reappear
  await dismissCookies(page);

  // --- GENERAL ---
  await page.fill('#title', fb.title);

  if (fb.slug) {
    await page.fill('#url', fb.slug);
  }

  // Upload PDF
  await page.locator('#file').setInputFiles(fb.pdfPath);
  console.log(`[UPLOAD] PDF set: ${basename(fb.pdfPath)}`);

  // Language (select — first unnamed select on the form)
  if (fb.language) {
    const langMap = { es: 'Spanish', en: 'English' };
    const langLabel = langMap[fb.language] || fb.language;
    const langSelect = page.locator('select').first();
    try {
      await langSelect.selectOption({ label: new RegExp(langLabel, 'i') });
      console.log(`[LANG] Set to ${langLabel}`);
    } catch {
      console.log(`[WARN] Could not set language to "${langLabel}"`);
    }
  }

  // --- SEO ---
  if (fb.metaTitle) {
    const metaTitleInput = page.locator('input[name*="meta"], input[name*="seo_title"]').first();
    if (await metaTitleInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await metaTitleInput.fill(fb.metaTitle);
    }
  }

  if (fb.metaDescription) {
    const metaDesc = page.locator('textarea').first();
    if (await metaDesc.isVisible({ timeout: 1000 }).catch(() => false)) {
      await metaDesc.fill(fb.metaDescription);
    }
  }

  // --- DESIGN ---
  // All check/radio use { force: true } because Bootstrap's div.form-check
  // intercepts pointer events on the raw input elements.

  // Single or spread view (radio buttons)
  if (fb.pageMode === 'single') {
    const radios = page.locator('input[type="radio"][name*="view"], input[type="radio"][name*="spread"], input[type="radio"][name*="single"], input[type="radio"][name*="mode"]');
    const count = await radios.count();
    if (count >= 2) {
      await radios.nth(1).check({ force: true });
    }
  }

  // Background colour (type="color" input)
  if (fb.backgroundColor) {
    const bgInput = page.locator('input[name="background"]');
    await bgInput.evaluate((el, color) => { el.value = color; }, fb.backgroundColor);
  }

  // --- BOOK OPTIONS ---

  // Page type (radio buttons: magazine, brochure, hardback, photoalbum)
  if (fb.pageType) {
    const typeMap = {
      magazine: '#page_type_magazine',
      brochure: '#page_type_brochure',
      hardback: '#page_type_hardback',
      photoalbum: '#page_type_photoalbum',
    };
    const selector = typeMap[fb.pageType];
    if (selector) {
      await page.click(selector, { force: true });
    }
  }

  // RTL
  if (fb.rtl) {
    await page.check('#rtl', { force: true });
  }

  // Disable sound
  if (fb.disableSound) {
    await page.check('#disable_sound', { force: true });
  }

  // --- LEAD GENERATION ---
  if (fb.emailCapture) {
    await page.check('#emailed', { force: true });
  }

  // --- PRIVACY ---

  // Disable download (checkbox: checked = no download)
  if (fb.allowDownload === false) {
    await page.check('#disable_download', { force: true });
  }

  // Privacy (hide from search engines)
  if (fb.seoPrivate) {
    await page.check('#private', { force: true });
  }

  // Password protection
  if (fb.passwordProtect) {
    await page.check('#passworded', { force: true });
    const pwInput = page.locator('input[type="password"], input[name*="book_password"], input[name*="passcode"]').first();
    if (await pwInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pwInput.fill(fb.passwordProtect);
    }
  }

  // --- SUBMIT ---
  console.log('[SUBMIT] Creating flipbook...');

  // Use Promise.all with navigation + click to properly catch the redirect
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 180000 }),
    page.click('input[type="submit"].btn-mint', { force: true }),
  ]);

  const afterUrl = page.url();
  console.log(`[SUBMIT] Done → ${afterUrl}`);

  // Check for validation errors (page stayed on /create with error messages)
  if (afterUrl.includes('/create')) {
    const errorMsg = await page.locator('.alert-danger, .invalid-feedback, .text-danger').first()
      .textContent({ timeout: 2000 }).catch(() => null);
    if (errorMsg) {
      throw new Error(`Form validation error: ${errorMsg.trim()}`);
    }
    // If no error message visible, maybe it's processing — wait a bit more
    console.log('[WARN] Still on create page, waiting for processing...');
    try {
      await page.waitForURL(url => !url.pathname.includes('/create'), { timeout: 60000 });
    } catch {
      await snap(page, `stuck-${fb._index}`);
      throw new Error('Form submission did not redirect. Check stuck screenshot.');
    }
  }

  // Capture the flipbook URL
  const currentUrl = page.url();
  let publicUrl = null;

  if (currentUrl.includes('/pdfflipbooklets/')) {
    publicUrl = currentUrl;
  }

  // Look for a link on the page
  if (!publicUrl) {
    const linkEl = page.locator('a[href*="/pdfflipbooklets/"]').first();
    if (await linkEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      publicUrl = await linkEl.getAttribute('href');
      if (publicUrl && !publicUrl.startsWith('http')) {
        publicUrl = `${BASE_URL}${publicUrl}`;
      }
    }
  }

  await snap(page, `created-${fb._index}`);
  console.log(`[RESULT] URL: ${publicUrl || '(check dashboard)'}`);
  return publicUrl;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const flipbooks = loadConfig(cliArgs.config);

  console.log('\n=== FlipBooklets Uploader ===');
  console.log(`Mode: ${HEADED ? 'HEADED (visible)' : 'HEADLESS (invisible)'}`);
  console.log(`PDFs to process: ${flipbooks.length}\n`);

  validate(flipbooks);

  const browser = await chromium.launch({
    headless: !HEADED,
    slowMo: HEADED ? 300 : 0,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'es-ES',
  });

  const page = await context.newPage();
  const results = [];

  try {
    await login(page);

    for (const fb of flipbooks) {
      try {
        const url = await createAndPublish(page, fb);
        results.push({ title: fb.title, status: 'OK', url });
      } catch (err) {
        console.error(`[ERROR] Failed for "${fb.title}": ${err.message}`);
        await snap(page, `error-${fb._index}`).catch(() => {});
        results.push({ title: fb.title, status: 'FAILED', error: err.message });
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\n=== RESULTS ===');
  console.table(results);

  const failed = results.filter(r => r.status === 'FAILED');
  if (failed.length > 0) {
    console.error(`\n${failed.length} flipbook(s) failed. Check screenshots/ for details.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
