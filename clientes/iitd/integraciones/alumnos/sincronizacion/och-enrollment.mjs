#!/usr/bin/env node

/**
 * OCH Auto-Enrollment Pipeline — IITD (N23)
 *
 * Pipeline automatico de matriculacion:
 *   Stackby ALUMNOS (Matriculado=Si, Alta_OCH≠Si) → OCH API → update Stackby
 *
 * Usage:
 *   node och-enrollment.mjs --enroll [--dry-run]    # Matricular pendientes
 *   node och-enrollment.mjs --status                 # Estado de matriculas OCH
 *   node och-enrollment.mjs --courses                # Listar cursos OCH
 *   node och-enrollment.mjs --report                 # Informe completo
 *   node och-enrollment.mjs --help
 *
 * Env vars (.env):
 *   OCH_API_KEY, STACKBY_API_KEY, STACKBY_STACK_ID
 *
 * Requiere: tabla ALUMNOS con columnas "Matriculado", "Alta OCH", "Programa"
 *
 * Mapping Programa IITD → Curso OCH:
 *   Se configura en OCH_COURSE_MAP. Si el programa no tiene mapping,
 *   se busca por nombre parcial en los cursos de OCH.
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

const DRY_RUN = process.argv.includes('--dry-run');

// =====================================================
// MAPPING: Programa IITD → busqueda en cursos OCH
// =====================================================

const PROGRAMA_SEARCH_TERMS = {
  'DECA Infantil y Primaria': 'DECA Infantil',
  'DECA ESO y Bachillerato': 'DECA ESO',
  'Formacion Sistematica': 'Sistematica',
  'Formacion Biblica': 'Biblica',
  'Compromiso Laical': 'Compromiso Laical',
  'Cursos Monograficos': 'Monografic',
};

// =====================================================
// LAZY IMPORTS
// =====================================================

let ochClient = null;
let alumnosClient = null;

async function getOchClient() {
  if (!ochClient) ochClient = await import('../compartido/och-client.mjs');
  return ochClient;
}

async function getAlumnosClient() {
  if (!alumnosClient) alumnosClient = await import('../compartido/alumnos-client.js');
  return alumnosClient;
}

// =====================================================
// CORE FUNCTIONS
// =====================================================

async function findPendingEnrollments() {
  const client = await getAlumnosClient();
  const alumnos = await client.getAllAlumnos();

  return alumnos.filter(a => {
    const matriculado = (a.field?.Matriculado || '').toLowerCase();
    const altaOch = (a.field?.['Alta OCH'] || '').toLowerCase();
    const email = (a.field?.Email || '').trim();

    return email && matriculado === 'si' && altaOch !== 'si';
  });
}

async function matchCourse(programa, courses) {
  if (!programa) return null;

  // Try configured search terms first
  for (const [key, searchTerm] of Object.entries(PROGRAMA_SEARCH_TERMS)) {
    if (programa.toLowerCase().includes(key.toLowerCase())) {
      const found = courses.find(c =>
        (c.course || c.name || c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (found) return found;
    }
  }

  // Fallback: direct name search
  const lower = programa.toLowerCase();
  return courses.find(c =>
    (c.course || c.name || c.title || '').toLowerCase().includes(lower)
  ) || null;
}

async function enrollPending(options = {}) {
  const dryRun = options.dryRun || DRY_RUN;
  const och = await getOchClient();

  console.log(`${dryRun ? '[DRY-RUN] ' : ''}Buscando alumnos pendientes de alta OCH...\n`);

  const courses = await och.listCourses();
  console.log(`Cursos OCH disponibles: ${courses.length}`);

  const pending = await findPendingEnrollments();
  console.log(`Alumnos pendientes de alta: ${pending.length}\n`);

  if (pending.length === 0) {
    console.log('No hay alumnos pendientes de matriculacion en OCH.');
    return { enrolled: 0, errors: 0, skipped: 0 };
  }

  let enrolled = 0, errors = 0, skipped = 0;

  for (const alumno of pending) {
    const email = (alumno.field?.Email || '').trim();
    const nombre = (alumno.field?.Nombre || '').trim();
    const apellidos = (alumno.field?.Apellidos || '').trim();
    const programa = (alumno.field?.Programa || '').trim();

    const course = await matchCourse(programa, courses);
    if (!course) {
      console.log(`  SKIP ${email} — no se encontro curso OCH para "${programa}"`);
      skipped++;
      continue;
    }

    const courseName = course.course || course.name || course.title;

    if (dryRun) {
      console.log(`  [DRY-RUN] ${email} → "${courseName}" (${course.id})`);
      enrolled++;
      continue;
    }

    try {
      await och.enrollStudent({
        email,
        courseId: course.id,
        firstName: nombre,
        lastName: apellidos,
      });

      // Update Stackby: Alta OCH = Si
      try {
        const client = await getAlumnosClient();
        if (client.updateAlumno) {
          await client.updateAlumno(alumno.id, { 'Alta OCH': 'Si' });
        }
      } catch { /* best effort */ }

      console.log(`  OK ${email} → "${courseName}"`);
      enrolled++;
    } catch (err) {
      console.log(`  ERROR ${email}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nResultado: ${enrolled} matriculados, ${skipped} sin curso, ${errors} errores`);
  return { enrolled, errors, skipped };
}

