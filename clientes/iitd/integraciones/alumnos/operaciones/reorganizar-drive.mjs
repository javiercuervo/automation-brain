#!/usr/bin/env node

/**
 * Reorganiza carpetas de Drive bajo carpeta organizadora IITD
 *
 * Acciones:
 * 1. Busca/crea "Recibos IITD" dentro de carpeta organizadora
 * 2. Mueve carpeta existente si está en raíz
 * 3. Crea subcarpetas adicionales recomendadas
 * 4. Actualiza .env con IDs correctos
 *
 * Usage:
 *   node reorganizar-drive.mjs --dry-run          # Preview sin cambios
 *   node reorganizar-drive.mjs                    # Ejecutar reorganización
 */

import { getDriveClient } from '../compartido/google-auth.mjs';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ID de la carpeta organizadora IITD (proporcionada por el usuario)
const PARENT_FOLDER_ID = '1CUY5Spma5__nR-MVKa1f8sa1vtvt6PdS';

const DRY_RUN = process.argv.includes('--dry-run');

// Subcarpetas a crear/verificar
const SUBCARPETAS = [
  { name: 'Recibos IITD', envVar: 'DRIVE_RECIBOS_FOLDER_ID' },
  { name: 'Documentos Firmados', envVar: 'DRIVE_DOCUMENTOS_FOLDER_ID' },
  { name: 'Importaciones', envVar: 'DRIVE_IMPORTACIONES_FOLDER_ID' },
  { name: 'Backups', envVar: 'DRIVE_BACKUPS_FOLDER_ID' },
];

// Shortcuts a crear (accesos directos a carpetas/archivos existentes)
const SHORTCUTS = [
  { name: 'Documentacion Matricula DECA', targetId: '1rrO3hoCHgrA-Mq8-LjqiRFoJVVPcPPG9' },
  { name: 'Panel IITD', targetId: '1JpEOMbu4JHjaaVqi5SZm0DienoiUl_0Q4uzdqt5RJUs' },
];

async function getParentFolder(drive) {
  try {
    const folder = await drive.files.get({
      fileId: PARENT_FOLDER_ID,
      fields: 'id, name, mimeType',
    });

    console.log(`✓ Carpeta organizadora encontrada: "${folder.data.name}"`);
    console.log(`  ID: ${PARENT_FOLDER_ID}`);
    console.log(`  URL: https://drive.google.com/drive/folders/${PARENT_FOLDER_ID}\n`);

    return folder.data;
  } catch (err) {
    console.error(`✗ Error: No se puede acceder a la carpeta ${PARENT_FOLDER_ID}`);
    console.error(`  ${err.message}\n`);
    throw err;
  }
}

async function findExistingFolder(drive, folderName) {
  const search = await drive.files.list({
    q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name, parents)',
  });

  return search.data.files || [];
}

async function moveFolder(drive, folderId, newParentId) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Movería carpeta ${folderId} a ${newParentId}`);
    return;
  }

  // Get current parents
  const file = await drive.files.get({
    fileId: folderId,
    fields: 'parents',
  });

  const previousParents = file.data.parents ? file.data.parents.join(',') : '';

  // Move to new parent
  await drive.files.update({
    fileId: folderId,
    addParents: newParentId,
    removeParents: previousParents,
    fields: 'id, parents',
  });
}

async function createFolder(drive, name, parentId) {
  if (DRY_RUN) {
    console.log(`  [DRY RUN] Crearía carpeta "${name}" en ${parentId}`);
    return { id: 'dry-run-id' };
  }

  const folder = await drive.files.create({
    requestBody: {
      name: name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, name',
  });

  return folder.data;
}

async function ensureSubfolder(drive, folderConfig) {
  const { name, envVar } = folderConfig;

  console.log(`\n📁 Procesando: ${name}`);

  // 1. Buscar si existe
  const existing = await findExistingFolder(drive, name);

  if (existing.length === 0) {
    // No existe, crear
    console.log(`  ℹ No existe, creando...`);
    const newFolder = await createFolder(drive, name, PARENT_FOLDER_ID);

    if (!DRY_RUN) {
      console.log(`  ✓ Creada: ${newFolder.id}`);
      console.log(`    URL: https://drive.google.com/drive/folders/${newFolder.id}`);
      return { id: newFolder.id, created: true };
    } else {
      console.log(`  [DRY RUN] Se crearía nueva carpeta`);
      return { id: 'dry-run-id', created: true };
    }
  }

  // 2. Existe, verificar ubicación
  const folder = existing[0];
  const isInCorrectLocation = folder.parents && folder.parents.includes(PARENT_FOLDER_ID);

  if (isInCorrectLocation) {
    console.log(`  ✓ Ya está en la ubicación correcta`);
    console.log(`    ID: ${folder.id}`);
    console.log(`    URL: https://drive.google.com/drive/folders/${folder.id}`);
    return { id: folder.id, moved: false };
  }

  // 3. Existe pero en otra ubicación, mover
  console.log(`  ℹ Existe pero en ubicación incorrecta, moviendo...`);
  console.log(`    ID actual: ${folder.id}`);
  console.log(`    Parents actuales: ${folder.parents ? folder.parents.join(', ') : 'raíz'}`);

  await moveFolder(drive, folder.id, PARENT_FOLDER_ID);

  if (!DRY_RUN) {
    console.log(`  ✓ Movida exitosamente`);
    console.log(`    Nueva URL: https://drive.google.com/drive/folders/${folder.id}`);
  }

  return { id: folder.id, moved: true };
}

