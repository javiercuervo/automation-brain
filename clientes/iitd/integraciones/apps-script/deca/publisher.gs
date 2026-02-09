/**
 * =====================================================
 * PUBLISHER DECA MATRICULAS
 * =====================================================
 *
 * Instituto Internacional de Teología a Distancia
 * Flujo: Getformly -> Sheets -> Apps Script -> Pabbly/Stackby
 *
 * Este script:
 * 1. Lee filas pendientes de la hoja de respuestas
 * 2. Valida que tengan campos obligatorios
 * 3. Genera un external_id determinista
 * 4. Envía el payload al destino configurado
 * 5. Marca la fila como publicada (o registra error)
 *
 * Ejecutar con trigger time-based cada 5 minutos.
 */

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

/**
 * Función principal de sincronización
 * Procesa filas pendientes y las envía al destino
 *
 * @returns {Object} Resumen de la ejecución
 */
function sync() {
  const startTime = new Date();
  const runId = generateRunId();

  Logger.log('=== SYNC START === Run ID: ' + runId);

  const lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
      Logger.log('No se pudo obtener lock. Otra ejecución en curso.');
      return { status: 'SKIPPED', reason: 'lock_unavailable', runId: runId };
    }

    Logger.log('Lock adquirido.');

    // Verificar configuración
    if (!verifySecrets()) {
      throw new Error('Secrets no configurados. Ejecutar setupSecrets().');
    }

    // Obtener hoja de datos
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      throw new Error('Hoja "' + CONFIG.SHEET_NAME + '" no encontrada.');
    }

    // Asegurar que existen las columnas de control
    ensureControlColumns(sheet);

    // Leer todas las filas (excluyendo cabecera)
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('No hay datos (solo cabecera).');
      return { status: 'OK', processed: 0, errors: 0, runId: runId };
    }

    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const data = dataRange.getValues();

    // Filtrar filas pendientes
    const pendingRows = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const publishedAt = row[CONFIG.COLUMNS.PUBLISHED_AT];
      const attempts = row[CONFIG.COLUMNS.PUBLISH_ATTEMPTS] || 0;

      if (!publishedAt && attempts < CONFIG.MAX_ATTEMPTS) {
        pendingRows.push({
          rowIndex: i + 2,
          data: row
        });
      }
    }

    Logger.log('Filas pendientes encontradas: ' + pendingRows.length);

    const rowsToProcess = pendingRows.slice(0, CONFIG.MAX_ROWS_PER_RUN);

    let processed = 0;
    let errors = 0;

    for (const pending of rowsToProcess) {
      const result = processRow(sheet, pending.rowIndex, pending.data, runId);

      if (result.success) {
        processed++;
      } else {
        errors++;
      }

      // Pausa entre requests
      if (rowsToProcess.indexOf(pending) < rowsToProcess.length - 1) {
        Utilities.sleep(200);
      }
    }

    const duration = (new Date() - startTime) / 1000;
    Logger.log('=== SYNC END === Procesadas: ' + processed + ', Errores: ' + errors + ', Duración: ' + duration + 's');

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
 */
