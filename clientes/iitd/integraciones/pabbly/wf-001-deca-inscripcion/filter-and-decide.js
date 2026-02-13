/**
 * @name WF_001 DECA Inscripción - Filter & Decide
 * @version 1.0.0
 * @author Claude Code
 * @description Post-search filter: Compara resultados de Stackby Search (por email)
 *              con Submitted On (UTC) para determinar si es CREATE o UPDATE.
 *              Implementa la clave compuesta: email + submitted_on
 * @automation WF_001_DECA_INSCRIPCION
 * @inputs
 *   - envelope: Envelope del paso normalize_and_map.js
 *   - search_results: Array de rows retornados por Stackby Search
 * @outputs Envelope actualizado con control.action = CREATE|UPDATE|ERROR
 */

const SCRIPT_VERSION = "1.2.0";
const SCRIPT_NAME = "wf_001_filter_and_decide";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Campo en Stackby que contiene el timestamp de envío
  stackby_submitted_field: "Submitted On (UTC)",
  // Tolerancia para comparación de timestamps (en milisegundos)
  // 60000 = 1 minuto de tolerancia por diferencias de formato
  timestamp_tolerance_ms: 60000
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normaliza un timestamp a milisegundos para comparación
 */
function normalizeTimestamp(ts) {
  if (!ts) return null;

  // Si ya es ISO-8601
  const date = new Date(ts);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }

  // Intenta parsear formato "DD MMM, YYYY HH:mm"
  const months = {
    'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3,
    'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7,
    'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
  };

  const match = String(ts).match(/(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (match) {
    const d = new Date(
      parseInt(match[3]),           // year
      months[match[2]] || 0,        // month
      parseInt(match[1]),           // day
      parseInt(match[4]),           // hour
      parseInt(match[5])            // minute
    );
    return d.getTime();
  }

  return null;
}

/**
 * Compara dos timestamps con tolerancia
 */
function timestampsMatch(ts1, ts2, toleranceMs) {
  const t1 = normalizeTimestamp(ts1);
  const t2 = normalizeTimestamp(ts2);

  if (t1 === null || t2 === null) {
    return false;
  }

  return Math.abs(t1 - t2) <= toleranceMs;
}

/**
 * Busca un registro que coincida con la clave compuesta (email + submitted_on)
 */
function findMatchingRecord(searchResults, targetEmail, targetSubmittedOn) {
  if (!searchResults || !Array.isArray(searchResults) || searchResults.length === 0) {
    return null;
  }

  const normalizedEmail = (targetEmail || "").toLowerCase().trim();

  for (const row of searchResults) {
    const fields = row.field || row.fields || row;

    // Obtener email del registro
    const rowEmail = (fields["Correo electrónico"] || "").toLowerCase().trim();

    // Obtener submitted_on del registro
    const rowSubmittedOn = fields[CONFIG.stackby_submitted_field];

    // Comparar email (debe coincidir exactamente)
    if (rowEmail !== normalizedEmail) {
      continue;
    }

    // Comparar submitted_on (con tolerancia)
    if (timestampsMatch(rowSubmittedOn, targetSubmittedOn, CONFIG.timestamp_tolerance_ms)) {
      return {
        id: row.id || row.rowId || fields.rowId,
        fields: fields
      };
    }
  }

  return null;
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

try {
  // Parse inputs
  const envelope = typeof input.envelope === "string"
    ? JSON.parse(input.envelope)
    : input.envelope;

  const searchResults = typeof input.search_results === "string"
    ? JSON.parse(input.search_results)
    : (input.search_results || []);

  // Validar que tenemos envelope válido
  if (!envelope || !envelope.data || !envelope.meta) {
    return {
      meta: {
        source_system: "pabbly",
        workflow: "WF_001_DECA_INSCRIPCION",
        run_id: `error:invalid_envelope:${Date.now()}`,
        idempotency_key: `error:invalid_envelope:${Date.now()}`,
        mapping_version: SCRIPT_VERSION,
        ts_ingested: new Date().toISOString()
      },
      data: { raw: input, normalized: {}, targets: {} },
      control: {
        action: "ERROR",
        reason: "Envelope inválido recibido del paso anterior",
        errors: ["Envelope missing or malformed"]
      }
    };
  }

  // Si el envelope ya tiene action=ERROR o SKIP, propagarlo sin cambios
  if (envelope.control.action === "ERROR" || envelope.control.action === "SKIP") {
    console.log(`[${SCRIPT_NAME}] Propagating ${envelope.control.action} from previous step`);
    return envelope;
  }

  // Extraer valores para la búsqueda
  const targetEmail = envelope.data.normalized.email;
  const targetSubmittedOn = envelope.data.normalized.submitted_on;
  const idempotencyKey = envelope.meta.idempotency_key;

  console.log(`[${SCRIPT_NAME}] Looking for: email=${targetEmail}, submitted_on=${targetSubmittedOn}`);
  console.log(`[${SCRIPT_NAME}] Search results count: ${searchResults.length}`);

  // Buscar coincidencia exacta con clave compuesta
  const matchingRecord = findMatchingRecord(searchResults, targetEmail, targetSubmittedOn);

  // Decidir acción basada en si encontramos coincidencia
  let action, reason, existingRowId;

  if (matchingRecord) {
    // Encontrado: UPDATE
    action = "UPDATE";
    reason = `Registro existente encontrado (row_id: ${matchingRecord.id}). Actualizar.`;
    existingRowId = matchingRecord.id;

    console.log(`[${SCRIPT_NAME}] MATCH FOUND: row_id=${existingRowId}`);
  } else {
    // No encontrado: CREATE
    action = "CREATE";
    reason = `No existe registro con idempotency_key=${idempotencyKey}. Crear nuevo.`;
    existingRowId = null;

    console.log(`[${SCRIPT_NAME}] NO MATCH: Will create new record`);
  }

  // Actualizar envelope con la decisión
  envelope.control.action = action;
  envelope.control.reason = reason;

  // Añadir row_id para update (si aplica)
  envelope.data._stackby_row_id = existingRowId;

  // =========================================================================
  // GESTIÓN DE "ACEPTADO EN" (campo gestionado internamente)
  // - CREATE: siempre set "PENDIENTE"
  // - UPDATE: solo set "PENDIENTE" si el valor actual está vacío/null
  // =========================================================================
  const ACEPTADO_EN_DEFAULT = "PENDIENTE";
  const ACEPTADO_EN_FIELD = "ACEPTADO EN";

  if (action === "CREATE") {
    // Nuevo registro: siempre inicializar con PENDIENTE
    envelope.data.targets[ACEPTADO_EN_FIELD] = ACEPTADO_EN_DEFAULT;
    console.log(`[${SCRIPT_NAME}] CREATE: Setting "${ACEPTADO_EN_FIELD}" = "${ACEPTADO_EN_DEFAULT}"`);
  } else if (action === "UPDATE" && matchingRecord) {
    // Registro existente: verificar si tiene valor
    const existingValue = matchingRecord.fields[ACEPTADO_EN_FIELD];

    if (!existingValue || existingValue === "" || existingValue === null) {
      // Campo vacío en registro existente: inicializar con PENDIENTE
      envelope.data.targets[ACEPTADO_EN_FIELD] = ACEPTADO_EN_DEFAULT;
      console.log(`[${SCRIPT_NAME}] UPDATE: "${ACEPTADO_EN_FIELD}" was empty, setting to "${ACEPTADO_EN_DEFAULT}"`);
    } else {
      // Campo ya tiene valor: NO sobrescribir (eliminar del targets si existe)
      delete envelope.data.targets[ACEPTADO_EN_FIELD];
      console.log(`[${SCRIPT_NAME}] UPDATE: Preserving existing "${ACEPTADO_EN_FIELD}" = "${existingValue}"`);
    }
  }

  // Añadir metadata de decisión
  envelope.meta.decision_ts = new Date().toISOString();
  envelope.meta.search_results_count = searchResults.length;
  envelope.meta.match_found = matchingRecord !== null;

  return envelope;

} catch (e) {
  console.log(`[${SCRIPT_NAME}] Exception: ${e.message}`);

  // Intentar preservar el envelope original si existe
  const originalEnvelope = input.envelope || {};

  return {
    meta: {
      ...(originalEnvelope.meta || {}),
      source_system: "pabbly",
      workflow: "WF_001_DECA_INSCRIPCION",
      run_id: `error:${Date.now()}`,
      idempotency_key: originalEnvelope.meta?.idempotency_key || `error:exception:${Date.now()}`,
      mapping_version: SCRIPT_VERSION,
      ts_ingested: new Date().toISOString()
    },
    data: originalEnvelope.data || { raw: input, normalized: {}, targets: {} },
    control: {
      action: "ERROR",
      reason: `Excepción en filter_and_decide: ${e.message}`,
      errors: [e.message]
    }
  };
}
