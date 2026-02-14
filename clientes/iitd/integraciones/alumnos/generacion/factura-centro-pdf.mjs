#!/usr/bin/env node

/**
 * Generador de facturas a centros asociados en PDF (N10)
 *
 * Genera facturas para centros asociados (diocesis, colegios, etc.)
 * a partir de la tabla FACTURAS_CENTROS en Stackby.
 *
 * Flujo completo (con --upload):
 *   1. Genera PDF de la factura
 *   2. Sube PDF a Google Drive
 *   3. Escribe enlace en Sheet "Panel IITD" > Facturas Centros
 *   4. Actualiza URL en Stackby FACTURAS_CENTROS
 *
 * Usage:
 *   node factura-centro-pdf.mjs --centro "Centro Lugo" --lineas '[{"concepto":"Mat DECA x5","cantidad":5,"precio":350}]'
 *   node factura-centro-pdf.mjs --centro "Centro Lugo" --productos MOD-001,MOD-002
 *   node factura-centro-pdf.mjs --centro "Centro Lugo" --lineas '[...]' --upload
 *   node factura-centro-pdf.mjs --all-pending                   # Todas las borradores
 *   node factura-centro-pdf.mjs --all-pending --upload           # Borradores + Drive + Sheet
 *   node factura-centro-pdf.mjs --factura-id <rowId>             # Generar por ID
 *   node factura-centro-pdf.mjs -o ./facturas                    # Directorio salida
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_FACTURAS_CENTROS_TABLE_ID
 *   PANEL_IITD_SHEET_ID, APPS_SCRIPT_UPLOAD_URL, DRIVE_DOCUMENTOS_FOLDER_ID
 *   IITD_NIF, IITD_DIRECCION, IITD_CP, IITD_CIUDAD, IITD_TELEFONO, IITD_EMAIL
 *   IITD_IBAN (opcional)
 */

