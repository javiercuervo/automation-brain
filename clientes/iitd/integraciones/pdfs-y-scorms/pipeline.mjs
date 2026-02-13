#!/usr/bin/env node

/**
 * IITD Pipeline — Download from Drive, upload to FlipBooklets/SiteGround, update Sheet
 *
 * Usage:
 *   node pipeline.mjs pdfs          # Phase 1: download PDFs + upload to FlipBooklets + update sheet
 *   node pipeline.mjs pdfs --dry    # Dry run: download only, no upload
 *   node pipeline.mjs scorms        # Phase 2: download ZIPs + upload to SiteGround + update sheet
 *   node pipeline.mjs sheet-only    # Only update sheet from results.json
 */

import 'dotenv/config';
import { google } from 'googleapis';
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { pipeline as streamPipeline } from 'node:stream/promises';

const SCRIPT_DIR = import.meta.dirname;
const DOWNLOADS_DIR = resolve(SCRIPT_DIR, 'downloads');
const RESULTS_FILE = resolve(SCRIPT_DIR, 'results.json');
const SHEET_ID = '1bXVP3RYFtl8XjRJ2bSFwm4Ntv8Uwi5fwWlxUS2iL_KA';

// ============================================================================
// ITEMS TO PROCESS (from PLAN.md, row 145+)
// ============================================================================

const PDFS = [
  { driveId: '1hSbdQAhIA7fH8v9d63RQwbAZ_5QuHN6E', slug: 'para-mejorar-iglesia-mision-evangelizadora', title: 'Para mejorar el estudio - La Iglesia y su misión evangelizadora', sheetName: 'Formato libro-Para mejorar el estudio-La Iglesia y su misión evangelizadora' },
  { driveId: '1agjhhnYCBB14SLSkr7v5hF_xZfk-zWbi', slug: 'contenidos-iglesia-mision-evangelizadora', title: 'Contenidos - La Iglesia y su misión evangelizadora', sheetName: 'Formato libro-Contenidos-La Iglesia y su misión evangelizadora' },
  { driveId: '17El_NF7K54Lwqn3tnvwSVlfar1rdP4fr', slug: 'para-mejorar-celebracion-sacramentos', title: 'Para mejorar el estudio - La celebración cristiana: los sacramentos', sheetName: 'Formato libro-Para mejorar el estudio-La celebración cristiana: los sacramentos' },
  { driveId: '1Dih_Grj-gv2rsIJVWATYd0ANOuCf_mCL', slug: 'contenidos-celebracion-sacramentos', title: 'Contenidos - La celebración cristiana: los sacramentos', sheetName: 'Formato libro-Contenidos-La celebración cristiana: los sacramentos' },
  { driveId: '1Wwsx9IswPZJDb5k3FXRgoVj5TmdxUxcS', slug: 'para-mejorar-condicion-moral', title: 'Para mejorar el estudio - La condición moral del ser humano', sheetName: 'Formato libro-Para mejorar el estudio-La condición moral del ser humano' },
  { driveId: '1wQ0qmtHxL2Rw3hKJsYUIfen9_psnxCHG', slug: 'contenidos-condicion-moral', title: 'Contenidos - La condición moral del ser humano', sheetName: 'Formato libro-Contenidos-La condición moral del ser humano' },
  { driveId: '1txHHdh191vifRD39lu9L39UQc4PyTc_6', slug: 'contenidos-camino-moral', title: 'Contenidos - El camino moral del cristiano', sheetName: 'Formato libro-Contenidos-El camino moral del cristiano' },
];

