/**
 * =====================================================
 * PUBLISHER LEADS WEB (N14)
 * =====================================================
 *
 * Instituto Internacional de Teología a Distancia
 * Flujo: Formulario contacto web -> Sheets -> Apps Script -> Stackby
 *
 * Versión simplificada del publisher DECA.
 * Ejecutar con trigger time-based cada 5-10 minutos.
 *
 * Patrón reutilizado de: apps-script/deca/publisher.gs
 */

// =====================================================
// FUNCIÓN PRINCIPAL
// =====================================================

function syncLeads() {
  var startTime = new Date();
  Logger.log('=== SYNC LEADS START ===');

  var lock = LockService.getScriptLock();

  try {
    if (!lock.tryLock(LEADS_CONFIG.LOCK_TIMEOUT_MS)) {
      Logger.log('Lock no disponible.');
      return { status: 'SKIPPED', reason: 'lock_unavailable' };
    }

    var ss = SpreadsheetApp.openById(LEADS_CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName(LEADS_CONFIG.SHEET_NAME);

    if (!sheet) {
      throw new Error('Hoja "' + LEADS_CONFIG.SHEET_NAME + '" no encontrada.');
    }

    ensureLeadControlColumns(sheet);

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log('No hay datos.');
      return { status: 'OK', processed: 0 };
    }

    var dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
    var data = dataRange.getValues();

    var processed = 0;
    var skipped = 0;
    var errors = 0;

    for (var i = 0; i < data.length; i++) {
      var row = data[i];
      var rowIndex = i + 2;

      // Skip already published
      var publishedAt = row[LEADS_CONFIG.COLUMNS.PUBLISHED_AT];
      if (publishedAt) {
        skipped++;
        continue;
      }

      // Skip if max attempts exceeded
      var attempts = row[LEADS_CONFIG.COLUMNS.PUBLISH_ATTEMPTS] || 0;
      if (attempts >= LEADS_CONFIG.MAX_ATTEMPTS) {
        skipped++;
        continue;
      }

      // Check required fields
      var email = normalizeLeadEmail(row[LEADS_CONFIG.COLUMNS.EMAIL]);
      var nombre = String(row[LEADS_CONFIG.COLUMNS.NOMBRE] || '').trim();

      if (!email) {
        continue; // Skip rows without email
      }

      // Generate external_id
      var externalId = row[LEADS_CONFIG.COLUMNS.EXTERNAL_ID];
      if (!externalId) {
        var timestamp = row[LEADS_CONFIG.COLUMNS.TIMESTAMP] || new Date().toISOString();
        externalId = LEADS_CONFIG.EXTERNAL_ID_PREFIX + generateLeadHash(email + '|' + timestamp);
        sheet.getRange(rowIndex, LEADS_CONFIG.COLUMNS.EXTERNAL_ID + 1).setValue(externalId);
      }

      // Build payload
      var payload = {
        external_id: externalId,
        email: email,
        nombre: nombre,
        telefono: String(row[LEADS_CONFIG.COLUMNS.TELEFONO] || '').trim(),
        mensaje: String(row[LEADS_CONFIG.COLUMNS.MENSAJE] || '').trim(),
        fuente: String(row[LEADS_CONFIG.COLUMNS.FUENTE] || LEADS_CONFIG.SOURCE).trim(),
        consentimiento_privacidad: Boolean(row[LEADS_CONFIG.COLUMNS.CONSENT_PRIVACY]),
        consentimiento_marketing: Boolean(row[LEADS_CONFIG.COLUMNS.CONSENT_MARKETING]),
        submitted_at: row[LEADS_CONFIG.COLUMNS.TIMESTAMP] ?
          new Date(row[LEADS_CONFIG.COLUMNS.TIMESTAMP]).toISOString() :
          new Date().toISOString()
      };

      try {
        // Increment attempts
        sheet.getRange(rowIndex, LEADS_CONFIG.COLUMNS.PUBLISH_ATTEMPTS + 1).setValue(attempts + 1);

        // Send to Stackby
        sendLeadToStackby(payload);

        // Mark as published
        sheet.getRange(rowIndex, LEADS_CONFIG.COLUMNS.PUBLISHED_AT + 1).setValue(new Date());

        // Send notification
        sendLeadNotification(payload);

        processed++;
        Logger.log('Lead publicado: ' + email + ' (fila ' + rowIndex + ')');

      } catch (e) {
        sheet.getRange(rowIndex, LEADS_CONFIG.COLUMNS.LAST_ERROR + 1).setValue(e.message);
        errors++;
        Logger.log('Error fila ' + rowIndex + ': ' + e.message);
      }

      // Rate limit
      Utilities.sleep(200);

      if (processed >= LEADS_CONFIG.MAX_ROWS_PER_RUN) break;
    }

    var duration = (new Date() - startTime) / 1000;
    Logger.log('=== SYNC LEADS END === Procesados: ' + processed +
               ', Errores: ' + errors + ', Omitidos: ' + skipped +
               ', Duración: ' + duration + 's');

    return { status: 'OK', processed: processed, errors: errors, skipped: skipped };

  } catch (e) {
    Logger.log('ERROR FATAL: ' + e.message);
    return { status: 'ERROR', error: e.message };

  } finally {
    lock.releaseLock();
  }
}

