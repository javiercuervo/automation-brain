/**
 * Shared Google Auth helper — Service Account
 *
 * Usage:
 *   import { getAuth, getSheetsClient, getDriveClient } from './google-auth.mjs';
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SA_PATH = resolve(__dirname, 'service-account.json');

let _google;

async function loadGoogle() {
  if (!_google) {
    const mod = await import('googleapis');
    _google = mod.google;
  }
  return _google;
}

export async function getAuth(scopes) {
  const google = await loadGoogle();

  if (existsSync(SA_PATH)) {
    return new google.auth.GoogleAuth({ keyFile: SA_PATH, scopes });
  }

  // Fallback: ADC (for local dev without service account)
  return new google.auth.GoogleAuth({ scopes });
}

export async function getSheetsClient() {
  const google = await loadGoogle();
  const auth = await getAuth([
    'https://www.googleapis.com/auth/spreadsheets',
  ]);
  return google.sheets({ version: 'v4', auth: await auth.getClient() });
}

export async function getDriveClient() {
  const google = await loadGoogle();
  const auth = await getAuth([
    'https://www.googleapis.com/auth/drive',
  ]);
  return google.drive({ version: 'v3', auth: await auth.getClient() });
}
