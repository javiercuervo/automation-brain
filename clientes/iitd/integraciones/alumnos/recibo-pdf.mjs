#!/usr/bin/env node

/**
 * Generador de recibos de matrícula en PDF (N08) — con upload Drive + Sheet
 *
 * Genera recibos de matrícula a partir de datos de la tabla ALUMNOS en Stackby.
 *
 * Flujo completo (con --upload):
 *   1. Genera PDF del recibo
 *   2. Sube PDF a Google Drive (carpeta "Recibos IITD")
 *   3. Escribe enlace en Sheet "Panel IITD" → Recibos
 *
 * Usage:
 *   node recibo-pdf.mjs --email juan@email.com                      # Solo genera PDF local
 *   node recibo-pdf.mjs --email juan@email.com --upload             # Genera + Drive + Sheet
 *   node recibo-pdf.mjs --email juan@email.com -o out/              # Guardar en directorio
 *   node recibo-pdf.mjs --programa DECA                             # Todos los DECA
 *   node recibo-pdf.mjs --programa DECA --upload                    # Todos DECA + Drive + Sheet
 *   node recibo-pdf.mjs --all                                       # Todos los alumnos
 *   node recibo-pdf.mjs --email juan@email.com --importe 350 --concepto "Matrícula DECA 2025/26"
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_ALUMNOS_TABLE_ID
 *   PANEL_IITD_SHEET_ID (para escribir en Sheet)
 *   DRIVE_RECIBOS_FOLDER_ID (opcional — crea carpeta si no existe)
 */

