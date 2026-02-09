#!/usr/bin/env node

/**
 * Discovery script — navigates through FlipBooklets.com and captures
 * screenshots + form elements at each step. Used to find correct selectors.
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const EMAIL = process.env.FLIPBOOKLETS_EMAIL;
const PASSWORD = process.env.FLIPBOOKLETS_PASSWORD;
const BASE = 'https://flipbooklets.com';
const DIR = resolve(import.meta.dirname, 'screenshots');

if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

async function snap(page, name) {
  await page.screenshot({ path: resolve(DIR, `${name}.png`), fullPage: true, timeout: 60000 });
  console.log(`  [SNAP] ${name}.png`);
}

async function dumpForms(page, label) {
  console.log(`\n=== ${label} (${page.url()}) ===`);
  const els = await page.$$eval(
    'input:not([type="hidden"]), select, textarea, button:not([class*="cookie"])',
    els => els.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).map(el => ({
      tag: el.tagName.toLowerCase(),
      type: el.type || '',
      name: el.name || '',
      id: el.id || '',
      class: (el.className || '').substring(0, 50),
      text: (el.textContent || '').trim().substring(0, 50),
      placeholder: el.placeholder || '',
    }))
  );
  console.table(els);
}

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();

  try {
    // 1. LOGIN
    console.log('\n--- STEP 1: LOGIN ---');
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });
    console.log(`  Logged in → ${page.url()}`);
    await snap(page, '01-dashboard');

    // 2. YOUR BOOKS
    console.log('\n--- STEP 2: YOUR BOOKS ---');
    await page.click('a:has-text("Your Books")');
    await page.waitForLoadState('domcontentloaded');
    await snap(page, '02-your-books');
    await dumpForms(page, 'YOUR BOOKS PAGE');

    // 3. Find and list all links/buttons that might be "Create"
    console.log('\n--- STEP 3: CREATE BUTTONS ---');
    const links = await page.$$eval('a, button', els =>
      els.filter(el => {
        const t = (el.textContent || '').toLowerCase();
        return t.includes('create') || t.includes('new') || t.includes('add') || t.includes('upload');
      }).map(el => ({
        tag: el.tagName,
        text: el.textContent.trim().substring(0, 50),
        href: el.href || '',
        class: (el.className || '').substring(0, 50),
      }))
    );
    console.table(links);

    // 4. Click the first create-like link
    if (links.length > 0) {
      console.log(`\n--- STEP 4: CLICKING "${links[0].text}" ---`);
      const createLink = page.locator(`a:has-text("${links[0].text}"), button:has-text("${links[0].text}")`).first();
      await createLink.click({ timeout: 10000 });
      await page.waitForLoadState('domcontentloaded');
      await snap(page, '03-create-form');
      await dumpForms(page, 'CREATE FORM');
    } else {
      console.log('  No create button found! Snapping current page.');
      await snap(page, '03-no-create-btn');
    }

    // 5. Wait for manual inspection
    console.log('\n--- DISCOVERY DONE --- Browser stays open for 30s for manual inspection.');
    await page.waitForTimeout(30000);

  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
