#!/usr/bin/env node

/**
 * Generador de certificados IITD en PDF (N09 + N26) — con QR + upload + Sheet
 *
 * Genera dos tipos de certificado para cualquier programa IITD:
 *   - Modelo 1: Certificado académico con tabla de calificaciones
 *   - Modelo 2: Diploma de finalización del programa
 *
 * Programas soportados (PLAN_ESTUDIOS):
 *   - DECA Infantil y Primaria
 *   - DECA ESO y Bachillerato
 *   - Experto Universitario en Teología
 *   - Bachiller en Teología
 *   - Licenciatura en Teología
 *   - (Cualquier otro programa → diploma genérico sin tabla de notas)
 *
 * Flujo completo (con --upload):
 *   1. Leer datos alumno de Stackby ALUMNOS
 *   2. Crear short link en pxl.to → URL corta para QR
 *   3. Generar PDF con QR embebido + hash de verificación
 *   4. Subir PDF a diplomas.institutoteologia.org via SSH
 *   5. Escribir resultado en Sheet "Panel IITD" → Certificados
 *
 * Usage:
 *   node certificado-pdf.mjs --email juan@email.com                      # Solo genera PDF local
 *   node certificado-pdf.mjs --email juan@email.com --mock               # Con datos de ejemplo
 *   node certificado-pdf.mjs --email juan@email.com --modelo 1           # Solo certificado académico
 *   node certificado-pdf.mjs --email juan@email.com --modelo 2           # Solo diploma
 *   node certificado-pdf.mjs --email juan@email.com --programa "Experto Universitario en Teología"
 *   node certificado-pdf.mjs --email juan@email.com --upload             # Genera + sube + escribe Sheet
 *   node certificado-pdf.mjs --email juan@email.com --upload --mock      # Full flow con datos mock
 *   node certificado-pdf.mjs --email juan@email.com --no-sign           # Sin firma digital
 *   node certificado-pdf.mjs --email juan@email.com -o out/              # Guardar en directorio
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_ALUMNOS_TABLE_ID
 *   STACKBY_CALIFICACIONES_TABLE_ID (opcional)
 *   PXL_API_TOKEN (para QR/short links)
 *   PANEL_IITD_SHEET_ID (para escribir en Sheet)
 */

