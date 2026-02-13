/**
 * Transformar oportunidades: traducir etapas, clasificar servicio, vincular empresa.
 *
 * Un solo delete+recreate por registro para minimizar riesgo.
 * Preserva linked records (Main Contacts) usando associations.json.
 *
 * REQUISITO: Crear columna "Tipo de Servicio" (Select) en Opportunities ANTES de ejecutar.
 */

require('dotenv').config();
const fs = require('fs');

const STACKBY_API_KEY = process.env.STACKBY_API_KEY;
const STACKBY_STACK_ID = 'stBBsLQwR69x3Vgs49';

const TABLES = {
  contacts: 'tbl1770077025864393853',
  companies: 'tbl17700770258657e9b69',
  opportunities: 'tbl17700770258658046c6'
};

const LOG_FILE = './transform-opportunities.log';
const REQUEST_DELAY = 3000;

// === Mapeos ===

const STAGE_MAP = {
  'closedwon': 'Ganada',
  'closedlost': 'Perdida',
  'appointmentscheduled': 'Contacto Inicial',
  'qualifiedtobuy': 'Calificada',
  'presentationscheduled': 'Propuesta',
  'decisionmakerboughtin': 'Negociacion',
  'contractsent': 'Contrato Enviado'
};

const SERVICE_RULES = [
  { type: 'Formacion', keywords: ['formacion', 'formación', 'programa', 'curso', 'taller', 'capacitacion', 'capacitación', 'ucm', 'guaix', 'claves de gestion', 'claves para gestionar', 'educación en ia', 'educacion en ia', 'iitd', 'lms', 'erp'] },
  { type: 'Coaching', keywords: ['coaching', 'one to one', 'one-to-one', 'mentoring', 'procesos one to one', 'mentor'] },
  { type: 'Consultoria', keywords: ['consultoría', 'consultoria', 'auditoría', 'auditoria', 'evaluación', 'evaluacion', 'automatización', 'automatizacion', 'estrategia de marketing', 'estrategias para la mejora'] },
  { type: 'Desarrollo Web', keywords: ['web', 'ecommerce', 'e-commerce', 'marketplace', 'shopify', 'hosting', 'app', 'chatgpt', 'whatsapp', 'plataforma', 'showroom', 'posicionamiento', 'seo'] },
  { type: 'Marketing', keywords: ['marketing', 'branding', 'youtube', 'contenido', 'edición', 'edicion', 'diseminación', 'diseminacion', 'fidelización', 'fidelizacion'] }
];

function classifyService(dealName) {
  const lower = dealName.toLowerCase();
  for (const rule of SERVICE_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw)) return rule.type;
    }
  }
  return 'Otro';
}

