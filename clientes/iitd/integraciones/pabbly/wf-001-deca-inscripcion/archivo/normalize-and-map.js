/**
 * @name WF_001 DECA Inscripción - Normalize & Map
 * @version 2.0.0
 * @author Claude Code
 * @description Transforma fila de Google Sheets (DECA Inscripción) en Envelope
 *              normalizado para upsert en Stackby (SOLICITUDES_DECA)
 * @automation WF_001_DECA_INSCRIPCION
 * @platform Pabbly Connect - Code by Pabbly (JavaScript) - NodeJS 18.x
 *
 * @setup CONFIGURACIÓN EN PABBLY:
 *        1. Copia este script completo en el módulo "Code by Pabbly"
 *        2. Verifica que ITERATOR_STEP_NUMBER coincida con tu paso Iterator
 *        3. Guarda y ejecuta "Save & Send Test Request"
 *
 * @important En Pabbly, los datos del Iterator están en el objeto 'data'
 *            Se accede como: data['3. Nombre'] (3 = número del paso Iterator)
 *
 * @outputs Envelope {meta, data, control}
 */

const SCRIPT_VERSION = "2.0.0";
const SCRIPT_NAME = "wf_001_deca_inscripcion";
const WORKFLOW_NAME = "WF_001_DECA_INSCRIPCION";

// ============================================================================
// ⚠️  ÚNICA CONFIGURACIÓN NECESARIA: NÚMERO DEL PASO ITERATOR
// ============================================================================
// Cambia este número si tu Iterator NO es el paso 3
const ITERATOR_STEP_NUMBER = 3;
// ============================================================================

// Helper para acceder a campos del Iterator
function getField(fieldName) {
  const key = `${ITERATOR_STEP_NUMBER}. ${fieldName}`;
  return data[key] !== undefined ? data[key] : null;
}

// ============================================================================
// CONFIGURATION & CONSTANTS
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
// VALIDATION FUNCTIONS
// ============================================================================

function validateEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateDNI(dni) {
  if (!dni) return false;
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

// ============================================================================
// NORMALIZATION FUNCTIONS
// ============================================================================

function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  return trimmed.replace(/\s+/g, " ");
}

function normalizeEmail(email) {
  const normalized = normalizeString(email);
  if (!normalized) return null;
  return normalized.toLowerCase();
}

function normalizePhone(phone) {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^\d+]/g, '');
  if (cleaned.length < 9) return null;
  return cleaned;
}

function normalizeDNI(dni) {
  if (!dni) return null;
  return String(dni).replace(/[\s-]/g, '').toUpperCase();
}

function normalizeSexo(sexo) {
  if (!sexo) return null;
  const normalized = normalizeString(sexo);
  if (!normalized) return null;
  return SEXO_NORMALIZE[normalized] || normalized;
}

function parseDate(dateStr) {
  if (!dateStr) return null;
  let cleaned = String(dateStr).replace(/^Date:\s*/i, '').trim();
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  const match = cleaned.match(/(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2]] || '01';
    const year = match[3];
    return `${year}-${month}-${day}`;
  }
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return null;
}

function parseDateTime(dateTimeStr) {
  if (!dateTimeStr) return null;
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
  };
  const match = String(dateTimeStr).match(/(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})\s+(\d{1,2}):(\d{2})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = months[match[2]] || '01';
    const year = match[3];
    const hour = match[4].padStart(2, '0');
    const minute = match[5];
    return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
  }
  const parsed = new Date(dateTimeStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return null;
}

function splitComma(value) {
  if (!value) return [];
  return String(value).split(',').map(item => item.trim()).filter(item => item !== '');
}

// ============================================================================
// IDEMPOTENCY KEY GENERATION
// ============================================================================

function generateIdempotencyKey(normalized) {
  const email = normalized.email || "null";
  const submittedOn = normalized.submitted_on || "null";
  return `stackby:SOLICITUDES_DECA:${email}:${submittedOn}`;
}

// ============================================================================
// APPLY MAPPING (Sheet → Stackby targets)
// ============================================================================

function applyMapping(normalized) {
  const targets = {};
  targets["Submitted On (UTC)"] = normalized.submitted_on;
  targets["¿En qué se desea matricular?"] = normalized.tipo_matricula;
  targets["Selección de módulos"] = normalized.seleccion_modulos;
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
  targets["Thank You Screen"] = normalized.thank_you;
  return targets;
}

// ============================================================================
// MAIN LOGIC
// ============================================================================

