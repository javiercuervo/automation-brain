#!/usr/bin/env node

/**
 * Upbase Discovery Script
 *
 * Navigates through Upbase.io UI, captures screenshots, dumps interactive
 * elements, and intercepts network requests to discover internal API endpoints.
 *
 * Outputs:
 *   - screenshots/ — PNG screenshots of each page
 *   - network-captures/ — JSON files with intercepted API calls
 *   - Console: tables of discovered selectors and API endpoints
 *
 * Usage:
 *   node discover.mjs            # headless with storage state
 *   node discover.mjs --headed   # visible browser (recommended for first run)
 *   node discover.mjs --manual   # headed + 60s pause for manual exploration
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values: cli } = parseArgs({
  options: {
    headed: { type: 'boolean', default: false },
    manual: { type: 'boolean', default: false },
  },
});

const BASE_URL = 'https://app.upbase.io';
const SCRIPT_DIR = import.meta.dirname;
const SCREENSHOT_DIR = resolve(SCRIPT_DIR, 'screenshots');
const NETWORK_DIR = resolve(SCRIPT_DIR, 'network-captures');
const STORAGE_PATH = resolve(SCRIPT_DIR, 'upbase-storage-state.json');

if (!existsSync(SCREENSHOT_DIR)) mkdirSync(SCREENSHOT_DIR, { recursive: true });
if (!existsSync(NETWORK_DIR)) mkdirSync(NETWORK_DIR, { recursive: true });

// Track captured API calls
const apiCalls = [];

// ============================================================================
// HELPERS
// ============================================================================

async function snap(page, name) {
  const filename = `${String(apiCalls.length).padStart(2, '0')}-${name}.png`;
  await page.screenshot({
    path: resolve(SCREENSHOT_DIR, filename),
    fullPage: true,
    timeout: 60000,
  });
  console.log(`  [SNAP] ${filename}`);
}

async function dumpElements(page, label) {
  console.log(`\n=== ${label} (${page.url()}) ===`);

  // Standard HTML elements
  const standard = await page.$$eval(
    'input:not([type="hidden"]), select, textarea, button',
    els => els.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map(el => ({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      name: el.name || '',
      id: el.id || '',
      class: (el.className || '').toString().substring(0, 60),
      text: (el.textContent || '').trim().substring(0, 60),
      placeholder: el.placeholder || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      role: el.getAttribute('role') || '',
    }))
  ).catch(() => []);

  if (standard.length > 0) {
    console.log('  Standard HTML elements:');
    console.table(standard);
  } else {
    console.log('  No standard form elements found.');
  }

  // Flutter semantics elements (flt-semantics)
  const flutter = await page.$$eval(
    'flt-semantics, flt-semantics-container, [role]',
    els => els.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).slice(0, 50).map(el => ({
      tag: el.tagName.toLowerCase(),
      role: el.getAttribute('role') || '',
      ariaLabel: el.getAttribute('aria-label') || '',
      ariaChecked: el.getAttribute('aria-checked') || '',
      tabIndex: el.tabIndex,
      text: (el.textContent || '').trim().substring(0, 60),
    }))
  ).catch(() => []);

  if (flutter.length > 0) {
    console.log(`  Flutter/ARIA semantics (first 50 of ${flutter.length}+):`);
    console.table(flutter);
  }

  return { standard, flutter };
}

function setupNetworkInterceptor(page) {
  page.on('request', req => {
    const url = req.url();
    const type = req.resourceType();

    // Capture fetch/XHR and anything that looks like an API call
    if (type === 'fetch' || type === 'xhr' || url.includes('/api/') || url.includes('/graphql')) {
      const entry = {
        timestamp: new Date().toISOString(),
        method: req.method(),
        url: url,
        type: type,
        headers: Object.fromEntries(
          Object.entries(req.headers()).filter(([k]) =>
            ['authorization', 'content-type', 'x-api-key', 'cookie'].includes(k.toLowerCase())
          )
        ),
        postData: req.postData()?.substring(0, 2000) || null,
      };
      apiCalls.push(entry);
      console.log(`  [NET] ${req.method()} ${url.substring(0, 120)}`);
    }
  });

  page.on('response', res => {
    const url = res.url();
    if (url.includes('/api/') || url.includes('/graphql')) {
      const matching = apiCalls.find(c => c.url === url && !c.status);
      if (matching) {
        matching.status = res.status();
        matching.statusText = res.statusText();
      }
    }
  });

  page.on('websocket', ws => {
    console.log(`  [WS] WebSocket opened: ${ws.url()}`);
    ws.on('framesent', frame => {
      apiCalls.push({
        timestamp: new Date().toISOString(),
        method: 'WS_SEND',
        url: ws.url(),
        type: 'websocket',
        postData: String(frame.payload).substring(0, 2000),
      });
    });
    ws.on('framereceived', frame => {
      apiCalls.push({
        timestamp: new Date().toISOString(),
        method: 'WS_RECV',
        url: ws.url(),
        type: 'websocket',
        postData: String(frame.payload).substring(0, 500),
      });
    });
  });
}

// ============================================================================
// MAIN DISCOVERY
// ============================================================================

async function main() {
  const hasStorageState = existsSync(STORAGE_PATH);
  if (!hasStorageState) {
    console.error('[ERROR] No storage state found. Run auth-setup.mjs first:');
    console.error('  node auth-setup.mjs --headed');
    process.exit(1);
  }

  const isHeaded = cli.headed || cli.manual;
  console.log(`[DISCOVER] Launching browser (${isHeaded ? 'headed' : 'headless'})...`);

  const browser = await chromium.launch({
    headless: !isHeaded,
    slowMo: isHeaded ? 300 : 0,
  });

  const context = await browser.newContext({
    storageState: STORAGE_PATH,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  setupNetworkInterceptor(page);

  try {
    // ---- STEP 1: Navigate to workspace ----
    console.log('\n--- STEP 1: WORKSPACE ---');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(5000); // Let Flutter app initialize
    await snap(page, 'workspace');

    const workspaceUrl = page.url();
    console.log(`  URL: ${workspaceUrl}`);

    // Check if Flutter app loaded (look for Flutter-specific elements)
    const hasFlutter = await page.$('flt-glass-pane, flutter-view, flt-semantics-host').then(el => !!el).catch(() => false);
    console.log(`  Flutter detected: ${hasFlutter}`);

    // Check accessibility tree
    const a11yTree = await page.accessibility.snapshot().catch(() => null);
    if (a11yTree) {
      console.log('  Accessibility tree root:', JSON.stringify(a11yTree).substring(0, 500));
    } else {
      console.log('  WARNING: No accessibility tree available');
    }

    await dumpElements(page, 'WORKSPACE');

    // ---- STEP 2: Find and click on first list/project ----
    console.log('\n--- STEP 2: NAVIGATION ---');

    // Look for clickable list/project items in sidebar or main area
    const clickables = await page.$$eval('[role="button"], [role="link"], [role="treeitem"], a[href]', els =>
      els.filter(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }).slice(0, 30).map(el => ({
        tag: el.tagName.toLowerCase(),
        role: el.getAttribute('role') || '',
        ariaLabel: el.getAttribute('aria-label') || '',
        text: (el.textContent || '').trim().substring(0, 80),
        href: el.getAttribute('href') || '',
      }))
    ).catch(() => []);

    if (clickables.length > 0) {
      console.log('  Clickable elements (first 30):');
      console.table(clickables);
    }

    // ---- STEP 3: Explore a list if possible ----
    console.log('\n--- STEP 3: LIST VIEW ---');
    // Try to navigate to a list by looking for sidebar links
    const listLinks = clickables.filter(c =>
      c.href && !c.href.includes('settings') && !c.href.includes('login')
    );
    if (listLinks.length > 0) {
      console.log(`  Found ${listLinks.length} potential list links, clicking first...`);
      const firstLink = page.locator(`[aria-label="${listLinks[0].ariaLabel}"]`).first();
      if (await firstLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstLink.click();
        await page.waitForTimeout(3000);
        await snap(page, 'list-view');
        await dumpElements(page, 'LIST VIEW');
      }
    }

    // ---- STEP 4: Try to find task creation UI ----
    console.log('\n--- STEP 4: TASK CREATION ---');
    const addButtons = await page.$$eval('[role="button"]', els =>
      els.filter(el => {
        const label = (el.getAttribute('aria-label') || '').toLowerCase();
        const text = (el.textContent || '').toLowerCase();
        return label.includes('add') || label.includes('new') || label.includes('create') ||
               text.includes('add') || text.includes('new') || text.includes('+');
      }).map(el => ({
        ariaLabel: el.getAttribute('aria-label') || '',
        text: (el.textContent || '').trim().substring(0, 60),
        role: el.getAttribute('role') || '',
      }))
    ).catch(() => []);

    if (addButtons.length > 0) {
      console.log('  Add/Create buttons found:');
      console.table(addButtons);
    } else {
      console.log('  No obvious add/create buttons found via role="button"');
    }

    // ---- STEP 5: Full page accessibility snapshot ----
    console.log('\n--- STEP 5: FULL A11Y SNAPSHOT ---');
    const fullSnapshot = await page.accessibility.snapshot({ interestingOnly: false }).catch(() => null);
    if (fullSnapshot) {
      const snapshotJson = JSON.stringify(fullSnapshot, null, 2);
      writeFileSync(resolve(NETWORK_DIR, 'a11y-snapshot.json'), snapshotJson);
      console.log(`  Full a11y snapshot saved (${(snapshotJson.length / 1024).toFixed(1)} KB)`);
    }

    // ---- Manual pause if requested ----
    if (cli.manual) {
      console.log('\n--- MANUAL MODE --- Browser stays open 60s. Interact with Upbase to capture API calls.');
      await page.waitForTimeout(60000);
    }

  } finally {
    // Save all captured API calls
    if (apiCalls.length > 0) {
      const captureFile = resolve(NETWORK_DIR, `api-calls-${Date.now()}.json`);
      writeFileSync(captureFile, JSON.stringify(apiCalls, null, 2));
      console.log(`\n[NET] Saved ${apiCalls.length} API calls to ${captureFile}`);

      // Summary
      const uniqueEndpoints = [...new Set(apiCalls.filter(c => c.method !== 'WS_RECV').map(c => `${c.method} ${c.url.split('?')[0]}`))];
      console.log('\n=== API ENDPOINTS DISCOVERED ===');
      uniqueEndpoints.forEach(ep => console.log(`  ${ep}`));
    } else {
      console.log('\n[NET] No API calls captured.');
    }

    // Save updated storage state (in case session was refreshed)
    try {
      await context.storageState({ path: STORAGE_PATH });
    } catch { /* ignore */ }

    await browser.close();
    console.log('\n[DISCOVER] Done.');
  }
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
