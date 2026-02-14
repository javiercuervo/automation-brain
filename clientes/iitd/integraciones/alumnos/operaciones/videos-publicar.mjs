#!/usr/bin/env node

/**
 * Videos Publicar — IITD (N31)
 *
 * Gestión de publicación y reporting de videos educativos multidioma.
 *
 * Usage:
 *   node videos-publicar.mjs --list [--programa X]    # Listar por programa
 *   node videos-publicar.mjs --publish --id X          # Marcar publicado
 *   node videos-publicar.mjs --embed --id X            # Generar embed HTML
 *   node videos-publicar.mjs --report                  # Informe cobertura
 *   node videos-publicar.mjs --help                    # Ayuda
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_VIDEOS_TABLE_ID
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

let videosClient = null;

async function loadDeps() {
  if (!videosClient) {
    videosClient = await import('../compartido/videos-client.mjs');
  }
}

// Programas IITD reales
const PROGRAMAS = [
  'DECA Infantil y Primaria',
  'DECA ESO y Bachillerato',
  'Formacion Sistematica',
  'Formacion Biblica',
  'Compromiso Laical',
  'Cursos Monograficos',
];

// =====================================================
// LIST — Por programa/idioma
// =====================================================

async function listByPrograma(programa) {
  await loadDeps();

  const filters = {};
  if (programa) filters.programa = programa;

  const videos = await videosClient.listVideos(filters);

  if (videos.length === 0) {
    console.log(`No hay videos${programa ? ` para "${programa}"` : ''}.`);
    return;
  }

  // Group by programa
  const grouped = {};
  for (const v of videos) {
    const prog = v.programa || '(sin programa)';
    if (!grouped[prog]) grouped[prog] = [];
    grouped[prog].push(v);
  }

  for (const [prog, vids] of Object.entries(grouped)) {
    console.log(`\n  ${prog} (${vids.length} videos):`);
    for (const v of vids) {
      const icon = { publicado: '+', produccion: '~', borrador: '.', retirado: 'x' }[v.estado] || '?';
      console.log(`    ${icon} [${v.idioma}] ${v.titulo} — ${v.plataforma || '?'} ${v.duracion ? '(' + v.duracion + ')' : ''}`);
    }
  }
  console.log();
}

// =====================================================
// PUBLISH — Marcar como publicado
// =====================================================

async function publishVideo(id) {
  await loadDeps();

  await videosClient.updateVideo(id, {
    estado: 'publicado',
    fechaPublicacion: new Date().toISOString(),
  });

  console.log(`Video ${id} marcado como publicado.`);
}

// =====================================================
// EMBED — Generar HTML embed
// =====================================================

async function embedVideo(id) {
  await loadDeps();

  const videos = await videosClient.listVideos();
  const video = videos.find(v => v.id === id);

  if (!video) {
    console.error(`Video no encontrado: ${id}`);
    process.exit(1);
  }

  const html = videosClient.generateEmbed(video);
  console.log(`\nEmbed para "${video.titulo}" (${video.idioma}):\n`);
  console.log(html);
  console.log();
}

// =====================================================
// REPORT — Cobertura por programa e idioma
// =====================================================

async function generateReport() {
  await loadDeps();

  const videos = await videosClient.listVideos();
  const idiomas = videosClient.IDIOMAS;

  console.log(`
========================================
  VIDEOS MULTIDIOMA — Informe de cobertura
  ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
========================================

  Total videos: ${videos.length}
  Publicados: ${videos.filter(v => v.estado === 'publicado').length}

  --- Cobertura por programa e idioma ---
`);

  // Header
  const header = `  ${'Programa'.padEnd(32)}  ${idiomas.map(i => i.padEnd(4)).join('  ')}  Total`;
  console.log(header);
  console.log(`  ${'-'.repeat(32)}  ${idiomas.map(() => '----').join('  ')}  -----`);

  for (const prog of PROGRAMAS) {
    const progsVids = videos.filter(v => v.programa === prog);
    const counts = idiomas.map(idioma =>
      progsVids.filter(v => v.idioma === idioma && v.estado === 'publicado').length
    );
    const total = counts.reduce((a, b) => a + b, 0);
    const cells = counts.map(c => (c > 0 ? String(c) : '-').padEnd(4));
    console.log(`  ${prog.padEnd(32)}  ${cells.join('  ')}  ${String(total).padStart(5)}`);
  }

  // Totals row
  const totals = idiomas.map(idioma =>
    videos.filter(v => v.idioma === idioma && v.estado === 'publicado').length
  );
  const grandTotal = totals.reduce((a, b) => a + b, 0);
  console.log(`  ${'-'.repeat(32)}  ${idiomas.map(() => '----').join('  ')}  -----`);
  console.log(`  ${'TOTAL'.padEnd(32)}  ${totals.map(t => String(t).padEnd(4)).join('  ')}  ${String(grandTotal).padStart(5)}`);

  console.log(`\n========================================\n`);
}

// =====================================================
// CLI
// =====================================================

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Videos Publicar IITD (N31) — Gestión multidioma

Comandos:
  --list [--programa X]     Listar videos por programa
  --publish --id X          Marcar video como publicado
  --embed --id X            Generar código embed HTML
  --report                  Informe de cobertura programa/idioma
`);
    return;
  }

  if (args.includes('--list')) {
    await listByPrograma(getArg('--programa'));
    return;
  }

  if (args.includes('--publish')) {
    const id = getArg('--id');
    if (!id) { console.error('Error: --id requerido'); process.exit(1); }
    await publishVideo(id);
    return;
  }

  if (args.includes('--embed')) {
    const id = getArg('--id');
    if (!id) { console.error('Error: --id requerido'); process.exit(1); }
    await embedVideo(id);
    return;
  }

  if (args.includes('--report')) {
    await generateReport();
    return;
  }

  console.error('Opcion no reconocida. Usa --help.');
  process.exit(1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
