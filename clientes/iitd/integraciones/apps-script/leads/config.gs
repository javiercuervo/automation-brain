/**
 * =====================================================
 * CONFIGURACIÓN - Publisher Leads Web
 * =====================================================
 *
 * Instituto Internacional de Teología a Distancia
 * Flujo: Formulario contacto web -> Sheets -> Apps Script -> Stackby
 *
 * IMPORTANTE: No incluir secrets directamente en el código.
 * Usar PropertiesService para almacenar claves.
 */

const LEADS_CONFIG = {
  // ID del spreadsheet donde llegan las respuestas del formulario de contacto
  // TODO: Reemplazar con el Sheet ID real cuando se proporcione
  SPREADSHEET_ID: 'PENDIENTE_SHEET_ID',

  // Nombre de la hoja de datos
  SHEET_NAME: 'Respuestas',

  // Notificaciones
  NOTIFICATION: {
    ENABLED: true,
    TO: 'alumnos@institutoteologia.org',
    SUBJECT_PREFIX: '[IITD] Nuevo lead: ',
    STACKBY_BASE_URL: 'https://stackby.com/stHbLS2nezlbb3BL78'
  },

  // Columnas del formulario de contacto (ajustar según formulario real)
  // TODO: Mapear cuando se conozca la estructura del formulario
  COLUMNS: {
    TIMESTAMP: 0,          // A: Fecha de envío
    NOMBRE: 1,             // B: Nombre
    EMAIL: 2,              // C: Email
    TELEFONO: 3,           // D: Teléfono
    MENSAJE: 4,            // E: Mensaje / consulta
    FUENTE: 5,             // F: Fuente (web, blog, landing...)
    CONSENT_PRIVACY: 6,    // G: Consentimiento privacidad (obligatorio)
    CONSENT_MARKETING: 7,  // H: Consentimiento marketing (opcional)

    // Columnas de control (añadidas por el script)
    EXTERNAL_ID: 8,        // I: ID único generado
    PUBLISHED_AT: 9,       // J: Timestamp de publicación
    PUBLISH_ATTEMPTS: 10,  // K: Intentos
    LAST_ERROR: 11         // L: Último error
  },

  REQUIRED_FIELDS: ['EMAIL', 'NOMBRE'],

  MAX_ATTEMPTS: 5,
  MAX_ROWS_PER_RUN: 20,

  LOCK_TIMEOUT_MS: 30000,
  FETCH_TIMEOUT_MS: 45000,

  BACKOFF_BASE_MS: 1000,
  BACKOFF_MAX_MS: 32000,

  EXTERNAL_ID_PREFIX: 'lead_web_',
  SOURCE: 'web_contacto'
};

/**
 * Configura los secrets para el publisher de leads
 * EJECUTAR UNA VEZ desde el editor de Apps Script
 */
function setupLeadsSecrets() {
  var props = PropertiesService.getScriptProperties();

  // Stackby directo
  props.setProperty('LEADS_SEND_MODE', 'stackby');
  props.setProperty('STACKBY_API_KEY', 'YOUR_STACKBY_API_KEY');
  props.setProperty('STACKBY_STACK_ID', 'stHbLS2nezlbb3BL78');
  // TODO: Crear tabla LEADS en Stackby y poner su ID aquí
  props.setProperty('STACKBY_LEADS_TABLE_ID', 'YOUR_LEADS_TABLE_ID');

  Logger.log('Leads secrets configurados.');
}
