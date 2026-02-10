#!/usr/bin/env node

/**
 * Generador de certificados DECA en PDF (N09)
 *
 * Genera dos tipos de certificado:
 *   - Modelo 1: Certificado académico con tabla de calificaciones
 *   - Modelo 2: Diploma de finalización del programa
 *
 * Los datos de calificaciones se leen de la tabla CALIFICACIONES de Stackby.
 * Si la tabla no existe aún, se puede usar --mock para generar con datos de ejemplo.
 *
 * Usage:
 *   STACKBY_API_KEY=xxx node certificado-pdf.mjs --email juan@email.com                    # Ambos modelos
 *   STACKBY_API_KEY=xxx node certificado-pdf.mjs --email juan@email.com --modelo 1         # Solo certificado académico
 *   STACKBY_API_KEY=xxx node certificado-pdf.mjs --email juan@email.com --modelo 2         # Solo diploma
 *   STACKBY_API_KEY=xxx node certificado-pdf.mjs --email juan@email.com --mock             # Con datos de ejemplo
 *   STACKBY_API_KEY=xxx node certificado-pdf.mjs --email juan@email.com -o out/            # Guardar en directorio
 */

import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import PDFDocument from 'pdfkit';

// =====================================================
// CONFIG
// =====================================================

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const ALUMNOS_TABLE = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const CALIFICACIONES_TABLE = process.env.STACKBY_CALIFICACIONES_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

