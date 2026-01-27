/**
 * @name WF_001 DECA Inscripción - Normalize & Map
 * @version 1.0.0
 * @author Claude Code
 * @description Transforma fila de Google Sheets (DECA Inscripción) en Envelope
 *              normalizado para upsert en Stackby (SOLICITUDES_DECA)
 * @automation WF_001_DECA_INSCRIPCION
 * @inputs input (objeto JSON con campos del row de Google Sheets)
 * @outputs Envelope {meta, data, control}
 */

const SCRIPT_VERSION = "1.2.0";
const SCRIPT_NAME = "wf_001_deca_inscripcion";
const WORKFLOW_NAME = "WF_001_DECA_INSCRIPCION";

// ============================================================================
// 1. CONFIGURATION & CONSTANTS
// ============================================================================

const CONFIG = {
  source: {
    system: "google_sheets",
    sheet_id: "1FK0TPur-qCYyVGM0bRuHMa6I8Q7vp_TpFWz3_2M56DQ",
    tab_name: "DECA Inscripción"
  },
  destination: {
    system: "stackby",
    stack_id: "stHbLS2nezlbb3BL78",
    table_id: "tbcoXCDU2ArgKH4eQJ",
    table_name: "SOLICITUDES_DECA"
  },
  idempotency_key_fields: ["email", "submitted_on"],
  required_fields: ["email", "nombre", "apellidos", "dni", "submitted_on"]
};

// Mapeo de nombres de columna: Sheet → Stackby
const FIELD_MAP = {
  // Sheet column                    → Stackby column
  "Submitted On (UTC)":              "Submitted On (UTC)",
  "¿En qué se desea matricular?":    "¿En qué se desea matricular?",
  "Selección de Módulos":            "Selección de módulos",  // minúscula en Stackby
  "Título civil":                    "Título civil",
  "Indique su título":               "Especificar otro título",  // diferente nombre
  "Nombre":                          "Nombre",
  "Apellidos":                       "Apellidos",
  "Calle (vía)":                     "Calle (vía)",
  "Número, piso, puerta":            "Número, piso, puerta",
  "Centro asociado al que pertenece":"Centro asociado al que pertenece",
  "Indique el nombre del centro":    "Indique el nombre del centro",
  "Población":                       "Población",
  "Código postal":                   "Código postal",
  "Provincia":                       "Provincia",
  "DNI / Pasaporte / NIE":           "DNI / Pasaporte / NIE",
  "Fecha de nacimiento":             "Fecha de nacimiento",
  "Estado civil":                    "Estado civil",
  "Sexo":                            "Sexo",
  "Teléfono de contacto":            "Teléfono de contacto",
  "Correo electrónico":              "Correo electrónico",
  "Firma del solicitante":           "Firma del solicitante",
  // "ADMITIDO EN" del Sheet se IGNORA - "ACEPTADO EN" es gestionado internamente
  "Thank You Screen":                "Thank You Screen"
};

// Normalización de valores Sexo
const SEXO_NORMALIZE = {
  "Hombre": "Masculino",
  "Mujer": "Femenino",
  "HOMBRE": "Masculino",
  "MUJER": "Femenino",
  "hombre": "Masculino",
  "mujer": "Femenino",
  "Masculino": "Masculino",
  "Femenino": "Femenino"
};

// ============================================================================
// 2. VALIDATION FUNCTIONS
// ============================================================================

function validateEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateDNI(dni) {
  if (!dni) return false;
  // Acepta DNI (8 dígitos + letra), NIE (X/Y/Z + 7 dígitos + letra), Pasaporte
  return /^[0-9XYZxyz][0-9]{6,7}[A-Za-z]?$/.test(dni.replace(/[\s-]/g, ''));
}

function validateRequired(data, fields) {
  const errors = [];
  for (const field of fields) {
    const value = data[field];
    if (value === null || value === undefined || value === "") {
      errors.push(`Campo requerido vacío: ${field}`);
    }
  }
  return errors;
}

function isEmptyRow(raw) {
  // Verifica si todos los campos relevantes están vacíos
  const values = Object.values(raw);
  return values.every(v => v === null || v === undefined || v === "");
}

// ============================================================================
// 3. NORMALIZATION FUNCTIONS
// ============================================================================

function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  // Colapsa espacios múltiples
  return trimmed.replace(/\s+/g, " ");
}

function normalizeEmail(email) {
  const normalized = normalizeString(email);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return null;
  // Elimina todo excepto dígitos y +
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  if (cleaned.length < 9) return null;
  return cleaned;
}