const SCORMS = [
  // Biblia, el mensaje del AT — v2 (filas 157-163, feb 2026)
  { driveId: '1AKTG9y1m6CgK7Y_tMt4PUhghhD-NmX9w', route: 'biblia-mensaje-AT-v2', ud: 'UD1', sheetName: 'Scorm Biblia, el mensaje del AT UD1' },
  { driveId: '12-f0DlOzQkdMOxjAfu_VlGntJI4EaFjp', route: 'biblia-mensaje-AT-v2', ud: 'UD2', sheetName: 'Scorm Biblia, el mensaje del AT UD2' },
  { driveId: '1O7OPuy0ZQc9B-KOJhxvukr4lDawtWR0p', route: 'biblia-mensaje-AT-v2', ud: 'UD3', sheetName: 'Scorm Biblia, el mensaje del AT UD3' },
  { driveId: '1WVltiT2eY_rFOFmX6fZ6McImYNFWYRft', route: 'biblia-mensaje-AT-v2', ud: 'UD4', sheetName: 'Scorm Biblia, el mensaje del AT UD4' },
  { driveId: '1dvwgwoU94D1dKMTikAZEB-5hqwKSubkm', route: 'biblia-mensaje-AT-v2', ud: 'UD5', sheetName: 'Scorm Biblia, el mensaje del AT UD5' },
  { driveId: '1mCD3Px0XZHJApr9a5LuviyaSRVBd8olP', route: 'biblia-mensaje-AT-v2', ud: 'UD6', sheetName: 'Scorm Biblia, el mensaje del AT UD6' },
  { driveId: '1kamMHkAfWN1EIClwFrLC8AblFiDmZ3LI', route: 'biblia-mensaje-AT-v2', ud: 'UD7', sheetName: 'Scorm Biblia, el mensaje del AT UD7' },
];

// ============================================================================
// EMBED TEMPLATES
// ============================================================================

function pdfEmbed(slug) {
  return `<style>.embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; width: 100%; max-width: 100%; } .embed-container iframe, .embed-container object, .embed-container embed { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }@media only screen and (max-width:999px) {.embed-container { position: relative; padding-bottom: 110%;}}</style><div class='embed-container'><iframe src='https://pdf.proportione.com/${slug}' style='border:0' allowfullscreen></iframe></div>`;
}

function scormEmbed(url) {
  return `<div style="padding:56.25% 0 0 0;position:relative;">\n  <iframe\n      src="${url}"\n      style="position:absolute;top:0;left:0;width:100%;height:100%;"\n      frameborder="0"\n      allow="autoplay; fullscreen; picture-in-picture"\n      allowfullscreen>\n  </iframe>\n</div>`;
}

// ============================================================================
// GOOGLE APIs
// ============================================================================

function getAuth() {
  // Try Service Account first (works in CI and avoids ADC permission issues)
  const saPath = resolve(SCRIPT_DIR, '../../integraciones/alumnos/service-account.json');
  if (existsSync(saPath)) {
    return new google.auth.GoogleAuth({
      keyFile: saPath,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });
  }
  return new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });
}

async function downloadFromDrive(driveId, destPath) {
  const auth = getAuth();
  const drive = google.drive({ version: 'v3', auth });

  const meta = await drive.files.get({ fileId: driveId, fields: 'name,mimeType,size' });
  console.log(`  [DRIVE] ${meta.data.name} (${meta.data.mimeType}, ${(Number(meta.data.size) / 1024).toFixed(0)} KB)`);

  const res = await drive.files.get({ fileId: driveId, alt: 'media' }, { responseType: 'stream' });
  const dest = createWriteStream(destPath);
  await streamPipeline(res.data, dest);
  console.log(`  [SAVED] ${destPath}`);
}

// ============================================================================
// SHEET UPDATE
// ============================================================================

async function findSheetRow(sheets, name) {
  // Read col B (names) to find the row
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'B:B',
  });
  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    if (rows[i][0] && rows[i][0].trim() === name.trim()) {
      return i + 1; // 1-indexed
    }
  }
  return null;
}