import { createWriteStream, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '.env'))) {
  const envContent = readFileSync(resolve(__dirname, '.env'), 'utf-8');
  for (const line of envContent.split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// =====================================================
// CONFIG
// =====================================================

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const BASE_URL = 'https://stackby.com/api/betav1';
const SHEET_ID = process.env.PANEL_IITD_SHEET_ID || '';
let DRIVE_FOLDER_ID = process.env.DRIVE_RECIBOS_FOLDER_ID || '';

const EMAIL_FILTER = (() => {
  const idx = process.argv.indexOf('--email');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const PROGRAMA_FILTER = (() => {
  const idx = process.argv.indexOf('--programa');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const IMPORTE_OVERRIDE = (() => {
  const idx = process.argv.indexOf('--importe');
  return idx !== -1 ? parseFloat(process.argv[idx + 1]) : null;
})();

const CONCEPTO_OVERRIDE = (() => {
  const idx = process.argv.indexOf('--concepto');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const OUTPUT_DIR = (() => {
  const idx = process.argv.indexOf('-o');
  return idx !== -1 ? process.argv[idx + 1] : './recibos';
})();

const ALL_MODE = process.argv.includes('--all');
const UPLOAD_MODE = process.argv.includes('--upload');

// Logo path (optional - works without it)
const LOGO_PATH = (() => {
  const idx = process.argv.indexOf('--logo');
  if (idx !== -1) return process.argv[idx + 1];
  const defaultPath = resolve(__dirname, '../../assets/logos/logo-ppal-iit-rgb.png');
  return existsSync(defaultPath) ? defaultPath : null;
})();

// Datos de la institución
const INSTITUCION = {
  nombre: 'INSTITUTO INTERNACIONAL DE TEOLOGÍA A DISTANCIA',
  nif: process.env.IITD_NIF || '[NIF — configurar IITD_NIF en .env]',
  direccion: process.env.IITD_DIRECCION || '[DIRECCIÓN — configurar IITD_DIRECCION en .env]',
  cp: process.env.IITD_CP || '[CP]',
  ciudad: process.env.IITD_CIUDAD || '[CIUDAD — configurar IITD_CIUDAD en .env]',
  telefono: process.env.IITD_TELEFONO || '[TELÉFONO — configurar IITD_TELEFONO en .env]',
  email: process.env.IITD_EMAIL || 'informacion@institutoteologia.org',
  web: 'institutoteologia.org',
};

// Importes por defecto por programa
const IMPORTES_PROGRAMA = {
  'DECLARACIÓN ECLESIÁSTICA COMPETENCIA ACADEMICA (DECA)': 350,
  'ESCUELA DE EVANGELIZADORES': 150,
  'FORMACIÓN SISTEMÁTICA': 200,
  'FORMACIÓN BÍBLICA': 180,
  'COMPROMISO LAICAL Y DOCTRINA SOCIAL': 180,
  'GENERAL': 100,
};

if (!API_KEY) {
  console.error('Set STACKBY_API_KEY env var');
  process.exit(1);
}

if (!EMAIL_FILTER && !PROGRAMA_FILTER && !ALL_MODE) {
  console.error('Usa --email, --programa, o --all');
  process.exit(1);
}

// =====================================================
// STACKBY API
// =====================================================

async function getAllRows() {
  let allRecords = [];
  let offset = 0;
  const PAGE_SIZE = 100;

  while (true) {
    const url = `${BASE_URL}/rowlist/${STACK_ID}/${TABLE_ID}` +
      (offset ? `?offset=${offset}` : '');

    const res = await fetch(url, {
      headers: { 'api-key': API_KEY },
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);

    const data = JSON.parse(text);
    const records = Array.isArray(data) ? data : (data.records || []);
    allRecords = allRecords.concat(records);

    if (records.length < PAGE_SIZE) break;
    offset += records.length;
  }

  return allRecords;
}

// =====================================================
// PDF GENERATION
// =====================================================

function generateReciboNumber(email, date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const hash = Array.from(email).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const suffix = String(Math.abs(hash) % 10000).padStart(4, '0');
  return `REC-${y}${m}-${suffix}`;
}

function formatDate(date) {
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatCurrency(amount) {
  return amount.toLocaleString('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });
}

function generateReciboPDF(alumno, outputPath) {
  return new Promise((resolvePromise, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

    const now = new Date();
    const reciboNum = generateReciboNumber(alumno.email, now);
    const programa = alumno.programa || 'Sin programa';
    const importe = IMPORTE_OVERRIDE || IMPORTES_PROGRAMA[programa] || 0;
    const concepto = CONCEPTO_OVERRIDE || `Matrícula ${programa}`;

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // --- HEADER ---
    let headerY = 50;
    if (LOGO_PATH) {
      try {
        doc.image(LOGO_PATH, 60, headerY, { width: 80 });
        headerY += 10;
      } catch { /* ignore missing logo */ }
    }

    doc.fontSize(12).font('Helvetica-Bold')
      .text(INSTITUCION.nombre, 150, headerY, { width: pageWidth - 100 });
    doc.fontSize(8).font('Helvetica')
      .text(`NIF: ${INSTITUCION.nif}`, 150, headerY + 30)
      .text(`${INSTITUCION.direccion} - ${INSTITUCION.cp} ${INSTITUCION.ciudad}`, 150, headerY + 40)
      .text(`Tel: ${INSTITUCION.telefono} | ${INSTITUCION.email}`, 150, headerY + 50);

    const boxX = doc.page.width - doc.page.margins.right - 160;
    const boxY = headerY + 60;
    doc.rect(boxX, boxY, 160, 45).stroke('#cccccc');
    doc.fontSize(10).font('Helvetica-Bold')
      .text(`Recibo: ${reciboNum}`, boxX + 10, boxY + 8, { width: 140 });
    doc.fontSize(9).font('Helvetica')
      .text(`Fecha: ${formatDate(now)}`, boxX + 10, boxY + 24, { width: 140 });

    // --- TITLE ---
    const titleY = boxY + 70;
    doc.fontSize(18).font('Helvetica-Bold')
      .text('RECIBO DE MATRÍCULA', 60, titleY, { width: pageWidth, align: 'center' });

    // --- DATOS DEL ALUMNO ---
    const datosY = titleY + 50;
    doc.rect(60, datosY, pageWidth, 95).fill('#f5f5f5').stroke('#cccccc');
    doc.fillColor('#000000');

    doc.fontSize(10).font('Helvetica-Bold')
      .text('DATOS DEL ALUMNO', 75, datosY + 10);
    doc.fontSize(9).font('Helvetica');

    const col1 = 75;
    const col2 = 310;
    const labelW = 65;
    const row1 = datosY + 28;
    const row2 = datosY + 42;
    const row3 = datosY + 56;
    const row4 = datosY + 70;

    doc.font('Helvetica-Bold').text('Nombre:', col1, row1, { width: labelW });
    doc.font('Helvetica').text(`${alumno.nombre} ${alumno.apellidos}`, col1 + labelW, row1, { width: 200 });
    doc.font('Helvetica-Bold').text('Email:', col1, row2, { width: labelW });
    doc.font('Helvetica').text(alumno.email, col1 + labelW, row2, { width: 200 });
    doc.font('Helvetica-Bold').text('Teléfono:', col1, row3, { width: labelW });
    doc.font('Helvetica').text(alumno.telefono || '—', col1 + labelW, row3, { width: 200 });

    doc.font('Helvetica-Bold').text('Programa:', col2, row1, { width: labelW });
    doc.font('Helvetica').text(programa, col2 + labelW, row1, { width: 130 });

    const expMatch = (alumno.notas || '').match(/Nº Exp: (IITD-\d+)/);
    doc.font('Helvetica-Bold').text('Estado pago:', col2, row3, { width: labelW });
    doc.font('Helvetica').text(alumno.estadoPago || '—', col2 + labelW, row3, { width: 130 });
    if (expMatch) {
      doc.font('Helvetica-Bold').text('Expediente:', col2, row4, { width: labelW });
      doc.font('Helvetica').text(expMatch[1], col2 + labelW, row4, { width: 130 });
    }

    // --- TABLE: CONCEPTOS ---
    const tableY = datosY + 120;

    doc.rect(60, tableY, pageWidth, 25).fill('#2c3e50');
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    doc.text('Concepto', 75, tableY + 8, { width: 300 });
    doc.text('Importe', pageWidth - 40, tableY + 8, { width: 80, align: 'right' });

    doc.fillColor('#000000');
    const rowY = tableY + 25;
    doc.rect(60, rowY, pageWidth, 30).stroke('#cccccc');
    doc.fontSize(9).font('Helvetica')
      .text(concepto, 75, rowY + 10, { width: 320 });
    doc.text(importe > 0 ? formatCurrency(importe) : '—', pageWidth - 40, rowY + 10, { width: 80, align: 'right' });

    const totalY = rowY + 30;
    doc.rect(60, totalY, pageWidth, 30).fill('#f0f0f0').stroke('#cccccc');
    doc.fillColor('#000000');
    doc.fontSize(11).font('Helvetica-Bold')
      .text('TOTAL', 75, totalY + 8);
    doc.text(importe > 0 ? formatCurrency(importe) : '—', pageWidth - 40, totalY + 8, { width: 80, align: 'right' });

    // --- PAYMENT INFO ---
    const payY = totalY + 55;
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Información de pago', 60, payY);
    doc.fontSize(8).font('Helvetica')
      .text(`Estado del pago: ${alumno.estadoPago || 'No registrado'}`, 60, payY + 16)
      .text(`Fecha de matrícula: ${alumno.fechaEstado || '—'}`, 60, payY + 28);

    // --- FOOTER ---
    const footerY = doc.page.height - 120;

    doc.moveTo(60, footerY).lineTo(60 + pageWidth, footerY).stroke('#cccccc');

    doc.fontSize(7).font('Helvetica').fillColor('#666666');
    doc.text(
      'Este documento es un recibo informativo de matrícula. No constituye factura a efectos fiscales.',
      60, footerY + 10, { width: pageWidth, align: 'center' }
    );
    doc.text(
      `${INSTITUCION.nombre} | ${INSTITUCION.web}`,
      60, footerY + 22, { width: pageWidth, align: 'center' }
    );

    doc.fontSize(6).fillColor('#999999');
    doc.text(
      'En caso de que usted nos facilite datos personales, serán tratados por INSTITUTO INTERNACIONAL DE ' +
      'TEOLOGÍA A DISTANCIA para atender su solicitud. Puede ejercer sus derechos de acceso, rectificación, ' +
      'supresión, limitación del tratamiento, portabilidad y oposición. Más información en www.iitdistancia.org',
      60, footerY + 40, { width: pageWidth, align: 'center' }
    );

    // Store metadata for the result
    alumno._reciboNum = reciboNum;
    alumno._importe = importe;
    alumno._concepto = concepto;

    doc.end();

    stream.on('finish', () => resolvePromise(outputPath));
    stream.on('error', reject);
  });
}

// =====================================================
// GOOGLE DRIVE — Upload PDF
// =====================================================

let _driveService = null;
let _sheetsService = null;

async function getGoogleServices() {
  if (_driveService && _sheetsService) return { drive: _driveService, sheets: _sheetsService };

  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets',
    ],
  });

  _driveService = google.drive({ version: 'v3', auth });
  _sheetsService = google.sheets({ version: 'v4', auth });
  return { drive: _driveService, sheets: _sheetsService };
}

async function ensureDriveFolder() {
  if (DRIVE_FOLDER_ID) return DRIVE_FOLDER_ID;

  const { drive } = await getGoogleServices();

  // Search for existing folder
  const search = await drive.files.list({
    q: "name='Recibos IITD' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: 'files(id, name)',
  });

  if (search.data.files.length > 0) {
    DRIVE_FOLDER_ID = search.data.files[0].id;
    console.log(`    Carpeta Drive existente: ${DRIVE_FOLDER_ID}`);
    return DRIVE_FOLDER_ID;
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: 'Recibos IITD',
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  DRIVE_FOLDER_ID = folder.data.id;
  console.log(`    Carpeta Drive creada: ${DRIVE_FOLDER_ID}`);
  return DRIVE_FOLDER_ID;
}

async function uploadToDrive(localPath, fileName) {
  const { drive } = await getGoogleServices();
  const folderId = await ensureDriveFolder();
  const { createReadStream } = await import('fs');

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: 'application/pdf',
      body: createReadStream(localPath),
    },
    fields: 'id, webViewLink',
  });

  return {
    fileId: res.data.id,
    url: res.data.webViewLink,
  };
}

// =====================================================
// GOOGLE SHEETS — Write to Recibos tab
// =====================================================

async function appendReciboToSheet(row) {
  if (!SHEET_ID) {
    console.log('  ⚠ PANEL_IITD_SHEET_ID no configurado, no se escribe en Sheet');
    return;
  }

  const { sheets } = await getGoogleServices();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "'Recibos'!A:H",
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('Generador de recibos de matrícula (N08)');
  console.log(`  Upload: ${UPLOAD_MODE ? 'SÍ (Drive + Sheet)' : 'NO (solo local)'}`);
  console.log();

  const rows = await getAllRows();
  console.log(`  Total registros en Stackby: ${rows.length}`);

  // Parse and filter
  let alumnos = rows.map(r => ({
    email: r.field?.Email || '',
    nombre: r.field?.Nombre || '',
    apellidos: r.field?.Apellidos || '',
    telefono: r.field?.Telefono || '',
    programa: r.field?.Programa || '',
    estado: r.field?.Estado || '',
    fechaEstado: r.field?.['Fecha estado'] || '',
    estadoPago: r.field?.['Estado pago'] || '',
    fuente: r.field?.Fuente || '',
    notas: r.field?.Notas || '',
  }));

  if (EMAIL_FILTER) {
    const target = EMAIL_FILTER.toLowerCase().trim();
    alumnos = alumnos.filter(a => a.email.toLowerCase() === target);
    if (alumnos.length === 0) {
      console.error(`No se encontró alumno con email: ${EMAIL_FILTER}`);
      process.exit(1);
    }
  } else if (PROGRAMA_FILTER) {
    alumnos = alumnos.filter(a =>
      a.programa.toLowerCase().includes(PROGRAMA_FILTER.toLowerCase())
    );
  }

  console.log(`  Alumnos a procesar: ${alumnos.length}`);

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Ensure Drive folder exists if uploading
  if (UPLOAD_MODE) {
    console.log('\n  Preparando Google Drive...');
    await ensureDriveFolder();
  }

  let generated = 0;
  const now = new Date().toISOString().split('T')[0];

  for (const alumno of alumnos) {
    const safeName = `${alumno.apellidos}_${alumno.nombre}`.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '_');
    const filename = `recibo_${safeName}.pdf`;
    const outputPath = join(OUTPUT_DIR, filename);

    await generateReciboPDF(alumno, outputPath);
    generated++;

    if (!UPLOAD_MODE) {
      process.stdout.write(`\r  Generados: ${generated}/${alumnos.length}`);
      continue;
    }

    // Upload to Drive
    let driveUrl = '';
    try {
      const upload = await uploadToDrive(outputPath, filename);
      driveUrl = upload.url;
      console.log(`  ✓ ${alumno.nombre} ${alumno.apellidos} → Drive: ${driveUrl}`);
    } catch (err) {
      console.error(`  ✗ Drive upload failed for ${alumno.email}: ${err.message}`);
    }

    // Write to Sheet
    if (SHEET_ID) {
      const programa = alumno.programa || 'Sin programa';
      const importe = IMPORTE_OVERRIDE || IMPORTES_PROGRAMA[programa] || 0;
      // Headers: Email, Nombre, Apellidos, Programa, Importe, Fecha, Enlace PDF, Estado
      const row = [
        alumno.email,
        alumno.nombre,
        alumno.apellidos,
        programa,
        importe > 0 ? importe : '',
        now,
        driveUrl,
        'Generado',
      ];

      try {
        await appendReciboToSheet(row);
      } catch (err) {
        console.error(`    ✗ Sheet write failed: ${err.message}`);
      }
    }
  }

  console.log();
  console.log();
  console.log(`Recibos generados: ${generated}`);
  console.log(`Directorio: ${resolve(OUTPUT_DIR)}`);
  if (UPLOAD_MODE && DRIVE_FOLDER_ID) {
    console.log(`Carpeta Drive: https://drive.google.com/drive/folders/${DRIVE_FOLDER_ID}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
