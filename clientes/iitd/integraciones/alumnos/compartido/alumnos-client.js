/**
 * =====================================================
 * ALUMNOS CLIENT
 * =====================================================
 *
 * Instituto Internacional de Teología a Distancia
 * Cliente para gestión de la tabla ALUMNOS en Stackby
 *
 * Email como ID único (clave primaria)
 */

const ALUMNOS_CONFIG = {
  API_KEY: process.env.STACKBY_API_KEY || 'YOUR_STACKBY_API_KEY',
  STACK_ID: process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78',
  TABLE_ID: process.env.STACKBY_ALUMNOS_TABLE_ID || 'tbJ6m2vPBrLEBvZ3VQ',
  BASE_URL: 'https://stackby.com/api/betav1'
};

// Estados válidos del pipeline
const ESTADOS = {
  SOLICITUD: 'solicitud',
  ADMITIDO: 'admitido',
  PAGADO: 'pagado',
  ENROLADO: 'enrolado',
  ACTIVO: 'activo',
  BAJA: 'baja'
};

const DOCS_ESTADOS = {
  PENDIENTE: 'pendiente',
  PARCIAL: 'parcial',
  COMPLETO: 'completo',
  VERIFICADO: 'verificado'
};

const PAGO_ESTADOS = {
  PENDIENTE: 'pendiente',
  PARCIAL: 'parcial',
  PAGADO: 'pagado'
};

const FUENTES = {
  FORMULARIO_DECA: 'formulario_deca',
  POLAR: 'polar',
  OCH: 'och',
  MANUAL: 'manual'
};

/**
 * Verifica que la tabla esté configurada
 */
function checkConfig() {
  if (!ALUMNOS_CONFIG.TABLE_ID) {
    throw new Error('STACKBY_ALUMNOS_TABLE_ID no configurado. Crea la tabla en Stackby y configura el ID.');
  }
}

/**
 * Hace una petición a la API de Stackby
 */
async function stackbyFetch(endpoint, options = {}) {
  const url = `${ALUMNOS_CONFIG.BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'api-key': ALUMNOS_CONFIG.API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Stackby error ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Normaliza un email (lowercase, trim)
 */
function normalizeEmail(email) {
  if (!email) return null;
  return String(email).toLowerCase().trim();
}

/**
 * Obtiene todos los registros de la tabla con paginacion
 * @returns {Promise<Array>} Todos los registros
 */
async function getAllRecords() {
  checkConfig();
  const PAGE_SIZE = 100;
  let all = [];
  let offset = 0;

  while (true) {
    const endpoint = `/rowlist/${ALUMNOS_CONFIG.STACK_ID}/${ALUMNOS_CONFIG.TABLE_ID}` +
      (offset ? `?offset=${offset}` : '');
    const data = await stackbyFetch(endpoint);
    const records = Array.isArray(data) ? data : (data.records || []);
    all = all.concat(records);
    if (records.length < PAGE_SIZE) break;
    offset += records.length;
  }

  return all;
}

/**
 * Busca un alumno por email
 * @param {string} email - Email del alumno
 * @returns {Promise<Object|null>} Registro del alumno o null
 */
async function findByEmail(email) {
  checkConfig();

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return null;

  const rows = await getAllRecords();

  return rows.find(row => {
    const rowEmail = normalizeEmail(row.field?.['Email']);
    return rowEmail === normalizedEmail;
  }) || null;
}

/**
 * Obtiene el siguiente ID_ALUMNO disponible (IITD-NNNN)
 * Lee todos los registros, encuentra el max ID y devuelve el siguiente.
 * @returns {Promise<string>} Next ID like "IITD-0042"
 */
async function getNextAlumnoId() {
  const rows = await getAllRecords();

  // Base: último nº expediente PolarDoc = 110000
  const POLAR_LAST_ID = 110000;
  let maxNum = POLAR_LAST_ID;
  for (const row of rows) {
    const id = row.field?.ID_ALUMNO || '';
    const match = String(id).match(/(\d+)$/);
    if (match) maxNum = Math.max(maxNum, parseInt(match[1]));
  }

  return 'IITD-' + String(maxNum + 1).padStart(6, '0');
}

/**
 * Crea un nuevo alumno
 * @param {Object} fields - Campos del alumno
 * @returns {Promise<Object>} Alumno creado
 */
async function createAlumno(fields) {
  checkConfig();

  // Asegurar email normalizado
  if (fields.Email) {
    fields.Email = normalizeEmail(fields.Email);
  }

  // Asegurar fecha de estado
  if (!fields['Fecha estado']) {
    fields['Fecha estado'] = new Date().toISOString().split('T')[0];
  }

  // Auto-asignar ID_ALUMNO si no viene (N04/N20)
  if (!fields.ID_ALUMNO) {
    fields.ID_ALUMNO = await getNextAlumnoId();
  }

  return stackbyFetch(
    `/rowcreate/${ALUMNOS_CONFIG.STACK_ID}/${ALUMNOS_CONFIG.TABLE_ID}`,
    {
      method: 'POST',
      body: JSON.stringify({
        records: [{ field: fields }]
      })
    }
  );
}

/**
 * Actualiza un alumno existente
 * @param {string} rowId - ID del registro en Stackby
 * @param {Object} fields - Campos a actualizar
 * @returns {Promise<Object>} Alumno actualizado
 */
async function updateAlumno(rowId, fields) {
  checkConfig();

  // Actualizar fecha de estado si cambia el estado
  if (fields.Estado && !fields['Fecha estado']) {
    fields['Fecha estado'] = new Date().toISOString().split('T')[0];
  }

  return stackbyFetch(
    `/rowupdate/${ALUMNOS_CONFIG.STACK_ID}/${ALUMNOS_CONFIG.TABLE_ID}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        records: [{ id: rowId, field: fields }]
      })
    }
  );
}