function processRow(sheet, rowIndex, rowData, runId) {
  Logger.log('Procesando fila ' + rowIndex);

  try {
    // Validar completitud
    const validation = validateRow(rowData);
    if (!validation.valid) {
      Logger.log('Fila ' + rowIndex + ' incompleta: ' + validation.reason);
      return { success: false, reason: 'incomplete', details: validation.reason };
    }

    // Generar o recuperar external_id
    let externalId = rowData[CONFIG.COLUMNS.EXTERNAL_ID];
    if (!externalId) {
      externalId = generateExternalId(rowData);
      sheet.getRange(rowIndex, CONFIG.COLUMNS.EXTERNAL_ID + 1).setValue(externalId);
      Logger.log('External ID generado: ' + externalId);
    }

    // Construir payload
    const payload = buildPayload(rowData, externalId);

    // Enviar al destino
    const sendResult = sendToDestination(payload, rowIndex);

    if (sendResult.success) {
      const now = new Date();
      const attempts = (rowData[CONFIG.COLUMNS.PUBLISH_ATTEMPTS] || 0) + 1;

      sheet.getRange(rowIndex, CONFIG.COLUMNS.PUBLISHED_AT + 1).setValue(now);
      sheet.getRange(rowIndex, CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).setValue(attempts);
      sheet.getRange(rowIndex, CONFIG.COLUMNS.LAST_ERROR + 1).setValue('');

      // Enviar notificación por email
      sendNotificationEmail(payload);

      // NOTA: Ya NO se crea automáticamente el alumno.
      // Miriam debe marcar "Es alumno = Sí" en la columna AB
      // y luego ejecutar syncAlumnos() para crear el registro en ALUMNOS_ACTUALES

      Logger.log('Fila ' + rowIndex + ' publicada exitosamente.');
      return { success: true, externalId: externalId };

    } else {
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

    const attempts = (rowData[CONFIG.COLUMNS.PUBLISH_ATTEMPTS] || 0) + 1;
    sheet.getRange(rowIndex, CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).setValue(attempts);
    sheet.getRange(rowIndex, CONFIG.COLUMNS.LAST_ERROR + 1).setValue(
      '[' + new Date().toISOString() + '] EXCEPTION: ' + e.message
    );

    return { success: false, reason: 'exception', error: e.message };
  }
}

// =====================================================
// VALIDACIÓN
// =====================================================

/**
 * Valida que una fila tenga los campos obligatorios
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

  // Validar formato de email
  const email = rowData[CONFIG.COLUMNS.EMAIL];
  if (email && !isValidEmail(email)) {
    return { valid: false, reason: 'Email inválido: ' + email };
  }

  return { valid: true };
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
}

// =====================================================
// GENERACIÓN DE IDS
// =====================================================

/**
 * Genera un external_id determinista
 */
function generateExternalId(rowData) {
  const email = normalizeEmail(rowData[CONFIG.COLUMNS.EMAIL]);
  const submittedAt = formatDateForId(rowData[CONFIG.COLUMNS.SUBMITTED_AT]);
  const programa = String(rowData[CONFIG.COLUMNS.PROGRAMA] || '').trim().toLowerCase();

  const source = email + '|' + submittedAt + '|' + programa;

  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, source);
  const hashHex = hash.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');

  return CONFIG.EXTERNAL_ID_PREFIX + hashHex.substring(0, 16);
}

function normalizeEmail(email) {
  if (!email) return '';
  return String(email).trim().toLowerCase();
}

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

  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

function generateRunId() {
  const now = new Date();
  const random = Math.random().toString(36).substring(2, 8);
  return now.toISOString().replace(/[-:]/g, '').substring(0, 14) + '_' + random;
}

// =====================================================
// CONSTRUCCIÓN DE PAYLOAD
// =====================================================

/**
 * Construye el payload JSON normalizado
 */
function buildPayload(rowData, externalId) {
  return {
    // Identificadores
    external_id: externalId,
    source: CONFIG.SOURCE,

    // Timestamps
    submitted_at: formatISODate(rowData[CONFIG.COLUMNS.SUBMITTED_AT]),
    ingested_at: new Date().toISOString(),

    // Datos personales
    email: normalizeEmail(rowData[CONFIG.COLUMNS.EMAIL]),
    nombre: String(rowData[CONFIG.COLUMNS.NOMBRE] || '').trim(),
    apellidos: String(rowData[CONFIG.COLUMNS.APELLIDOS] || '').trim(),
    nombre_completo: (String(rowData[CONFIG.COLUMNS.NOMBRE] || '').trim() + ' ' +
                      String(rowData[CONFIG.COLUMNS.APELLIDOS] || '').trim()).trim(),
    telefono: String(rowData[CONFIG.COLUMNS.TELEFONO] || '').trim(),
    dni: String(rowData[CONFIG.COLUMNS.DNI] || '').trim(),
    fecha_nacimiento: formatISODate(rowData[CONFIG.COLUMNS.FECHA_NACIMIENTO]),
    sexo: String(rowData[CONFIG.COLUMNS.SEXO] || '').trim(),
    estado_civil: String(rowData[CONFIG.COLUMNS.ESTADO_CIVIL] || '').trim(),

    // Dirección
    direccion: {
      calle: String(rowData[CONFIG.COLUMNS.CALLE] || '').trim(),
      numero_piso: String(rowData[CONFIG.COLUMNS.NUMERO_PISO] || '').trim(),
      poblacion: String(rowData[CONFIG.COLUMNS.POBLACION] || '').trim(),
      codigo_postal: String(rowData[CONFIG.COLUMNS.CODIGO_POSTAL] || '').trim(),
      provincia: String(rowData[CONFIG.COLUMNS.PROVINCIA] || '').trim()
    },

    // Datos académicos
    programa: String(rowData[CONFIG.COLUMNS.PROGRAMA] || '').trim(),
    modulos: String(rowData[CONFIG.COLUMNS.MODULOS] || '').trim(),
    titulo_civil: String(rowData[CONFIG.COLUMNS.TITULO_CIVIL] || '').trim(),
    titulo_indicado: String(rowData[CONFIG.COLUMNS.TITULO_INDICADO] || '').trim(),

    // Centro
    centro_asociado: String(rowData[CONFIG.COLUMNS.CENTRO_ASOCIADO] || '').trim(),
    centro_nombre: String(rowData[CONFIG.COLUMNS.CENTRO_NOMBRE] || '').trim(),

    // Estado
    admitido_en: String(rowData[CONFIG.COLUMNS.ADMITIDO_EN] || '').trim()
  };
}

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
// ENVÍO AL DESTINO
// =====================================================