import { createWriteStream, writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import PDFDocument from 'pdfkit';
import { addSignaturePlaceholder, signPdf, isSigningAvailable } from './pdf-signer.mjs';

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
const ALUMNOS_TABLE = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const CALIFICACIONES_TABLE = process.env.STACKBY_CALIFICACIONES_TABLE_ID || '';
const SHEET_ID = process.env.PANEL_IITD_SHEET_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

const EMAIL_FILTER = (() => {
  const idx = process.argv.indexOf('--email');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const MODELO_FILTER = (() => {
  const idx = process.argv.indexOf('--modelo');
  return idx !== -1 ? parseInt(process.argv[idx + 1]) : 0; // 0 = both
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

const LOGO_PATH = (() => {
  const idx = process.argv.indexOf('--logo');
  if (idx !== -1) return process.argv[idx + 1];
  const defaultPath = resolve(__dirname, '../../assets/logos/logo-ppal-iit-rgb.png');
  return existsSync(defaultPath) ? defaultPath : null;
})();

const INSTITUCION = {
  nombre: 'INSTITUTO INTERNACIONAL DE TEOLOGÍA A DISTANCIA',
  nombreCorto: 'IITD',
  direccion: process.env.IITD_DIRECCION || '[DIRECCIÓN — configurar IITD_DIRECCION en .env]',
  ciudad: process.env.IITD_CIUDAD || '[CIUDAD — configurar IITD_CIUDAD en .env]',
  web: 'institutoteologia.org',
};

const DIPLOMAS_BASE_URL = 'https://diplomas.institutoteologia.org';

// Programas IITD y sus asignaturas
// Modelo 1 (certificado académico con notas) solo disponible para programas listados aquí.
// Modelo 2 (diploma) funciona para CUALQUIER programa, incluso sin plan de estudios definido.
const PLAN_ESTUDIOS = {
  'DECA Infantil y Primaria': [
    'Teología Fundamental',
    'Cristología y Pneumatología',
    'Eclesiología y Mariología',
    'Moral Fundamental y Bioética',
    'Moral Social y Doctrina Social de la Iglesia',
    'Sagrada Escritura: Antiguo Testamento',
    'Sagrada Escritura: Nuevo Testamento',
    'Pedagogía y Didáctica de la Religión (Infantil y Primaria)',
    'Liturgia y Sacramentos',
  ],
  'DECA ESO y Bachillerato': [
    'Teología Fundamental',
    'Cristología y Pneumatología',
    'Eclesiología y Mariología',
    'Moral Fundamental y Bioética',
    'Moral Social y Doctrina Social de la Iglesia',
    'Sagrada Escritura: Antiguo Testamento',
    'Sagrada Escritura: Nuevo Testamento',
    'Pedagogía y Didáctica de la Religión (ESO y Bachillerato)',
    'Liturgia y Sacramentos',
  ],
  'Experto Universitario en Teología': [
    'Teología Fundamental',
    'Cristología',
    'Eclesiología',
    'Moral Fundamental',
    'Sagrada Escritura: Antiguo Testamento',
    'Sagrada Escritura: Nuevo Testamento',
    'Historia de la Iglesia',
    'Liturgia',
    'Teología Espiritual',
    'Patrología',
  ],
  'Bachiller en Teología': [
    'Teología Fundamental',
    'Cristología y Soteriología',
    'Eclesiología y Mariología',
    'Moral Fundamental y Bioética',
    'Moral Social y Doctrina Social de la Iglesia',
    'Sagrada Escritura: Antiguo Testamento',
    'Sagrada Escritura: Nuevo Testamento',
    'Historia de la Iglesia I',
    'Historia de la Iglesia II',
    'Liturgia y Sacramentos',
    'Teología Espiritual',
    'Patrología',
    'Filosofía I: Introducción y Metafísica',
    'Filosofía II: Ética y Antropología',
    'Derecho Canónico',
  ],
  'Licenciatura en Teología': [
    'Teología Dogmática Avanzada',
    'Exégesis Bíblica Avanzada',
    'Teología Moral Especial',
    'Metodología Teológica',
    'Seminario de Investigación I',
    'Seminario de Investigación II',
    'Teología Contemporánea',
    'Ecumenismo y Diálogo Interreligioso',
    'Trabajo Fin de Licenciatura',
  ],
  // Para añadir más programas, simplemente agregar entrada aquí.
  // Los programas SIN entrada aquí solo pueden generar Modelo 2 (diploma genérico).
};

if (!API_KEY) {
  console.error('Set STACKBY_API_KEY env var');
  process.exit(1);
}

if (!EMAIL_FILTER) {
  console.error('Usa --email para especificar el alumno');
  process.exit(1);
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

async function getCalificaciones(email) {
  if (!CALIFICACIONES_TABLE) {
    console.log('  ⚠ STACKBY_CALIFICACIONES_TABLE_ID no configurado');
    return null;
  }

  try {
    const rows = await fetchAllRows(CALIFICACIONES_TABLE);
    const target = email.toLowerCase().trim();
    return rows
      .filter(r => (r.field?.['Email alumno'] || '').toLowerCase().trim() === target)
      .map(r => ({
        asignatura: r.field?.Asignatura || '',
        programa: r.field?.Programa || '',
        curso: r.field?.['Curso académico'] || '',
        notaEvaluacion: r.field?.['Nota evaluación'] || '',
        notaExamen: r.field?.['Nota examen'] || '',
        calificacion: r.field?.['Calificación final'] || '',
        fecha: r.field?.['Fecha evaluación'] || '',
        profesor: r.field?.Profesor || '',
        convalidada: r.field?.Convalidada || false,
      }));
  } catch (err) {
    console.log(`  ⚠ Error leyendo calificaciones: ${err.message}`);
    return null;
  }
}

function getMockCalificaciones(programa) {
  // Try exact match first, then partial match
  const planKey = PLAN_ESTUDIOS[programa]
    ? programa
    : Object.keys(PLAN_ESTUDIOS).find(k =>
        programa.toLowerCase().includes(k.toLowerCase().split(' ')[0])
      ) || Object.keys(PLAN_ESTUDIOS)[0];

  const asignaturas = PLAN_ESTUDIOS[planKey];
  if (!asignaturas) {
    console.log(`  ⚠ Programa "${programa}" no tiene plan de estudios definido. Solo Modelo 2 disponible.`);
    return [];
  }

  const califs = ['SOBRESALIENTE', 'NOTABLE', 'NOTABLE', 'APROBADO', 'NOTABLE', 'SOBRESALIENTE', 'NOTABLE', 'APROBADO', 'NOTABLE'];
  const notas = [9.2, 7.8, 8.1, 6.5, 7.3, 9.0, 8.4, 5.8, 7.6];

  return asignaturas.map((asig, i) => ({
    asignatura: asig,
    programa: planKey,
    curso: '2025/26',
    notaEvaluacion: notas[i % notas.length],
    notaExamen: notas[(i + 1) % notas.length],
    calificacion: califs[i % califs.length],
    fecha: '2026-01-15',
    profesor: 'Dr. García López',
    convalidada: false,
  }));
}

// =====================================================
// VERIFICATION HASH
// =====================================================

function computeFileHash(filePath) {
  const buffer = readFileSync(filePath);
  return createHash('sha256').update(buffer).digest('hex').substring(0, 16);
}

// =====================================================
// PDF: MODELO 1 — Certificado Académico (con QR)
// =====================================================

function generateCertificadoAcademico(alumno, calificaciones, outputPath, opts = {}) {
  const { qrBuffer, shortUrl, verifyHash, sign = false } = opts;

  return new Promise((resolvePromise, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    // Collect buffer for signing instead of streaming directly to file
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    const pageWidth = doc.page.width - 100; // 50+50 margins
    const centerX = doc.page.width / 2;
    const now = new Date();

    // --- BORDER ---
    doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60)
      .lineWidth(2).stroke('#1a5276');
    doc.rect(35, 35, doc.page.width - 70, doc.page.height - 70)
      .lineWidth(0.5).stroke('#aed6f1');

    // --- LOGO ---
    let y = 55;
    if (LOGO_PATH) {
      try {
        doc.image(LOGO_PATH, centerX - 30, y, { width: 60 });
        y += 65;
      } catch { y += 10; }
    }

    // --- HEADER ---
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a5276')
      .text(INSTITUCION.nombre, 50, y, { width: pageWidth, align: 'center' });
    y += 25;

    doc.fontSize(18).font('Helvetica-Bold').fillColor('#1a5276')
      .text('CERTIFICADO ACADÉMICO', 50, y, { width: pageWidth, align: 'center' });
    y += 35;

    // --- STUDENT DATA ---
    doc.fontSize(10).font('Helvetica').fillColor('#333333');

    const fullName = `${alumno.nombre} ${alumno.apellidos}`;
    doc.text('Se certifica que', 50, y, { width: pageWidth, align: 'center' });
    y += 18;

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5276')
      .text(fullName.toUpperCase(), 50, y, { width: pageWidth, align: 'center' });
    y += 22;

    if (alumno.expediente) {
      doc.fontSize(9).font('Helvetica').fillColor('#666666')
        .text(`Nº Expediente: ${alumno.expediente}`, 50, y, { width: pageWidth, align: 'center' });
      y += 15;
    }

    doc.fontSize(10).font('Helvetica').fillColor('#333333')
      .text('ha cursado las siguientes asignaturas con las calificaciones que se indican:', 50, y, { width: pageWidth, align: 'center' });
    y += 25;

    // --- GRADES TABLE ---
    const tableX = 55;
    const colWidths = [250, 70, 70, 100]; // Asignatura, Nota, Examen, Calificación
    const tableWidth = colWidths.reduce((a, b) => a + b, 0);

    // Table header
    doc.rect(tableX, y, tableWidth, 22).fill('#1a5276');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');

    let colX = tableX + 8;
    doc.text('Asignatura', colX, y + 6, { width: colWidths[0] - 16 });
    colX += colWidths[0];
    doc.text('Eval.', colX, y + 6, { width: colWidths[1], align: 'center' });
    colX += colWidths[1];
    doc.text('Examen', colX, y + 6, { width: colWidths[2], align: 'center' });
    colX += colWidths[2];
    doc.text('Calificación', colX, y + 6, { width: colWidths[3], align: 'center' });

    y += 22;

    // Table rows
    for (let i = 0; i < calificaciones.length; i++) {
      const cal = calificaciones[i];
      const rowH = 18;
      const bgColor = i % 2 === 0 ? '#f8f9fa' : '#ffffff';

      doc.rect(tableX, y, tableWidth, rowH).fill(bgColor);
      doc.fillColor('#333333').fontSize(8).font('Helvetica');

      colX = tableX + 8;
      doc.text(cal.asignatura, colX, y + 4, { width: colWidths[0] - 16 });
      colX += colWidths[0];
      doc.text(cal.notaEvaluacion ? String(cal.notaEvaluacion) : '—', colX, y + 4, { width: colWidths[1], align: 'center' });
      colX += colWidths[1];
      doc.text(cal.notaExamen ? String(cal.notaExamen) : '—', colX, y + 4, { width: colWidths[2], align: 'center' });
      colX += colWidths[2];

      // Color-code qualification
      const califColor = cal.calificacion === 'SOBRESALIENTE' ? '#27ae60' :
        cal.calificacion === 'NOTABLE' ? '#2980b9' :
        cal.calificacion === 'APROBADO' ? '#7f8c8d' :
        cal.calificacion === 'SUSPENSO' ? '#e74c3c' : '#333333';
      doc.fillColor(califColor).font('Helvetica-Bold')
        .text(cal.calificacion || '—', colX, y + 4, { width: colWidths[3], align: 'center' });

      y += rowH;
    }

    // Table border
    doc.rect(tableX, y - (calificaciones.length * 18) - 22, tableWidth, (calificaciones.length * 18) + 22)
      .lineWidth(0.5).stroke('#cccccc');

    y += 25;

    // --- PROGRAM INFO ---
    const programaText = calificaciones[0]?.programa || alumno.programa;
    doc.fontSize(10).font('Helvetica').fillColor('#333333')
      .text(`Programa: ${programaText}`, 50, y, { width: pageWidth, align: 'center' });
    y += 15;
    doc.text(`Curso académico: ${calificaciones[0]?.curso || '2025/26'}`, 50, y, { width: pageWidth, align: 'center' });

    // --- SIGNATURES ---
    const sigY = doc.page.height - 170;

    doc.moveTo(100, sigY).lineTo(250, sigY).stroke('#999999');
    doc.moveTo(doc.page.width - 250, sigY).lineTo(doc.page.width - 100, sigY).stroke('#999999');

    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text('El/La Secretario/a General', 100, sigY + 5, { width: 150, align: 'center' });
    doc.text('El/La Director/a', doc.page.width - 250, sigY + 5, { width: 150, align: 'center' });

    // --- QR CODE (bottom-right) ---
    if (qrBuffer) {
      const qrSize = 60;
      const qrX = doc.page.width - 50 - qrSize;
      const qrY = doc.page.height - 110;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      if (shortUrl) {
        doc.fontSize(5).font('Helvetica').fillColor('#999999')
          .text(shortUrl, qrX - 10, qrY + qrSize + 2, { width: qrSize + 20, align: 'center' });
      }
    }

    // --- FOOTER ---
    const footerY = doc.page.height - 100;
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text(
        `${INSTITUCION.ciudad}, a ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        50, footerY, { width: pageWidth - 80, align: 'center' }
      );
    doc.fontSize(7)
      .text(INSTITUCION.web, 50, footerY + 12, { width: pageWidth - 80, align: 'center' });

    // Verification hash footer
    if (verifyHash) {
      doc.fontSize(5).fillColor('#cccccc')
        .text(`Verificación: ${verifyHash}`, 50, doc.page.height - 45, { width: pageWidth, align: 'center' });
    }

    if (MOCK_MODE) {
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#e74c3c')
        .opacity(0.3)
        .text('BORRADOR — DATOS DE EJEMPLO', 50, doc.page.height / 2 - 10, {
          width: pageWidth, align: 'center',
        });
      doc.opacity(1);
    }

    // Add signature placeholder before doc.end()
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
// PDF: MODELO 2 — Diploma de Finalización (con QR)
// =====================================================

function generateDiploma(alumno, outputPath, opts = {}) {
  const { qrBuffer, shortUrl, verifyHash, sign = false } = opts;

  return new Promise((resolvePromise, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    const pageWidth = doc.page.width - 120;
    const centerX = doc.page.width / 2;
    const now = new Date();

    // --- DECORATIVE BORDER ---
    doc.rect(25, 25, doc.page.width - 50, doc.page.height - 50)
      .lineWidth(3).stroke('#1a5276');
    doc.rect(32, 32, doc.page.width - 64, doc.page.height - 64)
      .lineWidth(1).stroke('#aed6f1');
    doc.rect(38, 38, doc.page.width - 76, doc.page.height - 76)
      .lineWidth(0.5).stroke('#d4e6f1');

    // --- LOGO ---
    let y = 55;
    if (LOGO_PATH) {
      try {
        doc.image(LOGO_PATH, centerX - 35, y, { width: 70 });
        y += 80;
      } catch { y += 15; }
    }

    // --- INSTITUTION NAME ---
    doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a5276')
      .text(INSTITUCION.nombre, 60, y, { width: pageWidth, align: 'center' });
    y += 30;

    // --- TITLE ---
    doc.fontSize(28).font('Helvetica-Bold').fillColor('#1a5276')
      .text('DIPLOMA', 60, y, { width: pageWidth, align: 'center' });
    y += 45;

    // --- CERTIFIES ---
    doc.fontSize(12).font('Helvetica').fillColor('#333333')
      .text('Certifica que', 60, y, { width: pageWidth, align: 'center' });
    y += 25;

    // --- STUDENT NAME ---
    const fullName = `${alumno.nombre} ${alumno.apellidos}`;
    doc.fontSize(22).font('Helvetica-Bold').fillColor('#1a5276')
      .text(fullName.toUpperCase(), 60, y, { width: pageWidth, align: 'center' });
    y += 35;

    if (alumno.expediente) {
      doc.fontSize(9).font('Helvetica').fillColor('#999999')
        .text(`Expediente: ${alumno.expediente}`, 60, y, { width: pageWidth, align: 'center' });
      y += 18;
    }

    // --- COMPLETION TEXT ---
    const programa = alumno.programa || 'Programa de Estudios';
    doc.fontSize(12).font('Helvetica').fillColor('#333333')
      .text('ha completado satisfactoriamente el programa de estudios', 60, y, { width: pageWidth, align: 'center' });
    y += 25;

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a5276')
      .text(programa, 60, y, { width: pageWidth, align: 'center' });
    y += 30;

    doc.fontSize(11).font('Helvetica').fillColor('#333333')
      .text(
        'habiendo superado todas las asignaturas del plan de estudios con la calificación requerida.',
        60, y, { width: pageWidth, align: 'center' }
      );

    // --- SIGNATURES ---
    const sigY = doc.page.height - 140;

    doc.moveTo(120, sigY).lineTo(300, sigY).stroke('#999999');
    doc.moveTo(doc.page.width - 300, sigY).lineTo(doc.page.width - 120, sigY).stroke('#999999');

    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    doc.text('Secretario/a General', 120, sigY + 5, { width: 180, align: 'center' });
    doc.text('Director/a del Instituto', doc.page.width - 300, sigY + 5, { width: 180, align: 'center' });

    // --- QR CODE (bottom-right) ---
    if (qrBuffer) {
      const qrSize = 65;
      const qrX = doc.page.width - 55 - qrSize;
      const qrY = doc.page.height - 120;
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });
      if (shortUrl) {
        doc.fontSize(5).font('Helvetica').fillColor('#999999')
          .text(shortUrl, qrX - 10, qrY + qrSize + 2, { width: qrSize + 20, align: 'center' });
      }
    }

    // --- DATE & LOCATION ---
    const footerY = doc.page.height - 85;
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
      .text(
        `En ${INSTITUCION.ciudad}, a ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        60, footerY, { width: pageWidth - 80, align: 'center' }
      );

    doc.fontSize(7).fillColor('#999999')
      .text(INSTITUCION.web, 60, footerY + 15, { width: pageWidth - 80, align: 'center' });

    // Verification hash footer
    if (verifyHash) {
      doc.fontSize(5).fillColor('#cccccc')
        .text(`Verificación: ${verifyHash}`, 60, doc.page.height - 40, { width: pageWidth, align: 'center' });
    }

    if (MOCK_MODE) {
      doc.save();
      doc.fontSize(30).font('Helvetica-Bold').fillColor('#e74c3c')
        .opacity(0.2)
        .text('BORRADOR — DATOS DE EJEMPLO', 60, doc.page.height / 2 + 20, {
          width: pageWidth, align: 'center',
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

  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

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
  console.log('Generador de certificados IITD (N09 + N26)');
  console.log(`  Modo: ${MOCK_MODE ? 'MOCK (datos de ejemplo)' : 'producción'}`);
  console.log(`  Upload: ${UPLOAD_MODE ? 'SÍ (SiteGround + Sheet)' : 'NO (solo local)'}`);
  console.log(`  Firma digital: ${SIGN_MODE ? 'SÍ' : 'NO (--no-sign o cert no disponible)'}`);
  if (PROGRAMA_OVERRIDE) console.log(`  Programa (override): ${PROGRAMA_OVERRIDE}`);
  console.log();

  // Get student data
  console.log(`  Buscando alumno: ${EMAIL_FILTER}`);
  const alumno = await getAlumno(EMAIL_FILTER);
  if (!alumno) {
    console.error(`No se encontró alumno con email: ${EMAIL_FILTER}`);
    process.exit(1);
  }

  // Apply --programa override
  if (PROGRAMA_OVERRIDE) alumno.programa = PROGRAMA_OVERRIDE;

  console.log(`  Encontrado: ${alumno.nombre} ${alumno.apellidos} (${alumno.expediente || 'sin expediente'})`);
  console.log(`  Programa: ${alumno.programa || '(no especificado)'}`);

  // Get grades
  let calificaciones = null;
  if (!MOCK_MODE) {
    calificaciones = await getCalificaciones(EMAIL_FILTER);
  }

  if (!calificaciones || calificaciones.length === 0) {
    if (MOCK_MODE) {
      console.log('  Usando calificaciones de ejemplo (--mock)');
      calificaciones = getMockCalificaciones(alumno.programa);
    } else {
      console.log('  ⚠ No hay calificaciones para este alumno.');
      console.log('    Usa --mock para generar con datos de ejemplo.');
      if (MODELO_FILTER === 0 || MODELO_FILTER === 1) {
        console.log('  → Modelo 1 (certificado académico) requiere calificaciones.');
        if (MODELO_FILTER === 1) process.exit(1);
      }
      calificaciones = [];
    }
  }

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
    const { createDiplomaLink } = await import('./pxl-client.mjs');
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
  let generated = 0;
  const results = [];

  // Modelo 1: Certificado académico
  if ((MODELO_FILTER === 0 || MODELO_FILTER === 1) && calificaciones.length > 0) {
    const path1 = join(OUTPUT_DIR, `certificado_academico_${safeName}.pdf`);
    await generateCertificadoAcademico(alumno, calificaciones, path1, { qrBuffer, shortUrl });

    // Compute verification hash after generation
    const hash = computeFileHash(path1);

    // Regenerate with hash embedded + digital signature
    await generateCertificadoAcademico(alumno, calificaciones, path1, { qrBuffer, shortUrl, verifyHash: hash, sign: SIGN_MODE });

    console.log(`\n  ✓ Modelo 1 (certificado académico): ${path1}`);
    console.log(`    Hash: ${hash}`);
    results.push({ modelo: 'Certificado académico', path: path1, hash });
    generated++;
  }

  // Modelo 2: Diploma
  if (MODELO_FILTER === 0 || MODELO_FILTER === 2) {
    const path2 = join(OUTPUT_DIR, `diploma_${safeName}.pdf`);
    await generateDiploma(alumno, path2, { qrBuffer, shortUrl });

    // Compute verification hash
    const hash = computeFileHash(path2);

    // Regenerate with hash + digital signature
    await generateDiploma(alumno, path2, { qrBuffer, shortUrl, verifyHash: hash, sign: SIGN_MODE });

    console.log(`\n  ✓ Modelo 2 (diploma): ${path2}`);
    console.log(`    Hash: ${hash}`);
    results.push({ modelo: 'Diploma', path: path2, hash });
    generated++;
  }

  // --- Upload to SiteGround ---
  if (UPLOAD_MODE && alumno.expediente) {
    console.log('\n  Subiendo a SiteGround...');
    const { uploadFile } = await import('./siteground-upload.mjs');

    for (const r of results) {
      // Use expediente as remote filename for the diploma (modelo 2)
      // For certificado académico, add suffix
      const remoteName = r.modelo === 'Diploma'
        ? `${alumno.expediente}.pdf`
        : `${alumno.expediente}-academico.pdf`;

      try {
        const uploadResult = uploadFile(r.path, remoteName);
        r.url = uploadResult.url;
        console.log(`    ✓ ${r.modelo}: ${uploadResult.url}`);
      } catch (err) {
        console.error(`    ✗ ${r.modelo}: ${err.message}`);
        r.url = '';
      }
    }
  }

  // --- Write to Google Sheet ---
  if (UPLOAD_MODE && SHEET_ID) {
    console.log('\n  Escribiendo en Sheet "Panel IITD" → Certificados...');

    for (const r of results) {
      // Headers: Email, Nombre, Apellidos, Expediente, Programa, Modelo, Fecha, URL diploma, URL corta (QR), Firma digital, Estado
      const row = [
        alumno.email,
        alumno.nombre,
        alumno.apellidos,
        alumno.expediente,
        alumno.programa,
        r.modelo,
        now,
        r.url || '',
        shortUrl,
        SIGN_MODE ? `Firmado (${r.hash})` : r.hash,
        MOCK_MODE ? 'BORRADOR' : 'Generado',
      ];

      try {
        await appendCertificadoToSheet(row);
        console.log(`    ✓ ${r.modelo} registrado en Sheet`);
      } catch (err) {
        console.error(`    ✗ Error escribiendo en Sheet: ${err.message}`);
      }
    }
  }

  console.log();
  console.log(`Certificados generados: ${generated}`);
  console.log(`Directorio: ${resolve(OUTPUT_DIR)}`);
  if (UPLOAD_MODE) {
    console.log(`Diploma URL: ${fullDiplomaUrl || '(sin expediente)'}`);
    console.log(`Short URL: ${shortUrl || '(sin expediente)'}`);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
