#!/usr/bin/env node

/**
 * Email Sender — IITD (N25)
 *
 * Modulo reutilizable de email transaccional con plantillas HTML.
 * Usa nodemailer con SMTP configurable via .env.
 *
 * Estado: 🔧 Implementado, pendiente config SMTP
 * Cuando IITD proporcione credenciales SMTP, anadir a .env:
 *   SMTP_HOST=smtp.example.com
 *   SMTP_PORT=587
 *   SMTP_USER=user@institutoteologia.org
 *   SMTP_PASS=password
 *   SMTP_FROM=Instituto Internacional de Teologia <informacion@institutoteologia.org>
 *
 * Usage como modulo:
 *   import { sendEmail, sendTemplate } from './email-sender.mjs';
 *   await sendEmail({ to: 'alumno@email.com', subject: 'Test', html: '<p>Hola</p>' });
 *   await sendTemplate('bienvenida', 'alumno@email.com', { nombre: 'Juan' });
 *
 * Usage como CLI:
 *   node email-sender.mjs --template bienvenida --to alumno@email.com --vars nombre=Juan
 *   node email-sender.mjs --template bienvenida --to alumno@email.com --dry-run
 *   node email-sender.mjs --list                                # listar templates disponibles
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { createTransport } from 'nodemailer';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '../.env'))) {
  for (const line of readFileSync(resolve(__dirname, '../.env'), 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// =====================================================
// CONFIG
// =====================================================

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || `Instituto Internacional de Teología <${process.env.IITD_EMAIL || 'informacion@institutoteologia.org'}>`;

const TEMPLATES_DIR = resolve(__dirname, '../plantillas');

const INSTITUCION = {
  nombre: 'Instituto Internacional de Teología a Distancia',
  web: 'institutoteologia.org',
  email: process.env.IITD_EMAIL || 'informacion@institutoteologia.org',
  direccion: process.env.IITD_DIRECCION || 'Calle Iriarte 3',
  ciudad: process.env.IITD_CIUDAD || '28028 Madrid',
  telefono: process.env.IITD_TELEFONO || '',
};

// Footer RGPD (N40) — incluido automaticamente en todos los emails
const RGPD_FOOTER = `
<hr style="border:none;border-top:1px solid #eee;margin:24px 0 16px;">
<p style="font-size:11px;color:#999;line-height:1.4;">
  Este mensaje ha sido enviado por el ${INSTITUCION.nombre} (${INSTITUCION.direccion}, ${INSTITUCION.ciudad}).
  Si desea ejercer sus derechos de acceso, rectificación, supresión o portabilidad conforme al RGPD,
  puede hacerlo en <a href="https://${INSTITUCION.web}/ejercicio-derechos-rgpd/" style="color:#999;">nuestro portal ARCO+</a>
  o escribiendo a <a href="mailto:${INSTITUCION.email}" style="color:#999;">${INSTITUCION.email}</a>.
</p>
`;

// =====================================================
// TRANSPORTER
// =====================================================

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!SMTP_HOST) {
    throw new Error(
      'SMTP no configurado. Añade SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS a .env\n' +
      'Ejemplo para Gmail SMTP:\n' +
      '  SMTP_HOST=smtp.gmail.com\n' +
      '  SMTP_PORT=587\n' +
      '  SMTP_USER=tu-cuenta@gmail.com\n' +
      '  SMTP_PASS=tu-app-password'
    );
  }

  _transporter = createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  return _transporter;
}

// =====================================================
// TEMPLATE ENGINE
// =====================================================

function loadTemplate(templateName) {
  const path = resolve(TEMPLATES_DIR, `${templateName}.html`);
  if (!existsSync(path)) {
    throw new Error(`Template no encontrado: ${path}`);
  }
  return readFileSync(path, 'utf-8');
}

function renderTemplate(html, vars = {}) {
  // Replace {{variable}} placeholders
  let rendered = html;
  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value || '');
  }

  // Inject default variables
  rendered = rendered.replace(/\{\{\s*institucion_nombre\s*\}\}/g, INSTITUCION.nombre);
  rendered = rendered.replace(/\{\{\s*institucion_web\s*\}\}/g, INSTITUCION.web);
  rendered = rendered.replace(/\{\{\s*institucion_email\s*\}\}/g, INSTITUCION.email);
  rendered = rendered.replace(/\{\{\s*fecha\s*\}\}/g, new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }));

  // Append RGPD footer
  rendered += RGPD_FOOTER;

  return rendered;
}

function listTemplates() {
  if (!existsSync(TEMPLATES_DIR)) return [];
  return readdirSync(TEMPLATES_DIR)
    .filter(f => f.endsWith('.html'))
    .map(f => basename(f, '.html'));
}

// Template → subject mapping
const TEMPLATE_SUBJECTS = {
  'bienvenida': 'Bienvenido/a al {{institucion_nombre}}',
  'notas-publicadas': 'Tus calificaciones han sido publicadas — {{institucion_nombre}}',
  'recibo-adjunto': 'Recibo de matrícula — {{institucion_nombre}}',
  'recordatorio-pago': 'Recordatorio: pago de matrícula pendiente — {{institucion_nombre}}',
};

// =====================================================
// PUBLIC API
// =====================================================

/**
 * Send a raw email
 * @param {object} opts - { to, subject, html, text, attachments }
 */