/**
 * Envía el payload al destino configurado (Pabbly o Stackby)
 */
function sendToDestination(payload, rowIndex) {
  const mode = getSendMode();

  if (mode === 'stackby') {
    return sendToStackby(payload, rowIndex);
  } else {
    return sendToPabbly(payload, rowIndex);
  }
}

/**
 * Envía a Pabbly via webhook
 */
function sendToPabbly(payload, rowIndex) {
  const webhookUrl = getWebhookUrl();

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  return fetchWithRetry(webhookUrl, options, rowIndex);
}

/**
 * Envía directamente a Stackby API
 */
function sendToStackby(payload, rowIndex) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('STACKBY_API_KEY');
  const stackId = props.getProperty('STACKBY_STACK_ID');
  const tableId = props.getProperty('STACKBY_TABLE_ID');

  if (!apiKey || !stackId || !tableId) {
    return { success: false, error: 'Stackby no configurado completamente' };
  }

  const url = 'https://stackby.com/api/betav1/rowcreate/' + stackId + '/' + tableId;
  Logger.log('URL Stackby: ' + url);

  // Mapear campos al formato exacto de columnas de Stackby
  // Convertir undefined/null a string vacío para evitar errores de API
  const safeValue = (val) => (val === undefined || val === null) ? '' : String(val);

  const flatPayload = {
    "Submitted On (UTC)": safeValue(payload.submitted_at),
    "¿En qué se desea matricular?": safeValue(payload.programa),
    "Selección de módulos": safeValue(payload.modulos),
    "Título civil": safeValue(payload.titulo_civil),
    "Especificar otro título": safeValue(payload.titulo_indicado),
    "Nombre": safeValue(payload.nombre),
    "Apellidos": safeValue(payload.apellidos),
    "Calle (vía)": safeValue(payload.direccion ? payload.direccion.calle : ''),
    "Número, piso, puerta": safeValue(payload.direccion ? payload.direccion.numero_piso : ''),
    "Centro asociado al que pertenece": safeValue(payload.centro_asociado),
    "Indique el nombre del centro": safeValue(payload.centro_nombre),
    "Población": safeValue(payload.direccion ? payload.direccion.poblacion : ''),
    "Código postal": safeValue(payload.direccion ? payload.direccion.codigo_postal : ''),
    "Provincia": safeValue(payload.direccion ? payload.direccion.provincia : ''),
    "DNI / Pasaporte / NIE": safeValue(payload.dni),
    "Fecha de nacimiento": safeValue(payload.fecha_nacimiento),
    "Estado civil": safeValue(payload.estado_civil),
    "Sexo": safeValue(payload.sexo),
    "Teléfono de contacto": safeValue(payload.telefono),
    "Correo electrónico": safeValue(payload.email)
    // NOTA: "ACEPTADO EN " omitido - causa error 501 por bug de Stackby con espacios finales
  };

  // Log del payload para debugging
  Logger.log('Payload a enviar: ' + JSON.stringify(flatPayload).substring(0, 500));

  // Formato correcto de Stackby API: { records: [{ field: {...} }] }
  // NOTA: Es "field" (singular), NO "fields" (plural)
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'api-key': apiKey
    },
    payload: JSON.stringify({ records: [{ field: flatPayload }] }),
    muteHttpExceptions: true
  };

  return fetchWithRetry(url, options, rowIndex);
}

/**
 * Fetch con reintentos y backoff exponencial
 */
function fetchWithRetry(url, options, rowIndex) {
  let lastError = null;
  let attempt = 0;
  const maxRetries = 3;

  while (attempt < maxRetries) {
    attempt++;

    try {
      Logger.log('Enviando (intento ' + attempt + ')...');

      const response = UrlFetchApp.fetch(url, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();

      Logger.log('Respuesta: ' + responseCode + ' - ' + responseText.substring(0, 200));

      if (responseCode >= 200 && responseCode < 300) {
        return {
          success: true,
          response: { code: responseCode, body: responseText }
        };
      }

      if (responseCode >= 400 && responseCode < 500 && responseCode !== 429) {
        return {
          success: false,
          error: 'HTTP ' + responseCode + ': ' + responseText.substring(0, 100)
        };
      }

      lastError = 'HTTP ' + responseCode + ': ' + responseText.substring(0, 100);

    } catch (e) {
      lastError = 'Exception: ' + e.message;
      Logger.log('Error en fetch: ' + e.message);
    }

    if (attempt < maxRetries) {
      const backoffMs = Math.min(
        CONFIG.BACKOFF_BASE_MS * Math.pow(2, attempt - 1),
        CONFIG.BACKOFF_MAX_MS
      );
      Logger.log('Backoff: ' + backoffMs + 'ms');
      Utilities.sleep(backoffMs);
    }
  }

  return {
    success: false,
    error: 'Max retries. Last: ' + lastError
  };
}

// =====================================================
// COLUMNAS DE CONTROL
// =====================================================

/**
 * Asegura que existan las columnas de control en la hoja
 */
function ensureControlColumns(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const requiredHeaders = ['external_id', 'published_at', 'publish_attempts', 'last_error'];

  let lastCol = headers.length;

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(header);
      Logger.log('Columna añadida: ' + header + ' en posición ' + lastCol);
    }
  }
}