/**
 * Crea o actualiza un alumno por email (upsert)
 * @param {Object} fields - Campos del alumno (debe incluir Email)
 * @returns {Promise<Object>} Resultado con action: 'created' o 'updated'
 */
async function upsertByEmail(fields) {
  const email = fields.Email;
  if (!email) {
    throw new Error('Email es requerido para upsert');
  }

  const existing = await findByEmail(email);

  if (existing) {
    // No sobrescribir campos existentes con valores vacíos
    const updateFields = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== null && value !== undefined && value !== '') {
        updateFields[key] = value;
      }
    }

    const result = await updateAlumno(existing.id, updateFields);
    return {
      action: 'updated',
      email: normalizeEmail(email),
      rowId: existing.id,
      result
    };
  } else {
    const result = await createAlumno(fields);
    return {
      action: 'created',
      email: normalizeEmail(email),
      result
    };
  }
}

/**
 * Crea alumno desde solicitud DECA
 * Función de alto nivel para usar en publisher.gs
 * @param {Object} solicitud - Datos de la solicitud DECA
 * @returns {Promise<Object>} Resultado del upsert
 */
async function crearDesdeSOLICITUD_DECA(solicitud) {
  const fields = {
    'Email': solicitud.email,
    'Nombre': solicitud.nombre,
    'Apellidos': solicitud.apellidos,
    'Telefono': solicitud.telefono,
    'DNI': solicitud.dni,
    'Programa': solicitud.programa,
    'Estado': ESTADOS.SOLICITUD,
    'Docs estado': DOCS_ESTADOS.PENDIENTE,
    'Estado pago': PAGO_ESTADOS.PENDIENTE,
    'Fuente': FUENTES.FORMULARIO_DECA,
    'Notas': `Solicitud ${solicitud.external_id || ''} del ${new Date().toLocaleDateString('es-ES')}`
  };

  return upsertByEmail(fields);
}

/**
 * Actualiza estado de pago (para webhook Stripe)
 * @param {string} email - Email del alumno
 * @param {Object} pagoInfo - Información del pago
 * @returns {Promise<Object>} Resultado de la actualización
 */
