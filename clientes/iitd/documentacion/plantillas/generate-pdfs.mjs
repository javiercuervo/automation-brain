#!/usr/bin/env node

/**
 * Genera PDFs de los 3 templates de BreezeDoc usando PDFKit.
 * Usage: node generate-pdfs.mjs
 */

import { createWriteStream, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(resolve(__dirname, '../../integraciones/alumnos/package.json'));
const PDFDocument = require('pdfkit');
const LOGO_PATH = resolve(__dirname, '../../assets/logos/logo-ppal-iit-rgb.png');
const hasLogo = existsSync(LOGO_PATH);

const INST = {
  nombre: 'INSTITUTO INTERNACIONAL DE TEOLOGÍA A DISTANCIA',
  cif: 'R2800617I',
  direccion: 'Calle Iriarte, 3 - 28028 Madrid',
  tel: '91 401 50 62',
  email: 'informacion@institutoteologia.org',
  web: 'institutoteologia.org',
};

function header(doc, title) {
  const w = doc.page.width - 120;
  let y = 50;
  if (hasLogo) {
    try { doc.image(LOGO_PATH, 60, y, { width: 60 }); } catch {}
  }
  doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a5276')
    .text(INST.nombre, 130, 55, { width: w - 70 });
  doc.fontSize(7).font('Helvetica').fillColor('#444')
    .text(`CIF: ${INST.cif} | ${INST.direccion}`, 130, 68)
    .text(`Tel: ${INST.tel} | ${INST.email} | ${INST.web}`, 130, 78);

  doc.moveTo(60, 95).lineTo(doc.page.width - 60, 95).lineWidth(1).stroke('#1a5276');

  doc.fontSize(16).font('Helvetica-Bold').fillColor('#1a5276')
    .text(title, 60, 110, { width: w, align: 'center' });
  return 140;
}

function field(doc, label, y, x = 60, w = 220) {
  doc.fontSize(8).font('Helvetica-Bold').fillColor('#333').text(label + ':', x, y);
  doc.moveTo(x + 80, y + 10).lineTo(x + w, y + 10).lineWidth(0.5).stroke('#aaa');
  return y + 18;
}

function paragraph(doc, text, y, opts = {}) {
  const x = opts.x || 60;
  const w = opts.width || (doc.page.width - 120);
  doc.fontSize(opts.fontSize || 9).font(opts.font || 'Helvetica').fillColor(opts.color || '#333')
    .text(text, x, y, { width: w, lineGap: 2 });
  return doc.y + 6;
}

function sectionTitle(doc, text, y) {
  doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a5276').text(text, 60, y);
  return doc.y + 4;
}

function signatureBlock(doc, leftLabel, rightLabel) {
  const y = doc.page.height - 140;
  doc.fontSize(8).font('Helvetica').fillColor('#333')
    .text(`En Madrid, a ________ de __________________ de 20_____`, 60, y - 20, { width: doc.page.width - 120, align: 'center' });

  doc.moveTo(80, y + 30).lineTo(250, y + 30).stroke('#999');
  doc.moveTo(doc.page.width - 250, y + 30).lineTo(doc.page.width - 80, y + 30).stroke('#999');

  doc.fontSize(7).font('Helvetica').fillColor('#666');
  doc.text(leftLabel, 80, y + 35, { width: 170, align: 'center' });
  doc.text(rightLabel, doc.page.width - 250, y + 35, { width: 170, align: 'center' });

  doc.fontSize(5).fillColor('#aaa')
    .text('La firma electrónica tiene la misma validez que la firma manuscrita conforme al Reglamento (UE) 910/2014 (eIDAS).', 60, doc.page.height - 50, { width: doc.page.width - 120, align: 'center' });
}

// =========================================================
// 1. CONTRATO MATRÍCULA DECA
// =========================================================

function generateMatricula() {
  return new Promise((res, rej) => {
    const out = resolve(__dirname, '01-contrato-matricula-deca.pdf');
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 60, left: 60, right: 60 } });
    doc.pipe(createWriteStream(out));
    const w = doc.page.width - 120;

    let y = header(doc, 'CONTRATO DE MATRÍCULA DECA');

    y = sectionTitle(doc, 'Datos del alumno/a', y);
    y = field(doc, 'Nombre completo', y);
    y = field(doc, 'DNI/NIE', y);
    y = field(doc, 'Email', y);
    y = field(doc, 'Teléfono', y);
    y = field(doc, 'Dirección', y);
    y = field(doc, 'Programa', y);
    y += 5;

    y = sectionTitle(doc, 'Cláusulas', y);
    y = paragraph(doc, '1. OBJETO. El presente contrato regula la matriculación del/la alumno/a en el programa DECA impartido por el Instituto Internacional de Teología a Distancia.', y);
    y = paragraph(doc, '2. PROGRAMA. El programa consta de 9 asignaturas: Teología Fundamental, Cristología y Pneumatología, Eclesiología y Mariología, Moral Fundamental y Bioética, Moral Social y DSI, Sagrada Escritura AT, Sagrada Escritura NT, Pedagogía y Didáctica de la Religión, y Liturgia y Sacramentos.', y);
    y = paragraph(doc, '3. DURACIÓN. Un curso académico, ampliable según normativa del Instituto.', y);
    y = paragraph(doc, '4. PRECIO. El importe de la matrícula es de __________ euros (IVA exento conforme al art. 20.Uno.9 Ley 37/1992).', y);
    y = paragraph(doc, '5. OBLIGACIONES DEL ALUMNO. Realizar las actividades y evaluaciones; respetar las normas del campus virtual; comunicar cambios en sus datos; mantener la confidencialidad de sus credenciales.', y);
    y = paragraph(doc, '6. OBLIGACIONES DEL INSTITUTO. Proporcionar acceso al campus y materiales; facilitar tutoría; evaluar en plazo; emitir certificados y diplomas; custodiar el expediente académico.', y);
    y = paragraph(doc, '7. DESISTIMIENTO. El alumno/a podrá desistir en 14 días naturales desde la formalización (RDL 1/2007). Si ya ha accedido al campus, se descontará la parte proporcional.', y);
    y = paragraph(doc, '8. PROTECCIÓN DE DATOS. Responsable: IITD, CIF R2800617I. Finalidad: gestión académica y administrativa. Base: ejecución del contrato (art. 6.1.b RGPD). Derechos: acceso, rectificación, supresión, limitación, portabilidad y oposición en informacion@institutoteologia.org.', y);
    y = paragraph(doc, '9. LEGISLACIÓN APLICABLE. Legislación española. Jurisdicción: Juzgados y Tribunales de Madrid.', y);

    signatureBlock(doc, 'Director/a del Instituto', 'El/La Alumno/a');
    doc.end();
    doc.on('end', () => { console.log(`  ✓ ${out}`); res(out); });
    doc.on('error', rej);
  });
}