// =====================================================
// FUNCIONES DE UTILIDAD Y TESTING
// =====================================================

/**
 * Test manual
 */
function testSync() {
  Logger.log('=== TEST MANUAL ===');
  const result = sync();
  Logger.log('Resultado: ' + JSON.stringify(result, null, 2));
}

/**
 * Verifica la configuración
 */
function testConfig() {
  Logger.log('=== TEST CONFIGURACIÓN ===');

  Logger.log('1. Verificando secrets...');
  const secretsOk = verifySecrets();
  Logger.log('   Secrets OK: ' + secretsOk);

  Logger.log('2. Verificando hoja...');
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (sheet) {
    Logger.log('   Hoja encontrada: ' + CONFIG.SHEET_NAME);
    Logger.log('   Filas: ' + sheet.getLastRow());
    Logger.log('   Columnas: ' + sheet.getLastColumn());
  } else {
    Logger.log('   ERROR: Hoja "' + CONFIG.SHEET_NAME + '" no encontrada');
  }

  Logger.log('3. Configuración:');
  Logger.log('   REQUIRED_FIELDS: ' + CONFIG.REQUIRED_FIELDS.join(', '));
  Logger.log('   MAX_ROWS_PER_RUN: ' + CONFIG.MAX_ROWS_PER_RUN);
}

/**
 * Resetea una fila para re-procesar
 */
function resetRow(rowNumber) {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
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
 * Resetea todas las filas con errores para re-intentar
 */
function resetAllErrors() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  var lastRow = sheet.getLastRow();
  var resetCount = 0;

  for (var row = 2; row <= lastRow; row++) {
    var publishedAt = sheet.getRange(row, CONFIG.COLUMNS.PUBLISHED_AT + 1).getValue();
    var attempts = sheet.getRange(row, CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).getValue();

    if (!publishedAt && attempts > 0) {
      sheet.getRange(row, CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).setValue(0);
      sheet.getRange(row, CONFIG.COLUMNS.LAST_ERROR + 1).setValue('');
      resetCount++;
      Logger.log('Reseteada fila ' + row);
    }
  }

  Logger.log('Total filas reseteadas: ' + resetCount);
}

/**
 * Diagnóstico rápido - ejecutar esta función
 */
function checkData() {
  var ss = SpreadsheetApp.openById('1FK0TPur-qCYyVGM0bRuHMa6I8Q7vp_TpFWz3_2M56DQ');
  var sheet = ss.getSheetByName('Deca Inscripción');

  var headers = sheet.getRange(1, 1, 1, 22).getValues()[0];
  Logger.log('ENCABEZADOS A-V:');
  for (var i = 0; i < 22; i++) {
    var col = i < 26 ? String.fromCharCode(65+i) : 'A' + String.fromCharCode(65+i-26);
    Logger.log(col + ': ' + (headers[i] || '(vacío)'));
  }

  var row = sheet.getRange(4, 1, 1, 22).getValues()[0];
  Logger.log('');
  Logger.log('FILA 4 DATOS:');
  for (var i = 0; i < 22; i++) {
    var col = i < 26 ? String.fromCharCode(65+i) : 'A' + String.fromCharCode(65+i-26);
    var val = row[i];
    if (val === '' || val === null || val === undefined) val = '(vacío)';
    else val = String(val).substring(0, 40);
    Logger.log(col + ': ' + val);
  }
}

/**
 * Diagnóstico: muestra los encabezados y primeras filas de datos
 */