const EMAIL_FILTER = (() => {
  const idx = process.argv.indexOf('--email');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();

const MODELO_FILTER = (() => {
  const idx = process.argv.indexOf('--modelo');
  return idx !== -1 ? parseInt(process.argv[idx + 1]) : 0; // 0 = both
})();

const OUTPUT_DIR = (() => {
  const idx = process.argv.indexOf('-o');
  return idx !== -1 ? process.argv[idx + 1] : './certificados';
})();

const MOCK_MODE = process.argv.includes('--mock');

const LOGO_PATH = (() => {
  const idx = process.argv.indexOf('--logo');
  if (idx !== -1) return process.argv[idx + 1];
  const defaultPath = resolve(new URL('.', import.meta.url).pathname, '../../assets/logos/logo-ppal-iit-rgb.png');
  return existsSync(defaultPath) ? defaultPath : null;
})();

const INSTITUCION = {
  nombre: 'INSTITUTO INTERNACIONAL DE TEOLOGÍA A DISTANCIA',
  nombreCorto: 'IITD',
  direccion: '[DIRECCIÓN PENDIENTE]',
  ciudad: '[CIUDAD]',
  web: 'www.iitdistancia.org',
};

// Programas DECA y sus asignaturas
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
  const planKey = Object.keys(PLAN_ESTUDIOS).find(k =>
    programa.toLowerCase().includes(k.toLowerCase().split(' ')[0])
  ) || Object.keys(PLAN_ESTUDIOS)[0];

  const asignaturas = PLAN_ESTUDIOS[planKey] || PLAN_ESTUDIOS[Object.keys(PLAN_ESTUDIOS)[0]];
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
// PDF: MODELO 1 — Certificado Académico
// =====================================================

function generateCertificadoAcademico(alumno, calificaciones, outputPath) {
  return new Promise((resolvePromise, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
    });

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

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
    const sigY = doc.page.height - 160;

    doc.moveTo(100, sigY).lineTo(250, sigY).stroke('#999999');
    doc.moveTo(doc.page.width - 250, sigY).lineTo(doc.page.width - 100, sigY).stroke('#999999');

    doc.fontSize(8).font('Helvetica').fillColor('#666666');
    doc.text('El/La Secretario/a General', 100, sigY + 5, { width: 150, align: 'center' });
    doc.text('El/La Director/a', doc.page.width - 250, sigY + 5, { width: 150, align: 'center' });

    // --- FOOTER ---
    const footerY = doc.page.height - 90;
    doc.fontSize(8).font('Helvetica').fillColor('#999999')
      .text(
        `${INSTITUCION.ciudad}, a ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        50, footerY, { width: pageWidth, align: 'center' }
      );
    doc.fontSize(7)
      .text(INSTITUCION.web, 50, footerY + 12, { width: pageWidth, align: 'center' });

    if (MOCK_MODE) {
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#e74c3c')
        .opacity(0.3)
        .text('BORRADOR — DATOS DE EJEMPLO', 50, doc.page.height / 2 - 10, {
          width: pageWidth, align: 'center',
        });
      doc.opacity(1);
    }

    doc.end();

    stream.on('finish', () => resolvePromise(outputPath));
    stream.on('error', reject);
  });
}

// =====================================================
// PDF: MODELO 2 — Diploma de Finalización
// =====================================================

function generateDiploma(alumno, outputPath) {
  return new Promise((resolvePromise, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

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
    const programa = alumno.programa || 'DECLARACIÓN ECLESIÁSTICA COMPETENCIA ACADEMICA (DECA)';
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
    const sigY = doc.page.height - 130;

    doc.moveTo(120, sigY).lineTo(300, sigY).stroke('#999999');
    doc.moveTo(doc.page.width - 300, sigY).lineTo(doc.page.width - 120, sigY).stroke('#999999');

    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    doc.text('Secretario/a General', 120, sigY + 5, { width: 180, align: 'center' });
    doc.text('Director/a del Instituto', doc.page.width - 300, sigY + 5, { width: 180, align: 'center' });

    // --- DATE & LOCATION ---
    const footerY = doc.page.height - 80;
    doc.fontSize(10).font('Helvetica').fillColor('#666666')
      .text(
        `En ${INSTITUCION.ciudad}, a ${now.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        60, footerY, { width: pageWidth, align: 'center' }
      );

    doc.fontSize(7).fillColor('#999999')
      .text(INSTITUCION.web, 60, footerY + 15, { width: pageWidth, align: 'center' });

    if (MOCK_MODE) {
      doc.save();
      doc.fontSize(30).font('Helvetica-Bold').fillColor('#e74c3c')
        .opacity(0.2)
        .text('BORRADOR — DATOS DE EJEMPLO', 60, doc.page.height / 2 + 20, {
          width: pageWidth, align: 'center',
        });
      doc.restore();
    }

    doc.end();

    stream.on('finish', () => resolvePromise(outputPath));
    stream.on('error', reject);
  });
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.log('Generador de certificados DECA (N09)');
  console.log(`  Modo: ${MOCK_MODE ? 'MOCK (datos de ejemplo)' : 'producción'}`);
  console.log();

  // Get student data
  console.log(`  Buscando alumno: ${EMAIL_FILTER}`);
  const alumno = await getAlumno(EMAIL_FILTER);
  if (!alumno) {
    console.error(`No se encontró alumno con email: ${EMAIL_FILTER}`);
    process.exit(1);
  }
  console.log(`  Encontrado: ${alumno.nombre} ${alumno.apellidos} (${alumno.expediente || 'sin expediente'})`);

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
      console.log('    O configura STACKBY_CALIFICACIONES_TABLE_ID cuando exista la tabla.');
      if (MODELO_FILTER === 0 || MODELO_FILTER === 1) {
        console.log('  → Modelo 1 (certificado académico) requiere calificaciones.');
        if (MODELO_FILTER === 1) process.exit(1);
      }
      // Can still generate modelo 2 (diploma) without grades
      calificaciones = [];
    }
  }

  // Ensure output dir
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const safeName = `${alumno.apellidos}_${alumno.nombre}`.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '_');
  let generated = 0;

  // Modelo 1: Certificado académico
  if ((MODELO_FILTER === 0 || MODELO_FILTER === 1) && calificaciones.length > 0) {
    const path1 = join(OUTPUT_DIR, `certificado_academico_${safeName}.pdf`);
    await generateCertificadoAcademico(alumno, calificaciones, path1);
    console.log(`  ✓ Modelo 1 (certificado académico): ${path1}`);
    generated++;
  }

  // Modelo 2: Diploma
  if (MODELO_FILTER === 0 || MODELO_FILTER === 2) {
    const path2 = join(OUTPUT_DIR, `diploma_${safeName}.pdf`);
    await generateDiploma(alumno, path2);
    console.log(`  ✓ Modelo 2 (diploma): ${path2}`);
    generated++;
  }

  console.log();
  console.log(`Certificados generados: ${generated}`);
  console.log(`Directorio: ${resolve(OUTPUT_DIR)}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