// =========================================================
// 2. CONVENIO CENTRO ASOCIADO
// =========================================================

function generateConvenio() {
  return new Promise((res, rej) => {
    const out = resolve(__dirname, '02-convenio-centro-asociado.pdf');
    const doc = new PDFDocument({ size: 'A4', margins: { top: 50, bottom: 60, left: 60, right: 60 } });
    doc.pipe(createWriteStream(out));

    let y = header(doc, 'CONVENIO DE COLABORACIÓN');

    y = sectionTitle(doc, 'Datos del Centro Asociado', y);
    y = field(doc, 'Denominación', y);
    y = field(doc, 'CIF/NIF', y);
    y = field(doc, 'Dirección', y);
    y = field(doc, 'Representante', y);
    y = field(doc, 'Cargo', y);
    y = field(doc, 'Email', y);
    y = field(doc, 'Teléfono', y);
    y = field(doc, 'Diócesis', y);
    y += 5;

    y = sectionTitle(doc, 'Cláusulas', y);
    y = paragraph(doc, '1. OBJETO. Establecer el marco de colaboración para la difusión y facilitación del acceso de los alumnos del Centro Asociado a los programas formativos del Instituto, en particular DECA.', y);
    y = paragraph(doc, '2. OBLIGACIONES DEL INSTITUTO. Facilitar información actualizada; gestionar matrículas; proporcionar acceso al campus; comunicar progreso académico (previo consentimiento del alumno); emitir certificados.', y);
    y = paragraph(doc, '3. OBLIGACIONES DEL CENTRO. Difundir la oferta formativa; facilitar gestiones de matriculación; designar persona de contacto; comunicar incidencias; no usar denominación o logo del Instituto sin autorización.', y);
    y = paragraph(doc, '4. CONDICIONES ECONÓMICAS. (A definir entre las partes).', y);
    y = paragraph(doc, '5. DURACIÓN. Un curso académico, prorrogable automáticamente salvo denuncia con 2 meses de antelación.', y);
    y = paragraph(doc, '6. RESOLUCIÓN. Por mutuo acuerdo, denuncia con preaviso de 2 meses, o incumplimiento. No afecta a alumnos ya matriculados.', y);
    y = paragraph(doc, '7. PROTECCIÓN DE DATOS. Ambas partes cumplen RGPD y LOPDGDD. Datos de alumnos solo se comunicarán previo consentimiento. Si el Centro accede a datos del Instituto, se formalizará contrato de encargado (art. 28 RGPD).', y);
    y = paragraph(doc, '8. CONFIDENCIALIDAD. Ambas partes mantienen la confidencialidad de la información, obligación que subsiste tras la terminación del convenio.', y);
    y = paragraph(doc, '9. LEGISLACIÓN. Legislación española. Jurisdicción: Madrid.', y);

    signatureBlock(doc, 'Director/a del Instituto', 'Representante del Centro');
    doc.end();
    doc.on('end', () => { console.log(`  ✓ ${out}`); res(out); });
    doc.on('error', rej);
  });
}

// =========================================================
// 3. CONSENTIMIENTO RGPD
// =========================================================

