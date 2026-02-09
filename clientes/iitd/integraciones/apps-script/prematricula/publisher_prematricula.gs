/**
 * =====================================================
 * PUBLISHER PRE-MATRICULA DECA
 * =====================================================
 *
 * Instituto Internacional de Teologia a Distancia
 * Flujo: Getformly -> Sheets -> Apps Script -> Pabbly -> Stackby
 *
 * Este script:
 * 1. Lee filas pendientes de la hoja raw_getformly
 * 2. Valida que tengan campos obligatorios
 * 3. Genera un external_id determinista
 * 4. Envia el payload a Pabbly via webhook
 * 5. Marca la fila como publicada (o registra error)
 *
 * Ejecutar con trigger time-based cada 5 minutos.
 */

// =====================================================
// FUNCION PRINCIPAL
// =====================================================

/**
 * Funcion principal de sincronizacion
 * Procesa filas pendientes y las envia a Pabbly
 *
 * @returns {Object} Resumen de la ejecucion
 */
function sync() {
  const startTime = new Date();
  const runId = generateRunId();

  Logger.log('=== SYNC START === Run ID: ' + runId);

  // Obtener lock exclusivo para evitar ejecuciones concurrentes
  const lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
      Logger.log('No se pudo obtener lock. Otra ejecucion en curso.');
      return { status: 'SKIPPED', reason: 'lock_unavailable', runId: runId };
    }

    Logger.log('Lock adquirido.');

    // Verificar configuracion
    if (!verifySecrets()) {
      throw new Error('Secrets no configurados. Ejecutar setupSecrets().');
    }

    // Obtener hoja de datos
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      throw new Error('Hoja "' + CONFIG.SHEET_NAME + '" no encontrada.');
    }

    // Leer todas las filas (excluyendo cabecera)
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('No hay datos (solo cabecera).');
      return { status: 'OK', processed: 0, errors: 0, runId: runId };
    }

    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const data = dataRange.getValues();

    // Filtrar filas pendientes (sin published_at)
    const pendingRows = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const publishedAt = row[CONFIG.COLUMNS.PUBLISHED_AT];
      const attempts = row[CONFIG.COLUMNS.PUBLISH_ATTEMPTS] || 0;

      // Pendiente si: no tiene published_at Y no ha excedido intentos maximos
      if (!publishedAt && attempts < CONFIG.MAX_ATTEMPTS) {
        pendingRows.push({
          rowIndex: i + 2, // +2 porque empezamos en fila 2 (1-indexed)
          data: row
        });
      }
    }

    Logger.log('Filas pendientes encontradas: ' + pendingRows.length);

    // Limitar filas por ejecucion
    const rowsToProcess = pendingRows.slice(0, CONFIG.MAX_ROWS_PER_RUN);

    // Procesar cada fila
    let processed = 0;
    let errors = 0;

    for (const pending of rowsToProcess) {
      const result = processRow(sheet, pending.rowIndex, pending.data, runId);

      if (result.success) {
        processed++;
      } else {
        errors++;
      }

      // Pequeña pausa entre requests para evitar rate limiting
      if (rowsToProcess.indexOf(pending) < rowsToProcess.length - 1) {
        Utilities.sleep(200);
      }
    }

    const duration = (new Date() - startTime) / 1000;
    Logger.log('=== SYNC END === Procesadas: ' + processed + ', Errores: ' + errors + ', Duracion: ' + duration + 's');

    return {
      status: 'OK',
      runId: runId,
      processed: processed,
      errors: errors,
      pending: pendingRows.length - rowsToProcess.length,
      durationSeconds: duration
    };

  } catch (e) {
    Logger.log('ERROR FATAL: ' + e.message);
    Logger.log(e.stack);
    return { status: 'ERROR', error: e.message, runId: runId };

  } finally {
    lock.releaseLock();
    Logger.log('Lock liberado.');
  }
}

// =====================================================
// PROCESAMIENTO DE FILAS
// =====================================================

/**
 * Procesa una fila individual
 *
 * @param {Sheet} sheet - Hoja de calculo
 * @param {number} rowIndex - Indice de la fila (1-indexed)
 * @param {Array} rowData - Datos de la fila
 * @param {string} runId - ID de la ejecucion actual
 * @returns {Object} Resultado del procesamiento
 */