import { createWriteStream, mkdirSync, existsSync, readFileSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import PDFDocument from 'pdfkit';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const SHEET_ID = process.env.PANEL_IITD_SHEET_ID || '';
const DRIVE_FOLDER_ID = process.env.DRIVE_DOCUMENTOS_FOLDER_ID || '';
const APPS_SCRIPT_UPLOAD_URL = process.env.APPS_SCRIPT_UPLOAD_URL || '';
const IVA_RATE = 0.21;

const INSTITUCION = {
  nombre: 'INSTITUTO INTERNACIONAL DE TEOLOGIA A DISTANCIA',
  nif: process.env.IITD_NIF || '[NIF]',
  direccion: process.env.IITD_DIRECCION || '[DIRECCION]',
  cp: process.env.IITD_CP || '[CP]',
  ciudad: process.env.IITD_CIUDAD || '[CIUDAD]',
  telefono: process.env.IITD_TELEFONO || '[TELEFONO]',
  email: process.env.IITD_EMAIL || 'informacion@institutoteologia.org',
  web: 'institutoteologia.org',
  iban: process.env.IITD_IBAN || '',
};

// CLI args
function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

const CENTRO_FILTER = getArg('--centro');
const LINEAS_RAW = getArg('--lineas');
const PRODUCTOS_RAW = getArg('--productos');
const FACTURA_ID = getArg('--factura-id');
const ALL_PENDING = process.argv.includes('--all-pending');
const UPLOAD_MODE = process.argv.includes('--upload');
const OUTPUT_DIR = getArg('-o') || './facturas';

const LOGO_PATH = (() => {
  const defaultPath = resolve(__dirname, '../../assets/logos/logo-ppal-iit-rgb.png');
  return existsSync(defaultPath) ? defaultPath : null;
})();

// =====================================================
// PDF GENERATION
// =====================================================

function formatCurrency(amount) {
  return Number(amount).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

function formatDate(dateStr) {
  if (!dateStr) return new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

function generateFacturaPDF(factura, centro, outputPath) {
  return new Promise((resolvePromise, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 60, right: 60 },
    });

    const stream = createWriteStream(outputPath);
    doc.pipe(stream);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // Parse lineas
    let lineas = [];
    try {
      lineas = typeof factura.lineas === 'string' ? JSON.parse(factura.lineas) : (factura.lineas || []);
    } catch { lineas = []; }

    const base = parseFloat(factura.baseImponible) || lineas.reduce((s, l) => s + ((l.cantidad || 1) * (l.precio || 0)), 0);
    const iva = parseFloat(factura.iva) || Math.round(base * IVA_RATE * 100) / 100;
    const total = parseFloat(factura.total) || Math.round((base + iva) * 100) / 100;

    // --- HEADER ---
    let headerY = 50;
    if (LOGO_PATH) {
      try {
        doc.image(LOGO_PATH, 60, headerY, { width: 80 });
        headerY += 10;
      } catch { /* ignore */ }
    }

    doc.fontSize(11).font('Helvetica-Bold')
      .text(INSTITUCION.nombre, 150, headerY, { width: pageWidth - 100 });
    doc.fontSize(8).font('Helvetica')
      .text(`NIF: ${INSTITUCION.nif}`, 150, headerY + 25)
      .text(`${INSTITUCION.direccion} - ${INSTITUCION.cp} ${INSTITUCION.ciudad}`, 150, headerY + 35)
      .text(`Tel: ${INSTITUCION.telefono} | ${INSTITUCION.email}`, 150, headerY + 45);

    // Factura number box
    const boxX = doc.page.width - doc.page.margins.right - 170;
    const boxY = headerY + 60;
    doc.rect(boxX, boxY, 170, 55).stroke('#cccccc');
    doc.fontSize(11).font('Helvetica-Bold')
      .text('FACTURA', boxX + 10, boxY + 8, { width: 150 });
    doc.fontSize(9).font('Helvetica')
      .text(`N.: ${factura.numeroFactura}`, boxX + 10, boxY + 24, { width: 150 })
      .text(`Fecha: ${formatDate(factura.fechaEmision)}`, boxX + 10, boxY + 38, { width: 150 });

    // --- DATOS DEL CENTRO (cliente) ---
    const clienteY = boxY + 80;
    doc.rect(60, clienteY, pageWidth, 70).fill('#f5f5f5').stroke('#cccccc');
    doc.fillColor('#000000');

    doc.fontSize(9).font('Helvetica-Bold')
      .text('DATOS DEL CLIENTE', 75, clienteY + 8);
    doc.fontSize(9).font('Helvetica');

    doc.font('Helvetica-Bold').text('Centro:', 75, clienteY + 24, { width: 55 });
    doc.font('Helvetica').text(factura.centro, 130, clienteY + 24, { width: 300 });
    doc.font('Helvetica-Bold').text('NIF:', 75, clienteY + 38, { width: 55 });
    doc.font('Helvetica').text(factura.nifCentro || '—', 130, clienteY + 38, { width: 200 });
    if (centro?.email) {
      doc.font('Helvetica-Bold').text('Email:', 75, clienteY + 52, { width: 55 });
      doc.font('Helvetica').text(centro.email, 130, clienteY + 52, { width: 200 });
    }

    // --- TABLE: LINEAS ---
    const tableY = clienteY + 90;
    const colConcepto = 75;
    const colCantidad = 340;
    const colPrecio = 395;
    const colTotal = 460;

    // Header row
    doc.rect(60, tableY, pageWidth, 22).fill('#2c3e50');
    doc.fillColor('#ffffff').fontSize(8).font('Helvetica-Bold');
    doc.text('Concepto', colConcepto, tableY + 7, { width: 260 });
    doc.text('Cant.', colCantidad, tableY + 7, { width: 50, align: 'right' });
    doc.text('P. Unit.', colPrecio, tableY + 7, { width: 60, align: 'right' });
    doc.text('Total', colTotal, tableY + 7, { width: 60, align: 'right' });
    doc.fillColor('#000000');

    // Data rows
    let rowY = tableY + 22;
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i];
      const cantidad = l.cantidad || 1;
      const precio = l.precio || 0;
      const lineTotal = cantidad * precio;
      const bg = i % 2 === 0 ? '#ffffff' : '#f9f9f9';

      doc.rect(60, rowY, pageWidth, 22).fill(bg).stroke('#e0e0e0');
      doc.fillColor('#000000').fontSize(8).font('Helvetica');
      doc.text(l.concepto || '', colConcepto, rowY + 7, { width: 260 });
      doc.text(String(cantidad), colCantidad, rowY + 7, { width: 50, align: 'right' });
      doc.text(formatCurrency(precio), colPrecio, rowY + 7, { width: 60, align: 'right' });
      doc.text(formatCurrency(lineTotal), colTotal, rowY + 7, { width: 60, align: 'right' });
      rowY += 22;
    }

    // Totals
    const totalsY = rowY + 5;

    doc.fontSize(9).font('Helvetica');
    doc.text('Base imponible:', 340, totalsY, { width: 115, align: 'right' });
    doc.text(formatCurrency(base), colTotal, totalsY, { width: 60, align: 'right' });

    doc.text(`IVA (${IVA_RATE * 100}%):`, 340, totalsY + 16, { width: 115, align: 'right' });
    doc.text(formatCurrency(iva), colTotal, totalsY + 16, { width: 60, align: 'right' });

    doc.rect(340, totalsY + 33, 185, 22).fill('#f0f0f0').stroke('#cccccc');
    doc.fillColor('#000000').fontSize(11).font('Helvetica-Bold');
    doc.text('TOTAL:', 345, totalsY + 38, { width: 110, align: 'right' });
    doc.text(formatCurrency(total), colTotal, totalsY + 38, { width: 60, align: 'right' });

    // --- PAYMENT INFO ---
    const payY = totalsY + 75;
    doc.fontSize(9).font('Helvetica-Bold')
      .text('Forma de pago', 60, payY);
    doc.fontSize(8).font('Helvetica')
      .text('Transferencia bancaria', 60, payY + 16);
    if (INSTITUCION.iban) {
      doc.text(`IBAN: ${INSTITUCION.iban}`, 60, payY + 28);
    }
    doc.text(`Referencia: ${factura.numeroFactura}`, 60, payY + (INSTITUCION.iban ? 40 : 28));

    // --- FOOTER ---
    const footerY = doc.page.height - 100;
    doc.moveTo(60, footerY).lineTo(60 + pageWidth, footerY).stroke('#cccccc');

    doc.fontSize(7).font('Helvetica').fillColor('#666666');
    doc.text(
      `${INSTITUCION.nombre} — NIF: ${INSTITUCION.nif} — ${INSTITUCION.direccion}, ${INSTITUCION.cp} ${INSTITUCION.ciudad}`,
      60, footerY + 10, { width: pageWidth, align: 'center' }
    );
    doc.text(
      'Este documento constituye factura a efectos fiscales conforme al Real Decreto 1619/2012.',
      60, footerY + 22, { width: pageWidth, align: 'center' }
    );

    doc.end();
    stream.on('finish', () => resolvePromise(outputPath));
    stream.on('error', reject);
  });
}

