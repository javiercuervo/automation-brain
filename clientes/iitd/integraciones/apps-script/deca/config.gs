/**
 * =====================================================
 * CONFIGURACION - Publisher DECA Matriculas
 * =====================================================
 *
 * Instituto Internacional de Teologia a Distancia
 * Flujo: Getformly -> Sheets -> Apps Script -> Pabbly/Stackby
 *
 * IMPORTANTE: No incluir secrets directamente en el codigo.
 * Usar PropertiesService para almacenar URLs de webhook y claves.
 */

// =====================================================
// CONSTANTES DE CONFIGURACION
// =====================================================

const CONFIG = {
  // ID del spreadsheet donde llegan las respuestas de Getformly
  SPREADSHEET_ID: '1FK0TPur-qCYyVGM0bRuHMa6I8Q7vp_TpFWz3_2M56DQ',

  // Nombre de la hoja de datos de entrada
  SHEET_NAME: 'Deca Inscripción',

  // =====================================================
  // NOTIFICACIONES EMAIL
  // =====================================================
  NOTIFICATION: {
    ENABLED: true,
    // PRODUCCIÓN: 'alumnos@institutoteologia.org'
    // DESARROLLO: usar email de desarrollador para pruebas
    TO: 'proportione@institutoteologia.org',  // TODO: Cambiar a alumnos@ cuando esté validado
    SUBJECT_PREFIX: '[DECA] Nueva solicitud: ',
    // URL base de Stackby para link directo (opcional)
    STACKBY_BASE_URL: 'https://stackby.com/stHbLS2nezlbb3BL78'
  },

  // Columnas del formulario (indices 0-based)
  COLUMNS: {
    // Campos del formulario Getformly
    SUBMITTED_AT: 0,              // A: Submitted On (UTC)
    PROGRAMA: 1,                  // B: ¿En qué se desea matricular?
    MODULOS: 2,                   // C: Selección de Módulos
    TITULO_CIVIL: 3,              // D: Título civil
    TITULO_INDICADO: 4,           // E: Indique su título
    NOMBRE: 5,                    // F: Nombre
    APELLIDOS: 6,                 // G: Apellidos
    CALLE: 7,                     // H: Calle (vía)
    NUMERO_PISO: 8,               // I: Número, piso, puerta
    CENTRO_ASOCIADO: 9,           // J: Centro asociado al que pertenece
    CENTRO_NOMBRE: 10,            // K: Indique el nombre del centro
    POBLACION: 11,                // L: Población
    CODIGO_POSTAL: 12,            // M: Código postal
    PROVINCIA: 13,                // N: Provincia
    DNI: 14,                      // O: DNI / Pasaporte / NIE
    FECHA_NACIMIENTO: 15,         // P: Fecha de nacimiento
    ESTADO_CIVIL: 16,             // Q: Estado civil
    SEXO: 17,                     // R: Sexo
    TELEFONO: 18,                 // S: Teléfono de contacto
    EMAIL: 19,                    // T: Correo electrónico
    FIRMA: 20,                    // U: Firma del solicitante
    THANK_YOU: 21,                // V: Thank You Screen
    ADMITIDO_EN: 22,              // W: ADMITIDO EN

    // Campos de control (añadir al final de la hoja)
    EXTERNAL_ID: 23,              // X: ID único generado
    PUBLISHED_AT: 24,             // Y: Timestamp de publicación exitosa
    PUBLISH_ATTEMPTS: 25,         // Z: Número de intentos
    LAST_ERROR: 26,               // AA: Último error registrado

    // Campo para validación manual por Miriam
    ES_ALUMNO: 27,                // AB: "Sí" / "No" / vacío - Miriam marca si es alumno
    ALUMNO_CREATED_AT: 28         // AC: Timestamp cuando se creó en tabla ALUMNOS
  },

  // Campos obligatorios para considerar una fila "completa"
  // NOTA: NOMBRE removido porque muchas filas no lo tienen
  REQUIRED_FIELDS: ['EMAIL', 'SUBMITTED_AT', 'APELLIDOS', 'PROGRAMA'],

  // Configuración de reintentos
  MAX_ATTEMPTS: 5,
  MAX_ROWS_PER_RUN: 20,

  // Timeouts
  LOCK_TIMEOUT_MS: 30000,
  FETCH_TIMEOUT_MS: 45000,

  // Backoff exponencial (en milisegundos)
  BACKOFF_BASE_MS: 1000,
  BACKOFF_MAX_MS: 32000,

  // Prefijo para external_id
  EXTERNAL_ID_PREFIX: 'deca_mat_',

  // Source identifier
  SOURCE: 'getformly_deca'
};

