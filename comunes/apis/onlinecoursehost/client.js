/**
 * Cliente API para OnlineCourseHost (OCH)
 * Documentación: https://help.onlinecoursehost.com/
 *
 * NOTA: La API de OCH es muy limitada.
 * Solo tiene 2 endpoints disponibles para integraciones externas.
 */

const BASE_URL = 'https://api.onlinecoursehost.com';

export class OnlineCourseHostClient {
  constructor(integrationToken) {
    if (!integrationToken) {
      throw new Error('OCH_INTEGRATION_TOKEN es requerido');
    }
    this.integrationToken = integrationToken;
  }

  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Integration-Token': this.integrationToken,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OnlineCourseHost API error ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * Listar cursos disponibles
   * Endpoint usado por Pabbly para obtener cursos en triggers
   * @returns {Promise<Array>} - Array de cursos
   */
  async listCourses() {
    return this.request('/api/pabbly-tenant-courses');
  }

  /**
   * Matricular un estudiante en un curso
   * Endpoint webhook para acciones de Zapier/Pabbly
   * @param {object} studentData - Datos del estudiante
   * @param {string} studentData.email - Email del estudiante (requerido)
   * @param {string} studentData.firstName - Nombre (opcional)
   * @param {string} studentData.lastName - Apellido (opcional)
   * @param {string} studentData.courseId - ID del curso (requerido)
   * @returns {Promise<object>} - Resultado de la matriculación
   */
  async enrollStudent(studentData) {
    if (!studentData.email) {
      throw new Error('email es requerido para matricular un estudiante');
    }
    if (!studentData.courseId) {
      throw new Error('courseId es requerido para matricular un estudiante');
    }

    return this.request('/api/zapier-enroll-student-action-webhook', {
      method: 'POST',
      body: JSON.stringify({
        email: studentData.email,
        first_name: studentData.firstName || '',
        last_name: studentData.lastName || '',
        course_id: studentData.courseId,
      }),
    });
  }

  /**
   * Método de conveniencia: Matricular por email y nombre de curso
   * Busca el curso por nombre y matricula al estudiante
   * @param {string} email - Email del estudiante
   * @param {string} courseName - Nombre del curso (búsqueda parcial)
   * @param {object} options - Opciones adicionales (firstName, lastName)
   * @returns {Promise<object>} - Resultado de la matriculación
   */
  async enrollByCourseName(email, courseName, options = {}) {
    // Obtener lista de cursos
    const courses = await this.listCourses();

    // Buscar curso por nombre (case insensitive, búsqueda parcial)
    const courseNameLower = courseName.toLowerCase();
    const course = courses.find(c =>
      c.name?.toLowerCase().includes(courseNameLower) ||
      c.title?.toLowerCase().includes(courseNameLower)
    );

    if (!course) {
      throw new Error(`No se encontró un curso con el nombre: ${courseName}`);
    }

    return this.enrollStudent({
      email,
      courseId: course.id,
      firstName: options.firstName,
      lastName: options.lastName,
    });
  }
}

export default OnlineCourseHostClient;