// =====================================================
// DRIVE UPLOAD
// =====================================================

async function uploadViaAppsScript(localPath, fileName, folderId) {
  const base64 = readFileSync(localPath).toString('base64');
  const resp = await fetch(APPS_SCRIPT_UPLOAD_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, base64, folderId, mimeType: 'application/pdf' }),
    redirect: 'follow',
  });
  const data = await resp.json();
  if (!data.ok) throw new Error(data.error || 'Apps Script upload failed');
  return { fileId: data.fileId, url: data.url };
}

async function uploadToDrive(localPath, fileName) {
  if (!APPS_SCRIPT_UPLOAD_URL) {
    console.log('    APPS_SCRIPT_UPLOAD_URL no configurada, no se sube a Drive');
    return null;
  }
  return uploadViaAppsScript(localPath, fileName, DRIVE_FOLDER_ID);
}

// =====================================================
// SHEET
// =====================================================

async function appendToSheet(factura, driveUrl) {
  if (!SHEET_ID) return;

  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();
  const TAB = 'Facturas Centros';

  // Ensure tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
    // Write headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `'${TAB}'!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Numero', 'Centro', 'NIF', 'Fecha', 'Base', 'IVA', 'Total', 'Estado', 'PDF']] },
    });
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A:I`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        factura.numeroFactura, factura.centro, factura.nifCentro,
        factura.fechaEmision, factura.baseImponible, factura.iva, factura.total,
        factura.estado, driveUrl || '',
      ]],
    },
  });
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`
Generador de facturas a centros (N10)

Comandos:
  --centro "X" --lineas '[{"concepto":"...","cantidad":N,"precio":N}]'
  --centro "X" --productos MOD-001,MOD-002    Lineas desde catalogo
  --factura-id <rowId>                         Generar factura existente
  --all-pending                                Todas las borradores
  --upload                                     Subir a Drive + Sheet
  -o ./dir                                     Directorio de salida
