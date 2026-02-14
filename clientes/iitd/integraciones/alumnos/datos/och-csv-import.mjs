#!/usr/bin/env node

/**
 * OCH CSV Import — IITD (N17 parcial)
 *
 * Importa datos exportados manualmente desde el admin panel de OCH.
 * OCH no tiene API para leer datos de alumnos/progreso, pero permite
 * exportar CSVs desde Admin > Manage Students.
 *
 * Tipos de import:
 *   --students FILE    Importar lista de estudiantes (Name, Email)
 *   --sales FILE       Importar datos de ventas (Analytics > Sales CSV)
 *   --match            Correlacionar alumnos OCH con Stackby ALUMNOS
 *   --report           Informe de sincronizacion OCH ↔ Stackby
 *   --help
 *
 * El CSV de OCH (Manage Students) tiene formato:
 *   "Name","Email"
 *   "Juan Perez","juan@example.com"
 *
 * El CSV de Sales tiene formato:
 *   "Date","Student","Email","Course","Payment","Gateway","Coupon","Amount"
 *
 * Usage:
 *   node och-csv-import.mjs --students ~/Downloads/och-students.csv [--dry-run]
 *   node och-csv-import.mjs --sales ~/Downloads/och-sales.csv [--dry-run]
 *   node och-csv-import.mjs --match [--dry-run]
 *   node och-csv-import.mjs --report
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
// CSV PARSER
// =====================================================

function parseCSV(content) {
  const lines = content.trim().split('\n').map(l => l.trim()).filter(l => l);
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line) => {
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    return fields;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseRow(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ''; });
    return obj;
  });

  return { headers, rows };
}

// =====================================================
// IMPORT STUDENTS
// =====================================================

async function importStudents(filePath) {
  if (!existsSync(filePath)) {
    console.error(`Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');
  const { rows } = parseCSV(content);

  console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}Importando estudiantes OCH...\n`);
  console.log(`  Archivo: ${filePath}`);
  console.log(`  Filas: ${rows.length}\n`);

  // Load alumnos from Stackby
  const alumnosModule = await import('../compartido/alumnos-client.js');
  const alumnos = await alumnosModule.getAllAlumnos();
  const alumnosByEmail = new Map();
  for (const a of alumnos) {
    const email = (a.field?.Email || '').toLowerCase().trim();
    if (email) alumnosByEmail.set(email, a);
  }

  let matched = 0, unmatched = 0, updated = 0;
  const unmatchedList = [];

  for (const row of rows) {
    const email = (row.Email || row.email || '').toLowerCase().trim();
    const name = row.Name || row.name || row.Nombre || '';

    if (!email) continue;

    const alumno = alumnosByEmail.get(email);
    if (alumno) {
      matched++;
      const altaOch = (alumno.field?.['Alta OCH'] || '').toLowerCase();
      if (altaOch !== 'si') {
        if (DRY_RUN) {
          console.log(`  [DRY-RUN] Actualizar Alta OCH=Si: ${email}`);
        } else {
          try {
            if (alumnosModule.updateAlumno) {
              await alumnosModule.updateAlumno(alumno.id, { 'Alta OCH': 'Si' });
            }
            console.log(`  OK Alta OCH=Si: ${email}`);
          } catch (err) {
            console.log(`  ERROR ${email}: ${err.message}`);
          }
        }
        updated++;
      }
    } else {
      unmatched++;
      unmatchedList.push({ email, name });
    }
  }

  console.log(`\nResultado:`);
  console.log(`  En OCH y Stackby: ${matched}`);
  console.log(`  Actualizados (Alta OCH): ${updated}`);
  console.log(`  Solo en OCH (sin Stackby): ${unmatched}`);

  if (unmatchedList.length > 0 && unmatchedList.length <= 50) {
    console.log(`\n  Alumnos en OCH sin registro Stackby:`);
    for (const u of unmatchedList) {
      console.log(`    ${u.email.padEnd(35)} ${u.name}`);
    }
  }

  console.log();
  return { matched, unmatched, updated };
}

// =====================================================
// IMPORT SALES
// =====================================================

async function importSales(filePath) {
  if (!existsSync(filePath)) {
    console.error(`Archivo no encontrado: ${filePath}`);
    process.exit(1);
  }

  const content = readFileSync(filePath, 'utf-8');
  const { rows } = parseCSV(content);

  console.log(`${DRY_RUN ? '[DRY-RUN] ' : ''}Importando ventas OCH...\n`);
  console.log(`  Archivo: ${filePath}`);
  console.log(`  Transacciones: ${rows.length}\n`);

  // Aggregate by course
  const byCourse = {};
  const byMonth = {};
  let totalRevenue = 0;

  for (const row of rows) {
    const course = row.Course || row.course || '(desconocido)';
    const amount = parseFloat((row.Amount || row.amount || '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
    const date = row.Date || row.date || '';

    byCourse[course] = byCourse[course] || { count: 0, revenue: 0 };
    byCourse[course].count++;
    byCourse[course].revenue += amount;

    const month = date.substring(0, 7); // YYYY-MM
    if (month) {
      byMonth[month] = byMonth[month] || { count: 0, revenue: 0 };
      byMonth[month].count++;
      byMonth[month].revenue += amount;
    }

    totalRevenue += amount;
  }

  console.log(`  Ingresos totales: ${totalRevenue.toFixed(2)} EUR`);

  console.log(`\n  Por curso:`);
  for (const [course, data] of Object.entries(byCourse).sort((a, b) => b[1].revenue - a[1].revenue)) {
    console.log(`    ${course.substring(0, 40).padEnd(40)} ${String(data.count).padStart(4)} ventas  ${data.revenue.toFixed(2).padStart(10)} EUR`);
  }

  if (Object.keys(byMonth).length > 0) {
    console.log(`\n  Por mes:`);
    for (const [month, data] of Object.entries(byMonth).sort()) {
      console.log(`    ${month}  ${String(data.count).padStart(4)} ventas  ${data.revenue.toFixed(2).padStart(10)} EUR`);
    }
  }

  console.log();
  return { transactions: rows.length, totalRevenue, byCourse, byMonth };
}

// =====================================================
// MATCH: correlacionar OCH ↔ Stackby
// =====================================================

async function matchStudents() {
  const alumnosModule = await import('../compartido/alumnos-client.js');
  const alumnos = await alumnosModule.getAllAlumnos();

  console.log(`\nCorrelacion OCH ↔ Stackby\n`);

  const matriculados = alumnos.filter(a => (a.field?.Matriculado || '').toLowerCase() === 'si');
  const altaOch = alumnos.filter(a => (a.field?.['Alta OCH'] || '').toLowerCase() === 'si');
  const pendientes = matriculados.filter(a => (a.field?.['Alta OCH'] || '').toLowerCase() !== 'si');

  console.log(`  Total alumnos Stackby: ${alumnos.length}`);
  console.log(`  Matriculados: ${matriculados.length}`);
  console.log(`  Con alta OCH: ${altaOch.length}`);
  console.log(`  Pendientes OCH: ${pendientes.length}`);

  const coverage = (altaOch.length / (matriculados.length || 1) * 100);
  console.log(`  Cobertura: ${coverage.toFixed(1)}%`);

  if (pendientes.length > 0 && pendientes.length <= 30) {
    console.log(`\n  Pendientes de alta OCH:`);
    for (const a of pendientes) {
      const email = (a.field?.Email || '').trim();
      const nombre = `${a.field?.Nombre || ''} ${a.field?.Apellidos || ''}`.trim();
      const programa = (a.field?.Programa || '').trim();
      console.log(`    ${email.padEnd(35)} ${nombre.substring(0, 25).padEnd(25)} ${programa}`);
    }
  }

  console.log();
  return { total: alumnos.length, matriculados: matriculados.length, altaOch: altaOch.length, pendientes: pendientes.length };
}

// =====================================================
// REPORT
// =====================================================

async function showReport() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  Informe Sincronizacion OCH ↔ Stackby`);
  console.log(`${'='.repeat(60)}\n`);

  // Try to connect to OCH
  let ochStatus = null;
  try {
    const ochModule = await import('../compartido/och-client.mjs');
    ochStatus = await ochModule.testConnection();
  } catch { /* OCH may not be configured */ }

  if (ochStatus) {
    console.log(`OCH API:`);
    console.log(`  Estado: ${ochStatus.ok ? 'Conectado' : 'Error — ' + ochStatus.error}`);
    if (ochStatus.ok) console.log(`  Cursos: ${ochStatus.courses}`);
    console.log();
  } else {
    console.log(`OCH API: No configurada (falta OCH_API_KEY en .env)\n`);
  }

  await matchStudents();

  console.log(`Nota: OCH no tiene API para leer datos de alumnos.`);
  console.log(`Para importar datos, exporta CSV desde OCH Admin > Manage Students.`);
  console.log(`Luego ejecuta: node och-csv-import.mjs --students ARCHIVO.csv\n`);
}

