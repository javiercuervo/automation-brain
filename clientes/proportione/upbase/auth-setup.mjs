#!/usr/bin/env node

/**
 * Upbase Auth Setup
 *
 * Opens a headed browser, logs into app.upbase.io, and saves the storage
 * state (cookies + localStorage) to upbase-storage-state.json.
 *
 * This file is then used by:
 *   - Playwright MCP server (--storage-state flag)
 *   - Standalone scripts (browser context)
 *
 * Usage:
 *   node auth-setup.mjs --headed    # headed (default, need to see login)
 *   node auth-setup.mjs             # headless (only if no 2FA/captcha)
 */

import 'dotenv/config';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values: cli } = parseArgs({
  options: {
    headed: { type: 'boolean', default: true },
  },
});

const EMAIL = process.env.UPBASE_EMAIL;
const PASSWORD = process.env.UPBASE_PASSWORD;
const BASE_URL = 'https://app.upbase.io';
const SCRIPT_DIR = import.meta.dirname;
const STORAGE_PATH = resolve(SCRIPT_DIR, 'upbase-storage-state.json');

if (!EMAIL || !PASSWORD) {
  console.error('[ERROR] Set UPBASE_EMAIL and UPBASE_PASSWORD in .env');
  process.exit(1);
}

async function main() {
  console.log('[AUTH] Launching browser (headed)...');
  const browser = await chromium.launch({
    headless: !cli.headed,
    slowMo: cli.headed ? 300 : 0,
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();

  try {
    // Navigate to login
    console.log(`[AUTH] Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Check if we land on a login page or need to find the login form
    const currentUrl = page.url();
    console.log(`[AUTH] Current URL: ${currentUrl}`);

    // Try to find email/login input
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="mail" i]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('[AUTH] Login form found, filling credentials...');
      await emailInput.fill(EMAIL);
      await passwordInput.fill(PASSWORD);

      // Find and click submit button
      const submitBtn = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in"), button:has-text("Login")').first();
      await submitBtn.click();

      // Wait for navigation away from login
      console.log('[AUTH] Waiting for login redirect...');
      await page.waitForURL(url => !url.href.includes('login') && !url.href.includes('signin'), { timeout: 30000 });
      console.log(`[AUTH] Logged in → ${page.url()}`);
    } else {
      console.log('[AUTH] No login form found. Possibly already logged in or different flow.');
      console.log('[AUTH] Browser will stay open 60s for manual login...');
      await page.waitForTimeout(60000);
    }

    // Wait a bit for the app to fully load
    await page.waitForTimeout(3000);

    // Save storage state
    await context.storageState({ path: STORAGE_PATH });
    console.log(`[AUTH] Storage state saved to: ${STORAGE_PATH}`);
    console.log('[AUTH] Done! You can now use this storage state with Playwright MCP.');

  } catch (err) {
    console.error(`[AUTH ERROR] ${err.message}`);
    console.log('[AUTH] Browser stays open 30s for manual intervention...');
    await page.waitForTimeout(30000);

    // Try to save whatever state we have
    try {
      await context.storageState({ path: STORAGE_PATH });
      console.log(`[AUTH] Partial storage state saved to: ${STORAGE_PATH}`);
    } catch { /* ignore */ }
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});
