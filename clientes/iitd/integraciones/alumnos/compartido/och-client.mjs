#!/usr/bin/env node

/**
 * OCH Client — IITD (N15/N23)
 *
 * Wrapper ESM del cliente OnlineCourseHost para uso desde alumnos/.
 * Integra con .env, cache de cursos, rate limiting.
 *
 * API OCH (limitada — solo 2 endpoints):
 *   - GET  /api/pabbly-tenant-courses → listar cursos
 *   - POST /api/zapier-enroll-student-action-webhook → matricular alumno
 *
 * Rate limit: 400 req/min
 *
 * Usage:
 *   node och-client.mjs list                    # Listar cursos OCH
 *   node och-client.mjs enroll --email X --course Y [--name "..."]
 *   node och-client.mjs find-course NOMBRE       # Buscar curso por nombre
 *   node och-client.mjs status                   # Estado conexion OCH
 *
 * Env vars (.env):
 *   OCH_API_KEY (o OCH_INTEGRATION_TOKEN)
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

const OCH_API_KEY = process.env.OCH_API_KEY || process.env.OCH_INTEGRATION_TOKEN || '';
const BASE_URL = process.env.OCH_BASE_URL || 'https://api.onlinecoursehost.com';

// Rate limiting: 400 req/min = ~6.6 req/s → 150ms min interval
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 150;

async function rateLimitedFetch(url, options = {}) {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, options);
}

// =====================================================
// API CORE
// =====================================================

async function ochRequest(endpoint, options = {}) {
  if (!OCH_API_KEY) throw new Error('OCH_API_KEY no configurada en .env');

  const url = `${BASE_URL}${endpoint}`;
  const res = await rateLimitedFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Integration-Token': OCH_API_KEY,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OCH ${res.status}: ${text}`);
  }

  return res.json();
}

// =====================================================
// COURSE CACHE
// =====================================================

let coursesCache = null;
let coursesCacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function getCourses(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && coursesCache && (now - coursesCacheTime) < CACHE_TTL_MS) {
    return coursesCache;
  }
  coursesCache = await ochRequest('/api/pabbly-tenant-courses');
  coursesCacheTime = now;
  return coursesCache;
}

// =====================================================
// PUBLIC API
// =====================================================

export async function listCourses() {
  return getCourses();
}

export async function findCourse(nameOrId) {
  const courses = await getCourses();
  const lower = nameOrId.toLowerCase();

  // Try exact ID match first
  const byId = courses.find(c => c.id === nameOrId);
  if (byId) return byId;

  // Then name match
  return courses.find(c =>
    (c.course || c.name || c.title || '').toLowerCase().includes(lower)
  ) || null;
}

export async function enrollStudent({ email, courseId, firstName, lastName }) {
  if (!email) throw new Error('email es requerido');
  if (!courseId) throw new Error('courseId es requerido');

  return ochRequest('/api/zapier-enroll-student-action-webhook', {
    method: 'POST',
    body: JSON.stringify({
      email,
      first_name: firstName || '',
      last_name: lastName || '',
      course_id: courseId,
    }),
  });
}

export async function enrollByCourseName(email, courseName, options = {}) {
  const course = await findCourse(courseName);
  if (!course) throw new Error(`Curso no encontrado: ${courseName}`);

  return enrollStudent({
    email,
    courseId: course.id,
    firstName: options.firstName || '',
    lastName: options.lastName || '',
  });
}

export async function testConnection() {
  try {
    const courses = await getCourses(true);
    return { ok: true, courses: courses.length };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export { OCH_API_KEY, BASE_URL };

// =====================================================
// CLI
// =====================================================

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.find(a => !a.startsWith('--'));

  if (!command || command === 'help' || args.includes('--help')) {
    console.log(`
OCH Client IITD (N15/N23) — OnlineCourseHost API

API limitada: solo 2 endpoints (listar cursos + matricular alumno).
No hay endpoints para: progreso, certificados, comunidad, estudiantes.

Comandos:
  list                          Listar cursos disponibles en OCH
  find-course NOMBRE            Buscar curso por nombre
  enroll --email X --course Y   Matricular alumno en curso
         [--name "Nombre Apellido"]
  status                        Verificar conexion OCH

Env vars: OCH_API_KEY (o OCH_INTEGRATION_TOKEN)
Rate limit: 400 req/min
`);
    return;
  }

  if (!OCH_API_KEY) {
    console.error('Error: OCH_API_KEY no configurada en .env');
    console.error('Obtener token: OCH Admin > Settings > Pabbly Integrations > Activate');
    process.exit(1);
  }

  if (command === 'list') {
    const courses = await listCourses();
    console.log(`\nCursos OCH (${courses.length}):\n`);
    for (const c of courses) {
      const name = c.course || c.name || c.title || '(sin nombre)';
      console.log(`  ${c.id}  ${name}`);
    }
    console.log();
    return;
  }

  if (command === 'find-course') {
    const name = args.filter(a => !a.startsWith('--')).slice(1).join(' ');
    if (!name) { console.error('Error: especifica nombre del curso'); process.exit(1); }

    const course = await findCourse(name);
    if (!course) { console.log(`No se encontro curso: "${name}"`); return; }

    console.log(`\nCurso encontrado:`);
    console.log(`  ID: ${course.id}`);
    console.log(`  Nombre: ${course.course || course.name || course.title}`);
    console.log();
    return;
  }

  if (command === 'enroll') {
    const email = getArg('--email');
    const courseArg = getArg('--course');
    const name = getArg('--name') || '';
    const dryRun = args.includes('--dry-run');

    if (!email || !courseArg) {
      console.error('Error: --email y --course son requeridos');
      process.exit(1);
    }

    const course = await findCourse(courseArg);
    if (!course) { console.error(`Curso no encontrado: ${courseArg}`); process.exit(1); }

    const courseName = course.course || course.name || course.title;
    const [firstName, ...lastParts] = name.split(' ');
    const lastName = lastParts.join(' ');

    if (dryRun) {
      console.log(`[DRY-RUN] Matricularia: ${email} en "${courseName}" (${course.id})`);
      return;
    }

    console.log(`Matriculando ${email} en "${courseName}"...`);
    const result = await enrollStudent({
      email,
      courseId: course.id,
      firstName: firstName || '',
      lastName: lastName || '',
    });
    console.log('Resultado:', JSON.stringify(result, null, 2));
    return;
  }

  if (command === 'status') {
    console.log(`\nOCH API Status\n`);
    console.log(`  Base URL: ${BASE_URL}`);
    console.log(`  API Key: ${OCH_API_KEY ? OCH_API_KEY.substring(0, 8) + '...' : '(no configurada)'}`);

    const test = await testConnection();
    if (test.ok) {
      console.log(`  Conexion: OK`);
      console.log(`  Cursos: ${test.courses}`);
    } else {
      console.log(`  Conexion: ERROR — ${test.error}`);
    }
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('och-client.mjs') ||
  process.argv[1].endsWith('och-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
