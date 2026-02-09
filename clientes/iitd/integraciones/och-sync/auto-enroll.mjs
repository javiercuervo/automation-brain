#!/usr/bin/env node

/**
 * Auto-Enroll in OCH (Pipeline N15)
 *
 * Reads the DECA Google Sheet, finds rows where:
 *   Matriculado = "Sí" AND Alta OCH = "No" (or empty)
 *
 * For each: calls OCH enrollStudent API, updates the row.
 *
 * Usage:
 *   OCH_API_KEY=xxx GOOGLE_SHEETS_API_KEY=xxx node auto-enroll.mjs --dry-run
 *   OCH_API_KEY=xxx node auto-enroll.mjs
 *
 * NOTE: This script is meant to be run manually or via cron.
 * It complements the syncAlumnos() function in publisher.gs.
 * The actual enrollment is done via the OCH API (och-client.js).
 */

// OCH API config
const OCH_API_KEY = process.env.OCH_API_KEY;
const OCH_BASE_URL = 'https://api.onlinecoursehost.com';
const DRY_RUN = process.argv.includes('--dry-run');

if (!OCH_API_KEY) {
  console.error('Set OCH_API_KEY env var');
  console.error('Usage: OCH_API_KEY=xxx node auto-enroll.mjs [--dry-run]');
  process.exit(1);
}

async function ochFetch(endpoint, options = {}) {
  const res = await fetch(`${OCH_BASE_URL}${endpoint}`, {
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

async function listCourses() {
  return ochFetch('/api/pabbly-tenant-courses');
}

async function enrollStudent(courseId, email, firstName, lastName) {
  return ochFetch('/api/zapier-enroll-student-action-webhook', {
    method: 'POST',
    body: JSON.stringify({
      email,
      first_name: firstName || '',
      last_name: lastName || '',
      course_id: courseId,
    }),
  });
}

async function main() {
  console.log(`${DRY_RUN ? '[DRY RUN] ' : ''}Auto-Enroll OCH\n`);

  // List available courses
  const courses = await listCourses();
  console.log(`Cursos disponibles en OCH: ${courses.length}`);
  for (const c of courses) {
    console.log(`  - ${c.id}: ${c.course || c.name || c.title}`);
  }

  console.log(`\n---`);
  console.log(`Este script necesita integrarse con Google Sheets para leer`);
  console.log(`las filas con Matriculado="Sí" y Alta OCH="No".`);
  console.log(`\nPor ahora, usa enrollStudent() directamente desde Apps Script`);
  console.log(`o invoca manualmente:`);
  console.log(`  node auto-enroll.mjs enroll <courseId> <email> [firstName] [lastName]`);

  // Manual enrollment mode
  if (process.argv[2] === 'enroll') {
    const courseId = process.argv[3];
    const email = process.argv[4];
    const firstName = process.argv[5] || '';
    const lastName = process.argv[6] || '';

    if (!courseId || !email) {
      console.error('\nUsage: node auto-enroll.mjs enroll <courseId> <email> [firstName] [lastName]');
      process.exit(1);
    }

    if (DRY_RUN) {
      console.log(`\n[DRY RUN] Matricularía: ${email} en curso ${courseId}`);
      return;
    }

    console.log(`\nMatriculando ${email} en curso ${courseId}...`);
    const result = await enrollStudent(courseId, email, firstName, lastName);
    console.log('Resultado:', JSON.stringify(result, null, 2));
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