async function actualizarPago(email, pagoInfo) {
  const alumno = await findByEmail(email);

  if (!alumno) {
    // Crear alumno si no existe (pago directo sin solicitud previa)
    return upsertByEmail({
      'Email': email,
      'Nombre': pagoInfo.nombre || '',
      'Estado': ESTADOS.PAGADO,
      'Estado pago': PAGO_ESTADOS.PAGADO,
      'Fecha pago': pagoInfo.fecha || new Date().toISOString().split('T')[0],
      'Fuente': FUENTES.MANUAL,
      'Notas': `Pago directo Stripe ${pagoInfo.stripeSessionId || ''}`
    });
  }

  // Actualizar alumno existente
  const updates = {
    'Estado pago': PAGO_ESTADOS.PAGADO,
    'Fecha pago': pagoInfo.fecha || new Date().toISOString().split('T')[0]
  };

  // Progresar estado si docs están OK
  const docsEstado = alumno.field['Docs estado'];
  if (docsEstado === DOCS_ESTADOS.COMPLETO || docsEstado === DOCS_ESTADOS.VERIFICADO) {
    updates['Estado'] = ESTADOS.PAGADO;
  }

  if (pagoInfo.stripeSessionId) {
    updates['Notas'] = (alumno.field['Notas'] || '') + `\nPago Stripe: ${pagoInfo.stripeSessionId}`;
  }

  return updateAlumno(alumno.id, updates);
}

/**
 * Actualiza datos de OCH (sync enrollments)
 * @param {string} email - Email del alumno
 * @param {Object} ochData - Datos de OnlineCourseHost
 * @returns {Promise<Object>} Resultado de la actualización
 */
async function actualizarDesdeOCH(email, ochData) {
  const alumno = await findByEmail(email);

  if (!alumno) {
    // Alumno en OCH pero no en nuestra base - crear
    return upsertByEmail({
      'Email': email,
      'Nombre': ochData.nombre || '',
      'Estado': ESTADOS.ACTIVO,
      'OCH Student ID': ochData.studentId,
      'Ultimo acceso': ochData.ultimoAcceso,
      'Progreso': ochData.progreso,
      'Fuente': FUENTES.MANUAL,
      'Notas': 'Importado desde OCH sync'
    });
  }

  const updates = {
    'OCH Student ID': ochData.studentId,
    'Ultimo acceso': ochData.ultimoAcceso,
    'Progreso': ochData.progreso
  };

  // Progresar estado si tiene actividad
  const estadoActual = alumno.field['Estado'];
  if (ochData.ultimoAcceso && estadoActual !== ESTADOS.ACTIVO && estadoActual !== ESTADOS.BAJA) {
    updates['Estado'] = ESTADOS.ACTIVO;
  }

  return updateAlumno(alumno.id, updates);
}

/**
 * Lista todos los alumnos (paginado)
 * @param {Object} options - Opciones de consulta
 * @returns {Promise<Array>} Lista de alumnos
 */
async function listarAlumnos(options = {}) {
  checkConfig();

  if (options.view) {
    // Views use single request (Stackby handles pagination server-side)
    let endpoint = `/rowlist/${ALUMNOS_CONFIG.STACK_ID}/${ALUMNOS_CONFIG.TABLE_ID}`;
    const params = new URLSearchParams();
    params.set('view', options.view);
    if (options.maxRecords) params.set('maxRecords', options.maxRecords);
    endpoint += `?${params.toString()}`;
    const result = await stackbyFetch(endpoint);
    return result.records || [];
  }

  // Default: paginate all records
  return getAllRecords();
}

/**
 * Filtra alumnos por estado
 * @param {string} estado - Estado a filtrar
 * @returns {Promise<Array>} Alumnos con ese estado
 */
async function filtrarPorEstado(estado) {
  const alumnos = await getAllRecords();
  return alumnos.filter(a => a.field?.['Estado'] === estado);
}

module.exports = {
  // Configuración
  config: ALUMNOS_CONFIG,
  ESTADOS,
  DOCS_ESTADOS,
  PAGO_ESTADOS,
  FUENTES,

  // Operaciones básicas
  getAllRecords,
  findByEmail,
  createAlumno,
  updateAlumno,
  upsertByEmail,
  listarAlumnos,
  filtrarPorEstado,
  getNextAlumnoId,

  // Operaciones de negocio
  crearDesdeSOLICITUD_DECA,
  actualizarPago,
  actualizarDesdeOCH,

  // Utilidades
  normalizeEmail,
  checkConfig
};