function diagnoseColumns() {
  const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    Logger.log('ERROR: Hoja no encontrada');
    return;
  }

  // Leer encabezados (fila 1)
  const headers = sheet.getRange(1, 1, 1, 10).getValues()[0];
  Logger.log('=== ENCABEZADOS (columnas A-J) ===');
  for (let i = 0; i < headers.length; i++) {
    const colLetter = String.fromCharCode(65 + i);
    Logger.log(colLetter + ' (índice ' + i + '): "' + headers[i] + '"');
  }

  // Leer primera fila de datos (fila 2)
  if (sheet.getLastRow() >= 2) {
    const firstRow = sheet.getRange(2, 1, 1, 10).getValues()[0];
    Logger.log('');
    Logger.log('=== PRIMERA FILA DE DATOS ===');
    for (let i = 0; i < firstRow.length; i++) {
      const colLetter = String.fromCharCode(65 + i);
      const value = firstRow[i] === '' ? '(vacío)' : String(firstRow[i]).substring(0, 50);
      Logger.log(colLetter + ': ' + value);
    }
  }

  // Verificar campos requeridos
  Logger.log('');
  Logger.log('=== CAMPOS REQUERIDOS SEGÚN CONFIG ===');
  Logger.log('NOMBRE esperado en columna: ' + String.fromCharCode(65 + CONFIG.COLUMNS.NOMBRE) + ' (índice ' + CONFIG.COLUMNS.NOMBRE + ')');
  Logger.log('EMAIL esperado en columna: ' + String.fromCharCode(65 + CONFIG.COLUMNS.EMAIL) + ' (índice ' + CONFIG.COLUMNS.EMAIL + ')');
  Logger.log('SUBMITTED_AT esperado en columna: ' + String.fromCharCode(65 + CONFIG.COLUMNS.SUBMITTED_AT) + ' (índice ' + CONFIG.COLUMNS.SUBMITTED_AT + ')');
}

// =====================================================
// NOTIFICACIONES EMAIL
// =====================================================

/**
 * Envía notificación por email cuando se procesa una nueva solicitud DECA
 * @param {Object} payload - Datos del alumno procesado
 */
function sendNotificationEmail(payload) {
  if (!CONFIG.NOTIFICATION || !CONFIG.NOTIFICATION.ENABLED) {
    Logger.log('Notificaciones deshabilitadas.');
    return;
  }

  try {
    const nombreCompleto = payload.nombre_completo ||
                           (payload.nombre + ' ' + payload.apellidos).trim() ||
                           'Sin nombre';

    const subject = CONFIG.NOTIFICATION.SUBJECT_PREFIX + nombreCompleto;

    const body = [
      'Se ha recibido y procesado una nueva solicitud DECA.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'DATOS DEL SOLICITANTE',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Nombre: ' + nombreCompleto,
      'Email: ' + (payload.email || 'No proporcionado'),
      'Teléfono: ' + (payload.telefono || 'No proporcionado'),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'PROGRAMA SOLICITADO',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Programa: ' + (payload.programa || 'No especificado'),
      'Módulos: ' + (payload.modulos || 'No especificado'),
      'Título civil: ' + (payload.titulo_civil || 'No especificado'),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'CENTRO',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Centro asociado: ' + (payload.centro_asociado || 'No especificado'),
      'Nombre centro: ' + (payload.centro_nombre || 'No especificado'),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Fecha de solicitud: ' + (payload.submitted_at ? new Date(payload.submitted_at).toLocaleString('es-ES') : 'No disponible'),
      'Procesado: ' + new Date().toLocaleString('es-ES'),
      '',
      CONFIG.NOTIFICATION.STACKBY_BASE_URL ?
        'Ver en Stackby: ' + CONFIG.NOTIFICATION.STACKBY_BASE_URL : '',
      '',
      '---',
      'Este es un mensaje automático del sistema de matriculaciones IITD.'
    ].join('\n');

    MailApp.sendEmail({
      to: CONFIG.NOTIFICATION.TO,
      subject: subject,
      body: body
    });

    Logger.log('Notificación enviada a ' + CONFIG.NOTIFICATION.TO);

  } catch (e) {
    // No fallar el proceso principal si falla el email
    Logger.log('ERROR enviando notificación: ' + e.message);
  }
}

/**
 * Test de notificación - ejecutar manualmente para verificar
 */
function testNotification() {
  const testPayload = {
    nombre: 'Test',
    apellidos: 'Usuario Prueba',
    nombre_completo: 'Test Usuario Prueba',
    email: 'test@example.com',
    telefono: '666123456',
    programa: 'Diploma en Teología',
    modulos: 'Módulo 1, Módulo 2',
    titulo_civil: 'Licenciado',
    centro_asociado: 'Centro Test',
    centro_nombre: 'Centro de Prueba',
    submitted_at: new Date().toISOString()
  };

  sendNotificationEmail(testPayload);
  Logger.log('Test de notificación completado. Revisar email en ' + CONFIG.NOTIFICATION.TO);
}

// =====================================================
// NOTIFICACIÓN ALTA/ENROLAMIENTO (N01)
// =====================================================