`);
    return;
  }

  const { listarFacturas, crearFactura, actualizarFactura } = await import('../compartido/facturas-client.mjs');

  // Ensure output directory
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  let facturasToProcess = [];

  if (FACTURA_ID) {
    // Generate specific factura by ID
    const all = await listarFacturas();
    const f = all.find(x => x.id === FACTURA_ID);
    if (!f) { console.error(`Factura no encontrada: ${FACTURA_ID}`); process.exit(1); }
    facturasToProcess = [f];

  } else if (ALL_PENDING) {
    // Generate all pending borradores
    facturasToProcess = await listarFacturas({ estado: 'borrador' });
    if (facturasToProcess.length === 0) {
      console.log('No hay facturas en estado borrador.');
      return;
    }

  } else if (CENTRO_FILTER) {
    // Create new factura for a centro
    let lineas = [];

    if (LINEAS_RAW) {
      try { lineas = JSON.parse(LINEAS_RAW); } catch (e) {
        console.error(`Error parsing --lineas: ${e.message}`);
        process.exit(1);
      }
    } else if (PRODUCTOS_RAW) {
      // Build lineas from product catalog
      const { listarProductos } = await import('../compartido/productos-client.mjs');
      const skus = PRODUCTOS_RAW.split(',').map(s => s.trim());
      const productos = await listarProductos();
      for (const sku of skus) {
        const p = productos.find(x => x.sku.toLowerCase() === sku.toLowerCase());
        if (p) {
          lineas.push({ concepto: `${p.nombre} (${p.sku})`, cantidad: 1, precio: parseFloat(p.precio) || 0 });
        } else {
          console.error(`  Producto no encontrado: ${sku}`);
        }
      }
    }

    if (lineas.length === 0) {
      console.error('Error: --lineas o --productos es requerido');
      process.exit(1);
    }

    // Look up centro in CONTACTOS
    let nifCentro = getArg('--nif') || '';
    let centroInfo = null;
    try {
      const { list: listContactos } = await import('../compartido/contactos-client.mjs');
      const contactos = await listContactos('centro_asociado');
      centroInfo = contactos.find(c =>
        c.organizacion.toLowerCase().includes(CENTRO_FILTER.toLowerCase()) ||
        c.nombre.toLowerCase().includes(CENTRO_FILTER.toLowerCase())
      );
      if (centroInfo?.notas) {
        const nifMatch = centroInfo.notas.match(/NIF[:\s]+([A-Z0-9-]+)/i);
        if (nifMatch && !nifCentro) nifCentro = nifMatch[1];
      }
    } catch { /* no contactos available */ }

    // Create factura in Stackby
    const factura = await crearFactura({
      centro: CENTRO_FILTER,
      nifCentro,
      lineas,
      concepto: getArg('--concepto') || lineas.map(l => l.concepto).join(', '),
    });
    console.log(`Factura creada: ${factura.numeroFactura}`);
    facturasToProcess = [factura];

  } else {
    console.error('Usa --centro, --factura-id, o --all-pending');
    process.exit(1);
  }

  console.log(`\nGenerando ${facturasToProcess.length} factura(s)...\n`);

  let generated = 0;
  for (const factura of facturasToProcess) {
    // Get centro info from contactos
    let centroInfo = null;
    try {
      const { list: listContactos } = await import('../compartido/contactos-client.mjs');
      const contactos = await listContactos('centro_asociado');
      centroInfo = contactos.find(c =>
        c.organizacion.toLowerCase().includes(factura.centro.toLowerCase()) ||
        c.nombre.toLowerCase().includes(factura.centro.toLowerCase())
      );
    } catch { /* ignore */ }

    const safeName = factura.numeroFactura.replace(/[^a-zA-Z0-9-]/g, '_');
    const filename = `factura_${safeName}.pdf`;
    const outputPath = join(OUTPUT_DIR, filename);

    await generateFacturaPDF(factura, centroInfo, outputPath);
    console.log(`  PDF: ${outputPath}`);
    generated++;

    if (UPLOAD_MODE) {
      let driveUrl = '';
      try {
        const upload = await uploadToDrive(outputPath, filename);
        if (upload) {
          driveUrl = upload.url;
          console.log(`  Drive: ${driveUrl}`);

          // Update Stackby with PDF URL
          await actualizarFactura(factura.id, { pdfUrl: driveUrl });
        }
      } catch (err) {
        console.error(`  Error Drive: ${err.message}`);
      }

      // Write to Sheet
      try {
        await appendToSheet(factura, driveUrl);
        console.log(`  Sheet: OK`);
      } catch (err) {
        console.error(`  Error Sheet: ${err.message}`);
      }

      // Audit log
      try {
        const { logAudit } = await import('../compartido/audit-client.mjs');
        await logAudit({
          tabla: 'FACTURAS_CENTROS',
          operacion: 'CREATE',
          rowId: factura.id,
          usuario: 'factura-centro-pdf.mjs',
          campos: JSON.stringify({ numero: factura.numeroFactura, centro: factura.centro, total: factura.total }),
          fuente: 'CLI',
          detalles: `Factura generada: ${factura.numeroFactura} — ${factura.centro}`,
          severidad: 'info',
        });
      } catch { /* non-blocking */ }
    }
  }

  console.log(`\nFacturas generadas: ${generated}`);
  console.log(`Directorio: ${resolve(OUTPUT_DIR)}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