async function updateSheetRow(sheets, rowNum, embedCode, url) {
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `D${rowNum}:E${rowNum}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[embedCode, url]] },
  });
  console.log(`  [SHEET] Row ${rowNum} updated`);
}

// ============================================================================
// PDF PIPELINE
// ============================================================================

async function runPdfs(dryRun = false) {
  console.log(`\n=== PDF PIPELINE (${PDFS.length} items) ===\n`);

  if (!existsSync(DOWNLOADS_DIR)) mkdirSync(DOWNLOADS_DIR, { recursive: true });

  // Load existing results
  let results = existsSync(RESULTS_FILE) ? JSON.parse(readFileSync(RESULTS_FILE, 'utf-8')) : [];

  // Step 1: Download all PDFs
  const downloaded = [];
  const seen = new Set();
  for (const pdf of PDFS) {
    if (seen.has(pdf.driveId)) {
      console.log(`  [SKIP] Duplicate drive ID: ${pdf.driveId}`);
      continue;
    }
    seen.add(pdf.driveId);

    const destPath = resolve(DOWNLOADS_DIR, `${pdf.slug}.pdf`);
    if (existsSync(destPath)) {
      console.log(`  [EXISTS] ${destPath}`);
    } else {
      await downloadFromDrive(pdf.driveId, destPath);
    }
    downloaded.push({ ...pdf, localPath: destPath });
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Downloaded files. Skipping upload.');
    return;
  }

  // Step 2: Generate flipbooks.config.json for upload.mjs
  const config = {
    defaults: {
      language: 'es',
      pageMode: 'spread',
      pageType: 'magazine',
      backgroundColor: '#1a1a2e',
      rtl: false,
      disableSound: false,
      emailCapture: false,
      allowDownload: true,
      seoPrivate: false,
      passwordProtect: null,
      metaTitle: null,
      metaDescription: null,
    },
    flipbooks: downloaded.map(pdf => ({
      pdfPath: pdf.localPath,
      title: pdf.title,
      slug: pdf.slug,
      overrides: {},
    })),
  };

  const configPath = resolve(SCRIPT_DIR, 'flipbooks.config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n[CONFIG] Written ${configPath} with ${downloaded.length} PDFs`);
  console.log('\n=== NEXT STEP ===');
  console.log('Run:  node upload.mjs --headed');
  console.log('Then: node pipeline.mjs sheet-only');
  console.log('\nThe upload.mjs will create each flipbook. After it finishes,');
  console.log('run sheet-only to update the Google Sheet with the results.\n');

  // Save results skeleton for sheet-only phase
  for (const pdf of PDFS) {
    const url = `https://pdf.proportione.com/${pdf.slug}`;
    const embed = pdfEmbed(pdf.slug);
    results.push({
      type: 'pdf',
      sheetName: pdf.sheetName,
      slug: pdf.slug,
      url,
      embed,
      status: 'pending_upload',
    });
  }
  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

// ============================================================================
// SCORM PIPELINE
// ============================================================================

async function runScorms() {
  console.log(`\n=== SCORM PIPELINE (${SCORMS.length} items) ===\n`);

  if (!existsSync(DOWNLOADS_DIR)) mkdirSync(DOWNLOADS_DIR, { recursive: true });

  let results = existsSync(RESULTS_FILE) ? JSON.parse(readFileSync(RESULTS_FILE, 'utf-8')) : [];

  // Step 1: Download all ZIPs
  for (const scorm of SCORMS) {
    const destPath = resolve(DOWNLOADS_DIR, `${scorm.route}-${scorm.ud}.zip`);
    if (existsSync(destPath)) {
      console.log(`  [EXISTS] ${destPath}`);
    } else {
      await downloadFromDrive(scorm.driveId, destPath);
    }

    const url = `https://scorm.institutoteologia.org/${scorm.route}/${scorm.ud}/index.html`;
    const embed = scormEmbed(url);

    results.push({
      type: 'scorm',
      sheetName: scorm.sheetName,
      route: scorm.route,
      ud: scorm.ud,
      localZip: destPath,
      url,
      embed,
      status: 'downloaded',
    });
  }

  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));

  console.log(`\n[DOWNLOADED] ${SCORMS.length} ZIPs to ${DOWNLOADS_DIR}`);
  console.log('\n=== NEXT: Upload to SiteGround ===');
  console.log('Ensure SSH is configured (ssh-add ~/.ssh/id_ed25519), then run:');
  console.log('  node pipeline.mjs scorm-upload');
}

// ============================================================================
// SCORM UPLOAD TO SITEGROUND
// ============================================================================

