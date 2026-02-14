#!/usr/bin/env node

/**
 * Flujo Publicación Cursos + Revisión COEO (N29)
 *
 * Gestiona el workflow de publicación de cursos:
 *   Borrador → Revisión COEO → Validado → Publicado
 *
 * Usage:
 *   node curso-publicar.mjs list                              # Listar cursos
 *   node curso-publicar.mjs list --estado Borrador            # Filtrar por estado
 *   node curso-publicar.mjs create --nombre "Teología I" --programa "DECA IP" --url teologia-i
 *   node curso-publicar.mjs review <nombre> [--revisor Mayte] # Enviar a revisión COEO
 *   node curso-publicar.mjs validate <nombre>                 # Marcar como validado
 *   node curso-publicar.mjs publish <nombre>                  # Publicar
 *   node curso-publicar.mjs publish-batch --estado Validado   # Publicar todos los validados
 *   node curso-publicar.mjs checklist <nombre>                # Ver checklist COEO
 *   node curso-publicar.mjs reject <nombre>                   # Devolver a borrador
 *   node curso-publicar.mjs --dry-run ...                     # Preview sin escribir
 */

import {
  listarCursos,
  crearCurso,
  cambiarEstado,
  ejecutarChecklist,
  buscarCursoPorNombre,
  ESTADOS_CURSO,
  CHECKLIST_COEO,
} from '../compartido/cursos-client.mjs';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const command = args.find(a => !a.startsWith('--'));

