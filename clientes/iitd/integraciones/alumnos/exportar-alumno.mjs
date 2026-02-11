#!/usr/bin/env node

/**
 * Exportación de datos de alumno — Portabilidad RGPD (N44)
 *
 * Art. 20 RGPD: derecho a recibir datos personales en formato
 * estructurado, de uso común y lectura mecánica.
 *
 * Exporta todos los datos de un alumno de Stackby (ALUMNOS + CALIFICACIONES)
 * en formato JSON y/o CSV.
 *
 * Usage:
 *   node exportar-alumno.mjs --email alumno@email.com           # JSON a stdout
 *   node exportar-alumno.mjs --email alumno@email.com --csv     # CSV a stdout
 *   node exportar-alumno.mjs --email alumno@email.com --all     # JSON + CSV a output/
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '.env'))) {
  for (const line of readFileSync(resolve(__dirname, '.env'), 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const ALUMNOS_TABLE = process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ';
const CALIFICACIONES_TABLE = process.env.STACKBY_CALIFICACIONES_TABLE_ID;
const BASE_URL = 'https://stackby.com/api/betav1';

// CLI args
const EMAIL = (() => {
  const idx = process.argv.indexOf('--email');
  return idx !== -1 ? process.argv[idx + 1] : null;
})();
const CSV_MODE = process.argv.includes('--csv');
const ALL_MODE = process.argv.includes('--all');

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
if (!EMAIL) { console.error('Usage: node exportar-alumno.mjs --email alumno@email.com [--csv] [--all]'); process.exit(1); }

// =====================================================
// STACKBY HELPERS
// =====================================================

async function stackbyGet(tableId, params = '') {
  const url = `${BASE_URL}/rowlist/${STACK_ID}/${tableId}${params ? '?' + params : ''}`;
  const res = await fetch(url, { headers: { 'api-key': API_KEY } });
  if (!res.ok) throw new Error(`Stackby ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getAllRows(tableId) {
  let all = [];
  let offset = 0;
  while (true) {
    const data = await stackbyGet(tableId, offset ? `offset=${offset}` : '');
    const records = Array.isArray(data) ? data : (data.records || []);
    all.push(...records);
    if (records.length < 100) break;
    offset += records.length;
  }
  return all;
}

function normalizeEmail(e) {
  return e ? String(e).toLowerCase().trim() : '';
}

// =====================================================
// DATA FETCH
// =====================================================

async function fetchAlumno(email) {
  const rows = await getAllRows(ALUMNOS_TABLE);
  const norm = normalizeEmail(email);
  return rows.find(r => normalizeEmail(r.field?.Email) === norm) || null;
}

async function fetchCalificaciones(email) {
  if (!CALIFICACIONES_TABLE) return [];
  const rows = await getAllRows(CALIFICACIONES_TABLE);
  const norm = normalizeEmail(email);
  return rows.filter(r => normalizeEmail(r.field?.['Email alumno']) === norm);
}

// =====================================================
// EXPORT FORMATS
// =====================================================

function buildExport(alumno, calificaciones) {
  const f = alumno.field || {};
  const now = new Date().toISOString();

  return {
    _meta: {
      fecha_exportacion: now,
      formato: 'RGPD Art. 20 — Portabilidad de datos',
      responsable: 'Instituto Internacional de Teología a Distancia',
      nif_responsable: process.env.IITD_NIF || 'R2800617I',
      direccion_responsable: `${process.env.IITD_DIRECCION || 'Calle Iriarte, 3'}, ${process.env.IITD_CP || '28028'} ${process.env.IITD_CIUDAD || 'Madrid'}`,
      contacto_dpo: process.env.IITD_EMAIL || 'informacion@institutoteologia.org'
    },
    datos_personales: {
      email: f.Email || '',
      nombre: f.Nombre || '',
      apellidos: f.Apellidos || '',
      dni: f.DNI || '',
      telefono: f.Telefono || '',
      direccion: f.Direccion || ''
    },
    datos_academicos: {
      expediente: f.ID_ALUMNO || '',
      programa: f.Programa || '',
      estado: f.Estado || '',
      fecha_alta: f['Fecha estado'] || '',
      fuente: f.Fuente || '',
      och_student_id: f['OCH Student ID'] || '',
      progreso: f.Progreso || ''
    },
    datos_pago: {
      estado_pago: f['Estado pago'] || '',
      fecha_pago: f['Fecha pago'] || '',
      docs_estado: f['Docs estado'] || ''
    },
    calificaciones: calificaciones.map(c => {
      const cf = c.field || {};
      return {
        asignatura: cf.Asignatura || '',
        programa: cf.Programa || '',
        curso_academico: cf['Curso académico'] || '',
        nota_evaluacion: cf['Nota evaluación'] || '',
        nota_examen: cf['Nota examen'] || '',
        calificacion_final: cf['Calificación final'] || '',
        fecha_evaluacion: cf['Fecha evaluación'] || '',
        profesor: cf.Profesor || '',
        convalidada: cf.Convalidada ? 'Sí' : 'No'
      };
    }),
    notas_internas: f.Notas || ''
  };
}

function toCSV(data) {
  const lines = [];

  // Datos personales
  lines.push('SECCION,CAMPO,VALOR');
  for (const [key, val] of Object.entries(data.datos_personales)) {
    lines.push(`Datos personales,${key},${escCSV(val)}`);
  }
  for (const [key, val] of Object.entries(data.datos_academicos)) {
    lines.push(`Datos académicos,${key},${escCSV(val)}`);
  }
  for (const [key, val] of Object.entries(data.datos_pago)) {
    lines.push(`Datos de pago,${key},${escCSV(val)}`);
  }

  // Calificaciones
  if (data.calificaciones.length > 0) {
    lines.push('');
    lines.push('CALIFICACIONES');
    const cols = Object.keys(data.calificaciones[0]);
    lines.push(cols.join(','));
    for (const cal of data.calificaciones) {
      lines.push(cols.map(c => escCSV(cal[c])).join(','));
    }
  }

  // Meta
  lines.push('');
  lines.push('METADATOS');
  for (const [key, val] of Object.entries(data._meta)) {
    lines.push(`${key},${escCSV(val)}`);
  }

  return lines.join('\n');
}

function escCSV(val) {
  const s = String(val || '').replace(/"/g, '""');
  return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
}

// =====================================================
// MAIN
// =====================================================

async function main() {
  console.error(`Buscando datos de: ${EMAIL}`);

  const alumno = await fetchAlumno(EMAIL);
  if (!alumno) {
    console.error(`No se encontró alumno con email: ${EMAIL}`);
    process.exit(1);
  }

  console.error(`Alumno encontrado: ${alumno.field?.Nombre || ''} ${alumno.field?.Apellidos || ''} (${alumno.field?.ID_ALUMNO || 'sin expediente'})`);

  const calificaciones = await fetchCalificaciones(EMAIL);
  console.error(`Calificaciones encontradas: ${calificaciones.length}`);

  const data = buildExport(alumno, calificaciones);

  if (ALL_MODE) {
    // Write files to output/
    const outDir = resolve(__dirname, 'output');
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const base = `export-${normalizeEmail(EMAIL).replace(/[@.]/g, '_')}`;
    const jsonPath = resolve(outDir, `${base}.json`);
    const csvPath = resolve(outDir, `${base}.csv`);

    writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    writeFileSync(csvPath, toCSV(data));

    console.error(`\nArchivos generados:`);
    console.error(`  JSON: ${jsonPath}`);
    console.error(`  CSV:  ${csvPath}`);
  } else if (CSV_MODE) {
    console.log(toCSV(data));
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(err => { console.error('Error:', err.message); process.exit(1); });
