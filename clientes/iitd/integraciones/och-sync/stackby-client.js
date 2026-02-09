/**
 * =====================================================
 * STACKBY CLIENT
 * =====================================================
 *
 * Instituto Internacional de Teología a Distancia
 * Cliente para la API de Stackby
 */

const STACKBY_CONFIG = {
  API_KEY: process.env.STACKBY_API_KEY || 'YOUR_STACKBY_API_KEY',
  STACK_ID: process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78',
  BASE_URL: 'https://stackby.com/api/betav1'
};

// IDs de tablas conocidas (configurar según necesidad)
const TABLES = {
  SOLICITUDES_DECA: 'tbcoXCDU2ArgKH4eQJ',
  ALUMNOS: process.env.STACKBY_ALUMNOS_TABLE_ID || null  // TODO: Configurar
};

/**
 * Hace una petición a la API de Stackby
 */
async function stackbyFetch(endpoint, options = {}) {
  const url = `${STACKBY_CONFIG.BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'api-key': STACKBY_CONFIG.API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Stackby API Error ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Crea una fila en una tabla
 * @param {string} tableId - ID de la tabla
 * @param {Object} fields - Campos a insertar
 * @returns {Promise<Object>} Fila creada
 */
async function createRow(tableId, fields) {
  return stackbyFetch(`/rowcreate/${STACKBY_CONFIG.STACK_ID}/${tableId}`, {
    method: 'POST',
    body: JSON.stringify({
      records: [{ field: fields }]
    })
  });
}

/**
 * Actualiza una fila existente
 * @param {string} tableId - ID de la tabla
 * @param {string} rowId - ID de la fila
 * @param {Object} fields - Campos a actualizar
 * @returns {Promise<Object>} Fila actualizada
 */
async function updateRow(tableId, rowId, fields) {
  return stackbyFetch(`/rowupdate/${STACKBY_CONFIG.STACK_ID}/${tableId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      records: [{ id: rowId, field: fields }]
    })
  });
}

/**
 * Obtiene filas de una tabla
 * @param {string} tableId - ID de la tabla
 * @param {Object} options - Opciones de consulta
 * @returns {Promise<Array>} Filas de la tabla
 */
async function getRows(tableId, options = {}) {
  let endpoint = `/rowlist/${STACKBY_CONFIG.STACK_ID}/${tableId}`;

  const params = new URLSearchParams();
  if (options.maxRecords) params.set('maxRecords', options.maxRecords);
  if (options.view) params.set('view', options.view);
  if (options.offset) params.set('offset', options.offset);

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  return stackbyFetch(endpoint);
}

/**
 * Busca una fila por un campo específico
 * @param {string} tableId - ID de la tabla
 * @param {string} fieldName - Nombre del campo
 * @param {string} value - Valor a buscar
 * @returns {Promise<Object|null>} Fila encontrada o null
 */
async function findRowByField(tableId, fieldName, value) {
  const rows = await getRows(tableId, { maxRecords: 100 });

  if (!rows.records) return null;

  const found = rows.records.find(row => {
    const fieldValue = row.field[fieldName];
    return fieldValue && fieldValue.toString().toLowerCase() === value.toString().toLowerCase();
  });

  return found || null;
}

/**
 * Crea o actualiza una fila (upsert por email)
 * @param {string} tableId - ID de la tabla
 * @param {Object} fields - Campos de la fila
 * @param {string} emailField - Nombre del campo email para buscar
 * @returns {Promise<Object>} Resultado de la operación
 */
async function upsertByEmail(tableId, fields, emailField = 'Email') {
  const email = fields[emailField] || fields['Correo electrónico'] || fields['email'];

  if (!email) {
    throw new Error('Email es requerido para upsert');
  }

  // Buscar si existe
  const existing = await findRowByField(tableId, emailField, email);

  if (existing) {
    // Actualizar
    return {
      action: 'updated',
      result: await updateRow(tableId, existing.id, fields)
    };
  } else {
    // Crear
    return {
      action: 'created',
      result: await createRow(tableId, fields)
    };
  }
}

module.exports = {
  createRow,
  updateRow,
  getRows,
  findRowByField,
  upsertByEmail,
  config: STACKBY_CONFIG,
  TABLES
};
