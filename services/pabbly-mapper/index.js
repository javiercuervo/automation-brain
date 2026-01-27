/**
 * Pabbly Mapper Service
 *
 * Recibe payloads de Pabbly Connect, mapea/normaliza campos y:
 * - Dispara repository_dispatch a GitHub (modo por defecto)
 * - O crea archivo directamente en repo (modo alternativo)
 *
 * @author Claude Code
 * @version 1.0.0
 */

const express = require('express');
const app = express();

// Middleware para JSON y form-data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================================
// CONFIGURACION
// ============================================================================

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'javiercuervo';
const GITHUB_REPO = process.env.GITHUB_REPO || 'automation-brain';
const OUTPUT_MODE = process.env.OUTPUT_MODE || 'repository_dispatch'; // 'repository_dispatch' o 'create_file'

// ============================================================================
// KEY_MAP: Mapeo de campos Pabbly -> campos normalizados
// ============================================================================

const KEY_MAP = {
  "3. Submitted On (UTC)": "Submitted On (UTC)",
  "3. Correo Electrónico": "Correo electrónico",
  "3. Indique Su Título": "Nombre",
  "3. Apellidos": "Apellidos",
  "3. DNI / Pasaporte / NIE": "DNI / Pasaporte / NIE",
  "3. ¿En Qué Se Desea Matricular?": "¿En qué se desea matricular?",
  "3. Selección De Módulos": "Selección de Módulos",
  "3. Calle (vía)": "Calle (vía)",
  "3. Número, Piso, Puerta": "Número, piso, puerta",
  "3. Código Postal": "Código postal",
  "3. Provincia": "Provincia",
  "3. Fecha De Nacimiento": "Fecha de nacimiento",
  "3. Estado Civil": "Estado civil",
  "3. Sexo": "Sexo",
  "3. Teléfono De Contacto": "Teléfono de contacto",
  "3. Firma Del Solicitante": "Firma del solicitante",
  "3. Thank You Screen": "Thank You Screen",
  // Campos adicionales que pueden venir
  "3. Nombre": "Nombre",
  "3. Título Civil": "Título civil",
  "3. Centro Asociado Al Que Pertenece": "Centro asociado al que pertenece",
  "3. Indique El Nombre Del Centro": "Indique el nombre del centro",
  "3. Población": "Población"
};

// ============================================================================
// FUNCIONES DE NORMALIZACION
// ============================================================================

/**
 * Normaliza fechas de varios formatos a YYYY-MM-DD
 * Soporta: "Date: 07 Jul, 2004", "07 Jul, 2004", "07/07/2004", "2004-07-07"
 */
function normalizeDate(dateStr) {
  if (!dateStr) return null;

  // Eliminar prefijo "Date: " si existe
  let cleaned = String(dateStr).replace(/^Date:\s*/i, '').trim();

  // Mapa de meses
  const months = {
    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
    'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
    'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12',
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };

  // Formato: "07 Jul, 2004" o "07 Jul 2004"
  const matchDMY = cleaned.match(/(\d{1,2})\s+([A-Za-z]+),?\s+(\d{4})/);
  if (matchDMY) {
    const day = matchDMY[1].padStart(2, '0');
    const monthName = matchDMY[2];
    const month = months[monthName] || '01';
    const year = matchDMY[3];
    return `${year}-${month}-${day}`;
  }

  // Formato: "07/07/2004" (DD/MM/YYYY)
  const matchSlash = cleaned.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (matchSlash) {
    const day = matchSlash[1].padStart(2, '0');
    const month = matchSlash[2].padStart(2, '0');
    const year = matchSlash[3];
    return `${year}-${month}-${day}`;
  }

  // Formato: "2004-07-07" (ya normalizado)
  const matchISO = cleaned.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (matchISO) {
    return cleaned;
  }

  // Fallback: intentar Date.parse
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return dateStr; // Devolver original si no se pudo parsear
}

/**
 * Normaliza string: trim, colapsa espacios
 */
function normalizeString(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  return trimmed.replace(/\s+/g, " ");
}

/**
 * Mapea y normaliza el payload de Pabbly
 */
function mapPayload(inputPayload) {
  const mappedPayload = {};

  for (const [pabblyKey, normalizedKey] of Object.entries(KEY_MAP)) {
    if (inputPayload[pabblyKey] !== undefined && inputPayload[pabblyKey] !== null && inputPayload[pabblyKey] !== "") {
      let value = inputPayload[pabblyKey];

      // Normalizar fechas
      if (normalizedKey.toLowerCase().includes('fecha') || normalizedKey.toLowerCase().includes('date')) {
        value = normalizeDate(value);
      } else {
        value = normalizeString(value);
      }

      if (value !== null) {
        mappedPayload[normalizedKey] = value;
      }
    }
  }

  return mappedPayload;
}

// ============================================================================
// FUNCIONES GITHUB
// ============================================================================

/**
 * Dispara repository_dispatch a GitHub
 */
