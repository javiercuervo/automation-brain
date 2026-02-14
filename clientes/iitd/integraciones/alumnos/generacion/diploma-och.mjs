#!/usr/bin/env node

/**
 * Generador de Diplomas OCH — Diseño corporativo IITD
 *
 * Genera diplomas con branding IITD completo:
 *   - Fuente Quasimoda (corporativa)
 *   - Colores institucionales (#007977 teal, #500d00 granate, #005d89 azul)
 *   - Logo horizontal con fondo transparente
 *   - Imagen de fondo decorativa
 *   - QR de verificación + hash
 *
 * Usage:
 *   node diploma-och.mjs --email alumno@email.com                    # Genera PDF local
 *   node diploma-och.mjs --email alumno@email.com --mock             # Con datos de ejemplo
 *   node diploma-och.mjs --email alumno@email.com --programa "DECA Infantil y Primaria"
 *   node diploma-och.mjs --email alumno@email.com --upload           # Genera + sube + Sheet
 *   node diploma-och.mjs --email alumno@email.com -o out/            # Directorio output
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_ALUMNOS_TABLE_ID
 *   PXL_API_TOKEN (para QR/short links)
 *   PANEL_IITD_SHEET_ID (para escribir en Sheet)
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import { addSignaturePlaceholder, signPdf, isSigningAvailable } from './pdf-signer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`Generador de Diplomas OCH — Diseño corporativo IITD

Usage:
  node diploma-och.mjs --email alumno@email.com              Genera PDF local
  node diploma-och.mjs --mock                                Con datos de ejemplo (sin --email)
  node diploma-och.mjs --email a@b.com --programa "DECA IP"  Override programa
  node diploma-och.mjs --email a@b.com --upload              Genera + sube SiteGround + Sheet
  node diploma-och.mjs --email a@b.com --no-sign             Sin firma digital
  node diploma-och.mjs --email a@b.com -o out/               Directorio output

Env vars: STACKBY_API_KEY, PXL_API_TOKEN, PANEL_IITD_SHEET_ID, CERT_P12_PASSWORD`);
  process.exit(0);
}

// Load .env
if (existsSync(resolve(__dirname, '../.env'))) {
  const envContent = readFileSync(resolve(__dirname, '../.env'), 'utf-8');
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
const ALUMNOS_TABLE = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const SHEET_ID = process.env.PANEL_IITD_SHEET_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

const EMAIL_FILTER = (() => {
  const idx = process.argv.indexOf('--email');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const PROGRAMA_OVERRIDE = (() => {
  const idx = process.argv.indexOf('--programa');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const OUTPUT_DIR = (() => {
  const idx = process.argv.indexOf('-o');
  return idx !== -1 ? process.argv[idx + 1] : './certificados';
})();

const MOCK_MODE = process.argv.includes('--mock');
const UPLOAD_MODE = process.argv.includes('--upload');
const SIGN_MODE = !process.argv.includes('--no-sign') && isSigningAvailable();

// =====================================================
// BRAND ASSETS
// =====================================================

const ACTIVOS_DIR = resolve(__dirname, '../../../activos');
const FONTS_DIR = resolve(ACTIVOS_DIR, 'fuentes');

const LOGO_PATH = resolve(ACTIVOS_DIR, 'logo-fondo-transparente.png');
const BG_PATH = resolve(ACTIVOS_DIR, 'och-diploma-background.png');

// Brand colors
const COLORS = {
  teal: '#007977',
  tealDark: '#006977',
  blueDark: '#005d89',
  granate: '#500d00',
  rojo: '#e30613',
  rosa: '#96465d',
  verdeGris: '#617971',
  cream: '#fcfaf7',
  textDark: '#2d2d2d',
  textMuted: '#666666',
  textLight: '#999999',
};

const INSTITUCION = {
  nombre: 'INSTITUTO INTERNACIONAL DE TEOLOGÍA A DISTANCIA',
  nombreCorto: 'IITD',
  direccion: process.env.IITD_DIRECCION || 'Calle Iriarte 3',
  ciudad: process.env.IITD_CIUDAD || 'Madrid',
  web: 'institutoteologia.org',
};

const DIPLOMAS_BASE_URL = 'https://diplomas.institutoteologia.org';

// =====================================================
// FONT REGISTRATION
// =====================================================

function registerFonts(doc) {
  const fonts = {
    'Quasimoda': resolve(FONTS_DIR, 'Quasimoda-Regular.otf'),
    'Quasimoda-Light': resolve(FONTS_DIR, 'Quasimoda-Light.otf'),
    'Quasimoda-Medium': resolve(FONTS_DIR, 'Quasimoda-Medium.otf'),
    'Quasimoda-SemiBold': resolve(FONTS_DIR, 'Quasimoda-SemiBold.otf'),
    'Quasimoda-Bold': resolve(FONTS_DIR, 'Quasimoda-Bold.otf'),
  };

  let registered = 0;
  for (const [name, path] of Object.entries(fonts)) {
    if (existsSync(path)) {
      doc.registerFont(name, path);
      registered++;
    }
  }

  if (registered === 0) {
    console.log('  ⚠ Fuentes Quasimoda no encontradas, usando Helvetica');
  }

  return registered > 0;
}

// Helper: use Quasimoda if available, fallback to Helvetica
function fontName(weight, hasQuasimoda) {
  if (!hasQuasimoda) {
    const map = {
      light: 'Helvetica',
      regular: 'Helvetica',
      medium: 'Helvetica-Bold',
      semibold: 'Helvetica-Bold',
      bold: 'Helvetica-Bold',
    };
    return map[weight] || 'Helvetica';
  }
  const map = {
    light: 'Quasimoda-Light',
    regular: 'Quasimoda',
    medium: 'Quasimoda-Medium',
    semibold: 'Quasimoda-SemiBold',
    bold: 'Quasimoda-Bold',
  };
  return map[weight] || 'Quasimoda';
}

// =====================================================
// STACKBY API
// =====================================================

async function fetchAllRows(tableId) {
  let allRecords = [];
  let offset = 0;
  const PAGE_SIZE = 100;

  while (true) {
    const url = `${BASE_URL}/rowlist/${STACK_ID}/${tableId}` +
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

async function getAlumno(email) {
  const rows = await fetchAllRows(ALUMNOS_TABLE);
  const target = email.toLowerCase().trim();
  const row = rows.find(r =>
    (r.field?.Email || '').toLowerCase().trim() === target
  );
  if (!row) return null;

  const notas = row.field?.Notas || '';
  const expMatch = notas.match(/Nº Exp: (IITD-\d+)/);

  return {
    email: row.field?.Email || '',
    nombre: row.field?.Nombre || '',
    apellidos: row.field?.Apellidos || '',
    programa: row.field?.Programa || '',
    estado: row.field?.Estado || '',
    expediente: expMatch ? expMatch[1] : '',
    fechaEstado: row.field?.['Fecha estado'] || '',
  };
}

function getMockAlumno() {
  return {
    email: 'ejemplo@test.com',
    nombre: 'María',
    apellidos: 'García López',
    programa: 'DECA Infantil y Primaria',
    estado: 'Titulado',
    expediente: 'IITD-110001',
    fechaEstado: '2026-01-15',
  };
}

// =====================================================
// VERIFICATION HASH
// =====================================================

function computeFileHash(filePath) {
  const buffer = readFileSync(filePath);
  return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

// =====================================================
// PDF: DIPLOMA OCH — Diseño corporativo
// =====================================================

function generateDiplomaOCH(alumno, outputPath, opts = {}) {
  const { qrBuffer, shortUrl, verifyHash, sign = false } = opts;

  return new Promise((resolvePromise, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    const PW = doc.page.width;   // 841.89
    const PH = doc.page.height;  // 595.28
    const hasQuasimoda = registerFonts(doc);
    const now = new Date();

    // --- BACKGROUND IMAGE ---
    if (existsSync(BG_PATH)) {
      doc.image(BG_PATH, 0, 0, { width: PW, height: PH });
    } else {
      // Fallback: cream background
      doc.rect(0, 0, PW, PH).fill(COLORS.cream);
    }

    // Content area (inside the decorative borders)
    const marginL = 65;
    const marginR = 65;
    const contentW = PW - marginL - marginR;
    const centerX = PW / 2;

    // --- LOGO ---
    let y = 30;
    if (existsSync(LOGO_PATH)) {
      const logoW = 220;
      const logoH = logoW * (672 / 1918); // maintain aspect ratio
      doc.image(LOGO_PATH, centerX - logoW / 2, y, { width: logoW });
      y += logoH + 15;
    } else {
      // Fallback: text header
      doc.font(fontName('bold', hasQuasimoda)).fontSize(11).fillColor(COLORS.teal)
        .text(INSTITUCION.nombre, marginL, y + 20, { width: contentW, align: 'center' });
      y += 50;
    }

    // --- DECORATIVE SEPARATOR ---
    const sepY = y + 5;
    doc.moveTo(centerX - 120, sepY).lineTo(centerX + 120, sepY)
      .lineWidth(1.5).stroke(COLORS.granate);
    y = sepY + 18;

    // --- DIPLOMA TITLE ---
    doc.font(fontName('bold', hasQuasimoda)).fontSize(36).fillColor(COLORS.teal)
      .text('DIPLOMA', marginL, y, { width: contentW, align: 'center', characterSpacing: 6 });
    y += 50;

    // --- CERTIFIES TEXT ---
    doc.font(fontName('light', hasQuasimoda)).fontSize(11).fillColor(COLORS.textDark)
      .text('Certifica que', marginL, y, { width: contentW, align: 'center' });
    y += 22;

    // --- STUDENT NAME ---
    const fullName = `${alumno.nombre} ${alumno.apellidos}`;
    doc.font(fontName('semibold', hasQuasimoda)).fontSize(24).fillColor(COLORS.granate)
      .text(fullName.toUpperCase(), marginL, y, { width: contentW, align: 'center' });
    y += 36;

    // --- EXPEDIENTE ---
    if (alumno.expediente) {
      doc.font(fontName('light', hasQuasimoda)).fontSize(8).fillColor(COLORS.textLight)
        .text(`Expediente: ${alumno.expediente}`, marginL, y, { width: contentW, align: 'center' });
      y += 16;
    }

    // --- COMPLETION TEXT ---
    doc.font(fontName('regular', hasQuasimoda)).fontSize(11).fillColor(COLORS.textDark)
      .text('ha completado satisfactoriamente el programa de estudios', marginL, y, {
        width: contentW, align: 'center',
      });
    y += 24;

    // --- PROGRAM NAME ---
    const programa = alumno.programa || 'Programa de Estudios';
    doc.font(fontName('bold', hasQuasimoda)).fontSize(16).fillColor(COLORS.teal)
      .text(programa, marginL, y, { width: contentW, align: 'center' });
    y += 28;

    // --- ADDITIONAL TEXT ---
    doc.font(fontName('light', hasQuasimoda)).fontSize(9.5).fillColor(COLORS.textMuted)
      .text(
        'habiendo superado todas las asignaturas del plan de estudios con la calificación requerida.',
        marginL + 40, y, { width: contentW - 80, align: 'center' }
      );

    // --- SIGNATURES ---
    const sigY = PH - 130;

    // Left signature
    doc.moveTo(marginL + 40, sigY).lineTo(marginL + 220, sigY)
      .lineWidth(0.5).stroke(COLORS.verdeGris);
    doc.font(fontName('regular', hasQuasimoda)).fontSize(8).fillColor(COLORS.textMuted)
      .text('Secretario/a General', marginL + 40, sigY + 5, { width: 180, align: 'center' });

    // Right signature
    doc.moveTo(PW - marginR - 220, sigY).lineTo(PW - marginR - 40, sigY)
      .lineWidth(0.5).stroke(COLORS.verdeGris);
    doc.font(fontName('regular', hasQuasimoda)).fontSize(8).fillColor(COLORS.textMuted)
      .text('Director/a del Instituto', PW - marginR - 220, sigY + 5, { width: 180, align: 'center' });

    // --- QR CODE ---
    if (qrBuffer) {
      const qrSize = 55;
      const qrX = PW - marginR - qrSize - 10;
      const qrY = PH - 95;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      if (shortUrl) {
        doc.font(fontName('light', hasQuasimoda)).fontSize(5).fillColor(COLORS.textLight)
          .text(shortUrl, qrX - 10, qrY + qrSize + 2, { width: qrSize + 20, align: 'center' });
      }
    }

    // --- DATE & LOCATION ---
    const footerY = PH - 80;
    const fechaStr = now.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    doc.font(fontName('regular', hasQuasimoda)).fontSize(9).fillColor(COLORS.textMuted)
      .text(`En ${INSTITUCION.ciudad}, a ${fechaStr}`, marginL, footerY, {
        width: contentW - 80, align: 'center',
      });

    // --- WEB ---
    doc.font(fontName('light', hasQuasimoda)).fontSize(7).fillColor(COLORS.textLight)
      .text(INSTITUCION.web, marginL, footerY + 14, {
        width: contentW - 80, align: 'center',
      });

    // --- VERIFICATION HASH ---
    if (verifyHash) {
      doc.font(fontName('light', hasQuasimoda)).fontSize(5).fillColor('#cccccc')
        .text(`Verificación: ${verifyHash}`, marginL, PH - 30, {
          width: contentW, align: 'center',
        });
    }

    // --- MOCK WATERMARK ---
    if (MOCK_MODE) {
      doc.save();
      doc.font(fontName('bold', hasQuasimoda)).fontSize(28).fillColor(COLORS.rojo)
        .opacity(0.15)
        .text('BORRADOR — DATOS DE EJEMPLO', marginL, PH / 2 + 30, {
          width: contentW, align: 'center',
        });
      doc.restore();
    }

    if (sign) addSignaturePlaceholder(doc);

    doc.end();

    doc.on('end', async () => {
      try {
        let buffer = Buffer.concat(chunks);
        if (sign) buffer = await signPdf(buffer);
        writeFileSync(outputPath, buffer);
        resolvePromise(outputPath);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// =====================================================
// GOOGLE SHEETS — Write to Certificados tab
// =====================================================

async function appendCertificadoToSheet(row) {
  if (!SHEET_ID) {
    console.log('  ⚠ PANEL_IITD_SHEET_ID no configurado, no se escribe en Sheet');
    return;
  }

  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "'Certificados'!A:K",
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
  console.log('Generador de Diplomas OCH — Diseño corporativo IITD');
  console.log(`  Modo: ${MOCK_MODE ? 'MOCK (datos de ejemplo)' : 'producción'}`);
  console.log(`  Upload: ${UPLOAD_MODE ? 'SÍ (SiteGround + Sheet)' : 'NO (solo local)'}`);
  console.log(`  Firma digital: ${SIGN_MODE ? 'SÍ' : 'NO (--no-sign o cert no disponible)'}`);
  if (PROGRAMA_OVERRIDE) console.log(`  Programa (override): ${PROGRAMA_OVERRIDE}`);
  console.log();

  // Get student data
  let alumno;
  if (MOCK_MODE && !EMAIL_FILTER) {
    alumno = getMockAlumno();
    console.log('  Usando alumno de ejemplo (--mock sin --email)');
  } else {
    if (!API_KEY) {
      console.error('Set STACKBY_API_KEY env var');
      process.exit(1);
    }
    if (!EMAIL_FILTER) {
      console.error('Usa --email para especificar el alumno, o --mock para datos de ejemplo');
      process.exit(1);
    }
    console.log(`  Buscando alumno: ${EMAIL_FILTER}`);
    alumno = await getAlumno(EMAIL_FILTER);
    if (!alumno) {
      console.error(`No se encontró alumno con email: ${EMAIL_FILTER}`);
      process.exit(1);
    }
  }

  if (PROGRAMA_OVERRIDE) alumno.programa = PROGRAMA_OVERRIDE;
  if (MOCK_MODE && !alumno.programa) alumno.programa = 'DECA Infantil y Primaria';

  console.log(`  Alumno: ${alumno.nombre} ${alumno.apellidos} (${alumno.expediente || 'sin expediente'})`);
  console.log(`  Programa: ${alumno.programa || '(no especificado)'}`);

  // Ensure output dir
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // --- Create QR if uploading ---
  let qrBuffer = null;
  let shortUrl = '';
  let fullDiplomaUrl = '';

  if (UPLOAD_MODE && alumno.expediente) {
    console.log('\n  Creando short link + QR...');
    const { createDiplomaLink } = await import('../compartido/pxl-client.mjs');
    const linkResult = await createDiplomaLink(alumno.expediente);
    qrBuffer = linkResult.qrBuffer;
    shortUrl = linkResult.shortUrl;
    fullDiplomaUrl = linkResult.fullUrl;
    console.log(`    Short URL: ${shortUrl}`);
    console.log(`    Full URL: ${fullDiplomaUrl}`);
  } else if (UPLOAD_MODE && !alumno.expediente) {
    console.log('  ⚠ Sin expediente — no se puede generar URL de diploma ni QR');
  }

  const safeName = `${alumno.apellidos}_${alumno.nombre}`.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '_');
  const now = new Date().toISOString().split('T')[0];

  // Generate diploma
  const outputPath = join(OUTPUT_DIR, `diploma_och_${safeName}.pdf`);
  await generateDiplomaOCH(alumno, outputPath, { qrBuffer, shortUrl });

  // Compute verification hash
  const hash = computeFileHash(outputPath);

  // Regenerate with hash embedded + digital signature
  await generateDiplomaOCH(alumno, outputPath, { qrBuffer, shortUrl, verifyHash: hash, sign: SIGN_MODE });

  console.log(`\n  ✓ Diploma OCH: ${outputPath}`);
  console.log(`    Hash: ${hash}`);

  // --- Upload to SiteGround ---
  if (UPLOAD_MODE && alumno.expediente) {
    console.log('\n  Subiendo a SiteGround...');
    const { uploadFile, diplomaHash } = await import('../compartido/siteground-upload.mjs');
    const fileHash = diplomaHash(alumno.expediente);
    const remoteName = `${fileHash}.pdf`;

    try {
      const uploadResult = uploadFile(outputPath, remoteName);
      console.log(`    ✓ URL: ${uploadResult.url}`);

      // Write to Sheet
      if (SHEET_ID) {
        console.log('\n  Escribiendo en Sheet "Panel IITD" → Certificados...');
        const row = [
          alumno.email,
          alumno.nombre,
          alumno.apellidos,
          alumno.expediente,
          alumno.programa,
          'Diploma OCH',
          now,
          uploadResult.url,
          shortUrl,
          SIGN_MODE ? `Firmado (${hash})` : hash,
          MOCK_MODE ? 'BORRADOR' : 'Generado',
        ];
        await appendCertificadoToSheet(row);
        console.log('    ✓ Registrado en Sheet');
      }
    } catch (err) {
      console.error(`    ✗ Error: ${err.message}`);
    }
  }

  console.log();
  console.log(`Diploma generado: ${resolve(outputPath)}`);
  if (UPLOAD_MODE) {
    console.log(`Diploma URL: ${fullDiplomaUrl || '(sin expediente)'}`);
    console.log(`Short URL: ${shortUrl || '(sin expediente)'}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