function updateEnvFile(folderIds) {
  const envPath = resolve(__dirname, '../.env');

  console.log(`\n📝 Actualizando .env`);
  console.log(`  Ruta: ${envPath}`);

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Se actualizarían estas variables:`);
    Object.entries(folderIds).forEach(([key, value]) => {
      console.log(`    ${key}=${value}`);
    });
    return;
  }

  let envContent = '';

  // Leer .env existente si existe
  if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
  }

  // Actualizar o añadir variables
  Object.entries(folderIds).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');

    if (regex.test(envContent)) {
      // Actualizar existente
      envContent = envContent.replace(regex, `${key}=${value}`);
      console.log(`  ✓ Actualizado: ${key}`);
    } else {
      // Añadir nuevo
      envContent += `\n${key}=${value}`;
      console.log(`  ✓ Añadido: ${key}`);
    }
  });

  // Limpiar líneas vacías múltiples
  envContent = envContent.replace(/\n{3,}/g, '\n\n');

  writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');
  console.log(`  ✓ Archivo .env actualizado`);
}

async function ensureShortcut(drive, config) {
  const { name, targetId } = config;

  console.log(`\n🔗 Procesando shortcut: ${name}`);

  // Check if shortcut already exists in parent folder
  const existing = await drive.files.list({
    q: `name='${name}' and '${PARENT_FOLDER_ID}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, shortcutDetails)',
  });

  const files = existing.data.files || [];
  if (files.length > 0) {
    console.log(`  Ya existe (${files[0].id})`);
    return;
  }

  if (DRY_RUN) {
    console.log(`  [DRY RUN] Crearia shortcut a ${targetId}`);
    return;
  }

  const shortcut = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.shortcut',
      shortcutDetails: { targetId },
      parents: [PARENT_FOLDER_ID],
    },
    fields: 'id, name',
  });

  console.log(`  Creado: ${shortcut.data.id}`);
}

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  REORGANIZACION DE CARPETAS DRIVE - IITD');
  console.log('═══════════════════════════════════════════════════════\n');

  if (DRY_RUN) {
    console.log('MODO DRY RUN - No se haran cambios reales\n');
  }

  // 1. Autenticar
  console.log('Autenticando con Google Drive...');
  const drive = await getDriveClient();

  // 2. Verificar carpeta padre
  await getParentFolder(drive);

  // 3. Procesar cada subcarpeta
  console.log('Procesando subcarpetas...');

  const folderIds = {};

  for (const config of SUBCARPETAS) {
    const result = await ensureSubfolder(drive, config);
    folderIds[config.envVar] = result.id;
  }

  // 4. Procesar shortcuts
  console.log('\nProcesando shortcuts...');

  for (const config of SHORTCUTS) {
    await ensureShortcut(drive, config);
  }

  // 5. Anadir env var de la carpeta Getformly DECA
  folderIds['DRIVE_DECA_DOCS_FOLDER_ID'] = '1rrO3hoCHgrA-Mq8-LjqiRFoJVVPcPPG9';

  // 6. Actualizar .env
  updateEnvFile(folderIds);

  // 7. Resumen
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  RESUMEN');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Estructura final:');
  console.log(`  [Carpeta organizadora] (${PARENT_FOLDER_ID})`);
  SUBCARPETAS.forEach(config => {
    const folderId = folderIds[config.envVar];
    console.log(`    ${config.name} (${folderId})`);
  });
  SHORTCUTS.forEach(config => {
    console.log(`    ${config.name} -> ${config.targetId}`);
  });

  console.log('\nVariables de entorno configuradas:');
  Object.entries(folderIds).forEach(([key, value]) => {
    console.log(`  ${key}=${value}`);
  });

  if (DRY_RUN) {
    console.log('\nDRY RUN. Ejecuta sin --dry-run para aplicar cambios.');
  } else {
    console.log('\nReorganizacion completada.');
  }
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
