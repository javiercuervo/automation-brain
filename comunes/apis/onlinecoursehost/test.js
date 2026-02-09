/**
 * Test de conexión para OnlineCourseHost API
 * Uso: node test_connection.js
 */

import 'dotenv/config';
import { OnlineCourseHostClient } from './client.js';

async function testConnection() {
  console.log('🔌 Testeando conexión a OnlineCourseHost API...\n');

  // Verificar variables de entorno
  const integrationToken = process.env.OCH_INTEGRATION_TOKEN;

  if (!integrationToken) {
    console.error('❌ Error: OCH_INTEGRATION_TOKEN no está configurada en .env');
    process.exit(1);
  }

  console.log('✅ Integration Token encontrado');

  try {
    const client = new OnlineCourseHostClient(integrationToken);

    // Test: Listar cursos (único endpoint de lectura disponible)
    console.log('📋 Listando cursos disponibles...');
    const courses = await client.listCourses();

    console.log(`✅ Conexión exitosa!`);

    if (Array.isArray(courses) && courses.length > 0) {
      console.log(`   Cursos encontrados: ${courses.length}\n`);
      console.log('📝 Cursos disponibles:');
      courses.forEach(course => {
        const name = course.name || course.title || 'Sin nombre';
        const id = course.id || 'N/A';
        console.log(`   - ${name} (ID: ${id})`);
      });
    } else {
      console.log('   No se encontraron cursos');
    }

    console.log('\n⚠️  Nota: La API de OnlineCourseHost es muy limitada.');
    console.log('   Solo tiene 2 endpoints: listar cursos y matricular estudiantes.');

  } catch (error) {
    console.error(`❌ Error de conexión: ${error.message}`);
    process.exit(1);
  }
}

testConnection();
