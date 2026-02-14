#!/usr/bin/env node

/**
 * Notificacion de brechas de seguridad — RGPD Art. 33/34 (N45)
 *
 * Workflow manual para gestionar brechas de datos personales.
 * El director/DPO decide si una anomalia constituye una brecha.
 *
 * Plazos legales:
 *   - 24h: Notificar al director IITD
 *   - 72h: Notificar a la AEPD (Agencia Espanola de Proteccion de Datos)
 *   - Sin plazo fijo pero asap: Notificar a los afectados
 *
 * Usage:
 *   node breach-notification.mjs --report                                    # Informe anomalias
 *   node breach-notification.mjs --notify-director --description "X" --dry-run
 *   node breach-notification.mjs --notify-director --description "X" --confirm
 *   node breach-notification.mjs --notify-aepd --breach-id BREACH-2026-02-14-001 --dry-run
 *   node breach-notification.mjs --notify-affected --email alumno@email.com --dry-run
 *   node breach-notification.mjs --notify-affected --all --breach-id X --dry-run
 *   node breach-notification.mjs --sheet                                     # Registrar en Panel IITD
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

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

const SHEET_ID = process.env.PANEL_IITD_SHEET_ID;
const DIRECTOR_EMAIL = process.env.IITD_DIRECTOR_EMAIL || 'alumnos@institutoteologia.org';

const INSTITUCION = {
  nombre: 'Instituto Internacional de Teologia a Distancia',
  nif: process.env.IITD_NIF || 'R2800617I',
  direccion: process.env.IITD_DIRECCION || 'Calle Iriarte, 3',
  cp: process.env.IITD_CP || '28028',
  ciudad: process.env.IITD_CIUDAD || 'Madrid',
  telefono: process.env.IITD_TELEFONO || '91 401 50 62',
  email: process.env.IITD_EMAIL || 'informacion@institutoteologia.org',
  web: 'institutoteologia.org',
};

// CLI args
const args = process.argv.slice(2);
const REPORT = args.includes('--report');
const NOTIFY_DIRECTOR = args.includes('--notify-director');
const NOTIFY_AEPD = args.includes('--notify-aepd');
const NOTIFY_AFFECTED = args.includes('--notify-affected');
const SHEET_MODE = args.includes('--sheet');
const DRY_RUN = args.includes('--dry-run');
const CONFIRM = args.includes('--confirm');

function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

// =====================================================
// BREACH HELPERS
// =====================================================

function generateBreachId() {
  const d = new Date();
  const date = d.toISOString().split('T')[0];
  const seq = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `BREACH-${date}-${seq}`;
}

function add72Hours(isoDate) {
  const d = new Date(isoDate);
  d.setHours(d.getHours() + 72);
  return d.toISOString();
}

// =====================================================
// REPORT
// =====================================================

async function cmdReport() {
  const { detectAnomalies } = await import('../compartido/audit-client.mjs');
  const days = getArg('--days') ? parseInt(getArg('--days')) : 30;

  console.log(`\nInforme de anomalias (ultimos ${days} dias):\n`);

  const anomalies = await detectAnomalies({ days });

  if (anomalies.length === 0) {
    console.log('  No se detectaron anomalias.');
    console.log('  El registro de auditoria no muestra patrones sospechosos.\n');
    return;
  }

  let alertCount = 0, warningCount = 0, infoCount = 0;
  for (const a of anomalies) {
    const icon = { alert: '!!', warning: ' !', info: ' i' }[a.severity] || ' ?';
    console.log(`  [${icon}] ${a.severity.toUpperCase()}: ${a.description}`);
    if (a.severity === 'alert') alertCount++;
    else if (a.severity === 'warning') warningCount++;
    else infoCount++;
  }

  console.log(`\nResumen: ${alertCount} alertas, ${warningCount} avisos, ${infoCount} info`);

  if (alertCount > 0) {
    console.log('\nSe recomienda evaluar las alertas para determinar si constituyen una brecha.');
    console.log('Para notificar al director:');
    console.log('  node operaciones/breach-notification.mjs --notify-director --description "..." --dry-run\n');
  }
}

// =====================================================
// NOTIFY DIRECTOR (24h)
// =====================================================

async function cmdNotifyDirector() {
  const description = getArg('--description');
  if (!description) {
    console.error('Error: --description es requerido para notificar al director');
    process.exit(1);
  }

  if (!DRY_RUN && !CONFIRM) {
    console.error('Error: usa --dry-run para preview o --confirm para enviar');
    process.exit(1);
  }

  const breachId = getArg('--breach-id') || generateBreachId();
  const fechaDeteccion = new Date().toISOString();
  const tablasAfectadas = getArg('--affected-tables') || 'Por determinar';
  const registrosAfectados = getArg('--affected-count') || 'Por determinar';
  const tipoDatos = getArg('--data-types') || 'Nombre, Email, datos academicos';

  const vars = {
    breach_id: breachId,
    fecha_deteccion: fechaDeteccion,
    descripcion: description,
    tablas_afectadas: tablasAfectadas,
    registros_afectados: registrosAfectados,
    tipo_datos: tipoDatos,
    fecha_limite_aepd: add72Hours(fechaDeteccion),
    iitd_nif: INSTITUCION.nif,
    iitd_direccion: INSTITUCION.direccion,
    iitd_cp: INSTITUCION.cp,
    iitd_ciudad: INSTITUCION.ciudad,
    iitd_telefono: INSTITUCION.telefono,
  };

  console.log(`\nNotificacion al director (24h) — RGPD Art. 33\n`);
  console.log(`  Breach ID: ${breachId}`);
  console.log(`  Deteccion: ${fechaDeteccion}`);
  console.log(`  Descripcion: ${description}`);
  console.log(`  Destinatario: ${DIRECTOR_EMAIL}`);
  console.log(`  Limite AEPD (72h): ${add72Hours(fechaDeteccion)}`);

  if (DRY_RUN) {
    const { sendTemplate } = await import('../compartido/email-sender.mjs');
    // Just load and render the template for preview
    console.log(`\n[DRY RUN] Email no enviado. Preview del contenido:\n`);
    console.log(`  To: ${DIRECTOR_EMAIL}`);
    console.log(`  Subject: URGENTE: Posible brecha de seguridad`);
    console.log(`  Variables: ${JSON.stringify(vars, null, 2)}\n`);
    return;
  }

  // Send actual email
  const { sendTemplate } = await import('../compartido/email-sender.mjs');
  const result = await sendTemplate('brecha-director', DIRECTOR_EMAIL, vars);
  console.log(`\n  Email enviado: ${result.messageId}`);

  // Log to audit
  const { logAudit } = await import('../compartido/audit-client.mjs');
  await logAudit({
    tabla: 'BREACH_NOTIFICATION',
    operacion: 'CREATE',
    rowId: breachId,
    usuario: 'breach-notification.mjs',
    campos: JSON.stringify({ tipo: 'director', to: DIRECTOR_EMAIL }),
    fuente: 'CLI',
    detalles: description,
    severidad: 'alert',
  });

  console.log(`  Registrado en audit log\n`);
}

// =====================================================
// NOTIFY AEPD (72h)
// =====================================================

async function cmdNotifyAepd() {
  const breachId = getArg('--breach-id');
  if (!breachId) {
    console.error('Error: --breach-id es requerido para notificar a la AEPD');
    process.exit(1);
  }

  if (!DRY_RUN && !CONFIRM) {
    console.error('Error: usa --dry-run para preview o --confirm para enviar');
    process.exit(1);
  }

  const description = getArg('--description') || 'Ver informe adjunto';
  const tablasAfectadas = getArg('--affected-tables') || 'Por determinar';
  const registrosAfectados = getArg('--affected-count') || 'Por determinar';
  const tipoDatos = getArg('--data-types') || 'Nombre, Email, datos academicos';
  const consecuencias = getArg('--consequences') || 'Posible acceso no autorizado a datos personales de alumnos';
  const medidas = getArg('--measures') || 'Revision de accesos, cambio de credenciales, refuerzo de controles';
  const comunicacion = getArg('--communication') || 'Se notificara a los afectados si se confirma riesgo alto';

  const vars = {
    breach_id: breachId,
    fecha_deteccion: new Date().toISOString(),
    descripcion: description,
    tablas_afectadas: tablasAfectadas,
    registros_afectados: registrosAfectados,
    tipo_datos: tipoDatos,
    consecuencias: consecuencias,
    medidas_adoptadas: medidas,
    comunicacion_afectados: comunicacion,
    iitd_nif: INSTITUCION.nif,
    iitd_direccion: INSTITUCION.direccion,
    iitd_cp: INSTITUCION.cp,
    iitd_ciudad: INSTITUCION.ciudad,
    iitd_telefono: INSTITUCION.telefono,
  };

  console.log(`\nNotificacion a la AEPD (72h) — RGPD Art. 33\n`);
  console.log(`  Breach ID: ${breachId}`);
  console.log(`  Responsable: ${INSTITUCION.nombre} (${INSTITUCION.nif})`);

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Notificacion AEPD no enviada. Variables:\n`);
    console.log(JSON.stringify(vars, null, 2));
    console.log(`\nPara enviar: sustituya --dry-run por --confirm\n`);
    return;
  }

  // The AEPD notification would typically be submitted via their web portal
  // This generates the structured email/document for the DPO to submit
  const { sendTemplate } = await import('../compartido/email-sender.mjs');
  const result = await sendTemplate('brecha-aepd', INSTITUCION.email, vars);
  console.log(`\n  Informe AEPD generado y enviado a: ${INSTITUCION.email}`);
  console.log(`  Message ID: ${result.messageId}`);
  console.log(`\n  IMPORTANTE: Enviar tambien via el portal web de la AEPD:`);
  console.log(`  https://sedeagpd.gob.es/sede-electronica-web/\n`);

  const { logAudit } = await import('../compartido/audit-client.mjs');
  await logAudit({
    tabla: 'BREACH_NOTIFICATION',
    operacion: 'CREATE',
    rowId: breachId,
    usuario: 'breach-notification.mjs',
    campos: JSON.stringify({ tipo: 'aepd' }),
    fuente: 'CLI',
    detalles: description,
    severidad: 'alert',
  });
}

// =====================================================
// NOTIFY AFFECTED (Art. 34)
// =====================================================

async function cmdNotifyAffected() {
  const breachId = getArg('--breach-id') || 'BREACH-UNKNOWN';
  const email = getArg('--email');
  const all = args.includes('--all');

  if (!email && !all) {
    console.error('Error: usa --email alumno@email.com o --all');
    process.exit(1);
  }

  if (!DRY_RUN && !CONFIRM) {
    console.error('Error: usa --dry-run para preview o --confirm para enviar');
    process.exit(1);
  }

  const description = getArg('--description') || 'Se ha detectado un acceso no autorizado a algunos datos personales';
  const tipoDatos = getArg('--data-types') || 'Nombre, Email, datos academicos';
  const medidas = getArg('--measures') || 'Hemos reforzado los controles de seguridad y cambiado las credenciales de acceso';

  const vars = {
    descripcion: description,
    tipo_datos: tipoDatos,
    medidas_adoptadas: medidas,
    iitd_nif: INSTITUCION.nif,
    iitd_telefono: INSTITUCION.telefono,
  };

  let recipients = [];
  if (email) {
    recipients = [email];
  } else if (all) {
    // Fetch affected from ALUMNOS table
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { getAllRecords } = require('../compartido/alumnos-client.js');
    const records = await getAllRecords();
    recipients = records.map(r => r.field?.Email).filter(Boolean);
    console.log(`\n  Encontrados ${recipients.length} alumnos con email\n`);
  }

  console.log(`Notificacion a afectados — RGPD Art. 34\n`);
  console.log(`  Breach ID: ${breachId}`);
  console.log(`  Destinatarios: ${recipients.length}`);

  if (DRY_RUN) {
    console.log(`\n[DRY RUN] Emails no enviados.`);
    console.log(`  Primeros 5: ${recipients.slice(0, 5).join(', ')}${recipients.length > 5 ? '...' : ''}`);
    console.log(`  Variables: ${JSON.stringify(vars, null, 2)}\n`);
    return;
  }

  const { sendTemplate } = await import('../compartido/email-sender.mjs');
  const { logAudit } = await import('../compartido/audit-client.mjs');

  let sent = 0, errors = 0;
  for (const to of recipients) {
    try {
      await sendTemplate('brecha-afectado', to, vars);
      sent++;
      if (sent % 10 === 0) console.log(`  Enviados: ${sent}/${recipients.length}`);
    } catch (err) {
      console.error(`  Error enviando a ${to}: ${err.message}`);
      errors++;
    }
    // Rate limit: 100ms between emails
    await new Promise(r => setTimeout(r, 100));
  }

  console.log(`\n  Resultado: ${sent} enviados, ${errors} errores`);

  await logAudit({
    tabla: 'BREACH_NOTIFICATION',
    operacion: 'CREATE',
    rowId: breachId,
    usuario: 'breach-notification.mjs',
    campos: JSON.stringify({ tipo: 'afectados', count: sent }),
    fuente: 'CLI',
    detalles: `Notificacion a ${sent} afectados`,
    severidad: 'alert',
  });
}

// =====================================================
// SHEET OUTPUT
// =====================================================

async function cmdSheet() {
  if (!SHEET_ID) {
    console.error('Error: PANEL_IITD_SHEET_ID no configurado');
    process.exit(1);
  }

  const { getAuditLog, detectAnomalies } = await import('../compartido/audit-client.mjs');
  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();
  const TAB = 'Brechas RGPD';

  // Ensure tab exists
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  }

  // Build report data
  const anomalies = await detectAnomalies({ days: 90 });
  const log = await getAuditLog({ days: 90 });

  const rows = [
    ['Informe de Auditoria RGPD', '', '', '', `Generado: ${new Date().toISOString()}`],
    [],
    ['Anomalias detectadas (90 dias)', `${anomalies.length} total`],
    ['Severidad', 'Tipo', 'Descripcion', 'Registros afectados'],
  ];

  for (const a of anomalies) {
    rows.push([a.severity.toUpperCase(), a.type, a.description, String(a.records.length)]);
  }

  rows.push([], ['Ultimos registros audit log (max 200)']);
  rows.push(['Fecha', 'Usuario', 'Tabla', 'Operacion', 'Row ID', 'Severidad', 'Detalles']);
  for (const r of log.slice(0, 200)) {
    rows.push([r.fecha, r.usuario, r.tabla, r.operacion, r.rowId, r.severidad, r.detalles]);
  }

  // Write
  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `'${TAB}'!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  console.log(`  Pestana "${TAB}" actualizada en Panel IITD (${rows.length} filas)`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  if (!REPORT && !NOTIFY_DIRECTOR && !NOTIFY_AEPD && !NOTIFY_AFFECTED && !SHEET_MODE || args.includes('--help')) {
    console.log(`
Notificacion de Brechas RGPD (N45) — Art. 33/34

Comandos:
  --report                                    Informe anomalias
  --notify-director --description "X"         Notificar al director (24h)
  --notify-aepd --breach-id X                 Generar notificacion AEPD (72h)
  --notify-affected --email X / --all         Notificar afectados
  --sheet                                     Registrar en Panel IITD

Opciones:
  --dry-run          Preview sin enviar
  --confirm          Enviar/ejecutar
  --breach-id X      ID del incidente
  --description "X"  Descripcion de la brecha
  --affected-tables  Tablas afectadas (ej: ALUMNOS,CALIFICACIONES)
  --affected-count   Numero aprox. de afectados
  --data-types       Tipos de datos afectados
  --days N           Dias a analizar (default: 30)
`);
    return;
  }

  if (REPORT) return cmdReport();
  if (NOTIFY_DIRECTOR) return cmdNotifyDirector();
  if (NOTIFY_AEPD) return cmdNotifyAepd();
  if (NOTIFY_AFFECTED) return cmdNotifyAffected();
  if (SHEET_MODE) return cmdSheet();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