/**
 * Envía notificación a secretaría cuando un alumno es dado de alta
 * en la tabla ALUMNOS (marcado como "Es alumno = Sí" por Miriam).
 *
 * Complementa a sendNotificationEmail() que notifica solicitudes nuevas.
 * Esta función notifica altas confirmadas.
 *
 * @param {Object} payload - Datos del alumno
 */
function sendEnrollmentNotification(payload) {
  if (!CONFIG.NOTIFICATION || !CONFIG.NOTIFICATION.ENABLED) return;

  try {
    var nombreCompleto = ((payload.nombre || '') + ' ' + (payload.apellidos || '')).trim() || 'Sin nombre';

    var subject = '[IITD] Alta de alumno: ' + nombreCompleto;

    var body = [
      'Se ha confirmado el alta de un nuevo alumno en el sistema.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'DATOS DEL ALUMNO',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Nombre: ' + nombreCompleto,
      'Email: ' + (payload.email || 'No proporcionado'),
      'Teléfono: ' + (payload.telefono || 'No proporcionado'),
      'DNI: ' + (payload.dni || 'No proporcionado'),
      'Programa: ' + (payload.programa || 'No especificado'),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Fecha alta: ' + new Date().toLocaleString('es-ES'),
      '',
      'Próximos pasos:',
      '  1. Verificar documentación del alumno',
      '  2. Dar de alta en OnlineCourseHost (si aplica)',
      '  3. Asignar profesor/grupo',
      '',
      CONFIG.NOTIFICATION.STACKBY_BASE_URL ?
        'Ver en Stackby: ' + CONFIG.NOTIFICATION.STACKBY_BASE_URL : '',
      '',
      '---',
      'Mensaje automático del sistema de matriculaciones IITD.'
    ].join('\n');

    MailApp.sendEmail({
      to: CONFIG.NOTIFICATION.TO,
      subject: subject,
      body: body
    });

    Logger.log('Notificación de alta enviada para: ' + payload.email);

  } catch (e) {
    Logger.log('ERROR enviando notificación de alta: ' + e.message);
  }
}

/**
 * Test de notificación de alta - ejecutar manualmente
 */
function testEnrollmentNotification() {
  sendEnrollmentNotification({
    nombre: 'Test',
    apellidos: 'Alumno Alta',
    email: 'test@example.com',
    telefono: '666123456',
    dni: '12345678A',
    programa: 'DECA'
  });
  Logger.log('Test de notificación de alta completado.');
}

// =====================================================
// CREACIÓN DE ALUMNO EN TABLA ALUMNOS
// =====================================================

/**
 * Crea o actualiza un registro en la tabla ALUMNOS
 * Se ejecuta tras publicar exitosamente en SOLICITUDES_DECA
 *
 * @param {Object} payload - Datos de la solicitud DECA
 * @param {string} externalId - ID externo generado
 */
function upsertAlumno(payload, externalId) {
  const props = PropertiesService.getScriptProperties();
  const alumnosTableId = props.getProperty('STACKBY_ALUMNOS_TABLE_ID');

  // Si no está configurada la tabla ALUMNOS, saltar silenciosamente
  if (!alumnosTableId) {
    Logger.log('Tabla ALUMNOS no configurada. Saltando upsert.');
    return;
  }

  try {
    const apiKey = props.getProperty('STACKBY_API_KEY');
    const stackId = props.getProperty('STACKBY_STACK_ID');

    // Primero buscar si ya existe por email
    const email = (payload.email || '').toLowerCase().trim();
    if (!email) {
      Logger.log('Email vacío, no se puede crear alumno.');
      return;
    }

    // Buscar alumno existente
    const searchUrl = 'https://stackby.com/api/betav1/rowlist/' + stackId + '/' + alumnosTableId + '?maxRecords=500';
    const searchOptions = {
      method: 'get',
      headers: { 'api-key': apiKey },
      muteHttpExceptions: true
    };

    const searchResponse = UrlFetchApp.fetch(searchUrl, searchOptions);
    const searchResult = JSON.parse(searchResponse.getContentText());

    let existingRowId = null;
    if (searchResult.records) {
      for (const record of searchResult.records) {
        const recordEmail = (record.field['Email'] || '').toLowerCase().trim();
        if (recordEmail === email) {
          existingRowId = record.id;
          break;
        }
      }
    }

    // Preparar campos para ALUMNOS
    const alumnoFields = {
      'Email': email,
      'Nombre': payload.nombre || '',
      'Apellidos': payload.apellidos || '',
      'Telefono': payload.telefono || '',
      'DNI': payload.dni || '',
      'Programa': payload.programa || '',
      'Estado': 'solicitud',
      'Fecha estado': new Date().toISOString().split('T')[0],
      'Docs estado': 'pendiente',
      'Estado pago': 'pendiente',
      'Fuente': 'formulario_deca',
      'Notas': 'Solicitud ' + (externalId || '') + ' del ' + new Date().toLocaleDateString('es-ES')
    };

    if (existingRowId) {
      // Actualizar registro existente (sin sobrescribir Estado si ya avanzó)
      const updateUrl = 'https://stackby.com/api/betav1/rowupdate/' + stackId + '/' + alumnosTableId;
      const updatePayload = {
        records: [{
          id: existingRowId,
          field: {
            'Nombre': alumnoFields['Nombre'],
            'Apellidos': alumnoFields['Apellidos'],
            'Telefono': alumnoFields['Telefono'],
            'DNI': alumnoFields['DNI'],
            'Programa': alumnoFields['Programa']
            // NO actualizar Estado para no revertir progreso
          }
        }]
      };

      const updateOptions = {
        method: 'patch',
        contentType: 'application/json',
        headers: { 'api-key': apiKey },
        payload: JSON.stringify(updatePayload),
        muteHttpExceptions: true
      };

      UrlFetchApp.fetch(updateUrl, updateOptions);
      Logger.log('Alumno actualizado: ' + email);

    } else {
      // Crear nuevo registro
      const createUrl = 'https://stackby.com/api/betav1/rowcreate/' + stackId + '/' + alumnosTableId;
      const createPayload = {
        records: [{ field: alumnoFields }]
      };

      const createOptions = {
        method: 'post',
        contentType: 'application/json',
        headers: { 'api-key': apiKey },
        payload: JSON.stringify(createPayload),
        muteHttpExceptions: true
      };

      UrlFetchApp.fetch(createUrl, createOptions);
      Logger.log('Alumno creado: ' + email);
    }

  } catch (e) {
    // No fallar el proceso principal si falla la creación de alumno
    Logger.log('ERROR creando/actualizando alumno: ' + e.message);
  }
}