function normalizeDNI(dni) {
  if (!dni) return null;
  // Elimina espacios y guiones, convierte a mayúsculas
  return String(dni).replace(/[\s-]/g, '').toUpperCase();
}

function normalizeSexo(sexo) {
  if (!sexo) return null;
  const normalized = normalizeString(sexo);
  if (!normalized) return null;
  return SEXO_NORMALIZE[normalized] || normalized;
}

/**
 * Parsea fecha en formato "DD MMM, YYYY" o "Date: DD MMM, YYYY"
 * Ejemplo: "17 Oct, 2025" → "2025-10-17"
 *          "Date: 07 Jul, 2004" → "2004-07-07"
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  // Elimina prefijo "Date: " si existe
  let cleaned = String(dateStr).replace(/^Date:\s*/i, '').trim();

  // Mapa de meses
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  // Intenta parsear "DD MMM, YYYY" o "DD MMM YYYY"
  const match = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2]] || '01';
    const year = match[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback: intenta Date.parse
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Parsea datetime en formato "DD MMM, YYYY HH:mm"
 * Ejemplo: "17 Oct, 2025 08:10" → "2025-10-17T08:10:00Z"
 */
function parseDateTime(dateTimeStr) {
  if (!dateTimeStr) return null;

  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };

  // Parsea "DD MMM, YYYY HH:mm"
  const match = String(dateTimeStr).match(/(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2]] || '01';
    const year = match[3];
    const hour = match[4].padStart(2, '0');
    const minute = match[5];
    return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
  }

  // Fallback
  const parsed = new Date(dateTimeStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}

/**
 * Separa string por comas en array (para multiselect)
 */
function splitComma(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(item => item.trim())
    .filter(item => item !== '');
}

// ============================================================================
// 4. IDEMPOTENCY KEY GENERATION
// ============================================================================

function generateIdempotencyKey(normalized) {
  const email = normalized.email || "null";
  const submittedOn = normalized.submitted_on || "null";
  return `stackby:SOLICITUDES_DECA:${email}:${submittedOn}`;
}

// ============================================================================
// 5. APPLY MAPPING (Sheet → Stackby targets)
// ============================================================================

function applyMapping(normalized) {
  const targets = {};

  // Mapeo directo con nombres de Stackby
  targets["Submitted On (UTC)"] = normalized.submitted_on;
  targets["¿En qué se desea matricular?"] = normalized.tipo_matricula;
  targets["Selección de módulos"] = normalized.seleccion_modulos; // ya es array
  targets["Título civil"] = normalized.titulo_civil;
  targets["Especificar otro título"] = normalized.otro_titulo;
  targets["Nombre"] = normalized.nombre;
  targets["Apellidos"] = normalized.apellidos;
  targets["Calle (vía)"] = normalized.calle;
  targets["Número, piso, puerta"] = normalized.numero_piso;
  targets["Centro asociado al que pertenece"] = normalized.centro_asociado;
  targets["Indique el nombre del centro"] = normalized.nombre_centro;
  targets["Población"] = normalized.poblacion;
  targets["Código postal"] = normalized.codigo_postal;
  targets["Provincia"] = normalized.provincia;
  targets["DNI / Pasaporte / NIE"] = normalized.dni;
  targets["Fecha de nacimiento"] = normalized.fecha_nacimiento;
  targets["Estado civil"] = normalized.estado_civil;
  targets["Sexo"] = normalized.sexo;
  targets["Teléfono de contacto"] = normalized.telefono;
  targets["Correo electrónico"] = normalized.email;
  targets["Firma del solicitante"] = normalized.firma_url;
  // "ACEPTADO EN" NO se incluye aquí - se gestiona en filter_and_decide.js
  // CREATE → "PENDIENTE", UPDATE → mantener valor existente
  targets["Thank You Screen"] = normalized.thank_you;

  return targets;
}

// ============================================================================
// 6. MAIN LOGIC
// ============================================================================