function processRow(sheet, rowIndex, rowData, runId) {
  Logger.log('Procesando fila ' + rowIndex);

  try {
    // Validar completitud
    const validation = validateRow(rowData);
    if (!validation.valid) {
      Logger.log('Fila ' + rowIndex + ' incompleta: ' + validation.reason);
      // No incrementar intentos para filas incompletas (pueden completarse despues)
      return { success: false, reason: 'incomplete', details: validation.reason };
    }

    // Generar o recuperar external_id
    let externalId = rowData[CONFIG.COLUMNS.EXTERNAL_ID];
    if (!externalId) {
      externalId = generateExternalId(rowData);
      // Escribir external_id en la hoja
      sheet.getRange(rowIndex, CONFIG.COLUMNS.EXTERNAL_ID + 1).setValue(externalId);
      Logger.log('External ID generado: ' + externalId);
    }

    // Construir payload
    const payload = buildPayload(rowData, externalId);

    // Enviar a Pabbly
    const sendResult = sendToPabbly(payload, rowIndex);

    if (sendResult.success) {
      // Marcar como publicado
      const now = new Date();
      const attempts = (rowData[CONFIG.COLUMNS.PUBLISH_ATTEMPTS] || 0) + 1;

      sheet.getRange(rowIndex, CONFIG.COLUMNS.PUBLISHED_AT + 1).setValue(now);
      sheet.getRange(rowIndex, CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).setValue(attempts);
      sheet.getRange(rowIndex, CONFIG.COLUMNS.LAST_ERROR + 1).setValue(''); // Limpiar error

      Logger.log('Fila ' + rowIndex + ' publicada exitosamente.');
      return { success: true, externalId: externalId };

    } else {
      // Registrar error
      const attempts = (rowData[CONFIG.COLUMNS.PUBLISH_ATTEMPTS] || 0) + 1;

      sheet.getRange(rowIndex, CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).setValue(attempts);
      sheet.getRange(rowIndex, CONFIG.COLUMNS.LAST_ERROR + 1).setValue(
        '[' + new Date().toISOString() + '] ' + sendResult.error
      );

      Logger.log('Fila ' + rowIndex + ' error: ' + sendResult.error + ' (intento ' + attempts + ')');
      return { success: false, reason: 'send_error', error: sendResult.error };
    }

  } catch (e) {
    Logger.log('Error procesando fila ' + rowIndex + ': ' + e.message);

    // Registrar error en la hoja
    const attempts = (rowData[CONFIG.COLUMNS.PUBLISH_ATTEMPTS] || 0) + 1;
    sheet.getRange(rowIndex, CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).setValue(attempts);
    sheet.getRange(rowIndex, CONFIG.COLUMNS.LAST_ERROR + 1).setValue(
      '[' + new Date().toISOString() + '] EXCEPTION: ' + e.message
    );

    return { success: false, reason: 'exception', error: e.message };
  }
}

// =====================================================
// VALIDACION
// =====================================================

/**
 * Valida que una fila tenga los campos obligatorios
 *
 * @param {Array} rowData - Datos de la fila
 * @returns {Object} { valid: boolean, reason: string }
 */
function validateRow(rowData) {
  const missing = [];

  for (const fieldName of CONFIG.REQUIRED_FIELDS) {
    const colIndex = CONFIG.COLUMNS[fieldName];
    const value = rowData[colIndex];

    if (value === undefined || value === null || value === '') {
      missing.push(fieldName);
    }
  }

  if (missing.length > 0) {
    return { valid: false, reason: 'Campos faltantes: ' + missing.join(', ') };
  }

  // Validacion adicional: email debe tener formato valido
  const email = rowData[CONFIG.COLUMNS.EMAIL];
  if (email && !isValidEmail(email)) {
    return { valid: false, reason: 'Email invalido: ' + email };
  }

  return { valid: true };
}

/**
 * Valida formato basico de email
 *
 * @param {string} email - Email a validar
 * @returns {boolean} true si es valido
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
}

// =====================================================
// GENERACION DE IDS
// =====================================================

/**
 * Genera un external_id determinista basado en los datos de la fila
 *
 * El ID es un hash de: email_normalizado + submitted_at + programa
 * Esto garantiza que el mismo envio siempre genera el mismo ID
 *
 * @param {Array} rowData - Datos de la fila
 * @returns {string} External ID
 */
