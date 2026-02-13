/**
 * Cookie Banner — IITD (N41)
 *
 * Banner de consentimiento de cookies conforme al RGPD y la LSSI.
 * Autocontenido: JS + CSS inline. Sin dependencias externas.
 *
 * Instalacion en WordPress:
 *   Opcion A: Appearance > Customize > Additional CSS/JS
 *   Opcion B: Plugin "Insert Headers and Footers" > Footer
 *   Opcion C: Copiar este script en un <script> antes de </body>
 *
 * Funcionamiento:
 *   - Muestra banner en la primera visita
 *   - Almacena preferencia en localStorage (key: iitd_cookie_consent)
 *   - Bloquea GA4 / analytics hasta que el usuario acepte
 *   - Enlace "Configurar cookies" permite cambiar preferencia
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'iitd_cookie_consent';
  var GA_MEASUREMENT_ID = ''; // Rellenar con el ID de GA4 si se usa (ej: G-XXXXXXXXXX)

  // =====================================================
  // CSS
  // =====================================================
  var css = [
    '#iitd-cookie-banner{position:fixed;bottom:0;left:0;right:0;z-index:99999;',
    'background:#1a1a2e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    'font-size:14px;line-height:1.5;padding:16px 24px;box-shadow:0 -2px 10px rgba(0,0,0,.3);',
    'display:flex;flex-wrap:wrap;align-items:center;gap:12px 24px}',
    '#iitd-cookie-banner p{margin:0;flex:1 1 300px}',
    '#iitd-cookie-banner a{color:#7ec8e3;text-decoration:underline}',
    '#iitd-cookie-banner .iitd-cb-btns{display:flex;gap:8px;flex-wrap:wrap}',
    '#iitd-cookie-banner button{border:none;border-radius:4px;padding:8px 18px;cursor:pointer;',
    'font-size:14px;font-weight:600;transition:opacity .2s}',
    '#iitd-cookie-banner button:hover{opacity:.85}',
    '#iitd-cb-accept{background:#4CAF50;color:#fff}',
    '#iitd-cb-necessary{background:transparent;color:#fff;border:1px solid #fff}',
    '#iitd-cb-settings{background:transparent;color:#7ec8e3;border:1px solid #7ec8e3}',
    '#iitd-cookie-settings{position:fixed;bottom:0;left:0;right:0;z-index:100000;',
    'background:#1a1a2e;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    'font-size:14px;line-height:1.5;padding:24px;box-shadow:0 -2px 10px rgba(0,0,0,.3);display:none}',
    '#iitd-cookie-settings h3{margin:0 0 12px;font-size:16px}',
    '#iitd-cookie-settings label{display:block;margin:8px 0;cursor:pointer}',
    '#iitd-cookie-settings .iitd-cb-btns{margin-top:16px;display:flex;gap:8px}',
    '#iitd-cookie-settings button{border:none;border-radius:4px;padding:8px 18px;cursor:pointer;',
    'font-size:14px;font-weight:600}',
    '#iitd-cs-save{background:#4CAF50;color:#fff}',
    '#iitd-cs-cancel{background:transparent;color:#fff;border:1px solid #fff}'
  ].join('\n');

  // =====================================================
  // FUNCIONES
  // =====================================================

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setConsent(prefs) {
    prefs.timestamp = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }

  function loadAnalytics() {
    if (!GA_MEASUREMENT_ID) return;
    // Cargar gtag.js solo si el usuario acepto analytics
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID, { anonymize_ip: true });
  }

  function applyConsent(prefs) {
    if (prefs && prefs.analytics) {
      loadAnalytics();
    }
  }

  function removeBanner() {
    var el = document.getElementById('iitd-cookie-banner');
    if (el) el.parentNode.removeChild(el);
    var settings = document.getElementById('iitd-cookie-settings');
    if (settings) settings.parentNode.removeChild(settings);
  }

  function showSettings() {
    document.getElementById('iitd-cookie-banner').style.display = 'none';
    document.getElementById('iitd-cookie-settings').style.display = 'block';
  }

  function hideSettings() {
    document.getElementById('iitd-cookie-settings').style.display = 'none';
    document.getElementById('iitd-cookie-banner').style.display = 'flex';
  }

  // =====================================================
  // RENDER
  // =====================================================

  function showBanner() {
    // Inyectar CSS
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    // Banner principal
    var banner = document.createElement('div');
    banner.id = 'iitd-cookie-banner';
    banner.innerHTML = [
      '<p>Utilizamos cookies propias y de terceros para mejorar tu experiencia. ',
      'Puedes aceptar todas, solo las necesarias o configurar tus preferencias. ',
      '<a href="/politica-de-cookies/">Mas informacion</a></p>',
      '<div class="iitd-cb-btns">',
      '<button id="iitd-cb-accept">Aceptar todas</button>',
      '<button id="iitd-cb-necessary">Solo necesarias</button>',
      '<button id="iitd-cb-settings">Configurar</button>',
      '</div>'
    ].join('');
    document.body.appendChild(banner);

    // Panel de configuracion
    var settings = document.createElement('div');
    settings.id = 'iitd-cookie-settings';
    settings.innerHTML = [
      '<h3>Configurar cookies</h3>',
      '<label><input type="checkbox" checked disabled> <strong>Necesarias</strong> — ',
      'Imprescindibles para el funcionamiento de la web (siempre activas)</label>',
      '<label><input type="checkbox" id="iitd-cs-analytics"> <strong>Analiticas</strong> — ',
      'Nos ayudan a entender como se usa la web (Google Analytics)</label>',
      '<div class="iitd-cb-btns">',
      '<button id="iitd-cs-save">Guardar preferencias</button>',
      '<button id="iitd-cs-cancel">Cancelar</button>',
      '</div>'
    ].join('');
    document.body.appendChild(settings);

    // Event listeners
    document.getElementById('iitd-cb-accept').addEventListener('click', function () {
      setConsent({ necessary: true, analytics: true });
      applyConsent({ analytics: true });
      removeBanner();
    });

    document.getElementById('iitd-cb-necessary').addEventListener('click', function () {
      setConsent({ necessary: true, analytics: false });
      removeBanner();
    });

    document.getElementById('iitd-cb-settings').addEventListener('click', showSettings);
    document.getElementById('iitd-cs-cancel').addEventListener('click', hideSettings);

    document.getElementById('iitd-cs-save').addEventListener('click', function () {
      var analytics = document.getElementById('iitd-cs-analytics').checked;
      var prefs = { necessary: true, analytics: analytics };
      setConsent(prefs);
      applyConsent(prefs);
      removeBanner();
    });
  }

  // =====================================================
  // INIT
  // =====================================================

  // Enlace "Configurar cookies" en footer: anadir clase .iitd-cookie-reopen a cualquier <a>
  document.addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('iitd-cookie-reopen')) {
      e.preventDefault();
      localStorage.removeItem(STORAGE_KEY);
      showBanner();
    }
  });

  var existing = getConsent();
  if (existing) {
    // Ya hay preferencia guardada — aplicar sin mostrar banner
    applyConsent(existing);
  } else {
    // Primera visita — mostrar banner
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
})();