// =====================================================
// ENVÍO A STACKBY
// =====================================================

function sendLeadToStackby(payload) {
  var props = PropertiesService.getScriptProperties();
  var apiKey = props.getProperty('STACKBY_API_KEY');
  var stackId = props.getProperty('STACKBY_STACK_ID');
  var tableId = props.getProperty('STACKBY_LEADS_TABLE_ID');

  if (!apiKey || !tableId) {
    throw new Error('Stackby no configurado para Leads. Ejecutar setupLeadsSecrets().');
  }

  // Buscar si ya existe por email (upsert)
  var searchUrl = 'https://stackby.com/api/betav1/rowlist/' + stackId + '/' + tableId + '?maxRecords=500';
  var searchResponse = UrlFetchApp.fetch(searchUrl, {
    method: 'get',
    headers: { 'api-key': apiKey },
    muteHttpExceptions: true
  });
  var searchResult = JSON.parse(searchResponse.getContentText());

  var existingRowId = null;
  if (searchResult.records) {
    for (var i = 0; i < searchResult.records.length; i++) {
      var recordEmail = (searchResult.records[i].field['Email'] || '').toLowerCase().trim();
      if (recordEmail === payload.email) {
        existingRowId = searchResult.records[i].id;
        break;
      }
    }
  }

  var fields = {
    'Email': payload.email,
    'Nombre': payload.nombre,
    'Teléfono': payload.telefono,
    'Mensaje': payload.mensaje,
    'Fuente': payload.fuente,
    'Fecha': payload.submitted_at ? payload.submitted_at.split('T')[0] : '',
    'Estado': 'nuevo',
    'Consentimiento marketing': payload.consentimiento_marketing ? 'Sí' : 'No',
    'external_id': payload.external_id
  };

  if (existingRowId) {
    // Update (no sobrescribir Estado)
    delete fields['Estado'];
    var updateUrl = 'https://stackby.com/api/betav1/rowupdate/' + stackId + '/' + tableId;
    UrlFetchApp.fetch(updateUrl, {
      method: 'patch',
      contentType: 'application/json',
      headers: { 'api-key': apiKey },
      payload: JSON.stringify({ records: [{ id: existingRowId, field: fields }] }),
      muteHttpExceptions: true
    });
    Logger.log('Lead actualizado: ' + payload.email);
  } else {
    var createUrl = 'https://stackby.com/api/betav1/rowcreate/' + stackId + '/' + tableId;
    UrlFetchApp.fetch(createUrl, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'api-key': apiKey },
      payload: JSON.stringify({ records: [{ field: fields }] }),
      muteHttpExceptions: true
    });
    Logger.log('Lead creado: ' + payload.email);
  }

  // Suscribir a Acumbamail SOLO si tiene consentimiento marketing
  if (payload.consentimiento_marketing) {
    Logger.log('Lead con consentimiento marketing: ' + payload.email + ' (pendiente integración Acumbamail)');
    // TODO: Integrar con Acumbamail API cuando esté configurada
  }
}