async function runScormUpload() {
  console.log('\n=== SCORM UPLOAD TO SITEGROUND ===\n');

  const results = existsSync(RESULTS_FILE) ? JSON.parse(readFileSync(RESULTS_FILE, 'utf-8')) : [];
  const scormResults = results.filter(r => r.type === 'scorm' && r.status === 'downloaded');

  if (scormResults.length === 0) {
    console.log('No scorms to upload. Run "node pipeline.mjs scorms" first.');
    return;
  }

  const { execSync } = await import('node:child_process');
  const { readdirSync, statSync } = await import('node:fs');
  const SSH_KEY = '~/.ssh/id_siteground';
  const SSH_HOST = 'u13-siv41mwallnd@ssh.institutoteologia.org';
  const SSH_PORT = '18765';
  const SSH_OPTS = `-p ${SSH_PORT} -i ${SSH_KEY} -o StrictHostKeyChecking=no`;
  const REMOTE_BASE = '/home/customer/www/scorm.institutoteologia.org/public_html';

  // Test SSH connection
  try {
    const lsOut = execSync(
      `ssh ${SSH_OPTS} ${SSH_HOST} "ls ${REMOTE_BASE}/"`,
      { encoding: 'utf-8', timeout: 15000 }
    );
    console.log('[SSH] Connected. Existing dirs:', lsOut.trim().split('\n').join(', '));
  } catch (e) {
    console.error('[SSH ERROR]', e.message);
    return;
  }

  // Group by route to create directories
  const routes = [...new Set(scormResults.map(s => s.route))];

  for (const route of routes) {
    const items = scormResults.filter(s => s.route === route);
    console.log(`\n[ROUTE] ${route} (${items.length} UDs)`);

    // Create route directory once
    execSync(`ssh ${SSH_OPTS} ${SSH_HOST} "mkdir -p ${REMOTE_BASE}/${route}"`, { timeout: 15000 });

    for (const item of items) {
      console.log(`  [UPLOAD] ${item.ud}...`);
      try {
        // Extract ZIP
        const extractDir = resolve(DOWNLOADS_DIR, `${item.route}-${item.ud}`);
        if (!existsSync(extractDir)) mkdirSync(extractDir, { recursive: true });
        execSync(`unzip -o -q "${item.localZip}" -d "${extractDir}"`, { timeout: 30000 });

        // Find content dir (ZIP might have a wrapper folder)
        let contentDir = extractDir;
        const entries = readdirSync(extractDir);
        if (entries.length === 1 && statSync(resolve(extractDir, entries[0])).isDirectory()) {
          contentDir = resolve(extractDir, entries[0]);
        }

        const remotePath = `${REMOTE_BASE}/${route}/${item.ud}`;

        // Create remote dir + rsync content
        execSync(`ssh ${SSH_OPTS} ${SSH_HOST} "mkdir -p ${remotePath}"`, { timeout: 15000 });
        execSync(
          `rsync -az -e "ssh ${SSH_OPTS}" "${contentDir}/" ${SSH_HOST}:"${remotePath}/"`,
          { timeout: 180000 }
        );

        // Verify index.html exists
        execSync(`ssh ${SSH_OPTS} ${SSH_HOST} "test -f ${remotePath}/index.html"`, { timeout: 10000 });
        console.log(`  [OK] ${item.url}`);

        item.status = 'uploaded';
      } catch (e) {
        console.error(`  [FAIL] ${e.message}`);
        item.status = 'failed';
      }
    }
  }

  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log('\n=== NEXT: Update sheet ===');
  console.log('Run: node pipeline.mjs sheet-only');
}

// ============================================================================
// SHEET-ONLY UPDATE
// ============================================================================

async function runSheetOnly() {
  console.log('\n=== UPDATING GOOGLE SHEET ===\n');

  const results = existsSync(RESULTS_FILE) ? JSON.parse(readFileSync(RESULTS_FILE, 'utf-8')) : [];
  if (results.length === 0) {
    console.log('No results to write. Run pdfs or scorms first.');
    return;
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  for (const item of results) {
    if (item.status === 'sheet_updated') continue;

    console.log(`[${item.type.toUpperCase()}] "${item.sheetName}"`);
    const rowNum = await findSheetRow(sheets, item.sheetName);
    if (!rowNum) {
      console.log(`  [WARN] Row not found in sheet for "${item.sheetName}"`);
      continue;
    }

    await updateSheetRow(sheets, rowNum, item.embed, item.url);
    item.status = 'sheet_updated';
  }

  writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log('\n[DONE] Sheet updated.');
}

// ============================================================================
// MAIN
// ============================================================================

const cmd = process.argv[2];
const dryRun = process.argv.includes('--dry');

switch (cmd) {
  case 'pdfs':
    await runPdfs(dryRun);
    break;
  case 'scorms':
    await runScorms();
    break;
  case 'scorm-upload':
    await runScormUpload();
    break;
  case 'sheet-only':
    await runSheetOnly();
    break;
  default:
    console.log('Usage: node pipeline.mjs <pdfs|scorms|scorm-upload|sheet-only> [--dry]');
    process.exit(1);
}