function getArg(name) {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

function getPositional() {
  // Get first arg after command that isn't a flag
  const cmdIdx = args.indexOf(command);
  for (let i = cmdIdx + 1; i < args.length; i++) {
    if (!args[i].startsWith('--')) return args[i];
  }
  return null;
}

async function findCurso(nombre) {
  if (!nombre) { console.error('Error: especifica el nombre del curso'); process.exit(1); }
  const curso = await buscarCursoPorNombre(nombre);
  if (!curso) { console.error(`Error: curso "${nombre}" no encontrado`); process.exit(1); }
  return curso;
}

// =====================================================
// COMMANDS
// =====================================================

async function cmdList() {
  const estadoFilter = getArg('--estado');
  let cursos = await listarCursos();

  if (estadoFilter) {
    cursos = cursos.filter(c => c.estado.toLowerCase().includes(estadoFilter.toLowerCase()));
  }

  if (cursos.length === 0) {
    console.log('No hay cursos' + (estadoFilter ? ` con estado "${estadoFilter}"` : '') + '.');
    return;
  }

  console.log(`\nCursos (${cursos.length}):\n`);
  const maxName = Math.max(...cursos.map(c => c.nombre.length), 10);
  console.log(`  ${'Nombre'.padEnd(maxName)}  ${'Estado'.padEnd(16)}  ${'Programa'.padEnd(20)}  Responsable`);
  console.log(`  ${'-'.repeat(maxName)}  ${'-'.repeat(16)}  ${'-'.repeat(20)}  -----------`);
  for (const c of cursos) {
    const emoji = { Borrador: '📝', 'Revisión COEO': '🔍', Validado: '✅', Publicado: '🚀' }[c.estado] || '❓';
    console.log(`  ${c.nombre.padEnd(maxName)}  ${emoji} ${c.estado.padEnd(14)}  ${(c.programa || '-').padEnd(20)}  ${c.responsable || '-'}`);
  }
  console.log();
}

async function cmdCreate() {
  const nombre = getArg('--nombre');
  const programa = getArg('--programa');
  const url = getArg('--url');
  const desc = getArg('--desc');
  const responsable = getArg('--responsable');
  const keywords = getArg('--keywords');
  const lms = getArg('--lms');

  if (!nombre) { console.error('Error: --nombre es requerido'); process.exit(1); }

  const fields = {
    nombre,
    programa: programa || '',
    urlSlug: url || nombre.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    descripcion: desc || '',
    responsable: responsable || '',
    keywordsSeo: keywords || '',
    enlaceLms: lms || '',
  };

  console.log(`Crear curso:`);
  console.log(`  Nombre: ${fields.nombre}`);
  console.log(`  Programa: ${fields.programa || '(sin asignar)'}`);
  console.log(`  URL slug: ${fields.urlSlug}`);
  console.log(`  Estado: ${ESTADOS_CURSO.BORRADOR}`);

  if (DRY_RUN) { console.log('\n[DRY RUN] No se ha creado nada.'); return; }

  const curso = await crearCurso(fields);
  console.log(`\n✓ Curso creado (ID: ${curso.id})`);
}

async function cmdReview() {
  const nombre = getPositional();
  const revisor = getArg('--revisor') || '';
  const curso = await findCurso(nombre);

  console.log(`Enviar a revisión COEO: "${curso.nombre}"`);
  console.log(`  Estado actual: ${curso.estado}`);
  console.log(`  Revisor: ${revisor || '(sin asignar)'}`);

  // Preview checklist
  const checklist = ejecutarChecklist(curso);
  console.log(`\nChecklist COEO:`);
  for (const item of checklist) {
    console.log(`  ${item.passed ? '✓' : '✗'} ${item.label}`);
  }

  const failed = checklist.filter(c => !c.passed);
  if (failed.length > 0) {
    console.log(`\n⚠ ${failed.length} items no superados.${FORCE ? ' (--force activo, se enviará igualmente)' : ' Usa --force para enviar igualmente.'}`);
  }

  if (DRY_RUN) { console.log('\n[DRY RUN] No se ha modificado nada.'); return; }

  const result = await cambiarEstado(curso.id, ESTADOS_CURSO.REVISION_COEO, { force: FORCE, revisor });
  console.log(`\n✓ Curso "${curso.nombre}" enviado a revisión COEO`);
}

async function cmdValidate() {
  const nombre = getPositional();
  const curso = await findCurso(nombre);

  console.log(`Validar curso: "${curso.nombre}"`);
  console.log(`  Estado actual: ${curso.estado}`);

  if (DRY_RUN) { console.log('\n[DRY RUN] No se ha modificado nada.'); return; }

  await cambiarEstado(curso.id, ESTADOS_CURSO.VALIDADO);
  console.log(`\n✓ Curso "${curso.nombre}" validado`);
}

async function cmdPublish() {
  const nombre = getPositional();
  const curso = await findCurso(nombre);

  console.log(`Publicar curso: "${curso.nombre}"`);
  console.log(`  Estado actual: ${curso.estado}`);
  console.log(`  Fecha publicación: ${new Date().toISOString().split('T')[0]}`);

  if (DRY_RUN) { console.log('\n[DRY RUN] No se ha modificado nada.'); return; }

  await cambiarEstado(curso.id, ESTADOS_CURSO.PUBLICADO);
  console.log(`\n✓ Curso "${curso.nombre}" publicado`);
}

async function cmdPublishBatch() {
  const estadoFilter = getArg('--estado') || ESTADOS_CURSO.VALIDADO;
  const cursos = (await listarCursos()).filter(c => c.estado === estadoFilter);

  if (cursos.length === 0) {
    console.log(`No hay cursos con estado "${estadoFilter}" para publicar.`);
    return;
  }

  console.log(`Publicación batch: ${cursos.length} cursos con estado "${estadoFilter}"\n`);
  for (const c of cursos) {
    console.log(`  → ${c.nombre}`);
  }

  if (DRY_RUN) { console.log('\n[DRY RUN] No se ha modificado nada.'); return; }

  let ok = 0, errors = 0;
  for (const c of cursos) {
    try {
      await cambiarEstado(c.id, ESTADOS_CURSO.PUBLICADO);
      console.log(`  ✓ ${c.nombre}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${c.nombre}: ${err.message}`);
      errors++;
    }
  }
  console.log(`\nResultado: ${ok} publicados, ${errors} errores`);
}

async function cmdChecklist() {
  const nombre = getPositional();
  const curso = await findCurso(nombre);

  console.log(`Checklist COEO: "${curso.nombre}"\n`);
  const checklist = ejecutarChecklist(curso);
  let passed = 0;
  for (const item of checklist) {
    console.log(`  ${item.passed ? '✓' : '✗'} ${item.label}`);
    if (item.passed) passed++;
  }
  console.log(`\nResultado: ${passed}/${checklist.length} superados`);
}

async function cmdReject() {
  const nombre = getPositional();
  const curso = await findCurso(nombre);

  console.log(`Devolver a borrador: "${curso.nombre}"`);
  console.log(`  Estado actual: ${curso.estado}`);

  if (DRY_RUN) { console.log('\n[DRY RUN] No se ha modificado nada.'); return; }

  await cambiarEstado(curso.id, ESTADOS_CURSO.BORRADOR);
  console.log(`\n✓ Curso "${curso.nombre}" devuelto a borrador`);
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  if (!command || command === 'help' || args.includes('--help')) {
    console.log(`
Flujo Publicación Cursos + Revisión COEO (N29)

Comandos:
  list                                  Listar cursos
  list --estado Borrador                Filtrar por estado
  create --nombre "X" --programa "Y"    Crear curso en borrador
  review <nombre> [--revisor X]         Enviar a revisión COEO
  validate <nombre>                     Marcar como validado
  publish <nombre>                      Publicar curso
  publish-batch [--estado Validado]     Publicar todos los validados
  checklist <nombre>                    Ver checklist COEO
  reject <nombre>                       Devolver a borrador

Opciones:
  --dry-run   Preview sin escribir
  --force     Forzar transición (ignora checklist)

Estados: Borrador → Revisión COEO → Validado → Publicado
`);
    return;
  }

  switch (command) {
    case 'list': return cmdList();
    case 'create': return cmdCreate();
    case 'review': return cmdReview();
    case 'validate': return cmdValidate();
    case 'publish': return cmdPublish();
    case 'publish-batch': return cmdPublishBatch();
    case 'checklist': return cmdChecklist();
    case 'reject': return cmdReject();
    default:
      console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
