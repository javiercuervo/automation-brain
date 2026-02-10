#!/usr/bin/env node

/**
 * Upload de archivos a SiteGround via SSH/rsync
 *
 * Reutiliza el patrón de pipeline.mjs (scripts/pdfs-y-scorms/) para
 * subir diplomas/certificados a diplomas.institutoteologia.org
 *
 * Usage (como módulo):
 *   import { uploadFile, testConnection } from './siteground-upload.mjs';
 *   await uploadFile('/local/path/cert.pdf', 'IITD-021865.pdf');
 *
 * Usage (CLI):
 *   node siteground-upload.mjs --test                              # Test SSH connection
 *   node siteground-upload.mjs --file /path/to/file.pdf            # Upload a file
 *   node siteground-upload.mjs --file /path/to/file.pdf --name X   # Upload with custom remote name
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';

// =====================================================
// CONFIG
// =====================================================

const SSH_KEY = process.env.SITEGROUND_SSH_KEY || '~/.ssh/id_siteground';
const SSH_HOST = process.env.SITEGROUND_SSH_HOST || 'u13-siv41mwallnd@ssh.institutoteologia.org';
const SSH_PORT = process.env.SITEGROUND_SSH_PORT || '18765';
const SSH_OPTS = `-p ${SSH_PORT} -i ${SSH_KEY} -o StrictHostKeyChecking=no`;
const REMOTE_BASE = process.env.DIPLOMAS_REMOTE_PATH ||
  '/home/customer/www/diplomas.institutoteologia.org/public_html';
const PUBLIC_URL_BASE = 'https://diplomas.institutoteologia.org';

// =====================================================
// SSH HELPERS
// =====================================================

function sshExec(command, timeout = 15000) {
  return execSync(`ssh ${SSH_OPTS} ${SSH_HOST} "${command}"`, {
    timeout,
    encoding: 'utf-8',
  }).trim();
}

function rsyncFile(localPath, remotePath, timeout = 60000) {
  execSync(
    `rsync -az -e "ssh ${SSH_OPTS}" "${localPath}" ${SSH_HOST}:"${remotePath}"`,
    { timeout }
  );
}

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Test SSH connectivity to SiteGround
 * @returns {boolean} true if connection works
 */
export function testConnection() {
  try {
    const result = sshExec('echo OK');
    return result === 'OK';
  } catch (err) {
    console.error(`SSH test failed: ${err.message}`);
    return false;
  }
}

/**
 * Ensure the diplomas directory exists on SiteGround
 */
export function ensureRemoteDir() {
  sshExec(`mkdir -p ${REMOTE_BASE}`);
}

/**
 * Upload a file to the diplomas subdomain
 * @param {string} localPath - Local file path
 * @param {string} remoteName - Remote filename (e.g. 'IITD-021865.pdf')
 * @returns {{ url: string, remotePath: string }} Public URL and remote path
 */
export function uploadFile(localPath, remoteName) {
  if (!existsSync(localPath)) {
    throw new Error(`File not found: ${localPath}`);
  }

  const remotePath = `${REMOTE_BASE}/${remoteName}`;
  const publicUrl = `${PUBLIC_URL_BASE}/${remoteName}`;

  // Ensure directory exists
  ensureRemoteDir();

  // Upload via rsync
  rsyncFile(localPath, remotePath);

  // Verify file exists on remote
  try {
    sshExec(`test -f ${remotePath}`);
  } catch {
    throw new Error(`Upload verification failed: ${remotePath}`);
  }

  return { url: publicUrl, remotePath };
}

/**
 * List files in the diplomas directory
 * @returns {string[]} Array of filenames
 */
export function listFiles() {
  try {
    const result = sshExec(`ls ${REMOTE_BASE}/ 2>/dev/null || echo ''`, 10000);
    return result.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Check if a diploma already exists on the server
 * @param {string} remoteName - Filename to check
 * @returns {boolean}
 */
export function fileExists(remoteName) {
  try {
    sshExec(`test -f ${REMOTE_BASE}/${remoteName}`);
    return true;
  } catch {
    return false;
  }
}

// =====================================================
// CLI MODE
// =====================================================

async function main() {
  const isTest = process.argv.includes('--test');
  const fileIdx = process.argv.indexOf('--file');
  const nameIdx = process.argv.indexOf('--name');
  const isList = process.argv.includes('--list');

  if (isTest) {
    console.log('Testing SSH connection to SiteGround...');
    console.log(`  Host: ${SSH_HOST}:${SSH_PORT}`);
    console.log(`  Key: ${SSH_KEY}`);
    console.log(`  Remote: ${REMOTE_BASE}`);

    const ok = testConnection();
    console.log(ok ? '  ✓ Connection OK' : '  ✗ Connection FAILED');
    process.exit(ok ? 0 : 1);
  }

  if (isList) {
    console.log('Files on diplomas.institutoteologia.org:');
    const files = listFiles();
    if (files.length === 0) {
      console.log('  (empty)');
    } else {
      for (const f of files) {
        console.log(`  ${f}`);
      }
    }
    return;
  }

  if (fileIdx !== -1) {
    const localPath = process.argv[fileIdx + 1];
    const remoteName = nameIdx !== -1 ? process.argv[nameIdx + 1] : localPath.split('/').pop();

    console.log(`Uploading: ${localPath} → ${remoteName}`);
    const result = uploadFile(localPath, remoteName);
    console.log(`  ✓ ${result.url}`);
    return;
  }

  console.log('Usage:');
  console.log('  node siteground-upload.mjs --test');
  console.log('  node siteground-upload.mjs --file /path/to/file.pdf');
  console.log('  node siteground-upload.mjs --file /path/to/file.pdf --name IITD-021865.pdf');
  console.log('  node siteground-upload.mjs --list');
}

// Only run CLI if executed directly (not imported)
const isMain = process.argv[1] && (
  process.argv[1].endsWith('siteground-upload.mjs') ||
  process.argv[1].endsWith('siteground-upload')
);
if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
