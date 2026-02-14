#!/usr/bin/env node

/**
 * Onboarding Funnel — IITD (N32)
 *
 * Gestión del funnel de conversión: blog → curso gratuito → secuencia email → upsell
 *
 * Flujo:
 *   1. Lead capturado (webhook/manual) → Stackby LEADS (estado: nuevo)
 *   2. --process → envía email bienvenida (día 0)
 *   3. --sequence → avanza secuencia diaria (días 1-6)
 *   4. --upsell → envía oferta de curso de pago (día 7+)
 *   5. --report → informe de conversión
 *
 * Usage:
 *   node onboarding-funnel.mjs --process [--dry-run]      # Procesar leads nuevos
 *   node onboarding-funnel.mjs --sequence [--dry-run]      # Enviar siguiente lección
 *   node onboarding-funnel.mjs --upsell [--dry-run]        # Enviar oferta a completos
 *   node onboarding-funnel.mjs --report                    # Informe conversión
 *   node onboarding-funnel.mjs --help                      # Ayuda
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_LEADS_TABLE_ID
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
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
// IMPORTS (lazy — para que --help funcione sin deps)
// =====================================================

let leadsClient = null;
let emailSender = null;

async function loadDeps() {
  if (!leadsClient) {
    leadsClient = await import('../compartido/leads-client.mjs');
    emailSender = await import('../compartido/email-sender.mjs');
  }
}

// =====================================================
// SEQUENCE CONFIG
// =====================================================

const SECUENCIA = [
  { dia: 1, estado: 'secuencia_dia_1', template: 'curso-gratuito-leccion', titulo: 'Introduccion a la Teologia' },
  { dia: 2, estado: 'secuencia_dia_2', template: 'curso-gratuito-leccion', titulo: 'La Biblia como fuente' },
  { dia: 3, estado: 'secuencia_dia_3', template: 'curso-gratuito-leccion', titulo: 'Teologia sistematica' },
  { dia: 4, estado: 'secuencia_dia_4', template: 'curso-gratuito-leccion', titulo: 'La tradicion de la Iglesia' },
  { dia: 5, estado: 'secuencia_dia_5', template: 'curso-gratuito-leccion', titulo: 'Etica y moral cristiana' },
  { dia: 6, estado: 'secuencia_dia_6', template: 'curso-gratuito-leccion', titulo: 'La mision educativa' },
];

// Map estado → siguiente paso en la secuencia
const SIGUIENTE_PASO = {
  'nuevo': null, // procesado por --process, no --sequence
  'secuencia_dia_1': SECUENCIA[1],
  'secuencia_dia_2': SECUENCIA[2],
  'secuencia_dia_3': SECUENCIA[3],
  'secuencia_dia_4': SECUENCIA[4],
  'secuencia_dia_5': SECUENCIA[5],
  'secuencia_dia_6': { dia: 7, estado: 'secuencia_completa', template: null, titulo: null },
};

// =====================================================
// PROCESS — Leads nuevos → email bienvenida
// =====================================================

async function processNewLeads(dryRun = false) {
  await loadDeps();

  const nuevos = await leadsClient.listLeads({ estado: 'nuevo' });
  console.log(`Leads nuevos: ${nuevos.length}`);

  if (nuevos.length === 0) {
    console.log('No hay leads nuevos por procesar.');
    return { processed: 0 };
  }

  let processed = 0;
  for (const lead of nuevos) {
    console.log(`  ${lead.email} — ${lead.nombre || '(sin nombre)'}`);

    if (dryRun) {
      console.log(`    [DRY-RUN] Enviaría email bienvenida + actualizar a secuencia_dia_1`);
      processed++;
      continue;
    }

    // Send welcome email
    await emailSender.sendTemplate('curso-gratuito-bienvenida', lead.email, {
      nombre: lead.nombre || 'estudiante',
      curso_gratuito: lead.cursoGratuito || 'Introduccion a la Teologia',
      leccion_contenido: 'En esta primera leccion descubriras los fundamentos de la teologia y por que es relevante para la educacion y la vida cotidiana.',
    });

    // Update state
    await leadsClient.updateLead(lead.email, { estado: 'secuencia_dia_1' });

    console.log(`    Bienvenida enviada + estado → secuencia_dia_1`);
    processed++;
  }

  console.log(`\nProcesados: ${processed}`);
  return { processed };
}

// =====================================================
// SEQUENCE — Avanzar secuencia diaria
// =====================================================

async function advanceSequence(dryRun = false) {
  await loadDeps();

  // Get all leads in active sequence (dia 1-6)
  const allLeads = await leadsClient.listLeads();
  const enSecuencia = allLeads.filter(l => SIGUIENTE_PASO[l.estado]);

  console.log(`Leads en secuencia activa: ${enSecuencia.length}`);

  if (enSecuencia.length === 0) {
    console.log('No hay leads en secuencia activa.');
    return { advanced: 0, completed: 0 };
  }

  let advanced = 0, completed = 0;
  for (const lead of enSecuencia) {
    const siguiente = SIGUIENTE_PASO[lead.estado];
    if (!siguiente) continue;

    // Check elapsed time (min 20h between emails to avoid spamming)
    const captura = new Date(lead.fechaCaptura);
    const diaActual = parseInt(lead.estado.replace('secuencia_dia_', '')) || 0;
    const horasMinimas = diaActual * 24;
    const horasTranscurridas = (Date.now() - captura.getTime()) / (1000 * 60 * 60);

    if (horasTranscurridas < horasMinimas) {
      console.log(`  ${lead.email} — ${lead.estado} (esperando: ${Math.ceil(horasMinimas - horasTranscurridas)}h restantes)`);
      continue;
    }

    console.log(`  ${lead.email} — ${lead.estado} → ${siguiente.estado}`);

    if (dryRun) {
      if (siguiente.template) {
        console.log(`    [DRY-RUN] Enviaría leccion ${siguiente.dia}: ${siguiente.titulo}`);
      } else {
        console.log(`    [DRY-RUN] Secuencia completa`);
      }
      if (siguiente.estado === 'secuencia_completa') completed++;
      advanced++;
      continue;
    }

    // Send lesson email if applicable
    if (siguiente.template) {
      await emailSender.sendTemplate(siguiente.template, lead.email, {
        nombre: lead.nombre || 'estudiante',
        curso_gratuito: lead.cursoGratuito || 'Introduccion a la Teologia',
        dia_numero: String(siguiente.dia),
        leccion_titulo: siguiente.titulo,
        leccion_contenido: `Contenido de la leccion ${siguiente.dia}: ${siguiente.titulo}. Este contenido debe ser configurado con el material real del curso.`,
      });
    }

    // Update state
    await leadsClient.updateLead(lead.email, { estado: siguiente.estado });

    if (siguiente.estado === 'secuencia_completa') {
      console.log(`    Secuencia completa`);
      completed++;
    } else {
      console.log(`    Leccion ${siguiente.dia} enviada + estado → ${siguiente.estado}`);
    }
    advanced++;
  }

  console.log(`\nAvanzados: ${advanced} | Completaron secuencia: ${completed}`);
  return { advanced, completed };
}

// =====================================================
// UPSELL — Oferta curso de pago
// =====================================================

async function sendUpsell(dryRun = false) {
  await loadDeps();

  const completos = await leadsClient.listLeads({ estado: 'secuencia_completa' });
  console.log(`Leads con secuencia completa: ${completos.length}`);

  if (completos.length === 0) {
    console.log('No hay leads pendientes de upsell.');
    return { sent: 0 };
  }

  let sent = 0;
  for (const lead of completos) {
    console.log(`  ${lead.email} — ${lead.nombre || '(sin nombre)'}`);

    if (dryRun) {
      console.log(`    [DRY-RUN] Enviaría email upsell + actualizar a upsell_enviado`);
      sent++;
      continue;
    }

    await emailSender.sendTemplate('curso-gratuito-upsell', lead.email, {
      nombre: lead.nombre || 'estudiante',
      curso_gratuito: lead.cursoGratuito || 'Introduccion a la Teologia',
    });

    await leadsClient.updateLead(lead.email, { estado: 'upsell_enviado' });

    console.log(`    Upsell enviado + estado → upsell_enviado`);
    sent++;
  }

  console.log(`\nUpsells enviados: ${sent}`);
  return { sent };
}

// =====================================================
// REPORT — Informe de conversión
// =====================================================

async function generateReport() {
  await loadDeps();

  const stats = await leadsClient.getStats();

  console.log(`
========================================
  ONBOARDING FUNNEL — Informe
  ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
========================================

  Total leads capturados:  ${stats.total}
  En secuencia activa:     ${(stats.byEstado['secuencia_dia_1'] || 0) + (stats.byEstado['secuencia_dia_2'] || 0) + (stats.byEstado['secuencia_dia_3'] || 0) + (stats.byEstado['secuencia_dia_4'] || 0) + (stats.byEstado['secuencia_dia_5'] || 0) + (stats.byEstado['secuencia_dia_6'] || 0)}
  Secuencia completa:      ${stats.secuenciaCompleta}
  Conversiones (pagado):   ${stats.conversiones}
  Tasa de conversion:      ${stats.tasaConversion}

  --- Por estado ---`);

  for (const [estado, count] of Object.entries(stats.byEstado).sort((a, b) => b[1] - a[1])) {
    const bar = '#'.repeat(Math.min(count, 40));
    console.log(`    ${estado.padEnd(22)} ${String(count).padStart(4)}  ${bar}`);
  }

  if (Object.keys(stats.byOrigen).length > 0) {
    console.log(`\n  --- Por origen ---`);
    for (const [origen, count] of Object.entries(stats.byOrigen).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${origen.padEnd(22)} ${String(count).padStart(4)}`);
    }
  }

  if (Object.keys(stats.byCurso).length > 0) {
    console.log(`\n  --- Por curso gratuito ---`);
    for (const [curso, count] of Object.entries(stats.byCurso).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${curso.padEnd(22)} ${String(count).padStart(4)}`);
    }
  }

  console.log(`\n========================================\n`);
  return stats;
}

// =====================================================
// CLI
// =====================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Onboarding Funnel IITD (N32) — Curso gratuito → Conversión

Comandos:
  --process [--dry-run]     Procesar leads nuevos (bienvenida + dia 1)
  --sequence [--dry-run]    Avanzar secuencia diaria (dias 2-6 + completar)
  --upsell [--dry-run]      Enviar oferta curso pagado (dia 7+)
  --report                  Informe de conversión del funnel

Flujo completo:
  1. Lead capturado → estado "nuevo"
  2. --process → email bienvenida → "secuencia_dia_1"
  3. --sequence (diario) → lecciones 2-6 → "secuencia_completa"
  4. --upsell → oferta → "upsell_enviado"
  5. Conversión manual → "convertido"
`);
    return;
  }

  if (args.includes('--process')) {
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Procesando leads nuevos...\n`);
    await processNewLeads(dryRun);
    return;
  }

  if (args.includes('--sequence')) {
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Avanzando secuencia...\n`);
    await advanceSequence(dryRun);
    return;
  }

  if (args.includes('--upsell')) {
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Enviando upsells...\n`);
    await sendUpsell(dryRun);
    return;
  }

  if (args.includes('--report')) {
    await generateReport();
    return;
  }

  console.error('Opcion no reconocida. Usa --help para ver opciones.');
  process.exit(1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
