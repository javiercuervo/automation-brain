/**
 * =====================================================
 * OCH-STACKBY SYNC
 * =====================================================
 *
 * Instituto Internacional de Teología a Distancia
 *
 * LIMITACIÓN DE LA API DE OCH:
 * La API de OnlineCourseHost NO permite obtener estudiantes matriculados.
 * Solo permite:
 *   - Listar cursos
 *   - Matricular estudiantes (Stackby → OCH)
 *
 * Este script ofrece:
 *   1. Listar cursos disponibles en OCH
 *   2. Matricular alumnos desde Stackby a OCH (dirección inversa)
 *
 * Uso:
 *   node sync-enrollments.js                    # Ver cursos disponibles
 *   node sync-enrollments.js --help             # Ayuda
 *   node sync-enrollments.js --enroll EMAIL ID  # Matricular alumno
 */

const ochClient = require('./och-client');

async function main() {
  const args = process.argv.slice(2);

  console.log('='.repeat(60));
  console.log('OCH-STACKBY INTEGRATION');
  console.log(`Fecha: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log('');

  // Ayuda
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  // Matricular alumno
  if (args.includes('--enroll')) {
    const enrollIndex = args.indexOf('--enroll');
    const email = args[enrollIndex + 1];
    const courseId = args[enrollIndex + 2];

    if (!email || !courseId) {
      console.error('Error: Uso: --enroll EMAIL COURSE_ID');
      console.log('');
      console.log('Para ver IDs de cursos: node sync-enrollments.js');
      process.exit(1);
    }

    await enrollStudent(email, courseId);
    return;
  }

  // Por defecto: listar cursos
  await listCourses();
}

async function listCourses() {
  console.log('CURSOS DISPONIBLES EN ONLINECOURSEHOST');
  console.log('-'.repeat(60));
  console.log('');

  try {
    const courses = await ochClient.listCourses();

    console.log(`Total: ${courses.length} cursos\n`);

    courses.forEach((c, i) => {
      const num = String(i + 1).padStart(2, ' ');
      console.log(`${num}. ${c.course || c.name || 'Sin nombre'}`);
      console.log(`    ID: ${c.id}`);
      console.log('');
    });

    console.log('-'.repeat(60));
    console.log('');
    console.log('NOTA IMPORTANTE:');
    console.log('La API de OCH NO permite obtener lista de estudiantes.');
    console.log('Solo se puede MATRICULAR estudiantes (Stackby → OCH).');
    console.log('');
    console.log('Para matricular un alumno:');
    console.log('  node sync-enrollments.js --enroll email@ejemplo.com COURSE_ID');
    console.log('');

  } catch (error) {
    console.error('Error conectando con OCH:', error.message);
    process.exit(1);
  }
}

async function enrollStudent(email, courseId) {
  console.log(`MATRICULANDO ALUMNO`);
  console.log('-'.repeat(60));
  console.log(`Email: ${email}`);
  console.log(`Curso ID: ${courseId}`);
  console.log('');

  try {
    const result = await ochClient.enrollStudent(courseId, { email });
    console.log('✅ Matriculación exitosa');
    console.log('Resultado:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error matriculando:', error.message);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
USO:
  node sync-enrollments.js              Lista cursos disponibles
  node sync-enrollments.js --enroll EMAIL COURSE_ID
                                        Matricula un alumno en un curso
  node sync-enrollments.js --help       Muestra esta ayuda

LIMITACIONES DE LA API DE OCH:
  ✅ Listar cursos                      - Disponible
  ✅ Matricular estudiante              - Disponible (Stackby → OCH)
  ❌ Obtener estudiantes de un curso    - NO disponible
  ❌ Ver progreso de estudiantes        - NO disponible
  ❌ Sincronizar OCH → Stackby          - NO posible con la API actual

ALTERNATIVAS PARA OBTENER DATOS DE ESTUDIANTES:
  1. Exportar manualmente desde el panel de administración de OCH
  2. Configurar webhook de OCH para notificar nuevas matrículas
  3. Usar la integración con Pabbly/Zapier si está disponible

EJEMPLOS:
  # Ver cursos disponibles
  node sync-enrollments.js

  # Matricular alumno en el módulo DECA I
  node sync-enrollments.js --enroll alumno@email.com 43h3c5fBqWDZ8FVEp3B6
`);
}

// Ejecutar
main().catch(console.error);
