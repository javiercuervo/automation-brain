/**
 * =====================================================
 * CONFIGURACION - Publisher Pre-Matricula DECA
 * =====================================================
 *
 * Instituto Internacional de Teologia a Distancia
 * Flujo: Getformly -> Sheets -> Apps Script -> Pabbly -> Stackby
 *
 * IMPORTANTE: No incluir secrets directamente en el codigo.
 * Usar PropertiesService para almacenar URLs de webhook y claves.
 */

// =====================================================
// CONSTANTES DE CONFIGURACION
// =====================================================

const CONFIG = {
  // Nombre de la hoja de datos de entrada (donde Getformly escribe)
  SHEET_NAME: 'raw_getformly',

  // Columnas de control (indices 0-based para arrays, 1-based para Range)
  COLUMNS: {
    // Campos del formulario (ajustar segun estructura real de Getformly)
    SUBMITTED_AT: 0,       // A: Timestamp del envio
    EMAIL: 1,              // B: Email del solicitante
    NOMBRE: 2,             // C: Nombre completo
    TELEFONO: 3,           // D: Telefono
    PROGRAMA: 4,           // E: Programa/curso solicitado
    SEDE: 5,               // F: Campus/sede

    // Campos de control (añadir al final de la hoja)
    EXTERNAL_ID: 6,        // G: ID unico generado
    PUBLISHED_AT: 7,       // H: Timestamp de publicacion exitosa
    PUBLISH_ATTEMPTS: 8,   // I: Numero de intentos
    LAST_ERROR: 9          // J: Ultimo error registrado
  },

  // Campos obligatorios para considerar una fila "completa"
  REQUIRED_FIELDS: ['EMAIL', 'SUBMITTED_AT', 'PROGRAMA'],

  // Configuracion de reintentos
  MAX_ATTEMPTS: 5,           // Maximo de intentos antes de marcar como fallido
  MAX_ROWS_PER_RUN: 50,      // Maximo de filas a procesar por ejecucion

  // Timeouts
  LOCK_TIMEOUT_MS: 30000,    // 30 segundos para obtener lock
  FETCH_TIMEOUT_MS: 45000,   // 45 segundos para llamada HTTP

  // Backoff exponencial (en milisegundos)
  BACKOFF_BASE_MS: 1000,     // 1 segundo base
  BACKOFF_MAX_MS: 32000,     // 32 segundos maximo

  // Prefijo para external_id
  EXTERNAL_ID_PREFIX: 'deca_pm_',

  // Source identifier
  SOURCE: 'getformly'
};

// =====================================================
// PROPIEDADES (SECRETS)
// =====================================================

/**
 * Obtiene la URL del webhook de Pabbly desde PropertiesService
 * @returns {string} URL del webhook
 */
function getPabblyWebhookUrl() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('PABBLY_WEBHOOK_URL');

  if (!url) {
    throw new Error('PABBLY_WEBHOOK_URL no configurada. Ejecutar setupSecrets() primero.');
  }

  return url;
}

/**
 * Configura los secrets en PropertiesService
 * EJECUTAR UNA VEZ MANUALMENTE desde el editor de Apps Script
 *
 * Pasos:
 * 1. Abrir este script en el editor de Apps Script
 * 2. Modificar la URL del webhook abajo
 * 3. Ejecutar esta funcion una vez
 * 4. Verificar en Project Settings > Script Properties
 */
function setupSecrets() {
  const props = PropertiesService.getScriptProperties();

  // MODIFICAR ESTA URL con el webhook real de Pabbly
  props.setProperty('PABBLY_WEBHOOK_URL', 'https://connect.pabbly.com/workflow/sendwebhookdata/TU_WEBHOOK_ID');

  Logger.log('Secrets configurados correctamente.');
  Logger.log('URL configurada: ' + props.getProperty('PABBLY_WEBHOOK_URL'));
}

/**
 * Verifica que los secrets esten configurados
 * @returns {boolean} true si todo esta OK
 */
function verifySecrets() {
  try {
    const url = getPabblyWebhookUrl();
    Logger.log('Webhook URL configurada: ' + url.substring(0, 50) + '...');
    return true;
  } catch (e) {
    Logger.log('ERROR: ' + e.message);
    return false;
  }
}
