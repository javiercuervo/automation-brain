#!/usr/bin/env node

/**
 * Tutorías Upsell — IITD (N33)
 *
 * Detecta alumnos que han completado asignaturas/programas y les ofrece
 * tutorías personalizadas como servicio adicional.
 *
 * Flujo:
 *   1. --detect → escanear calificaciones → identificar completados
 *   2. --send [--dry-run] → enviar email oferta tutoría
 *   3. --report → informe conversión tutorías
 *
 * Usage:
 *   node tutorias-upsell.mjs --detect [--dry-run]     # Detectar completados
 *   node tutorias-upsell.mjs --send [--dry-run]        # Enviar ofertas
 *   node tutorias-upsell.mjs --report                  # Informe conversión
 *   node tutorias-upsell.mjs --help                    # Ayuda
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_CALIFICACIONES_TABLE_ID,
 *   STACKBY_TUTORIAS_UPSELLS_TABLE_ID, SMTP_*
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
// IMPORTS (lazy)
// =====================================================

let calificacionesClient = null;
let tutoriasClient = null;
let emailSender = null;

async function loadDeps() {
  if (!calificacionesClient) {
    calificacionesClient = await import('../compartido/calificaciones-client.mjs');
    tutoriasClient = await import('../compartido/tutorias-client.mjs');
    emailSender = await import('../compartido/email-sender.mjs');
  }
}

// =====================================================
// DETECT — Alumnos que completaron asignaturas
// =====================================================

async function detectCompletados(dryRun = false) {
  await loadDeps();

  console.log('Cargando calificaciones...');
  const calificaciones = await calificacionesClient.listCalificaciones();
  console.log(`  ${calificaciones.length} calificaciones encontradas`);

  // Group by email+programa
  const byAlumno = {};
  for (const c of calificaciones) {
    if (!c.email) continue;
    const nota = parseFloat(c.calificacionFinal) || 0;
    if (nota < 5) continue; // solo aprobados

    const key = `${c.email}|${c.programa}`;
    if (!byAlumno[key]) {
      byAlumno[key] = {
        email: c.email,
        nombre: `${c.nombre || ''} ${c.apellidos || ''}`.trim(),
        programa: c.programa,
        asignaturas: [],
      };
    }
    byAlumno[key].asignaturas.push(c.asignatura);
  }

  // Check existing offers to avoid duplicates
  let existingOfertas = [];
  try {
    existingOfertas = await tutoriasClient.listOfertas();
  } catch { /* tabla puede no existir aún */ }
  const existingKeys = new Set(existingOfertas.map(o => `${o.email}|${o.programa}`));

  // Filter: at least 3 approved subjects and no existing offer
  const candidatos = Object.values(byAlumno).filter(a =>
    a.asignaturas.length >= 3 && !existingKeys.has(`${a.email}|${a.programa}`)
  );

  console.log(`\nCandidatos nuevos: ${candidatos.length} (min 3 asignaturas aprobadas, sin oferta previa)\n`);

  let created = 0;
  for (const c of candidatos) {
    console.log(`  ${c.email} — ${c.programa} (${c.asignaturas.length} asignaturas aprobadas)`);

    if (dryRun) {
      console.log(`    [DRY-RUN] Crearía oferta tutorías`);
      created++;
      continue;
    }

    await tutoriasClient.createOferta({
      email: c.email,
      nombre: c.nombre,
      cursoCompletado: c.asignaturas.join(', '),
      programa: c.programa,
      fechaCompletado: new Date().toISOString(),
    });

    console.log(`    Oferta creada`);
    created++;
  }

  console.log(`\nDetectados: ${candidatos.length} | Ofertas creadas: ${created}`);
  return { detected: candidatos.length, created };
}

// =====================================================
// SEND — Enviar emails de oferta
// =====================================================

async function sendOfertas(dryRun = false) {
  await loadDeps();

  const pendientes = await tutoriasClient.listOfertas({ estadoOferta: 'pendiente' });
  console.log(`Ofertas pendientes de envío: ${pendientes.length}`);

  if (pendientes.length === 0) {
    console.log('No hay ofertas pendientes por enviar.');
    return { sent: 0 };
  }

  let sent = 0;
  for (const oferta of pendientes) {
    console.log(`  ${oferta.email} — ${oferta.programa}`);

    if (dryRun) {
      console.log(`    [DRY-RUN] Enviaría email oferta tutorías`);
      sent++;
      continue;
    }

    await emailSender.sendTemplate('tutorias-oferta', oferta.email, {
      nombre: oferta.nombre || 'estudiante',
      programa: oferta.programa,
      curso_completado: oferta.cursoCompletado,
    });

    await tutoriasClient.updateOferta(oferta.id, {
      estadoOferta: 'enviada',
      fechaOferta: new Date().toISOString(),
    });

    console.log(`    Email enviado + estado → enviada`);
    sent++;
  }

  console.log(`\nOfertas enviadas: ${sent}`);
  return { sent };
}

// =====================================================
// REPORT — Informe de conversión
// =====================================================

async function generateReport() {
  await loadDeps();

  const stats = await tutoriasClient.getStats();

  console.log(`
========================================
  TUTORIAS UPSELL — Informe
  ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
========================================

  Total ofertas:        ${stats.total}
  Enviadas:             ${stats.byEstado['enviada'] || 0}
  Aceptadas:            ${stats.conversiones}
  Tasa conversion:      ${stats.tasaConversion}

  --- Por estado ---`);

  for (const [estado, count] of Object.entries(stats.byEstado).sort((a, b) => b[1] - a[1])) {
    const bar = '#'.repeat(Math.min(count, 40));
    console.log(`    ${estado.padEnd(16)} ${String(count).padStart(4)}  ${bar}`);
  }

  if (Object.keys(stats.byPrograma).length > 0) {
    console.log(`\n  --- Por programa ---`);
    for (const [prog, count] of Object.entries(stats.byPrograma).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${prog.padEnd(30)} ${String(count).padStart(4)}`);
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
Tutorias Upsell IITD (N33) — Oferta post-curso

Comandos:
  --detect [--dry-run]    Detectar alumnos con 3+ asignaturas aprobadas
  --send [--dry-run]      Enviar email de oferta a ofertas pendientes
  --report                Informe de conversión tutorías

Flujo:
  1. --detect → escanea calificaciones → crea ofertas (estado: pendiente)
  2. --send → envía email → estado: enviada
  3. Conversión manual → estado: aceptada
`);
    return;
  }

  if (args.includes('--detect')) {
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Detectando alumnos completados...\n`);
    await detectCompletados(dryRun);
    return;
  }

  if (args.includes('--send')) {
    console.log(`${dryRun ? '[DRY-RUN] ' : ''}Enviando ofertas...\n`);
    await sendOfertas(dryRun);
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
