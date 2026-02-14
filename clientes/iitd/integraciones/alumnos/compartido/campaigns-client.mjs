#!/usr/bin/env node

/**
 * Campaigns Client — IITD (N37)
 *
 * CRUD para la tabla CAMPAIGNS en Stackby.
 * Gestiona campañas de marketing (Google Grants, redes sociales, etc.)
 *
 * Columnas: Campaign_Name, Platform, Budget, Start_Date, End_Date, Status,
 *   Impressions, Clicks, CTR, Conversions, CPA, Notas
 *
 * Usage:
 *   node campaigns-client.mjs list                         # Listar campañas
 *   node campaigns-client.mjs list --platform google_grants
 *   node campaigns-client.mjs create --name X --platform Y
 *   node campaigns-client.mjs update --id X --impressions N --clicks N
 *   node campaigns-client.mjs stats                        # Estadísticas
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_CAMPAIGNS_TABLE_ID
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
const TABLE_ID = process.env.STACKBY_CAMPAIGNS_TABLE_ID || '';
const BASE_URL = 'https://stackby.com/api/betav1';

if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); }
if (!TABLE_ID) { console.error('Error: STACKBY_CAMPAIGNS_TABLE_ID no configurada en .env'); }

// =====================================================
// ENUMS
// =====================================================

export const CAMPAIGN_ESTADOS = {
  ACTIVA: 'activa',
  PAUSADA: 'pausada',
  FINALIZADA: 'finalizada',
  BORRADOR: 'borrador',
};

export const PLATAFORMAS = {
  GOOGLE_GRANTS: 'google_grants',
  GOOGLE_ADS: 'google_ads',
  META: 'meta',
  LINKEDIN: 'linkedin',
  OTRA: 'otra',
};

// =====================================================
// FIELD MAPPING
// =====================================================

function parseFields(f) {
  return {
    campaignName: (f?.Campaign_Name || '').trim(),
    platform: (f?.Platform || '').trim(),
    budget: parseFloat(f?.Budget) || 0,
    startDate: (f?.Start_Date || '').trim(),
    endDate: (f?.End_Date || '').trim(),
    status: (f?.Status || CAMPAIGN_ESTADOS.BORRADOR).trim(),
    impressions: parseInt(f?.Impressions) || 0,
    clicks: parseInt(f?.Clicks) || 0,
    ctr: (f?.CTR || '').trim(),
    conversions: parseInt(f?.Conversions) || 0,
    cpa: parseFloat(f?.CPA) || 0,
    notas: (f?.Notas || '').trim(),
  };
}

function toStackbyFields(f) {
  const out = {};
  if (f.campaignName !== undefined) out['Campaign_Name'] = f.campaignName;
  if (f.platform !== undefined) out['Platform'] = f.platform;
  if (f.budget !== undefined) out['Budget'] = String(f.budget);
  if (f.startDate !== undefined) out['Start_Date'] = f.startDate;
  if (f.endDate !== undefined) out['End_Date'] = f.endDate;
  if (f.status !== undefined) out['Status'] = f.status;
  if (f.impressions !== undefined) out['Impressions'] = String(f.impressions);
  if (f.clicks !== undefined) out['Clicks'] = String(f.clicks);
  if (f.ctr !== undefined) out['CTR'] = f.ctr;
  if (f.conversions !== undefined) out['Conversions'] = String(f.conversions);
  if (f.cpa !== undefined) out['CPA'] = String(f.cpa);
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

export async function listCampaigns(filters = {}) {
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

  if (filters.platform) {
    all = all.filter(c => c.platform.toLowerCase() === filters.platform.toLowerCase());
  }
  if (filters.status) {
    all = all.filter(c => c.status.toLowerCase() === filters.status.toLowerCase());
  }

  return all;
}

export async function createCampaign(data) {
  const fields = toStackbyFields({
    campaignName: data.campaignName,
    platform: data.platform || PLATAFORMAS.GOOGLE_GRANTS,
    budget: data.budget || 0,
    startDate: data.startDate || new Date().toISOString().split('T')[0],
    status: CAMPAIGN_ESTADOS.BORRADOR,
    notas: data.notas || '',
  });

  const result = await stackbyFetch(`/rowcreate/${STACK_ID}/${TABLE_ID}`, {
    method: 'POST',
    body: JSON.stringify({ records: [{ field: fields }] }),
  });
  const created = Array.isArray(result) ? result[0] : (result.records?.[0] || result);
  return { id: created.id, ...parseFields(created.field) };
}

export async function updateCampaign(id, updates) {
  // Auto-calculate CTR and CPA
  if (updates.impressions !== undefined && updates.clicks !== undefined) {
    const impressions = parseInt(updates.impressions) || 0;
    const clicks = parseInt(updates.clicks) || 0;
    updates.ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) + '%' : '0%';
  }
  if (updates.budget !== undefined && updates.conversions !== undefined) {
    const budget = parseFloat(updates.budget) || 0;
    const conversions = parseInt(updates.conversions) || 0;
    updates.cpa = conversions > 0 ? (budget / conversions).toFixed(2) : '0';
  }

  const fields = toStackbyFields(updates);
  await stackbyFetch(`/rowupdate/${STACK_ID}/${TABLE_ID}`, {
    method: 'PATCH',
    body: JSON.stringify({ records: [{ id, field: fields }] }),
  });
  return { success: true, id, ...updates };
}

export async function getStats() {
  const all = await listCampaigns();
  const byPlatform = {}, byStatus = {};
  let totalImpressions = 0, totalClicks = 0, totalConversions = 0, totalBudget = 0;

  for (const c of all) {
    byPlatform[c.platform] = (byPlatform[c.platform] || 0) + 1;
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    totalImpressions += c.impressions;
    totalClicks += c.clicks;
    totalConversions += c.conversions;
    totalBudget += c.budget;
  }

  return {
    total: all.length,
    totalImpressions,
    totalClicks,
    totalConversions,
    totalBudget,
    avgCTR: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) + '%' : '0%',
    avgCPA: totalConversions > 0 ? (totalBudget / totalConversions).toFixed(2) : '0',
    byPlatform,
    byStatus,
  };
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
Campaigns Client IITD (N37) — Google Grants + Marketing

Comandos:
  list [--platform X] [--status X]       Listar campañas
  create --name X --platform Y           Crear campaña
  update --id X --impressions N --clicks N --conversions N
  stats                                  Estadísticas agregadas

Plataformas: google_grants, google_ads, meta, linkedin, otra
Estados: activa, pausada, finalizada, borrador
`);
    return;
  }

  if (!API_KEY) { console.error('Error: STACKBY_API_KEY no configurada'); process.exit(1); }
  if (!TABLE_ID) { console.error('Error: STACKBY_CAMPAIGNS_TABLE_ID no configurada'); process.exit(1); }

  if (command === 'list') {
    const filters = {};
    if (getArg('--platform')) filters.platform = getArg('--platform');
    if (getArg('--status')) filters.status = getArg('--status');

    const campaigns = await listCampaigns(filters);
    if (campaigns.length === 0) { console.log('No hay campañas.'); return; }

    console.log(`\nCampañas (${campaigns.length}):\n`);
    console.log(`  ${'Nombre'.padEnd(30)}  ${'Plataforma'.padEnd(15)}  ${'Estado'.padEnd(12)}  ${'Impr.'.padStart(8)}  ${'Clicks'.padStart(7)}  ${'CTR'.padStart(7)}  ${'Conv.'.padStart(6)}`);
    console.log(`  ${'-'.repeat(30)}  ${'-'.repeat(15)}  ${'-'.repeat(12)}  ${'-'.repeat(8)}  ${'-'.repeat(7)}  ${'-'.repeat(7)}  ${'-'.repeat(6)}`);
    for (const c of campaigns) {
      console.log(`  ${c.campaignName.substring(0, 30).padEnd(30)}  ${c.platform.padEnd(15)}  ${c.status.padEnd(12)}  ${String(c.impressions).padStart(8)}  ${String(c.clicks).padStart(7)}  ${(c.ctr || '-').padStart(7)}  ${String(c.conversions).padStart(6)}`);
    }
    console.log();
    return;
  }

  if (command === 'create') {
    const name = getArg('--name');
    if (!name) { console.error('Error: --name es requerido'); process.exit(1); }

    const result = await createCampaign({
      campaignName: name,
      platform: getArg('--platform') || PLATAFORMAS.GOOGLE_GRANTS,
      budget: parseFloat(getArg('--budget') || '0'),
    });
    console.log(`Campaña creada: ${result.campaignName} (${result.platform})`);
    return;
  }

  if (command === 'update') {
    const id = getArg('--id');
    if (!id) { console.error('Error: --id es requerido'); process.exit(1); }

    const updates = {};
    if (getArg('--impressions')) updates.impressions = parseInt(getArg('--impressions'));
    if (getArg('--clicks')) updates.clicks = parseInt(getArg('--clicks'));
    if (getArg('--conversions')) updates.conversions = parseInt(getArg('--conversions'));
    if (getArg('--budget')) updates.budget = parseFloat(getArg('--budget'));
    if (getArg('--status')) updates.status = getArg('--status');

    const result = await updateCampaign(id, updates);
    console.log(`Campaña actualizada: ${result.id}`);
    return;
  }

  if (command === 'stats') {
    const stats = await getStats();
    console.log(`\nCampaigns — Estadísticas\n`);
    console.log(`  Total campañas:     ${stats.total}`);
    console.log(`  Impresiones:        ${stats.totalImpressions.toLocaleString()}`);
    console.log(`  Clicks:             ${stats.totalClicks.toLocaleString()}`);
    console.log(`  CTR medio:          ${stats.avgCTR}`);
    console.log(`  Conversiones:       ${stats.totalConversions}`);
    console.log(`  CPA medio:          ${stats.avgCPA} EUR`);
    console.log(`  Presupuesto total:  ${stats.totalBudget.toFixed(2)} EUR`);
    console.log(`\n  Por plataforma:`);
    for (const [k, v] of Object.entries(stats.byPlatform)) console.log(`    ${k}: ${v}`);
    console.log(`\n  Por estado:`);
    for (const [k, v] of Object.entries(stats.byStatus)) console.log(`    ${k}: ${v}`);
    console.log();
    return;
  }

  console.error(`Comando desconocido: "${command}".`);
  process.exit(1);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('campaigns-client.mjs') ||
  process.argv[1].endsWith('campaigns-client')
);

if (isMain) {
  main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
}