export async function sendEmail(opts) {
  const { to, subject, html, text, attachments } = opts;
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    html: html + RGPD_FOOTER,
    text,
    attachments,
  });

  return { messageId: info.messageId, to, subject };
}

/**
 * Send an email using a template
 * @param {string} templateName - Template file name (without .html)
 * @param {string} to - Recipient email
 * @param {object} vars - Variables to inject into template
 * @param {object} extra - { attachments, subject }
 */
export async function sendTemplate(templateName, to, vars = {}, extra = {}) {
  const raw = loadTemplate(templateName);
  const html = renderTemplate(raw, vars);

  let subject = extra.subject || TEMPLATE_SUBJECTS[templateName] || `Notificación — ${INSTITUCION.nombre}`;
  // Replace vars in subject too
  for (const [key, value] of Object.entries(vars)) {
    subject = subject.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value || '');
  }
  subject = subject.replace(/\{\{\s*institucion_nombre\s*\}\}/g, INSTITUCION.nombre);

  return sendEmail({ to, subject, html, attachments: extra.attachments });
}

// =====================================================
// CLI
// =====================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    const templates = listTemplates();
    console.log('Templates disponibles:');
    for (const t of templates) {
      console.log(`  - ${t}`);
    }
    if (templates.length === 0) console.log('  (ninguno — crear en templates/)');
    return;
  }

  const templateIdx = args.indexOf('--template');
  const toIdx = args.indexOf('--to');
  const dryRun = args.includes('--dry-run');

  if (templateIdx === -1 || toIdx === -1) {
    console.log('Email Sender IITD (N25)');
    console.log();
    console.log('Usage:');
    console.log('  node email-sender.mjs --template <nombre> --to <email> [--vars key=val ...] [--dry-run]');
    console.log('  node email-sender.mjs --list');
    console.log();
    console.log(`SMTP configurado: ${SMTP_HOST ? 'SÍ (' + SMTP_HOST + ')' : 'NO — añadir SMTP_HOST a .env'}`);
    return;
  }

  const templateName = args[templateIdx + 1];
  const to = args[toIdx + 1];

  // Parse --vars key=val key2=val2
  const vars = {};
  const varsIdx = args.indexOf('--vars');
  if (varsIdx !== -1) {
    for (let i = varsIdx + 1; i < args.length; i++) {
      if (args[i].startsWith('--')) break;
      const [k, ...v] = args[i].split('=');
      vars[k] = v.join('=');
    }
  }

  console.log(`Email Sender IITD (N25)`);
  console.log(`  Template: ${templateName}`);
  console.log(`  To: ${to}`);
  console.log(`  Variables: ${JSON.stringify(vars)}`);
  console.log(`  Dry run: ${dryRun ? 'SÍ' : 'NO'}`);
  console.log();

  // Load and render
  const raw = loadTemplate(templateName);
  const html = renderTemplate(raw, vars);

  let subject = TEMPLATE_SUBJECTS[templateName] || `Notificación — ${INSTITUCION.nombre}`;
  for (const [key, value] of Object.entries(vars)) {
    subject = subject.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g'), value || '');
  }
  subject = subject.replace(/\{\{\s*institucion_nombre\s*\}\}/g, INSTITUCION.nombre);

  if (dryRun) {
    console.log('--- PREVIEW ---');
    console.log(`Subject: ${subject}`);
    console.log(`From: ${SMTP_FROM}`);
    console.log(`To: ${to}`);
    console.log();
    console.log(html);
    console.log('--- END PREVIEW ---');
    console.log();
    console.log('✓ Dry run completado. No se ha enviado ningún email.');
    return;
  }

  const result = await sendEmail({ to, subject, html });
  console.log(`✓ Email enviado: ${result.messageId}`);
}

// Run CLI if executed directly
const isMain = process.argv[1] && (
  process.argv[1].endsWith('email-sender.mjs') ||
  process.argv[1].endsWith('email-sender')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