// =====================================================
// CLI
// =====================================================

function getArgValue(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
OCH CSV Import (N17) — Sincronizacion OCH ↔ Stackby

OCH no tiene API para leer datos de alumnos/progreso.
Workaround: exportar CSV desde OCH Admin y procesar aqui.

Comandos:
  --students FILE [--dry-run]   Importar lista estudiantes (OCH > Manage Students > CSV)
  --sales FILE [--dry-run]      Importar ventas (OCH > Analytics > Sales > CSV)
  --match [--dry-run]           Correlacionar alumnos Stackby ↔ OCH (via Alta OCH)
  --report                      Informe completo de sincronizacion

CSV estudiantes: "Name","Email"
CSV ventas: "Date","Student","Email","Course","Payment","Gateway","Coupon","Amount"

Flujo recomendado:
  1. OCH Admin > Manage Students > Export CSV
  2. node och-csv-import.mjs --students archivo.csv --dry-run
  3. node och-csv-import.mjs --students archivo.csv
  4. node och-csv-import.mjs --report
`);
    return;
  }

  if (args.includes('--students')) {
    const file = getArgValue('--students');
    if (!file) { console.error('Error: especifica archivo CSV'); process.exit(1); }
    await importStudents(resolve(process.cwd(), file));
    return;
  }

  if (args.includes('--sales')) {
    const file = getArgValue('--sales');
    if (!file) { console.error('Error: especifica archivo CSV'); process.exit(1); }
    await importSales(resolve(process.cwd(), file));
    return;
  }

  if (args.includes('--match')) {
    await matchStudents();
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