function generateExternalId(rowData) {
  const email = normalizeEmail(rowData[CONFIG.COLUMNS.EMAIL]);
  const submittedAt = formatDateForId(rowData[CONFIG.COLUMNS.SUBMITTED_AT]);
  const programa = String(rowData[CONFIG.COLUMNS.PROGRAMA] || '').trim().toLowerCase();

  // Concatenar componentes
  const source = email + '|' + submittedAt + '|' + programa;

  // Generar hash MD5 (determinista)
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, source);
  const hashHex = hash.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');

  // Devolver con prefijo y primeros 16 caracteres del hash
  return CONFIG.EXTERNAL_ID_PREFIX + hashHex.substring(0, 16);
}

/**
 * Normaliza un email para comparacion consistente
 *
 * @param {string} email - Email original
 * @returns {string} Email normalizado
 */
function normalizeEmail(email) {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

/**
 * Formatea una fecha para usar en el ID
 *
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada (ISO sin milisegundos)
 */
function formatDateForId(date) {
  if (!date) return '';

  let d;
  if (date instanceof Date) {
    d = date;
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) {
    return String(date);
  }

  // Formato: YYYY-MM-DDTHH:MM:SSZ (sin milisegundos)
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Genera un ID unico para la ejecucion (para logs)
 *
 * @returns {string} Run ID
 */
function generateRunId() {
  const now = new Date();
  const random = Math.random().toString(36).substring(2, 8);
  return now.toISOString().replace(/[-:]/g, '').substring(0, 14) + '_' + random;
}

// =====================================================
// CONSTRUCCION DE PAYLOAD
// =====================================================

/**
 * Construye el payload JSON para enviar a Pabbly
 *
 * @param {Array} rowData - Datos de la fila
 * @param {string} externalId - External ID generado
 * @returns {Object} Payload JSON
 */
function buildPayload(rowData, externalId) {
  const email = rowData[CONFIG.COLUMNS.EMAIL];
  const submittedAt = rowData[CONFIG.COLUMNS.SUBMITTED_AT];

  return {
    // Identificadores
    external_id: externalId,
    source: CONFIG.SOURCE,

    // Timestamps
    submitted_at: formatISODate(submittedAt),
    ingested_at: new Date().toISOString(),

    // Datos del formulario
    email: normalizeEmail(email),
    email_key: normalizeEmail(email), // Para busquedas en Stackby
    nombre: String(rowData[CONFIG.COLUMNS.NOMBRE] || '').trim(),
    telefono: String(rowData[CONFIG.COLUMNS.TELEFONO] || '').trim(),
    programa: String(rowData[CONFIG.COLUMNS.PROGRAMA] || '').trim(),
    sede: String(rowData[CONFIG.COLUMNS.SEDE] || '').trim()
  };
}

/**
 * Formatea una fecha a ISO 8601
 *
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha en formato ISO
 */
function formatISODate(date) {
  if (!date) return null;

  let d;
  if (date instanceof Date) {
    d = date;
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) {
    return null;
  }

  return d.toISOString();
}

// =====================================================
// ENVIO A PABBLY
// =====================================================

/**
 * Envia un payload a Pabbly via webhook
 * Implementa retry con backoff exponencial
 *
 * @param {Object} payload - Payload JSON a enviar
 * @param {number} rowIndex - Indice de fila (para logs)
 * @returns {Object} { success: boolean, error?: string, response?: Object }
 */
function sendToPabbly(payload, rowIndex) {
  const webhookUrl = getPabblyWebhookUrl();

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    timeout: CONFIG.FETCH_TIMEOUT_MS / 1000 // UrlFetch usa segundos
  };

  let lastError = null;
  let attempt = 0;
  const maxRetries = 3;

  while (attempt < maxRetries) {
    attempt++;

    try {
      Logger.log('Enviando a Pabbly (intento ' + attempt + '): ' + JSON.stringify(payload).substring(0, 200));

      const response = UrlFetchApp.fetch(webhookUrl, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      Logger.log('Respuesta Pabbly: ' + responseCode + ' - ' + responseText.substring(0, 200));

      // Exito: 2xx
      if (responseCode >= 200 && responseCode < 300) {
        return {
          success: true,
          response: {
            code: responseCode,
            body: responseText
          }
        };
      }

      // Error cliente (4xx): no reintentar
      if (responseCode >= 400 && responseCode < 500) {
        return {
          success: false,
          error: 'HTTP ' + responseCode + ': ' + responseText.substring(0, 100)
        };
      }

      // Error servidor (5xx): reintentar con backoff
      lastError = 'HTTP ' + responseCode + ': ' + responseText.substring(0, 100);

    } catch (e) {
      lastError = 'Exception: ' + e.message;
      Logger.log('Error en UrlFetch: ' + e.message);
    }

    // Backoff exponencial antes de reintentar
    if (attempt < maxRetries) {
      const backoffMs = Math.min(
        CONFIG.BACKOFF_BASE_MS * Math.pow(2, attempt - 1),
        CONFIG.BACKOFF_MAX_MS
      );
      Logger.log('Backoff: ' + backoffMs + 'ms antes de reintento ' + (attempt + 1));
      Utilities.sleep(backoffMs);
    }
  }

  return {
    success: false,
    error: 'Max retries exceeded. Last error: ' + lastError
  };
}

// =====================================================
// FUNCIONES DE UTILIDAD Y TESTING
// =====================================================

/**
 * Ejecuta sync() manualmente para testing
 * Muestra resultados en el log
 */
function testSync() {
  Logger.log('=== TEST MANUAL ===');
  const result = sync();
  Logger.log('Resultado: ' + JSON.stringify(result, null, 2));
}

/**
 * Verifica la configuracion sin ejecutar sync
 */
function testConfig() {
  Logger.log('=== TEST CONFIGURACION ===');

  // Verificar secrets
  Logger.log('1. Verificando secrets...');
  const secretsOk = verifySecrets();
  Logger.log('   Secrets OK: ' + secretsOk);

  // Verificar hoja
  Logger.log('2. Verificando hoja...');
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (sheet) {
    Logger.log('   Hoja encontrada: ' + CONFIG.SHEET_NAME);
    Logger.log('   Filas: ' + sheet.getLastRow());
    Logger.log('   Columnas: ' + sheet.getLastColumn());
  } else {
    Logger.log('   ERROR: Hoja "' + CONFIG.SHEET_NAME + '" no encontrada');
  }

  // Mostrar configuracion
  Logger.log('3. Configuracion actual:');
  Logger.log('   SHEET_NAME: ' + CONFIG.SHEET_NAME);
  Logger.log('   REQUIRED_FIELDS: ' + CONFIG.REQUIRED_FIELDS.join(', '));
  Logger.log('   MAX_ROWS_PER_RUN: ' + CONFIG.MAX_ROWS_PER_RUN);
  Logger.log('   MAX_ATTEMPTS: ' + CONFIG.MAX_ATTEMPTS);
}

/**
 * Genera un payload de ejemplo para testing de Pabbly
 */
function generateSamplePayload() {
  const sample = {
    external_id: CONFIG.EXTERNAL_ID_PREFIX + 'sample123456',
    source: CONFIG.SOURCE,
    submitted_at: new Date().toISOString(),
    ingested_at: new Date().toISOString(),
    email: 'test@example.com',
    email_key: 'test@example.com',
    nombre: 'Juan Perez',
    telefono: '+34600123456',
    programa: 'DECA Primaria',
    sede: 'Madrid'
  };

  Logger.log('=== PAYLOAD DE EJEMPLO ===');
  Logger.log(JSON.stringify(sample, null, 2));
  return sample;
}

/**
 * Resetea los intentos de una fila especifica (para re-procesar)
 *
 * @param {number} rowNumber - Numero de fila (1-indexed, incluyendo cabecera)
 */
function resetRow(rowNumber) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    Logger.log('ERROR: Hoja no encontrada');
    return;
  }

  sheet.getRange(rowNumber, CONFIG.COLUMNS.PUBLISHED_AT + 1).setValue('');
  sheet.getRange(rowNumber, CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).setValue(0);
  sheet.getRange(rowNumber, CONFIG.COLUMNS.LAST_ERROR + 1).setValue('');

  Logger.log('Fila ' + rowNumber + ' reseteada.');
}

/**
 * Resetea todas las filas con error para re-intentar
 */
function resetAllErrors() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    Logger.log('ERROR: Hoja no encontrada');
    return;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log('No hay datos');
    return;
  }

  const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  const data = dataRange.getValues();

  let resetCount = 0;
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const publishedAt = row[CONFIG.COLUMNS.PUBLISHED_AT];
    const attempts = row[CONFIG.COLUMNS.PUBLISH_ATTEMPTS] || 0;

    // Resetear filas que fallaron (sin published_at y con intentos >= MAX)
    if (!publishedAt && attempts >= CONFIG.MAX_ATTEMPTS) {
      const rowNum = i + 2;
      sheet.getRange(rowNum, CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).setValue(0);
      sheet.getRange(rowNum, CONFIG.COLUMNS.LAST_ERROR + 1).setValue('');
      resetCount++;
    }
  }

  Logger.log('Filas reseteadas: ' + resetCount);
}
