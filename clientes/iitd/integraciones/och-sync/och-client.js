/**
 * =====================================================
 * ONLINECOURSEHOST CLIENT
 * =====================================================
 *
 * Instituto Internacional de Teología a Distancia
 * Cliente para la API de OnlineCourseHost
 *
 * LIMITACIÓN IMPORTANTE:
 * La API de OCH solo tiene 2 endpoints disponibles:
 * - GET /api/pabbly-tenant-courses - Listar cursos
 * - POST /api/zapier-enroll-student-action-webhook - Matricular estudiante
 *
 * NO es posible:
 * - Obtener lista de estudiantes matriculados
 * - Ver progreso de estudiantes
 * - Sincronizar matrículas OCH → Stackby
 *
 * Para sincronización bidireccional se necesitaría:
 * - Exportación manual desde panel de OCH
 * - Webhook configurado en OCH (si existe)
 */

const OCH_CONFIG = {
  API_KEY: process.env.OCH_API_KEY || 'YOUR_OCH_API_KEY',
  BASE_URL: 'https://api.onlinecoursehost.com'
};

/**
 * Hace una petición a la API de OCH
 */
async function ochFetch(endpoint, options = {}) {
  const url = `${OCH_CONFIG.BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Integration-Token': OCH_CONFIG.API_KEY,
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OCH API Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Obtiene la lista de cursos
 * @returns {Promise<Array>} Lista de cursos
 */
async function listCourses() {
  return ochFetch('/api/pabbly-tenant-courses');
}

/**
 * Matricula un estudiante en un curso
 * @param {string} courseId - ID del curso
 * @param {Object} student - Datos del estudiante
 * @param {string} student.email - Email (requerido)
 * @param {string} student.firstName - Nombre
 * @param {string} student.lastName - Apellido
 * @returns {Promise<Object>} Resultado de la matriculación
 */
async function enrollStudent(courseId, student) {
  if (!student.email) {
    throw new Error('email es requerido para matricular');
  }
  if (!courseId) {
    throw new Error('courseId es requerido');
  }

  return ochFetch('/api/zapier-enroll-student-action-webhook', {
    method: 'POST',
    body: JSON.stringify({
      email: student.email,
      first_name: student.firstName || student.nombre || '',
      last_name: student.lastName || student.apellidos || '',
      course_id: courseId
    })
  });
}

/**
 * Matricula por nombre de curso (búsqueda)
 * @param {string} email - Email del estudiante
 * @param {string} courseName - Nombre del curso (búsqueda parcial)
 * @param {Object} options - firstName, lastName
 */
async function enrollByCourseName(email, courseName, options = {}) {
  const courses = await listCourses();

  const courseNameLower = courseName.toLowerCase();
  const course = courses.find(c =>
    (c.course || c.name || c.title || '').toLowerCase().includes(courseNameLower)
  );

  if (!course) {
    throw new Error(`No se encontró curso: ${courseName}`);
  }

  return enrollStudent(course.id, {
    email,
    firstName: options.firstName,
    lastName: options.lastName
  });
}

/**
 * NOTA: Las siguientes funciones NO están disponibles en la API de OCH
 * Se mantienen como stubs para documentar la limitación
 */

async function getCourseStudents(courseId) {
  throw new Error(
    'La API de OCH no permite obtener estudiantes de un curso. ' +
    'Esta información solo está disponible en el panel de administración.'
  );
}

async function getAllStudents() {
  throw new Error(
    'La API de OCH no permite obtener lista de estudiantes. ' +
    'Esta información solo está disponible en el panel de administración.'
  );
}

async function getStudentProgress(courseId, studentId) {
  throw new Error(
    'La API de OCH no permite obtener progreso de estudiantes. ' +
    'Esta información solo está disponible en el panel de administración.'
  );
}

async function getAllEnrollments() {
  throw new Error(
    'La API de OCH no permite obtener matriculaciones. ' +
    'La sincronización OCH → Stackby requiere exportación manual desde el panel de OCH.'
  );
}

module.exports = {
  listCourses,
  enrollStudent,
  enrollByCourseName,
  // Stubs para documentar limitaciones
  getCourseStudents,
  getAllStudents,
  getStudentProgress,
  getAllEnrollments,
  config: OCH_CONFIG
};
