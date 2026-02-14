#!/usr/bin/env node

/**
 * Google Grants Report — IITD (N37)
 *
 * Dashboard de rendimiento de campañas Google Grants.
 * Correlaciona ads → leads → inscripciones usando UTM tracking.
 *
 * Usage:
 *   node google-grants-report.mjs --campaigns                 # Campañas activas
 *   node google-grants-report.mjs --performance [--period month|week]
 *   node google-grants-report.mjs --conversions               # Correlación ads→inscripciones
 *   node google-grants-report.mjs --sheet                     # Subir a Panel IITD
 *   node google-grants-report.mjs --alert                     # Alertar si KPIs fuera rango
 *   node google-grants-report.mjs --report                    # Informe completo
 *
 * Env vars (.env):
 *   STACKBY_API_KEY, STACKBY_STACK_ID, STACKBY_CAMPAIGNS_TABLE_ID
 *   STACKBY_LEADS_TABLE_ID (opcional, para correlación)
 *   GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN (futuro, para API directa)
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

// =====================================================
// IMPORTS (lazy)
// =====================================================

let campaignsClient = null;
let leadsClient = null;

async function loadDeps() {
  if (!campaignsClient) {
    campaignsClient = await import('../compartido/campaigns-client.mjs');
  }
}

async function loadLeads() {
  if (!leadsClient) {
    try {
      leadsClient = await import('../compartido/leads-client.mjs');
    } catch { /* leads table may not exist yet */ }
  }
}

// =====================================================
// ALERT THRESHOLDS
// =====================================================

const THRESHOLDS = {
  MIN_CTR: 2.0,      // % — Google Grants requires >5% but we alert early
  MAX_CPA: 50.0,     // EUR
  MIN_IMPRESSIONS_WEEK: 100,
};

// =====================================================
// CAMPAIGNS — Listar campañas activas
// =====================================================

async function showCampaigns() {
  await loadDeps();

  const activas = await campaignsClient.listCampaigns({ status: 'activa' });
  const pausadas = await campaignsClient.listCampaigns({ status: 'pausada' });

  console.log(`\nCampañas Google Grants\n`);

  if (activas.length > 0) {
    console.log(`  ACTIVAS (${activas.length}):`);
    for (const c of activas) {
      console.log(`    ${c.campaignName}`);
      console.log(`      Impresiones: ${c.impressions.toLocaleString()} | Clicks: ${c.clicks} | CTR: ${c.ctr || '-'} | Conv: ${c.conversions}`);
    }
  }

  if (pausadas.length > 0) {
    console.log(`\n  PAUSADAS (${pausadas.length}):`);
    for (const c of pausadas) {
      console.log(`    ${c.campaignName} (desde ${c.endDate || '?'})`);
    }
  }

  if (activas.length === 0 && pausadas.length === 0) {
    console.log('  No hay campañas registradas.');
  }
  console.log();
}

// =====================================================
// PERFORMANCE — Rendimiento general
// =====================================================

async function showPerformance() {
  await loadDeps();

  const stats = await campaignsClient.getStats();
  const grants = await campaignsClient.listCampaigns({ platform: 'google_grants' });

  const grantsStats = {
    total: grants.length,
    activas: grants.filter(c => c.status === 'activa').length,
    impressions: grants.reduce((s, c) => s + c.impressions, 0),
    clicks: grants.reduce((s, c) => s + c.clicks, 0),
    conversions: grants.reduce((s, c) => s + c.conversions, 0),
  };
  grantsStats.ctr = grantsStats.impressions > 0
    ? ((grantsStats.clicks / grantsStats.impressions) * 100).toFixed(2) + '%'
    : '0%';

  console.log(`
========================================
  GOOGLE GRANTS — Rendimiento
  ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
========================================

  Google Grants:
    Campañas activas:    ${grantsStats.activas} / ${grantsStats.total}
    Impresiones:         ${grantsStats.impressions.toLocaleString()}
    Clicks:              ${grantsStats.clicks.toLocaleString()}
    CTR:                 ${grantsStats.ctr}
    Conversiones:        ${grantsStats.conversions}

  Todas las plataformas:
    Total campañas:      ${stats.total}
    Impresiones:         ${stats.totalImpressions.toLocaleString()}
    Clicks:              ${stats.totalClicks.toLocaleString()}
    CTR medio:           ${stats.avgCTR}
    Conversiones:        ${stats.totalConversions}
    CPA medio:           ${stats.avgCPA} EUR

========================================
`);
}

// =====================================================
// CONVERSIONS — Correlación ads → leads → inscripciones
// =====================================================