/**
 * Test de creación de alumno - ejecutar manualmente
 */
function testUpsertAlumno() {
  const testPayload = {
    email: 'test-alumno@example.com',
    nombre: 'Test',
    apellidos: 'Alumno Prueba',
    telefono: '666123456',
    dni: '12345678A',
    programa: 'DECA'
  };

  upsertAlumno(testPayload, 'test_ext_123');
  Logger.log('Test de upsert alumno completado.');
}

// =====================================================
// SYNC ALUMNOS - Proceso manual por Miriam
// =====================================================

/**
 * Sincroniza alumnos marcados con "Es alumno = Sí" a Stackby ALUMNOS_ACTUALES
 *
 * Flujo:
 * 1. Lee filas donde "Es alumno" = "Sí" (columna AB)
 * 2. Filtra las que NO tienen fecha en "alumno_created_at" (columna AC)
 * 3. Crea/actualiza el registro en tabla ALUMNOS_ACTUALES
 * 4. Marca la columna AC con el timestamp
 *
 * Ejecutar manualmente o con trigger cada 5-10 minutos.
 *
 * @returns {Object} Resumen de la ejecución
 */
function syncAlumnos() {
  const startTime = new Date();
  Logger.log('=== SYNC ALUMNOS START ===');

  const lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(CONFIG.LOCK_TIMEOUT_MS)) {
      Logger.log('No se pudo obtener lock. Otra ejecución en curso.');
      return { status: 'SKIPPED', reason: 'lock_unavailable' };
    }

    // Verificar que la tabla ALUMNOS esté configurada
    const props = PropertiesService.getScriptProperties();
    const alumnosTableId = props.getProperty('STACKBY_ALUMNOS_TABLE_ID');

    if (!alumnosTableId) {
      Logger.log('ERROR: STACKBY_ALUMNOS_TABLE_ID no configurado.');
      return { status: 'ERROR', error: 'ALUMNOS table not configured' };
    }

    // Obtener hoja de datos
    const ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

    if (!sheet) {
      throw new Error('Hoja "' + CONFIG.SHEET_NAME + '" no encontrada.');
    }

    // Asegurar que existen las columnas de control para alumnos
    ensureAlumnoColumns(sheet);

    // Asegurar columnas operativas (Matriculado, Profesor, Alta OCH, Enrolado, Nº Expediente)
    ensureOperationalColumns(sheet);

    // Leer todas las filas
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('No hay datos.');
      return { status: 'OK', processed: 0 };
    }

    const dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    const data = dataRange.getValues();

    // Filtrar filas pendientes de crear como alumno
    const pendingAlumnos = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const esAlumno = String(row[CONFIG.COLUMNS.ES_ALUMNO] || '').toLowerCase().trim();
      const alumnoCreatedAt = row[CONFIG.COLUMNS.ALUMNO_CREATED_AT];

      // Solo procesar si "Es alumno" = "sí" y no tiene fecha de creación
      if ((esAlumno === 'sí' || esAlumno === 'si' || esAlumno === 'yes') && !alumnoCreatedAt) {
        pendingAlumnos.push({
          rowIndex: i + 2,
          data: row
        });
      }
    }

    Logger.log('Alumnos pendientes de crear: ' + pendingAlumnos.length);

    let processed = 0;
    let errors = 0;

    for (const pending of pendingAlumnos) {
      try {
        // Construir payload del alumno
        const rowData = pending.data;
        const externalId = rowData[CONFIG.COLUMNS.EXTERNAL_ID] || '';

        const payload = {
          email: normalizeEmail(rowData[CONFIG.COLUMNS.EMAIL]),
          nombre: String(rowData[CONFIG.COLUMNS.NOMBRE] || '').trim(),
          apellidos: String(rowData[CONFIG.COLUMNS.APELLIDOS] || '').trim(),
          telefono: String(rowData[CONFIG.COLUMNS.TELEFONO] || '').trim(),
          dni: String(rowData[CONFIG.COLUMNS.DNI] || '').trim(),
          programa: String(rowData[CONFIG.COLUMNS.PROGRAMA] || '').trim()
        };

        // Crear/actualizar en ALUMNOS_ACTUALES
        upsertAlumno(payload, externalId);

        // Marcar como creado
        const now = new Date();
        sheet.getRange(pending.rowIndex, CONFIG.COLUMNS.ALUMNO_CREATED_AT + 1).setValue(now);

        Logger.log('Alumno creado: ' + payload.email + ' (fila ' + pending.rowIndex + ')');
        processed++;

        // Notificar a secretaría del nuevo alumno (N01)
        sendEnrollmentNotification(payload);

      } catch (e) {
        Logger.log('Error procesando fila ' + pending.rowIndex + ': ' + e.message);
        errors++;
      }

      // Pausa entre requests
      Utilities.sleep(200);
    }

    const duration = (new Date() - startTime) / 1000;
    Logger.log('=== SYNC ALUMNOS END === Creados: ' + processed + ', Errores: ' + errors + ', Duración: ' + duration + 's');

    return {
      status: 'OK',
      processed: processed,
      errors: errors,
      pending: pendingAlumnos.length - processed,
      durationSeconds: duration
    };

  } catch (e) {
    Logger.log('ERROR FATAL: ' + e.message);
    return { status: 'ERROR', error: e.message };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Asegura que existan las columnas de control para alumnos
 */
function ensureAlumnoColumns(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const requiredHeaders = ['Es alumno', 'alumno_created_at'];

  let lastCol = headers.length;

  for (const header of requiredHeaders) {
    const found = headers.some(h =>
      String(h).toLowerCase().trim() === header.toLowerCase()
    );

    if (!found) {
      lastCol++;
      sheet.getRange(1, lastCol).setValue(header);
      Logger.log('Columna añadida: ' + header + ' en posición ' + lastCol);
    }
  }
}

/**
 * Asegura que existan las columnas operativas añadidas en feb 2026
 * (Matriculado, Profesor, Alta OCH, Enrolado, Nº Expediente)
 *
 * IMPORTANTE: Estas columnas van DESPUÉS de AC para no romper Formly
 */
function ensureOperationalColumns(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var operationalHeaders = [
    { index: CONFIG.COLUMNS.MATRICULADO, name: 'Matriculado' },
    { index: CONFIG.COLUMNS.PROFESOR, name: 'Profesor' },
    { index: CONFIG.COLUMNS.ALTA_OCH, name: 'Alta OCH' },
    { index: CONFIG.COLUMNS.ENROLADO, name: 'Enrolado' },
    { index: CONFIG.COLUMNS.NUM_EXPEDIENTE, name: 'Nº Expediente' }
  ];

  for (var i = 0; i < operationalHeaders.length; i++) {
    var col = operationalHeaders[i];
    var colNum = col.index + 1; // 1-based

    // Extender la hoja si hace falta
    if (colNum > sheet.getLastColumn()) {
      sheet.insertColumnsAfter(sheet.getLastColumn(), colNum - sheet.getLastColumn());
    }

    var currentHeader = sheet.getRange(1, colNum).getValue();
    if (!currentHeader || String(currentHeader).trim() === '') {
      sheet.getRange(1, colNum).setValue(col.name);
      Logger.log('Columna operativa añadida: ' + col.name + ' en posición ' + colNum);
    }
  }
}

/**
 * Test de syncAlumnos - ejecutar manualmente
 */
function testSyncAlumnos() {
  Logger.log('=== TEST SYNC ALUMNOS ===');
  const result = syncAlumnos();
  Logger.log('Resultado: ' + JSON.stringify(result, null, 2));
}
