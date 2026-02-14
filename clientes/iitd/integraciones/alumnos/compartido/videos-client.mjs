#!/usr/bin/env node

/**
 * Videos Client — IITD (N31)
 *
 * CRUD para la tabla VIDEOS en Stackby.
 * Gestiona catálogo de videos educativos multidioma.
 *
 * Columnas: Titulo, Programa, Idioma, URL, Plataforma, Estado,
 *   Fecha_Publicacion, Duracion, Subtitulos, Notas
 *
 * Usage:
 *   node videos-client.mjs list                            # Listar videos
 *   node videos-client.mjs list --programa DECA            # Filtrar
 *   node videos-client.mjs list --idioma es                # Filtrar por idioma
 *   node videos-client.mjs create --titulo X --programa Y  # Crear video
 *   node videos-client.mjs find --titulo X                 # Buscar
 *   node videos-client.mjs stats                           # Estadísticas cobertura
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_VIDEOS_TABLE_ID
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env
if (existsSync(resolve(__dirname, '../.env'))) {
  for (const line of readFileSync(resolve(__dirname, '../.env'), 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const API_KEY = process.env.STACKBY_API_KEY;
const STACK_ID = process.env.STACKBY_STACK_ID || 'stHbLS2nezlbb3BL78';
const TABLE_ID = process.env.STACKBY_VIDEOS_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); }
if (!TABLE_ID) { console.error('Error: STACKBY_VIDEOS_TABLE_ID no configurada en .env'); }

// =====================================================
// ENUMS
// =====================================================

export const VIDEO_ESTADOS = {
  BORRADOR: 'borrador',
  PRODUCCION: 'produccion',
  PUBLICADO: 'publicado',
  RETIRADO: 'retirado',
};

export const PLATAFORMAS = {
  YOUTUBE: 'youtube',
  VIMEO: 'vimeo',
  DRIVE: 'drive',
  OTRA: 'otra',
};

export const IDIOMAS = ['es', 'en', 'fr', 'pt', 'it'];

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    titulo: (f?.Titulo || '').trim(),
    programa: (f?.Programa || '').trim(),
    idioma: (f?.Idioma || 'es').trim(),
    url: (f?.URL || '').trim(),
    plataforma: (f?.Plataforma || '').trim(),
    estado: (f?.Estado || VIDEO_ESTADOS.BORRADOR).trim(),
    fechaPublicacion: (f?.Fecha_Publicacion || '').trim(),
    duracion: (f?.Duracion || '').trim(),
    subtitulos: (f?.Subtitulos || '').trim(),
    notas: (f?.Notas || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.titulo !== undefined) out['Titulo'] = f.titulo;
  if (f.programa !== undefined) out['Programa'] = f.programa;
  if (f.idioma !== undefined) out['Idioma'] = f.idioma;
  if (f.url !== undefined) out['URL'] = f.url;
  if (f.plataforma !== undefined) out['Plataforma'] = f.plataforma;
  if (f.estado !== undefined) out['Estado'] = f.estado;
  if (f.fechaPublicacion !== undefined) out['Fecha_Publicacion'] = f.fechaPublicacion;
  if (f.duracion !== undefined) out['Duracion'] = f.duracion;
  if (f.subtitulos !== undefined) out['Subtitulos'] = f.subtitulos;
  if (f.notas !== undefined) out['Notas'] = f.notas;
  return out;
}

// =====================================================
// API HELPERS
// =====================================================

async function stackbyFetch(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: { 'api-key': API_KEY, 'Content-Type': 'application/json', ...options.headers },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Stackby ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

// =====================================================
// CRUD
// =====================================================

export async function listVideos(filters = {}) {
  let all = [], offset = 0;
  while (true) {
    const data = await stackbyFetch(
      `/rowlist/${STACK_ID}/${TABLE_ID}` + (offset ? `?offset=${offset}` : '')
    );
    const records = Array.isArray(data) ? data : (data.records || []);
    const parsed = records.map(r => ({ id: r.id, ...parseFields(r.field) }));
    all = all.concat(parsed);
    if (records.length < 100) break;
    offset += records.length;
  }

  if (filters.programa) {
    all = all.filter(v => v.programa.toLowerCase().includes(filters.programa.toLowerCase()));
  }
  if (filters.idioma) {
    all = all.filter(v => v.idioma.toLowerCase() === filters.idioma.toLowerCase());
  }
  if (filters.estado) {
    all = all.filter(v => v.estado.toLowerCase() === filters.estado.toLowerCase());
  }
  if (filters.plataforma) {
    all = all.filter(v => v.plataforma.toLowerCase() === filters.plataforma.toLowerCase());
  }

  return all;
}

export async function findByTitulo(titulo) {
  const all = await listVideos();
  const target = titulo.toLowerCase().trim();
  return all.filter(v => v.titulo.toLowerCase().includes(target));
}

export async function createVideo(data) {
  const fields = toStackbyFields({
    titulo: data.titulo,
    programa: data.programa || '',
    idioma: data.idioma || 'es',
    url: data.url || '',
    plataforma: data.plataforma || '',
    estado: data.estado || VIDEO_ESTADOS.BORRADOR,
    duracion: data.duracion || '',
    subtitulos: data.subtitulos || '',
    notas: data.notas || '',
  });

  const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: fields }] }),
  });
  const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);
  return { id: created.id, ...parseFields(created.field) };
}

export async function updateVideo(id, updates) {
  const fields = toStackbyFields(updates);
  await stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id, field: fields }] }),
  });
  return { success: true, id, ...updates };
}

export async function getStats() {
  const all = await listVideos();
  const byPrograma = {}, byIdioma = {}, byEstado = {}, byPlataforma = {};

  for (const v of all) {
    if (v.programa) byPrograma[v.programa] = (byPrograma[v.programa] || 0) + 1;
    byIdioma[v.idioma] = (byIdioma[v.idioma] || 0) + 1;
    byEstado[v.estado] = (byEstado[v.estado] || 0) + 1;
    if (v.plataforma) byPlataforma[v.plataforma] = (byPlataforma[v.plataforma] || 0) + 1;
  }

  return { total: all.length, byPrograma, byIdioma, byEstado, byPlataforma };
}

export function generateEmbed(video) {
  if (video.plataforma === 'youtube' && video.url) {
    const id = video.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)?.[1];
    if (id) return `<iframe width="560" height="315" src="https://www.youtube.com/embed/${id}" frameborder="0" allowfullscreen></iframe>`;
  }
  if (video.plataforma === 'vimeo' && video.url) {
    const id = video.url.match(/vimeo\.com\/(\d+)/)?.[1];
    if (id) return `<iframe width="560" height="315" src="https://player.vimeo.com/video/${id}" frameborder="0" allowfullscreen></iframe>`;
  }
  return `<a href="${video.url}">${video.titulo}</a>`;
}

// =====================================================
// CLI
// =====================================================

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 && idx + 1 < process.argv.length ? process.argv[idx + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const command = args.find(a => !a.startsWith('--'));

  if (!command || command === 'help' || args.includes('--help')) {
    console.log(`
Videos Client IITD (N31) — Catálogo multidioma

Comandos:
  list [--programa X] [--idioma X] [--estado X]   Listar videos
  create --titulo X --programa Y [--idioma es]     Crear video
  find --titulo X                                  Buscar por titulo
  embed --id X                                     Generar embed HTML
  stats                                            Estadísticas de cobertura

Estados: borrador, produccion, publicado, retirado
Plataformas: youtube, vimeo, drive, otra
Idiomas: es, en, fr, pt, it
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
  if (!TABLE_ID) { console.error('Error: STACKBY_VIDEOS_TABLE_ID no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--programa')) filters.programa = getArg('--programa');
    if (getArg('--idioma')) filters.idioma = getArg('--idioma');
    if (getArg('--estado')) filters.estado = getArg('--estado');

    const videos = await listVideos(filters);
    if (videos.length === 0) { console.log('No hay videos.'); return; }

    console.log(`\nVideos (${videos.length}):\n`);
    console.log(`  ${'Titulo'.padEnd(40)}  ${'Programa'.padEnd(25)}  ${'Idioma'.padEnd(6)}  ${'Estado'.padEnd(12)}  Plataforma`);
    console.log(`  ${'-'.repeat(40)}  ${'-'.repeat(25)}  ${'-'.repeat(6)}  ${'-'.repeat(12)}  ----------`);
    for (const v of videos) {
      console.log(`  ${v.titulo.substring(0, 40).padEnd(40)}  ${v.programa.substring(0, 25).padEnd(25)}  ${v.idioma.padEnd(6)}  ${v.estado.padEnd(12)}  ${v.plataforma}`);
    }
    console.log();
    return;
  }

  if (command === 'create') {
    const titulo = getArg('--titulo');
    if (!titulo) { console.error('Error: --titulo es requerido'); process.exit(1); }

    const result = await createVideo({
      titulo,
      programa: getArg('--programa') || '',
      idioma: getArg('--idioma') || 'es',
      url: getArg('--url') || '',
      plataforma: getArg('--plataforma') || '',
      duracion: getArg('--duracion') || '',
    });
    console.log(`Video creado: ${result.titulo} (${result.idioma})`);
    return;
  }

  if (command === 'find') {
    const titulo = getArg('--titulo');
    if (!titulo) { console.error('Error: --titulo es requerido'); process.exit(1); }

    const videos = await findByTitulo(titulo);
    if (videos.length === 0) { console.log(`No encontrado: ${titulo}`); return; }

    for (const v of videos) {
      console.log(`\n  ${v.titulo} (${v.idioma})`);
      console.log(`    Programa: ${v.programa}`);
      console.log(`    Estado: ${v.estado}`);
      console.log(`    URL: ${v.url}`);
      if (v.duracion) console.log(`    Duracion: ${v.duracion}`);
      if (v.subtitulos) console.log(`    Subtitulos: ${v.subtitulos}`);
    }
    console.log();
    return;
  }

  if (command === 'stats') {
    const stats = await getStats();
    console.log(`\nVideos — Estadísticas de cobertura\n`);
    console.log(`  Total videos: ${stats.total}`);
    console.log(`\n  Por programa:`);
    for (const [k, v] of Object.entries(stats.byPrograma)) console.log(`    ${k}: ${v}`);
    console.log(`\n  Por idioma:`);
    for (const [k, v] of Object.entries(stats.byIdioma)) console.log(`    ${k}: ${v}`);
    console.log(`\n  Por estado:`);
    for (const [k, v] of Object.entries(stats.byEstado)) console.log(`    ${k}: ${v}`);
    if (Object.keys(stats.byPlataforma).length > 0) {
      console.log(`\n  Por plataforma:`);
      for (const [k, v] of Object.entries(stats.byPlataforma)) console.log(`    ${k}: ${v}`);
    }
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}". Usa --help para ver opciones.`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('videos-client.mjs') ||
  process.argv[1].endsWith('videos-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