async function showConversions() {
  await loadDeps();
  await loadLeads();

  const campaigns = await campaignsClient.listCampaigns({ platform: 'google_grants' });

  console.log(`\nCorrelación Google Grants → Conversiones\n`);

  // From campaigns data
  const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0);
  const totalConversions = campaigns.reduce((s, c) => s + c.conversions, 0);

  console.log(`  Desde campañas:`);
  console.log(`    Clicks totales:      ${totalClicks}`);
  console.log(`    Conversiones:        ${totalConversions}`);
  console.log(`    Tasa click→conv:     ${totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) + '%' : '-'}`);

  // From leads (if available)
  if (leadsClient) {
    try {
      const leads = await leadsClient.listLeads();
      const googleLeads = leads.filter(l =>
        l.utmSource === 'google' || l.utmSource === 'google_grants'
      );
      const convertidos = googleLeads.filter(l => l.estado === 'convertido');

      console.log(`\n  Desde leads (UTM tracking):`);
      console.log(`    Leads de Google:     ${googleLeads.length}`);
      console.log(`    Convertidos:         ${convertidos.length}`);
      console.log(`    Tasa lead→conv:      ${googleLeads.length > 0 ? ((convertidos.length / googleLeads.length) * 100).toFixed(1) + '%' : '-'}`);
    } catch { /* leads table may not exist */ }
  }

  console.log();
}

// =====================================================
// SHEET — Subir datos a Panel IITD
// =====================================================

async function uploadToSheet() {
  await loadDeps();

  const PANEL_SHEET_ID = process.env.PANEL_IITD_SHEET_ID || '1JpEOMbu4JHjaaVqi5SZm0DienoiUl_0Q4uzdqt5RJUs';

  console.log('Cargando campañas...');
  const campaigns = await campaignsClient.listCampaigns();
  const grants = campaigns.filter(c => c.platform === 'google_grants');

  const rows = grants.map(c => [
    c.campaignName,
    c.status,
    c.impressions,
    c.clicks,
    c.ctr || '',
    c.conversions,
    c.cpa || '',
    c.startDate || '',
    c.endDate || '',
  ]);

  // Summary row
  const totalImpr = grants.reduce((s, c) => s + c.impressions, 0);
  const totalClicks = grants.reduce((s, c) => s + c.clicks, 0);
  const totalConv = grants.reduce((s, c) => s + c.conversions, 0);
  rows.push(['TOTAL', '', totalImpr, totalClicks,
    totalImpr > 0 ? ((totalClicks / totalImpr) * 100).toFixed(2) + '%' : '',
    totalConv, '', '', '']);

  console.log(`Preparados ${rows.length} filas (${grants.length} campañas + total)`);
  console.log(`Sheet destino: ${PANEL_SHEET_ID} (pestaña "Google Grants")`);
  console.log('\nNota: La subida a Sheets requiere el módulo google-auth.');
  console.log('Por ahora, los datos están disponibles via --report para copiar manualmente.');
}

// =====================================================
// ALERT — Alertas de KPIs
// =====================================================

async function checkAlerts() {
  await loadDeps();

  const activas = await campaignsClient.listCampaigns({ status: 'activa' });
  let alertCount = 0;

  console.log(`\nVerificando alertas (${activas.length} campañas activas)...\n`);

  for (const c of activas) {
    const ctr = c.impressions > 0 ? (c.clicks / c.impressions) * 100 : 0;
    const cpa = c.conversions > 0 ? c.budget / c.conversions : 0;

    const alerts = [];
    if (ctr < THRESHOLDS.MIN_CTR && c.impressions > 50) {
      alerts.push(`CTR bajo: ${ctr.toFixed(2)}% (min: ${THRESHOLDS.MIN_CTR}%)`);
    }
    if (cpa > THRESHOLDS.MAX_CPA && c.conversions > 0) {
      alerts.push(`CPA alto: ${cpa.toFixed(2)} EUR (max: ${THRESHOLDS.MAX_CPA} EUR)`);
    }

    if (alerts.length > 0) {
      console.log(`  ALERTA: ${c.campaignName}`);
      for (const a of alerts) {
        console.log(`    - ${a}`);
        alertCount++;
      }
    }
  }

  if (alertCount === 0) {
    console.log('  Todos los KPIs dentro de rango.');
  } else {
    console.log(`\n  ${alertCount} alertas detectadas.`);
  }
  console.log();
  return { alertCount };
}

// =====================================================
// REPORT — Informe completo
// =====================================================

async function fullReport() {
  await showPerformance();
  await showConversions();
  await checkAlerts();
}

// =====================================================
// CLI
// =====================================================

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(`
Google Grants Report IITD (N37) — Dashboard de campañas

Comandos:
  --campaigns              Listar campañas activas
  --performance            Rendimiento general
  --conversions            Correlación ads → leads → inscripciones
  --sheet                  Subir datos a Panel IITD
  --alert                  Verificar alertas de KPIs
  --report                 Informe completo (todo lo anterior)

Umbrales de alerta:
  CTR mínimo:  ${THRESHOLDS.MIN_CTR}%
  CPA máximo:  ${THRESHOLDS.MAX_CPA} EUR
`);
    return;
  }

  if (args.includes('--campaigns')) { await showCampaigns(); return; }
  if (args.includes('--performance')) { await showPerformance(); return; }
  if (args.includes('--conversions')) { await showConversions(); return; }
  if (args.includes('--sheet')) { await uploadToSheet(); return; }
  if (args.includes('--alert')) { await checkAlerts(); return; }
  if (args.includes('--report')) { await fullReport(); return; }

  console.error('Opción no reconocida. Usa --help.');
  process.exit(1);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