function generateConsentimiento() {
  return new Promise((res, rej) => {
    const out = resolve(__dirname, '03-consentimiento-rgpd.pdf');
    const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 50, left: 55, right: 55 } });
    doc.pipe(createWriteStream(out));
    const w = doc.page.width - 110;

    // Compact header
    let y = 40;
    if (hasLogo) { try { doc.image(LOGO_PATH, 55, y, { width: 45 }); } catch {} }
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a5276')
      .text(INST.nombre, 108, 43, { width: w - 53 });
    doc.fontSize(6.5).font('Helvetica').fillColor('#444')
      .text(`CIF: ${INST.cif} | ${INST.direccion} | Tel: ${INST.tel} | ${INST.email}`, 108, 55);
    doc.moveTo(55, 67).lineTo(doc.page.width - 55, 67).lineWidth(1).stroke('#1a5276');

    doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a5276')
      .text('CONSENTIMIENTO EXPRESO — RGPD', 55, 75, { width: w, align: 'center' });
    y = 97;

    // Datos — compact two-column
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a5276').text('Datos del interesado', 55, y);
    y += 14;
    const fld = (label, fy, fx = 55) => {
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#333').text(label + ':', fx, fy);
      doc.moveTo(fx + 70, fy + 9).lineTo(fx + 210, fy + 9).lineWidth(0.4).stroke('#aaa');
      return fy + 14;
    };
    const y1 = fld('Nombre', y, 55);
    const y2 = fld('DNI/NIE', y1, 55);
    fld('Email', y, 300);
    fld('Programa', y1, 300);
    y = y2 + 3;

    // Info tratamiento — compact
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a5276').text('Información sobre el tratamiento', 55, y);
    y += 13;
    const p = (text, py) => {
      doc.fontSize(7).font('Helvetica').fillColor('#333').text(text, 55, py, { width: w, lineGap: 1 });
      return doc.y + 3;
    };
    y = p(`Responsable: ${INST.nombre}, CIF ${INST.cif}, ${INST.direccion}. Finalidades: (1) gestión académica y administrativa, (2) comunicaciones comerciales, (3) grabación de sesiones online con fines académicos, (4) cesión a la Conferencia Episcopal para tramitación DECA, (5) uso de imagen en materiales promocionales.`, y);
    y = p('Base jurídica: ejecución del contrato (finalidades 1 y 4) y consentimiento del interesado (finalidades 2, 3 y 5). Conservación: vigencia de la relación + plazos legales (expedientes: indefinido; contables: 6 años; resto: hasta retirada del consentimiento). Derechos: acceso, rectificación, supresión, limitación, portabilidad y oposición en informacion@institutoteologia.org. Reclamación ante la AEPD (www.aepd.es).', y);
    y += 5;

    // Consentimientos
    doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a5276').text('Consentimientos', 55, y);
    y += 14;

    const checks = [
      'COMUNICACIONES COMERCIALES: Consiento recibir comunicaciones sobre programas, cursos y eventos del Instituto. Puedo retirar este consentimiento en cualquier momento.',
      'GRABACIÓN DE SESIONES: Consiento la grabación de las sesiones formativas online en las que participe, para uso exclusivamente académico y formativo.',
      'PUBLICACIÓN DE IMAGEN: Consiento el uso de mi imagen en materiales promocionales del Instituto (web, redes sociales, folletos).',
    ];

    for (const text of checks) {
      doc.rect(55, y, 9, 9).lineWidth(0.8).stroke('#333');
      doc.fontSize(7).font('Helvetica').fillColor('#333').text(text, 70, y, { width: w - 15, lineGap: 1 });
      y = doc.y + 6;
    }

    y += 4;
    doc.fontSize(7).font('Helvetica').fillColor('#333')
      .text('Declaro haber leído y comprendido la información anterior. Presto mi consentimiento libre, específico, informado e inequívoco para los tratamientos marcados. Puedo retirar cualquier consentimiento en cualquier momento comunicándolo a informacion@institutoteologia.org, sin que ello afecte a la licitud del tratamiento previo.', 55, y, { width: w, lineGap: 1 });
    y = doc.y + 15;

    // Signature — inline
    doc.fontSize(7.5).font('Helvetica').fillColor('#333')
      .text('En Madrid, a ________ de __________________ de 20_____', 55, y, { width: w, align: 'center' });
    y += 30;

    doc.moveTo(doc.page.width - 250, y).lineTo(doc.page.width - 70, y).stroke('#999');
    doc.fontSize(7).font('Helvetica').fillColor('#666')
      .text('El/La Interesado/a', doc.page.width - 250, y + 4, { width: 180, align: 'center' });

    doc.fontSize(5).fillColor('#aaa')
      .text('La firma electrónica tiene la misma validez que la firma manuscrita conforme al Reglamento (UE) 910/2014 (eIDAS).', 55, doc.page.height - 45, { width: w, align: 'center' });

    doc.end();
    doc.on('end', () => { console.log(`  ✓ ${out}`); res(out); });
    doc.on('error', rej);
  });
}

// =========================================================

console.log('Generando PDFs de templates BreezeDoc...\n');
await Promise.all([generateMatricula(), generateConvenio(), generateConsentimiento()]);
console.log('\nHecho. Sube estos PDFs como templates a BreezeDoc.');