// =====================================================
// PROPIEDADES (SECRETS)
// =====================================================

/**
 * Obtiene la URL del webhook destino desde PropertiesService
 * @returns {string} URL del webhook
 */
function getWebhookUrl() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('WEBHOOK_URL');

  if (!url) {
    throw new Error('WEBHOOK_URL no configurada. Ejecutar setupSecrets() primero.');
  }

  return url;
}

/**
 * Obtiene el modo de envío (pabbly o stackby)
 * @returns {string} 'pabbly' o 'stackby'
 */
function getSendMode() {
  const props = PropertiesService.getScriptProperties();
  return props.getProperty('SEND_MODE') || 'pabbly';
}

/**
 * Configura los secrets en PropertiesService
 * EJECUTAR UNA VEZ MANUALMENTE desde el editor de Apps Script
 *
 * Opciones:
 * - Para Pabbly: setear WEBHOOK_URL con URL del webhook de Pabbly
 * - Para Stackby directo: setear STACKBY_API_KEY y STACKBY_TABLE_URL
 */
function setupSecrets() {
  const props = PropertiesService.getScriptProperties();

  // MODIFICAR ESTOS VALORES con los datos reales
  // Opción 1: Pabbly (comentado)
  // props.setProperty('SEND_MODE', 'pabbly');
  // props.setProperty('WEBHOOK_URL', 'https://connect.pabbly.com/workflow/sendwebhookdata/TU_WEBHOOK_ID');

  // Opción 2: Stackby directo (ACTIVO)
  // IMPORTANTE: Reemplazar estos valores con las credenciales reales
  props.setProperty('SEND_MODE', 'stackby');
  props.setProperty('STACKBY_API_KEY', 'YOUR_STACKBY_API_KEY');  // Obtener de Stackby > Settings > API
  props.setProperty('STACKBY_STACK_ID', 'YOUR_STACK_ID');        // ID del stack (en URL)
  props.setProperty('STACKBY_TABLE_ID', 'YOUR_TABLE_ID');        // ID tabla SOLICITUDES_DECA

  // Tabla ALUMNOS_ACTUALES para crear registro de alumno
  props.setProperty('STACKBY_ALUMNOS_TABLE_ID', 'YOUR_ALUMNOS_TABLE_ID');  // ID tabla ALUMNOS

  Logger.log('Secrets configurados correctamente.');
  Logger.log('Modo: ' + props.getProperty('SEND_MODE'));
}

/**
 * Verifica que los secrets estén configurados
 * @returns {boolean} true si todo está OK
 */
function verifySecrets() {
  try {
    const mode = getSendMode();
    Logger.log('Modo de envío: ' + mode);

    if (mode === 'pabbly') {
      const url = getWebhookUrl();
      Logger.log('Webhook URL configurada: ' + url.substring(0, 50) + '...');
    } else if (mode === 'stackby') {
      const props = PropertiesService.getScriptProperties();
      const apiKey = props.getProperty('STACKBY_API_KEY');
      if (!apiKey) throw new Error('STACKBY_API_KEY no configurada');
      Logger.log('Stackby API Key configurada.');
    }
    return true;
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return false;
  }
}

/**
 * Muestra la configuración actual (sin revelar secrets)
 */
function showConfig() {
  Logger.log('=== CONFIGURACIÓN ACTUAL ===');
  Logger.log('Hoja: ' + CONFIG.SHEET_NAME);
  Logger.log('Campos requeridos: ' + CONFIG.REQUIRED_FIELDS.join(', '));
  Logger.log('Max filas por ejecución: ' + CONFIG.MAX_ROWS_PER_RUN);
  Logger.log('Max intentos: ' + CONFIG.MAX_ATTEMPTS);

  const props = PropertiesService.getScriptProperties();
  Logger.log('Modo envío: ' + (props.getProperty('SEND_MODE') || 'NO CONFIGURADO'));
  Logger.log('Webhook configurado: ' + (props.getProperty('WEBHOOK_URL') ? 'SÍ' : 'NO'));
}
