/**
 * =====================================================
 * IMPORTACIÓN DATOS POLAR
 * =====================================================
 *
 * Instituto Internacional de Teología a Distancia
 *
 * Script para importar datos históricos desde POLAR (sistema anterior)
 * a la nueva tabla ALUMNOS en Stackby.
 *
 * Uso:
 *   node import-polar.js /ruta/al/archivo.csv
 *   node import-polar.js /ruta/al/archivo.csv --dry-run
 */

const fs = require('fs');
const path = require('path');
const alumnosClient = require('../alumnos/alumnos-client');

// Configuración del mapeo de campos POLAR → ALUMNOS
const FIELD_MAPPING = {
  // Ajustar según los nombres reales de columnas en el CSV de POLAR
  'email': 'Email',
  'correo': 'Email',
  'correo_electronico': 'Email',
  'nombre': 'Nombre',
  'apellido': 'Apellidos',
  'apellidos': 'Apellidos',
  'telefono': 'Telefono',
  'tel': 'Telefono',
  'dni': 'DNI',
  'documento': 'DNI',
  'programa': 'Programa',
  'curso': 'Programa',
  'estado': 'Estado',
  'estado_matricula': 'Estado',
  'notas': 'Notas',
  'observaciones': 'Notas'
};

// Mapeo de estados POLAR → estados ALUMNOS
const ESTADO_MAPPING = {
  // Ajustar según valores reales en POLAR
  'activo': 'activo',
  'matriculado': 'activo',
  'en_curso': 'activo',
  'finalizado': 'activo',
  'completado': 'activo',
  'baja': 'baja',
  'abandono': 'baja',
  'pendiente': 'solicitud',
  'inscrito': 'solicitud'
};

/**
 * Parsea un archivo CSV
 */
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  if (lines.length < 2) {
    throw new Error('CSV vacío o sin datos');
  }

  // Primera línea = headers
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));

  const records = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = values[idx];
      });
      records.push(record);
    }
  }

  return { headers, records };
}

/**
 * Parsea una línea CSV manejando comillas
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

/**
 * Mapea un registro POLAR a formato ALUMNOS
 */
function mapPolarToAlumno(polarRecord) {
  const alumno = {
    'Fuente': 'polar'
  };

  for (const [polarField, value] of Object.entries(polarRecord)) {
    const alumnoField = FIELD_MAPPING[polarField.toLowerCase()];
    if (alumnoField && value) {
      alumno[alumnoField] = value;
    }
  }

  // Mapear estado si existe
  if (alumno.Estado) {
    const mappedEstado = ESTADO_MAPPING[alumno.Estado.toLowerCase()];
    alumno.Estado = mappedEstado || 'solicitud';
  } else {
    alumno.Estado = 'solicitud';
  }

  // Valores por defecto
  if (!alumno['Docs estado']) alumno['Docs estado'] = 'pendiente';
  if (!alumno['Estado pago']) alumno['Estado pago'] = 'pendiente';

  return alumno;
}

/**
 * Ejecuta la importación
 */
async function runImport(csvPath, options = {}) {
  const dryRun = options.dryRun || process.argv.includes('--dry-run');
  const startTime = Date.now();

  console.log('='.repeat(60));
  console.log('IMPORTACIÓN DATOS POLAR → ALUMNOS');
  console.log(`Archivo: ${csvPath}`);
  console.log(`Fecha: ${new Date().toISOString()}`);
  console.log(`Modo: ${dryRun ? 'DRY RUN (sin cambios)' : 'PRODUCCIÓN'}`);
  console.log('='.repeat(60));
  console.log('');

  // Verificar configuración
  try {
    alumnosClient.checkConfig();
  } catch (error) {
    console.error('ERROR:', error.message);
    console.log('\nConfigura STACKBY_ALUMNOS_TABLE_ID antes de ejecutar.');
    process.exit(1);
  }

  // Verificar archivo
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: Archivo no encontrado: ${csvPath}`);
    process.exit(1);
  }

  // Parsear CSV
  console.log('1. Parseando CSV...');
  const { headers, records } = parseCSV(csvPath);
  console.log(`   Columnas: ${headers.join(', ')}`);
  console.log(`   Registros: ${records.length}`);
  console.log('');

  // Verificar que hay campo de email
  const emailField = headers.find(h =>
    h === 'email' || h === 'correo' || h === 'correo_electronico'
  );
  if (!emailField) {
    console.error('ERROR: No se encontró campo de email en el CSV');
    console.log('Columnas disponibles:', headers);
    process.exit(1);
  }
  console.log(`   Campo email detectado: ${emailField}`);
  console.log('');

  // Procesar registros
  console.log('2. Procesando registros...');
  console.log('');

  const stats = {
    total: records.length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    duplicates: []
  };

  const processedEmails = new Set();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const email = alumnosClient.normalizeEmail(record[emailField]);

    console.log(`   [${i + 1}/${records.length}] ${email || '(sin email)'}`);

    // Validar email
    if (!email || !email.includes('@')) {
      console.log('       → SKIP: email inválido');
      stats.skipped++;
      continue;
    }

    // Detectar duplicados en el mismo CSV
    if (processedEmails.has(email)) {
      console.log('       → SKIP: duplicado en CSV');
      stats.duplicates.push(email);
      stats.skipped++;
      continue;
    }
    processedEmails.add(email);

    // Mapear a formato ALUMNOS
    const alumnoFields = mapPolarToAlumno(record);

    if (dryRun) {
      console.log('       → [DRY RUN] Se crearía/actualizaría');
      stats.skipped++;
    } else {
      try {
        const result = await alumnosClient.upsertByEmail(alumnoFields);

        if (result.action === 'created') {
          console.log('       → Creado nuevo registro');
          stats.created++;
        } else {
          console.log('       → Actualizado registro existente');
          stats.updated++;
        }
      } catch (error) {
        console.error(`       → ERROR: ${error.message}`);
        stats.errors++;
      }
    }

    // Pausa entre requests
    if (!dryRun && i < records.length - 1) {
      await sleep(200);
    }
  }

  // Resumen
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('='.repeat(60));
  console.log('RESUMEN IMPORTACIÓN');
  console.log('='.repeat(60));
  console.log(`Total registros: ${stats.total}`);
  console.log(`Creados:         ${stats.created}`);
  console.log(`Actualizados:    ${stats.updated}`);
  console.log(`Saltados:        ${stats.skipped}`);
  console.log(`Errores:         ${stats.errors}`);
  console.log(`Duración:        ${duration}s`);

  if (stats.duplicates.length > 0) {
    console.log('');
    console.log('Emails duplicados en CSV:');
    stats.duplicates.forEach(email => console.log(`  - ${email}`));
  }

  console.log('='.repeat(60));

  return stats;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.log('Uso: node import-polar.js /ruta/al/archivo.csv [--dry-run]');
    console.log('');
    console.log('Opciones:');
    console.log('  --dry-run    Simular sin hacer cambios');
    process.exit(1);
  }

  runImport(csvPath).catch(console.error);
}

module.exports = { runImport, mapPolarToAlumno, parseCSV };