// =====================================================
// NOTIFICACIÓN
// =====================================================

function sendLeadNotification(payload) {
  if (!LEADS_CONFIG.NOTIFICATION || !LEADS_CONFIG.NOTIFICATION.ENABLED) return;

  try {
    var subject = LEADS_CONFIG.NOTIFICATION.SUBJECT_PREFIX + (payload.nombre || payload.email);

    var body = [
      'Nuevo lead recibido desde la web.',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'DATOS DEL CONTACTO',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Nombre: ' + (payload.nombre || 'No proporcionado'),
      'Email: ' + payload.email,
      'Teléfono: ' + (payload.telefono || 'No proporcionado'),
      'Fuente: ' + (payload.fuente || 'web'),
      'Marketing: ' + (payload.consentimiento_marketing ? 'Sí (acepta)' : 'No'),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'MENSAJE',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      payload.mensaje || '(sin mensaje)',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'Fecha: ' + new Date().toLocaleString('es-ES'),
      '',
      LEADS_CONFIG.NOTIFICATION.STACKBY_BASE_URL ?
        'Ver en Stackby: ' + LEADS_CONFIG.NOTIFICATION.STACKBY_BASE_URL : '',
      '',
      '---',
      'Mensaje automático del sistema IITD.',
      '',
      '',
      LEADS_CONFIG.NOTIFICATION.RGPD_FOOTER || ''
    ].join('\n');

    MailApp.sendEmail({
      to: LEADS_CONFIG.NOTIFICATION.TO,
      subject: subject,
      body: body
    });

  } catch (e) {
    Logger.log('ERROR notificación lead: ' + e.message);
  }
}

// =====================================================
// UTILIDADES
// =====================================================

function normalizeLeadEmail(email) {
  if (!email) return null;
  return String(email).toLowerCase().trim();
}

function generateLeadHash(input) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, input);
  var hex = '';
  for (var i = 0; i < raw.length; i++) {
    var val = (raw[i] + 256) % 256;
    hex += ('0' + val.toString(16)).slice(-2);
  }
  return hex.substring(0, 12);
}

function ensureLeadControlColumns(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var controlHeaders = [
    { index: LEADS_CONFIG.COLUMNS.EXTERNAL_ID, name: 'external_id' },
    { index: LEADS_CONFIG.COLUMNS.PUBLISHED_AT, name: 'published_at' },
    { index: LEADS_CONFIG.COLUMNS.PUBLISH_ATTEMPTS, name: 'publish_attempts' },
    { index: LEADS_CONFIG.COLUMNS.LAST_ERROR, name: 'last_error' }
  ];

  for (var i = 0; i < controlHeaders.length; i++) {
    var col = controlHeaders[i];
    var colNum = col.index + 1;

    if (colNum > sheet.getLastColumn()) {
      sheet.insertColumnsAfter(sheet.getLastColumn(), colNum - sheet.getLastColumn());
    }

    var current = sheet.getRange(1, colNum).getValue();
    if (!current || String(current).trim() === '') {
      sheet.getRange(1, colNum).setValue(col.name);
      Logger.log('Columna control leads añadida: ' + col.name);
    }
  }
}

// =====================================================
// TEST
// =====================================================

function testSyncLeads() {
  Logger.log('=== TEST SYNC LEADS ===');
  var result = syncLeads();
  Logger.log('Resultado: ' + JSON.stringify(result, null, 2));
}

function testLeadNotification() {
  sendLeadNotification({
    nombre: 'Test Lead',
    email: 'test@example.com',
    telefono: '666123456',
    mensaje: 'Me interesa información sobre el DECA',
    fuente: 'web_contacto',
    consentimiento_marketing: false
  });
  Logger.log('Test notificación lead completado.');
}
