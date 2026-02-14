#!/usr/bin/env node

/**
 * Ticket Processor — IITD (N35)
 *
 * Procesador de tickets: fetch nuevos → matchFAQ → auto-respond o escalar.
 *
 * Usage:
 *   node ticket-processor.mjs --process --dry-run                 # Preview procesamiento
 *   node ticket-processor.mjs --process --confirm [--auto-respond]  # Ejecutar
 *   node ticket-processor.mjs --report [--days 30]                 # Informe
 *   node ticket-processor.mjs --sheet                              # Tab "Tickets" en Panel IITD
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

const SHEET_ID = process.env.PANEL_IITD_SHEET_ID;
const STAFF_EMAIL = process.env.IITD_DIRECTOR_EMAIL || 'alumnos@institutoteologia.org';

const PROCESS_MODE = process.argv.includes('--process');
const REPORT_MODE = process.argv.includes('--report');
const SHEET_MODE = process.argv.includes('--sheet');
const DRY_RUN = process.argv.includes('--dry-run');
const CONFIRM = process.argv.includes('--confirm');
const AUTO_RESPOND = process.argv.includes('--auto-respond');

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

// =====================================================
// PROCESS TICKETS
// =====================================================

async function processTickets() {
  const { listarTickets, actualizarTicket, ESTADOS_TICKET } = await import('../compartido/tickets-client.mjs');
  const { matchFAQ, CONFIDENCE_THRESHOLD } = await import('../compartido/faq-responder.mjs');

  const nuevos = await listarTickets({ estado: 'nuevo' });
  if (nuevos.length === 0) {
    console.log('No hay tickets nuevos para procesar.');
    return;
  }

  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}Procesando ${nuevos.length} tickets nuevos...\n`);

  let autoResponded = 0, escalated = 0;

  for (const ticket of nuevos) {
    const faqResult = matchFAQ(ticket.asunto, ticket.mensaje);

    console.log(`  ${ticket.ticketId}: "${ticket.asunto}"`);
    console.log(`    FAQ match: ${faqResult.matched ? 'SI' : 'NO'} (confianza: ${faqResult.confianza}, categoria: ${faqResult.categoria || '-'})`);

    if (faqResult.matched && faqResult.confianza >= CONFIDENCE_THRESHOLD) {
      // Auto-respond
      if (DRY_RUN) {
        console.log(`    [DRY-RUN] Auto-responderia con FAQ ${faqResult.faqId}`);
        autoResponded++;
        continue;
      }

      if (AUTO_RESPOND) {
        await actualizarTicket(ticket.id, {
          estado: ESTADOS_TICKET.AUTO_RESPONDIDO,
          respuesta: faqResult.respuesta,
          fuenteRespuesta: 'faq_match',
          categoria: faqResult.categoria,
          confianzaCategoria: String(faqResult.confianza),
        });

        // Send auto-response email
        try {
          const { sendTemplate } = await import('../compartido/email-sender.mjs');
          await sendTemplate('respuesta-ticket', ticket.emailRemitente, {
            nombre: ticket.nombreRemitente || ticket.emailRemitente,
            ticket_id: ticket.ticketId,
            asunto: ticket.asunto,
            respuesta: faqResult.respuesta,
          });
          console.log(`    Auto-respondido y email enviado`);
        } catch (err) {
          console.log(`    Auto-respondido (email fallido: ${err.message})`);
        }
        autoResponded++;
      } else {
        // Mark FAQ match but don't auto-respond
        await actualizarTicket(ticket.id, {
          categoria: faqResult.categoria,
          confianzaCategoria: String(faqResult.confianza),
          notasInternas: `FAQ match: ${faqResult.faqId} (confianza: ${faqResult.confianza})`,
        });
        console.log(`    Clasificado, pendiente de auto-respuesta (usar --auto-respond)`);
      }
    } else {
      // Escalate
      if (DRY_RUN) {
        console.log(`    [DRY-RUN] Escalaria a ${STAFF_EMAIL}`);
        escalated++;
        continue;
      }

      await actualizarTicket(ticket.id, {
        estado: ESTADOS_TICKET.ESCALADO,
        asignadoA: STAFF_EMAIL,
        fechaEscalado: new Date().toISOString(),
        categoria: faqResult.categoria || 'general',
        confianzaCategoria: String(faqResult.confianza),
        prioridad: 'media',
      });

      // Notify staff
      try {
        const { sendTemplate } = await import('../compartido/email-sender.mjs');
        await sendTemplate('ticket-escalado', STAFF_EMAIL, {
          ticket_id: ticket.ticketId,
          email_remitente: ticket.emailRemitente,
          asunto: ticket.asunto,
          mensaje: ticket.mensaje,
          categoria: faqResult.categoria || 'general',
          confianza: String(faqResult.confianza),
        });
        console.log(`    Escalado a ${STAFF_EMAIL} (email enviado)`);
      } catch (err) {
        console.log(`    Escalado (email fallido: ${err.message})`);
      }
      escalated++;
    }
  }

  console.log(`\n${DRY_RUN ? '[DRY-RUN] ' : ''}Resultado: ${autoResponded} auto-respondidos, ${escalated} escalados`);
}

// =====================================================
// REPORT
// =====================================================

async function report() {
  const { listarTickets } = await import('../compartido/tickets-client.mjs');
  const all = await listarTickets();
  const days = parseInt(getArg('--days') || '30');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recent = all.filter(t => t.fechaCreacion && new Date(t.fechaCreacion) >= cutoff);
  const byEstado = {}, byCat = {}, byFuente = {};
  let totalSla = 0, countSla = 0;

  for (const t of recent) {
    byEstado[t.estado] = (byEstado[t.estado] || 0) + 1;
    if (t.categoria) byCat[t.categoria] = (byCat[t.categoria] || 0) + 1;
    if (t.fuenteRespuesta) byFuente[t.fuenteRespuesta] = (byFuente[t.fuenteRespuesta] || 0) + 1;
    if (t.slaHoras) { totalSla += parseFloat(t.slaHoras); countSla++; }
  }

  console.log(`\n=== INFORME TICKETS (ultimos ${days} dias) ===`);
  console.log(`Fecha: ${new Date().toISOString().split('T')[0]}`);
  console.log(`Total tickets (periodo): ${recent.length}`);
  console.log(`Total tickets (historico): ${all.length}`);
  console.log(`SLA medio: ${countSla ? (totalSla / countSla).toFixed(1) + 'h' : 'N/A'}`);
  console.log();
  console.log('--- Por estado ---');
  for (const [k, v] of Object.entries(byEstado)) console.log(`  ${k}: ${v}`);
  console.log();
  console.log('--- Por categoria ---');
  for (const [k, v] of Object.entries(byCat)) console.log(`  ${k}: ${v}`);
  console.log();
  console.log('--- Por fuente respuesta ---');
  for (const [k, v] of Object.entries(byFuente)) console.log(`  ${k}: ${v}`);
}

// =====================================================
// SHEET
// =====================================================

async function writeSheet() {
  if (!SHEET_ID) { console.error('PANEL_IITD_SHEET_ID no configurado'); return; }

  const { listarTickets } = await import('../compartido/tickets-client.mjs');
  const { getSheetsClient } = await import('../compartido/google-auth.mjs');
  const sheets = await getSheetsClient();
  const all = await listarTickets();

  const fecha = new Date().toISOString().split('T')[0];
  const byEstado = {};
  for (const t of all) byEstado[t.estado] = (byEstado[t.estado] || 0) + 1;

  const rows = [
    ['INFORME TICKETS', '', '', '', '', '', fecha],
    [],
    ['Total', all.length, '', ...Object.entries(byEstado).flat()],
    [],
    ['DETALLE TICKETS'],
    ['Ticket ID', 'Fecha', 'Email', 'Asunto', 'Categoria', 'Estado', 'Prioridad', 'SLA', 'Fuente'],
    ...all.map(t => [
      t.ticketId, (t.fechaCreacion || '').substring(0, 10), t.emailRemitente,
      t.asunto, t.categoria, t.estado, t.prioridad, t.slaHoras, t.fuenteRespuesta,
    ]),
  ];

  const TAB = 'Tickets';
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === TAB);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: TAB } } }] },
    });
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId: SHEET_ID, range: `'${TAB}'!A:Z` });
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `'${TAB}'!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });
  console.log(`Pestana "${TAB}" actualizada en Panel IITD.`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  if (process.argv.includes('--help')) {
    console.log(`
Ticket Processor IITD (N35)

Usage:
  node ticket-processor.mjs --process --dry-run                  Preview
  node ticket-processor.mjs --process --confirm [--auto-respond]  Ejecutar
  node ticket-processor.mjs --report [--days 30]                 Informe
  node ticket-processor.mjs --sheet                              Tab "Tickets" en Panel IITD
`);
    return;
  }

  if (PROCESS_MODE) {
    if (!DRY_RUN && !CONFIRM) {
      console.error('Error: --process requiere --dry-run o --confirm');
      process.exit(1);
    }
    await processTickets();
  } else if (REPORT_MODE) {
    await report();
  } else if (SHEET_MODE) {
    await writeSheet();
  } else {
    console.error('Especifica un modo: --process, --report o --sheet. Usa --help para mas info.');
    process.exit(1);
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
