/**
 * @name WF_001 DECA Inscripción - Normalize & Map
 * @version 3.0.0
 * @author Claude Code
 * @description Transforma fila de Google Sheets (DECA Inscripción) en Envelope
 *              normalizado para upsert en Stackby (SOLICITUDES_DECA)
 *
 * @platform Pabbly Connect - Code by Pabbly (JavaScript)
 *
 * @setup EN PABBLY "Code by Pabbly":
 *        1. En "Set Input Variables", añade estas variables y mapéalas desde el Iterator:
 *           - submitted_on      → Iterator: Submitted On (UTC)
 *           - email             → Iterator: Correo electrónico
 *           - nombre            → Iterator: Nombre
 *           - apellidos         → Iterator: Apellidos
 *           - dni               → Iterator: DNI / Pasaporte / NIE
 *           - tipo_matricula    → Iterator: ¿En qué se desea matricular?
 *           - seleccion_modulos → Iterator: Selección de Módulos
 *           - titulo_civil      → Iterator: Título civil
 *           - indique_titulo    → Iterator: Indique su título
 *           - calle             → Iterator: Calle (vía)
 *           - numero_piso       → Iterator: Número, piso, puerta
 *           - centro_asociado   → Iterator: Centro asociado al que pertenece
 *           - nombre_centro     → Iterator: Indique el nombre del centro
 *           - poblacion         → Iterator: Población
 *           - codigo_postal     → Iterator: Código postal
 *           - provincia         → Iterator: Provincia
 *           - fecha_nacimiento  → Iterator: Fecha de nacimiento
 *           - estado_civil      → Iterator: Estado civil
 *           - sexo              → Iterator: Sexo
 *           - telefono          → Iterator: Teléfono de contacto
 *           - firma             → Iterator: Firma del solicitante
 *           - thank_you         → Iterator: Thank You Screen
 *
 *        2. Pega este script en el área de código
 *        3. Guarda y ejecuta "Save & Send Test Request"
 */

const SCRIPT_VERSION = "3.0.0";

// ============================================================================
// Los datos vienen del objeto 'input' (declarado en "Set Input Variables")
// ============================================================================

const rawData = {
  submitted_on: input.submitted_on || null,
  email: input.email || null,
  nombre: input.nombre || null,
  apellidos: input.apellidos || null,
  dni: input.dni || null,
  tipo_matricula: input.tipo_matricula || null,
  seleccion_modulos: input.seleccion_modulos || null,
  titulo_civil: input.titulo_civil || null,
  indique_titulo: input.indique_titulo || null,
  calle: input.calle || null,
  numero_piso: input.numero_piso || null,
  centro_asociado: input.centro_asociado || null,
  nombre_centro: input.nombre_centro || null,
  poblacion: input.poblacion || null,
  codigo_postal: input.codigo_postal || null,
  provincia: input.provincia || null,
  fecha_nacimiento: input.fecha_nacimiento || null,
  estado_civil: input.estado_civil || null,
  sexo: input.sexo || null,
  telefono: input.telefono || null,
  firma: input.firma || null,
  thank_you: input.thank_you || null
};

// ============================================================================
// FUNCIONES DE NORMALIZACIÓN
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
  const map = {
    "Hombre": "Masculino", "Mujer": "Femenino",
    "HOMBRE": "Masculino", "MUJER": "Femenino",
    "hombre": "Masculino", "mujer": "Femenino"
  };
  const normalized = normalizeString(sexo);
  return map[normalized] || normalized;
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
    return `${match[3]}-${months[match[2]] || '01'}-${match[1].padStart(2, '0')}`;
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
// VALIDACIÓN
// ============================================================================

function validateEmail(email) {
  if (!email) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateDNI(dni) {
  if (!dni) return false;
  return /^[0-9XYZxyz][0-9]{6,7}[A-Za-z]?$/.test(dni.replace(/[\s-]/g, ''));
}

// ============================================================================
// LÓGICA PRINCIPAL
// ============================================================================

// Verificar si hay datos
const hasData = Object.values(rawData).some(v => v !== null && v !== "");

if (!hasData) {
  // Fila vacía
  output = {
    action: "SKIP",
    reason: "Fila vacía - sin datos para procesar",
    targets: {}
  };
} else {
  // Procesar datos

  // Fallback de nombre: si "nombre" vacío, usar "indique_titulo"
  const nombreNorm = normalizeString(rawData.nombre);
  const indiqueTituloNorm = normalizeString(rawData.indique_titulo);
  const usedFallback = !nombreNorm && indiqueTituloNorm;
  const nombreFinal = nombreNorm || indiqueTituloNorm;
  const otroTituloFinal = usedFallback ? null : indiqueTituloNorm;

  // Normalizar campos
  const emailNorm = normalizeEmail(rawData.email);
  const dniNorm = normalizeDNI(rawData.dni);
  const submittedNorm = parseDateTime(rawData.submitted_on);
  const apellidosNorm = normalizeString(rawData.apellidos);

  // Validar campos requeridos
  const errors = [];
  if (!emailNorm) errors.push("Email vacío o inválido");
  if (!nombreFinal) errors.push("Nombre vacío");
  if (!apellidosNorm) errors.push("Apellidos vacío");
  if (!dniNorm) errors.push("DNI vacío");
  if (!submittedNorm) errors.push("Fecha de envío vacía");

  if (emailNorm && !validateEmail(emailNorm)) {
    errors.push("Email con formato inválido: " + emailNorm);
  }
  if (dniNorm && !validateDNI(dniNorm)) {
    errors.push("DNI con formato inválido: " + dniNorm);
  }

  // Determinar acción
  const action = errors.length > 0 ? "ERROR" : "UPSERT";

  // Construir targets para Stackby
  const targets = {
    "Submitted On (UTC)": submittedNorm,
    "¿En qué se desea matricular?": normalizeString(rawData.tipo_matricula),
    "Selección de módulos": splitComma(rawData.seleccion_modulos),
    "Título civil": normalizeString(rawData.titulo_civil),
    "Especificar otro título": otroTituloFinal,
    "Nombre": nombreFinal,
    "Apellidos": apellidosNorm,
    "Calle (vía)": normalizeString(rawData.calle),
    "Número, piso, puerta": normalizeString(rawData.numero_piso),
    "Centro asociado al que pertenece": normalizeString(rawData.centro_asociado),
    "Indique el nombre del centro": normalizeString(rawData.nombre_centro),
    "Población": normalizeString(rawData.poblacion),
    "Código postal": normalizeString(rawData.codigo_postal),
    "Provincia": normalizeString(rawData.provincia),
    "DNI / Pasaporte / NIE": dniNorm,
    "Fecha de nacimiento": parseDate(rawData.fecha_nacimiento),
    "Estado civil": normalizeString(rawData.estado_civil),
    "Sexo": normalizeSexo(rawData.sexo),
    "Teléfono de contacto": normalizePhone(rawData.telefono),
    "Correo electrónico": emailNorm,
    "Firma del solicitante": normalizeString(rawData.firma),
    "Thank You Screen": normalizeString(rawData.thank_you)
  };

  // Output final
  output = {
    action: action,
    reason: errors.length > 0 ? errors.join("; ") : "OK - listo para Stackby",
    errors: errors,
    version: SCRIPT_VERSION,
    idempotency_key: `${emailNorm}:${submittedNorm}`,
    targets: targets
  };
}