async function showStatus() {
  const och = await getOchClient();

  console.log(`\nEstado OCH Enrollment\n`);

  // Connection test
  const test = await och.testConnection();
  console.log(`  Conexion OCH: ${test.ok ? 'OK' : 'ERROR — ' + test.error}`);
  if (test.ok) console.log(`  Cursos disponibles: ${test.courses}`);

  // Pending enrollments
  const pending = await findPendingEnrollments();
  console.log(`  Pendientes de alta OCH: ${pending.length}`);

  if (pending.length > 0 && pending.length <= 20) {
    console.log(`\n  Pendientes:`);
    for (const a of pending) {
      const email = (a.field?.Email || '').trim();
      const programa = (a.field?.Programa || '').trim();
      console.log(`    ${email.padEnd(35)} ${programa}`);
    }
  }

  console.log();
}

async function showCourses() {
  const och = await getOchClient();
  const courses = await och.listCourses();

  console.log(`\nCursos OCH (${courses.length}):\n`);
  console.log(`  ${'ID'.padEnd(30)}  Nombre`);
  console.log(`  ${'-'.repeat(30)}  ${'-'.repeat(40)}`);
  for (const c of courses) {
    const name = c.course || c.name || c.title || '(sin nombre)';
    console.log(`  ${(c.id || '').padEnd(30)}  ${name}`);
  }
  console.log();
}

async function showReport() {
  const och = await getOchClient();
  const client = await getAlumnosClient();
  const alumnos = await client.getAllAlumnos();
  const courses = await och.listCourses();

  const total = alumnos.length;
  const matriculados = alumnos.filter(a => (a.field?.Matriculado || '').toLowerCase() === 'si');
  const altaOch = alumnos.filter(a => (a.field?.['Alta OCH'] || '').toLowerCase() === 'si');
  const pendientes = matriculados.filter(a => (a.field?.['Alta OCH'] || '').toLowerCase() !== 'si');

  console.log(`\nInforme OCH Enrollment\n`);
  console.log(`  Total alumnos Stackby: ${total}`);
  console.log(`  Matriculados (Matriculado=Si): ${matriculados.length}`);
  console.log(`  Alta OCH (Alta OCH=Si): ${altaOch.length}`);
  console.log(`  Pendientes de alta OCH: ${pendientes.length}`);
  console.log(`  Cursos OCH: ${courses.length}`);

  // By programa
  const byPrograma = {};
  for (const a of pendientes) {
    const prog = (a.field?.Programa || 'Sin programa').trim();
    byPrograma[prog] = (byPrograma[prog] || 0) + 1;
  }

  if (Object.keys(byPrograma).length > 0) {
    console.log(`\n  Pendientes por programa:`);
    for (const [prog, count] of Object.entries(byPrograma).sort((a, b) => b[1] - a[1])) {
      const match = await matchCourse(prog, courses);
      const icon = match ? 'M' : '?';
      console.log(`    ${icon} ${prog}: ${count}${match ? '' : ' (sin mapping OCH)'}`);
    }
  }

  // Coverage
  const coverage = altaOch.length / (matriculados.length || 1) * 100;
  console.log(`\n  Cobertura OCH: ${coverage.toFixed(1)}% (${altaOch.length}/${matriculados.length})`);
  console.log();
}

// =====================================================
// CLI
// =====================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
OCH Auto-Enrollment Pipeline (N23) — Stackby ALUMNOS → OCH

Matriculacion automatica: alumnos con Matriculado=Si y Alta OCH≠Si.

Comandos:
  --enroll [--dry-run]    Matricular alumnos pendientes en OCH
  --status                Estado de conexion y pendientes
  --courses               Listar cursos disponibles en OCH
  --report                Informe completo de cobertura

Flujo:
  1. Lee ALUMNOS de Stackby (Matriculado=Si, Alta OCH≠Si)
  2. Busca curso OCH correspondiente al Programa
  3. Llama OCH enrollStudent API
  4. Actualiza Alta OCH=Si en Stackby

Env vars: OCH_API_KEY, STACKBY_API_KEY, STACKBY_STACK_ID
`);
    return;
  }

  if (args.includes('--enroll')) {
    await enrollPending({ dryRun: DRY_RUN });
    return;
  }

  if (args.includes('--status')) {
    await showStatus();
    return;
  }

  if (args.includes('--courses')) {
    await showCourses();
    return;
  }

  if (args.includes('--report')) {
    await showReport();
    return;
  }

  console.error('Comando no reconocido. Usa --help para ver opciones.');
  process.exit(1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