// === Utils ===

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalizeString(str) {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

async function stackbyFetch(endpoint, options = {}) {
  const response = await fetch(`https://stackby.com/api/betav1${endpoint}`, {
    ...options,
    headers: {
      'api-key': STACKBY_API_KEY,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  const text = await response.text();

  if (response.status === 429 || (text.startsWith('<!DOCTYPE') && response.status !== 500)) {
    throw new Error('RATE_LIMIT');
  }
  if (response.status >= 400) {
    throw new Error(`HTTP_${response.status}: ${text.substring(0, 200)}`);
  }

  return JSON.parse(text);
}

async function retryOnRateLimit(fn, description) {
  let waitTime = 15 * 60 * 1000;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (err.message === 'RATE_LIMIT' || err.message.includes('fetch failed') || err.message.includes('ECONNRESET')) {
        log(`  ${err.message} en ${description} (intento ${attempt + 1}/6)`);
        await sleep(waitTime);
        waitTime = Math.min(waitTime * 2, 60 * 60 * 1000);
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Max reintentos en ${description}`);
}

async function getAllRows(tableId) {
  const all = [];
  let offset = 0;
  while (true) {
    const data = await retryOnRateLimit(
      () => stackbyFetch(`/rowlist/${STACKBY_STACK_ID}/${tableId}?maxRecords=100&offset=${offset}`),
      `rowlist offset=${offset}`
    );
    if (!data.length) break;
    all.push(...data);
    if (data.length < 100) break;
    offset += 100;
    await sleep(1000);
  }
  return all;
}

async function main() {
  log('=== TRANSFORMANDO OPORTUNIDADES ===\n');

  // 1. Leer contactos y empresas de Stackby
  log('Leyendo contactos...');
  const contacts = await getAllRows(TABLES.contacts);
  log(`  ${contacts.length} contactos`);
  await sleep(1500);

  log('Leyendo empresas...');
  const companies = await getAllRows(TABLES.companies);
  log(`  ${companies.length} empresas`);
  await sleep(1500);

  log('Leyendo oportunidades...');
  const opportunities = await getAllRows(TABLES.opportunities);
  log(`  ${opportunities.length} oportunidades`);
  await sleep(1500);

  // 2. Crear mapas
  const contactByEmail = new Map();
  for (const row of contacts) {
    const email = normalizeString(row.field.Email);
    if (email) contactByEmail.set(email, row.field.rowId);
  }

  const companyByName = new Map();
  for (const row of companies) {
    const name = normalizeString(row.field['Company Name']);
    if (name) companyByName.set(name, row.field.rowId);
  }

  // 3. Cargar asociaciones
  const associations = JSON.parse(fs.readFileSync('./CSVs/associations.json', 'utf8'));

  // dealName → [contactEmails]
  const dealContacts = new Map();
  for (const assoc of associations.contactToDeal) {
    const dealName = normalizeString(assoc.dealName);
    if (!dealContacts.has(dealName)) dealContacts.set(dealName, []);
    dealContacts.get(dealName).push(normalizeString(assoc.contactEmail));
  }

  // dealName → companyName
  const dealCompany = new Map();
  for (const assoc of associations.companyToDeal) {
    const dealName = normalizeString(assoc.dealName);
    dealCompany.set(dealName, normalizeString(assoc.companyName));
  }

  log(`Maps: ${contactByEmail.size} emails, ${companyByName.size} empresas, ${dealContacts.size} deal-contacts, ${dealCompany.size} deal-companies\n`);

  // 4. Procesar cada oportunidad
  let transformed = 0;
  let errors = 0;

  for (let i = 0; i < opportunities.length; i++) {
    const opp = opportunities[i];
    const f = opp.field;
    const dealName = f['Deal Name'] || '';
    const normalizedDeal = normalizeString(dealName);

    // Traducir etapa
    const oldStage = (f.Stage || '').toLowerCase();
    const newStage = STAGE_MAP[oldStage] || f.Stage || '';

    // Clasificar servicio
    const serviceType = classifyService(dealName);

    // Resolver contactos
    const emails = dealContacts.get(normalizedDeal) || [];
    const contactRowIds = emails.map(e => contactByEmail.get(e)).filter(Boolean);

    // Workaround: arrays de 1 elemento fallan con HTTP 500
    let mainContacts;
    if (contactRowIds.length === 1) {
      mainContacts = [contactRowIds[0], contactRowIds[0]];
    } else if (contactRowIds.length > 1) {
      mainContacts = contactRowIds;
    }

    // Resolver empresa
    const companyName = dealCompany.get(normalizedDeal);
    const companyRowId = companyName ? companyByName.get(companyName) : null;
    // Busqueda flexible si no hay match exacto
    let resolvedCompanyId = companyRowId;
    if (!resolvedCompanyId && companyName) {
      for (const [name, rowId] of companyByName) {
        if (name.includes(companyName) || companyName.includes(name)) {
          resolvedCompanyId = rowId;
          break;
        }
      }
    }

    // Construir nuevo registro
    const newRecord = {
      'Deal Name': dealName,
      'Stage': newStage,
      'Status': f.Status || '',
      'Priority': f.Priority || '',
      'Owner': f.Owner || '',
      'Close Date': f['Close Date'] || '',
      'Total Value': f['Total Value'] || '',
      'Users': f.Users || '',
      'Price/User': f['Price/User'] || '',
      'Tipo de Servicio': serviceType
    };

    if (mainContacts) {
      newRecord['Main Contacts'] = mainContacts;
    }
    if (resolvedCompanyId) {
      // Company link needs [rowId, rowId] workaround for single element
      newRecord['Company'] = [resolvedCompanyId, resolvedCompanyId];
    }

    // Limpiar campos vacíos
    for (const key of Object.keys(newRecord)) {
      if (newRecord[key] === '' || newRecord[key] === null || newRecord[key] === undefined) {
        delete newRecord[key];
      }
    }

    try {
      // Delete
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowdelete/${STACKBY_STACK_ID}/${TABLES.opportunities}?rowIds[]=${f.rowId}`,
          { method: 'DELETE' }
        ),
        `delete opp ${i + 1}`
      );
      await sleep(REQUEST_DELAY);

      // Create
      await retryOnRateLimit(
        () => stackbyFetch(
          `/rowcreate/${STACKBY_STACK_ID}/${TABLES.opportunities}`,
          {
            method: 'POST',
            body: JSON.stringify({ records: [{ field: newRecord }] })
          }
        ),
        `create opp ${i + 1}`
      );

      transformed++;
      const details = [];
      if (newStage !== f.Stage) details.push(`etapa: ${newStage}`);
      details.push(`servicio: ${serviceType}`);
      if (resolvedCompanyId) details.push('empresa vinculada');
      if (mainContacts) details.push(`${contactRowIds.length} contacto(s)`);

      log(`  ✓ [${i + 1}/${opportunities.length}] ${dealName} → ${details.join(', ')}`);
      await sleep(REQUEST_DELAY);
    } catch (err) {
      errors++;
      log(`  ✗ [${i + 1}/${opportunities.length}] ${dealName}: ${err.message}`);
    }
  }

  // 5. Verificar
  await sleep(2000);
  const final = await getAllRows(TABLES.opportunities);

  log(`\n=== RESULTADO ===`);
  log(`Oportunidades transformadas: ${transformed}/${opportunities.length}`);
  log(`Errores: ${errors}`);
  log(`Total final: ${final.length} (esperado: ${opportunities.length})`);

  // Mostrar distribución de etapas y servicios
  const stageCount = {};
  const serviceCount = {};
  for (const r of final) {
    const s = r.field.Stage || '(vacío)';
    const t = r.field['Tipo de Servicio'] || '(vacío)';
    stageCount[s] = (stageCount[s] || 0) + 1;
    serviceCount[t] = (serviceCount[t] || 0) + 1;
  }

  log('\nDistribución por etapa:');
  for (const [k, v] of Object.entries(stageCount)) log(`  ${k}: ${v}`);

  log('\nDistribución por tipo de servicio:');
  for (const [k, v] of Object.entries(serviceCount)) log(`  ${k}: ${v}`);

  log('\n=== FIN ===');
}

main().catch(err => {
  log(`ERROR FATAL: ${err.message}`);
  process.exit(1);
});