async function triggerRepositoryDispatch(submissionId, mappedPayload) {
  const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Accept': 'application/vnd.github+json',
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      event_type: 'pabbly_submission',
      client_payload: {
        submissionId: submissionId,
        mappedPayload: mappedPayload,
        timestamp: new Date().toISOString()
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${errorText}`);
  }

  // repository_dispatch devuelve 204 No Content en exito
  return { success: true, message: 'Repository dispatch triggered successfully' };
}

/**
 * Crea archivo directamente en repo (modo alternativo)
 */
async function createFileInRepo(submissionId, mappedPayload) {
  const branchName = `pabbly/sub-${submissionId}`;
  const filePath = `data/submissions/${submissionId}.json`;
  const fileContent = JSON.stringify(mappedPayload, null, 2);
  const contentBase64 = Buffer.from(fileContent).toString('base64');

  // 1. Obtener SHA del branch main
  const mainRef = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/ref/heads/main`,
    {
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );

  if (!mainRef.ok) {
    throw new Error(`Failed to get main branch: ${await mainRef.text()}`);
  }

  const mainData = await mainRef.json();
  const mainSha = mainData.object.sha;

  // 2. Crear nueva rama
  const createBranch = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/git/refs`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: `refs/heads/${branchName}`,
        sha: mainSha
      })
    }
  );

  // Ignorar error si la rama ya existe
  if (!createBranch.ok && createBranch.status !== 422) {
    throw new Error(`Failed to create branch: ${await createBranch.text()}`);
  }

  // 3. Crear archivo
  const createFile = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `feat: add submission ${submissionId} from Pabbly`,
        content: contentBase64,
        branch: branchName
      })
    }
  );

  if (!createFile.ok) {
    throw new Error(`Failed to create file: ${await createFile.text()}`);
  }

  // 4. Crear PR
  const createPR = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls`,
    {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `feat: Pabbly submission ${submissionId}`,
        body: `## Submission from Pabbly\n\nSubmission ID: ${submissionId}\nTimestamp: ${new Date().toISOString()}\n\nThis PR was auto-generated by the pabbly-mapper service.`,
        head: branchName,
        base: 'main'
      })
    }
  );

  if (!createPR.ok && createPR.status !== 422) {
    throw new Error(`Failed to create PR: ${await createPR.text()}`);
  }

  const prData = await createPR.json();
  return {
    success: true,
    pr_url: prData.html_url || `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/pull/${prData.number}`,
    branch: branchName
  };
}

// ============================================================================
// MIDDLEWARE DE AUTENTICACION
// ============================================================================

function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!API_KEY) {
    console.error('[AUTH] API_KEY not configured');
    return res.status(500).json({ success: false, error: 'Server misconfiguration: API_KEY not set' });
  }

  if (!apiKey) {
    console.warn('[AUTH] Missing x-api-key header');
    return res.status(401).json({ success: false, error: 'Missing x-api-key header' });
  }

  if (apiKey !== API_KEY) {
    console.warn('[AUTH] Invalid API key');
    return res.status(401).json({ success: false, error: 'Invalid API key' });
  }

  next();
}

// ============================================================================
// ENDPOINTS
// ============================================================================

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    version: '1.0.0',
    mode: OUTPUT_MODE,
    timestamp: new Date().toISOString()
  });
});

/**
 * Main endpoint - recibe payload de Pabbly
 */
app.post('/', authenticateApiKey, async (req, res) => {
  const startTime = Date.now();

  try {
    console.log('[PABBLY] Received request');

    // Extraer payload - puede venir como body directo o como campo 'payload'
    let inputPayload = req.body;
    if (req.body.payload) {
      inputPayload = typeof req.body.payload === 'string'
        ? JSON.parse(req.body.payload)
        : req.body.payload;
    }

    // Extraer submissionId
    const submissionId = req.body.submissionId
      || inputPayload.submissionId
      || inputPayload['submissionId']
      || `sub-${Date.now()}`;

    console.log(`[PABBLY] Processing submission: ${submissionId}`);

    // Mapear payload
    const mappedPayload = mapPayload(inputPayload);

    console.log(`[PABBLY] Mapped ${Object.keys(mappedPayload).length} fields`);

    // Verificar GITHUB_TOKEN
    if (!GITHUB_TOKEN) {
      console.error('[GITHUB] GITHUB_TOKEN not configured');
      return res.status(500).json({
        success: false,
        error: 'Server misconfiguration: GITHUB_TOKEN not set'
      });
    }

    // Ejecutar segun modo
    let result;
    if (OUTPUT_MODE === 'create_file') {
      console.log('[GITHUB] Mode: create_file');
      result = await createFileInRepo(submissionId, mappedPayload);
    } else {
      console.log('[GITHUB] Mode: repository_dispatch');
      result = await triggerRepositoryDispatch(submissionId, mappedPayload);
    }

    const duration = Date.now() - startTime;
    console.log(`[PABBLY] Completed in ${duration}ms`);

    res.status(200).json({
      success: true,
      submissionId: submissionId,
      mappedFields: Object.keys(mappedPayload).length,
      mode: OUTPUT_MODE,
      result: result,
      duration_ms: duration
    });

  } catch (error) {
    console.error('[ERROR]', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Debug endpoint - muestra mapeo sin ejecutar
 */
app.post('/debug', authenticateApiKey, (req, res) => {
  try {
    let inputPayload = req.body;
    if (req.body.payload) {
      inputPayload = typeof req.body.payload === 'string'
        ? JSON.parse(req.body.payload)
        : req.body.payload;
    }

    const mappedPayload = mapPayload(inputPayload);

    res.status(200).json({
      success: true,
      inputKeys: Object.keys(inputPayload),
      mappedPayload: mappedPayload,
      mappedKeys: Object.keys(mappedPayload)
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log(`[SERVER] Pabbly Mapper running on port ${PORT}`);
  console.log(`[SERVER] Mode: ${OUTPUT_MODE}`);
  console.log(`[SERVER] GitHub: ${GITHUB_OWNER}/${GITHUB_REPO}`);
});