try {
  // Log para debugging
  console.log(`[${SCRIPT_NAME}] v${SCRIPT_VERSION} - Procesando datos del Iterator (paso ${ITERATOR_STEP_NUMBER})...`);

  // Extraer datos del Iterator usando el objeto 'data' de Pabbly
  const rawData = {
    "Submitted On (UTC)": getField("Submitted On (UTC)"),
    "Correo electrónico": getField("Correo electrónico"),
    "Nombre": getField("Nombre"),
    "Apellidos": getField("Apellidos"),
    "DNI / Pasaporte / NIE": getField("DNI / Pasaporte / NIE"),
    "¿En qué se desea matricular?": getField("¿En qué se desea matricular?"),
    "Selección de Módulos": getField("Selección de Módulos"),
    "Título civil": getField("Título civil"),
    "Indique su título": getField("Indique su título"),
    "Calle (vía)": getField("Calle (vía)"),
    "Número, piso, puerta": getField("Número, piso, puerta"),
    "Centro asociado al que pertenece": getField("Centro asociado al que pertenece"),
    "Indique el nombre del centro": getField("Indique el nombre del centro"),
    "Población": getField("Población"),
    "Código postal": getField("Código postal"),
    "Provincia": getField("Provincia"),
    "Fecha de nacimiento": getField("Fecha de nacimiento"),
    "Estado civil": getField("Estado civil"),
    "Sexo": getField("Sexo"),
    "Teléfono de contacto": getField("Teléfono de contacto"),
    "Firma del solicitante": getField("Firma del solicitante"),
    "Thank You Screen": getField("Thank You Screen")
  };

  // Verificar que hay datos
  const hasAnyData = Object.values(rawData).some(v => v !== null && v !== undefined && v !== "");

  if (!hasAnyData) {
    // No hay datos - posible fila vacía o configuración incorrecta
    output = {
      meta: {
        source_system: CONFIG.source.system,
        source_ref: `sheet:${CONFIG.source.tab_name}:empty_or_config_error`,
        workflow: WORKFLOW_NAME,
        run_id: `skip:empty:${Date.now()}`,
        idempotency_key: `skip:empty:${Date.now()}`,
        mapping_version: SCRIPT_VERSION,
        ts_ingested: new Date().toISOString()
      },
      data: {
        raw: rawData,
        normalized: {},
        targets: {},
        _debug: {
          iterator_step: ITERATOR_STEP_NUMBER,
          sample_key: `${ITERATOR_STEP_NUMBER}. Nombre`,
          available_keys: Object.keys(data || {}).slice(0, 10)
        }
      },
      control: {
        action: "SKIP",
        reason: "Fila vacía o error de configuración. Verifica ITERATOR_STEP_NUMBER.",
        errors: []
      }
    };
  } else {
    // Hay datos - procesar normalmente

    // FALLBACK DE NOMBRE: Si "Nombre" está vacío, usar "Indique su título"
    const rawNombre = normalizeString(rawData["Nombre"]);
    const rawIndiqueTitulo = normalizeString(rawData["Indique su título"]);
    const usedFallbackNombre = !rawNombre && rawIndiqueTitulo;
    const nombre_final = rawNombre || rawIndiqueTitulo;
    const otro_titulo_final = usedFallbackNombre ? null : rawIndiqueTitulo;

    // Normalizar todos los campos
    const normalized = {
      submitted_on: parseDateTime(rawData["Submitted On (UTC)"]),
      tipo_matricula: normalizeString(rawData["¿En qué se desea matricular?"]),
      seleccion_modulos: splitComma(rawData["Selección de Módulos"]),
      titulo_civil: normalizeString(rawData["Título civil"]),
      otro_titulo: otro_titulo_final,
      nombre: nombre_final,
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
      thank_you: normalizeString(rawData["Thank You Screen"]),
      _nombre_fallback_used: usedFallbackNombre
    };

    // Generar idempotency key
    const idempotencyKey = generateIdempotencyKey(normalized);
    console.log(`[${SCRIPT_NAME}] Idempotency key: ${idempotencyKey}`);

    // Validar campos requeridos
    const validationErrors = validateRequired(normalized, CONFIG.required_fields);

    // Validaciones adicionales
    if (normalized.email && !validateEmail(normalized.email)) {
      validationErrors.push(`Email inválido: ${normalized.email}`);
    }
    if (normalized.dni && !validateDNI(normalized.dni)) {
      validationErrors.push(`DNI/NIE inválido: ${normalized.dni}`);
    }

    // Determinar acción
    let action, reason;
    if (validationErrors.length > 0) {
      action = "ERROR";
      reason = "Validación fallida: " + validationErrors.join("; ");
    } else {
      action = "UPSERT";
      reason = "Datos válidos, listo para upsert en Stackby";
    }

    // Aplicar mapping
    const targets = applyMapping(normalized);

    // Build Envelope
    output = {
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
  }

} catch (e) {
  console.log(`[${SCRIPT_NAME}] Exception: ${e.message}`);

  output = {
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
      raw: null,
      normalized: {},
      targets: {},
      _debug: {
        error_message: e.message,
        error_stack: e.stack ? e.stack.slice(0, 300) : null,
        iterator_step: ITERATOR_STEP_NUMBER,
        data_keys: Object.keys(data || {}).slice(0, 15)
      }
    },
    control: {
      action: "ERROR",
      reason: `Excepción: ${e.message}`,
      errors: [e.message]
    }
  };
}