try {
  // Parse input
  const rawData = typeof input === "string" ? JSON.parse(input) : input;

  // Log para debugging
  console.log(`[${SCRIPT_NAME}] Processing row...`);

  // Verifica fila vacía
  if (isEmptyRow(rawData)) {
    return {
      meta: {
        source_system: CONFIG.source.system,
        source_ref: `sheet:${CONFIG.source.tab_name}:empty`,
        workflow: WORKFLOW_NAME,
        run_id: `skip:empty:${Date.now()}`,
        idempotency_key: `skip:empty:${Date.now()}`,
        mapping_version: SCRIPT_VERSION,
        ts_ingested: new Date().toISOString()
      },
      data: {
        raw: rawData,
        normalized: {},
        targets: {}
      },
      control: {
        action: "SKIP",
        reason: "Fila vacía detectada",
        errors: []
      }
    };
  }

  // Normalize all fields
  const normalized = {
    submitted_on: parseDateTime(rawData["Submitted On (UTC)"]),
    tipo_matricula: normalizeString(rawData["¿En qué se desea matricular?"]),
    seleccion_modulos: splitComma(rawData["Selección de Módulos"]),
    titulo_civil: normalizeString(rawData["Título civil"]),
    otro_titulo: normalizeString(rawData["Indique su título"]),
    nombre: normalizeString(rawData["Nombre"]),
    apellidos: normalizeString(rawData["Apellidos"]),
    calle: normalizeString(rawData["Calle (vía)"]),
    numero_piso: normalizeString(rawData["Número, piso, puerta"]),
    centro_asociado: normalizeString(rawData["Centro asociado al que pertenece"]),
    nombre_centro: normalizeString(rawData["Indique el nombre del centro"]),
    poblacion: normalizeString(rawData["Población"]),
    codigo_postal: normalizeString(rawData["Código postal"]),
    provincia: normalizeString(rawData["Provincia"]),
    dni: normalizeDNI(rawData["DNI / Pasaporte / NIE"]),
    fecha_nacimiento: parseDate(rawData["Fecha de nacimiento"]),
    estado_civil: normalizeString(rawData["Estado civil"]),
    sexo: normalizeSexo(rawData["Sexo"]),
    telefono: normalizePhone(rawData["Teléfono de contacto"]),
    email: normalizeEmail(rawData["Correo electrónico"]),
    firma_url: normalizeString(rawData["Firma del solicitante"]),
    // aceptado_en: NO se importa del Sheet - se gestiona internamente
    thank_you: normalizeString(rawData["Thank You Screen"])
  };

  // Generate idempotency key (early, for tracking)
  const idempotencyKey = generateIdempotencyKey(normalized);

  console.log(`[${SCRIPT_NAME}] Idempotency key: ${idempotencyKey}`);

  // Validate required fields
  const validationErrors = validateRequired(normalized, CONFIG.required_fields);

  // Additional validations
  if (normalized.email && !validateEmail(normalized.email)) {
    validationErrors.push(`Email inválido: ${normalized.email}`);
  }
  if (normalized.dni && !validateDNI(normalized.dni)) {
    validationErrors.push(`DNI/NIE inválido: ${normalized.dni}`);
  }

  // Determine action
  let action, reason;
  if (validationErrors.length > 0) {
    action = "ERROR";
    reason = "Validación fallida: " + validationErrors.join("; ");
  } else {
    action = "UPSERT";
    reason = "Datos válidos, listo para upsert en Stackby";
  }

  // Apply mapping to get targets
  const targets = applyMapping(normalized);

  // Build and return Envelope
  return {
    meta: {
      source_system: CONFIG.source.system,
      source_ref: `sheet:${CONFIG.source.tab_name}:row`,
      workflow: WORKFLOW_NAME,
      run_id: `${WORKFLOW_NAME}:${idempotencyKey}:${Date.now()}`,
      idempotency_key: idempotencyKey,
      mapping_version: SCRIPT_VERSION,
      ts_ingested: new Date().toISOString()
    },
    data: {
      raw: rawData,
      normalized: normalized,
      targets: targets
    },
    control: {
      action: action,
      reason: reason,
      errors: validationErrors
    }
  };

} catch (e) {
  // Error handling - return valid Envelope even on exception
  console.log(`[${SCRIPT_NAME}] Exception: ${e.message}`);

  return {
    meta: {
      source_system: CONFIG.source.system,
      source_ref: `sheet:${CONFIG.source.tab_name}:error`,
      workflow: WORKFLOW_NAME,
      run_id: `error:${Date.now()}`,
      idempotency_key: `error:exception:${Date.now()}`,
      mapping_version: SCRIPT_VERSION,
      ts_ingested: new Date().toISOString()
    },
    data: {
      raw: typeof input === 'string' ? input.slice(0, 500) : input,
      normalized: {},
      targets: {}
    },
    control: {
      action: "ERROR",
      reason: `Excepción: ${e.message}`,
      errors: [e.message]
    }
  };
}
