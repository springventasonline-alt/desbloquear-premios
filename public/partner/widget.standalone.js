/**
 * Desbloquear Premios — Widget para Tiendanube Partner Portal
 * Subir este archivo (o widget.min.js) como versión del script en partners.tiendanube.com
 * API: https://desbloquear-premios-production.up.railway.app/api/widget/{storeId}
 */
(function () {
  'use strict';

  var APP_BASE = 'https://desbloquear-premios-production.up.railway.app';
  var CONTAINER_ID = 'dpp-rewards-bar-root';
  var POLL_INTERVAL = 1500;

  function getStoreId() {
    if (window.LS && window.LS.store && window.LS.store.id) {
      return String(window.LS.store.id);
    }
    var script = document.currentScript;
    if (script && script.src) {
      var match = script.src.match(/[?&]store=(\d+)/);
      if (match) return match[1];
    }
    var scripts = document.getElementsByTagName('script');
    for (var i = scripts.length - 1; i >= 0; i--) {
      var m = scripts[i].src && scripts[i].src.match(/[?&]store=(\d+)/);
      if (m) return m[1];
    }
    return null;
  }

  function formatMoney(cents, currency) {
    var amount = cents / 100;
    var separator = (currency && currency.cents_separator) || ',';
    var thousands = (currency && currency.thousands_separator) || '.';
    var parts = amount.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    var formatted = parts.join(separator);
    if (currency && currency.display_short) {
      return currency.display_short
        .replace('{{amount}}', formatted)
        .replace('{{amount_no_decimals}}', parts[0]);
    }
    return '$' + formatted;
  }

  function interpolate(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return vars[key] != null ? vars[key] : '';
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getCartSubtotal() {
    if (window.LS && window.LS.cart && typeof window.LS.cart.subtotal === 'number') {
      return window.LS.cart.subtotal / 100;
    }
    return 0;
  }

  function findCartContainer() {
    var selectors = [
      '#modal-cart .modal-body',
      '.js-ajax-cart-panel',
      '.js-cart-drawer',
      '.cart-summary',
      '[data-store="cart-summary"]',
      '.cart-widget',
      'form[action*="cart"]',
      '.cart-container',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function computeProgress(cartTotal, levels) {
    var sorted = levels.slice().sort(function (a, b) {
      return a.order - b.order;
    });
    var unlocked = [];
    var next = null;
    for (var i = 0; i < sorted.length; i++) {
      if (cartTotal >= sorted[i].threshold) {
        unlocked.push(sorted[i]);
      } else if (!next) {
        next = sorted[i];
      }
    }
    var maxThreshold = sorted.length ? sorted[sorted.length - 1].threshold : 0;
    var progressPercent = maxThreshold > 0 ? Math.min(100, (cartTotal / maxThreshold) * 100) : 0;
    return { unlocked: unlocked, next: next, progressPercent: progressPercent };
  }

  function buildStyles(config) {
    return [
      '#dpp-rewards-bar-root{font-family:' + config.typography.fontFamily + ';margin:12px 0}',
      '.dpp-bar{background:' + config.colors.secondary + ';border-radius:12px;padding:14px 16px;color:' + config.colors.text + '}',
      '.dpp-title{font-size:15px;font-weight:700;margin:0 0 10px}',
      '.dpp-track{background:rgba(0,0,0,.08);border-radius:999px;height:10px;overflow:hidden}',
      '.dpp-fill{background:linear-gradient(90deg,' + config.colors.primary + ',' + config.colors.accent + ');height:100%;border-radius:999px;transition:width .35s ease}',
      '.dpp-message{font-size:13px;margin-top:10px;line-height:1.4}',
      '.dpp-levels{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}',
      '.dpp-level{flex:1;min-width:80px;text-align:center;padding:8px 6px;border-radius:8px;background:rgba(255,255,255,.6);font-size:11px;opacity:.55;transition:all .25s ease}',
      '.dpp-level.is-unlocked{opacity:1;background:' + config.colors.accent + '22;border:1px solid ' + config.colors.accent + '}',
      '.dpp-level-icon{font-size:18px;display:block;margin-bottom:4px}',
      '.dpp-level-title{font-weight:600}',
    ].join('');
  }

  function renderBar(config, cartTotal) {
    var progress = computeProgress(cartTotal, config.levels);
    var currency = window.LS && window.LS.currency;
    var message;
    if (progress.unlocked.length === config.levels.length) {
      message = config.texts.allUnlocked;
    } else if (progress.next) {
      var remaining = Math.max(0, progress.next.threshold - cartTotal);
      message = interpolate(config.texts.progress, {
        amount: formatMoney(remaining * 100, currency),
        reward: progress.next.title,
      });
    } else {
      message = config.texts.title;
    }
    var levelsHtml = config.levels
      .map(function (level) {
        var isUnlocked = cartTotal >= level.threshold;
        return (
          '<div class="dpp-level' +
          (isUnlocked ? ' is-unlocked' : '') +
          '"><span class="dpp-level-icon">' +
          escapeHtml(level.icon) +
          '</span><span class="dpp-level-title">' +
          escapeHtml(level.title) +
          '</span><span>' +
          formatMoney(level.threshold * 100, currency) +
          '</span></div>'
        );
      })
      .join('');
    return (
      '<div class="dpp-bar"><p class="dpp-title">' +
      escapeHtml(config.texts.title) +
      '</p><div class="dpp-track"><div class="dpp-fill" style="width:' +
      progress.progressPercent.toFixed(1) +
      '%"></div></div><p class="dpp-message">' +
      escapeHtml(message) +
      '</p><div class="dpp-levels">' +
      levelsHtml +
      '</div></div>'
    );
  }

  function mount(config) {
    var container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      var target = findCartContainer();
      if (target) {
        target.insertBefore(container, target.firstChild);
      } else {
        document.body.appendChild(container);
      }
    }
    var styleId = 'dpp-rewards-bar-styles';
    if (!document.getElementById(styleId)) {
      var style = document.createElement('style');
      style.id = styleId;
      style.textContent = buildStyles(config);
      document.head.appendChild(style);
    }
    container.innerHTML = renderBar(config, getCartSubtotal());
  }

  function fetchConfig(storeId) {
    return fetch(APP_BASE + '/api/widget/' + storeId, { credentials: 'omit' }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    });
  }

  function init() {
    var storeId = getStoreId();
    if (!storeId) {
      console.warn('[DPP] No se detectó store ID');
      return;
    }
    fetchConfig(storeId)
      .then(function (config) {
        if (!config || !config.enabled) return;
        mount(config);
        var lastTotal = getCartSubtotal();
        setInterval(function () {
          var current = getCartSubtotal();
          if (current !== lastTotal) {
            lastTotal = current;
            mount(config);
          }
        }, POLL_INTERVAL);
        document.addEventListener('cart.updated', function () {
          mount(config);
        });
      })
      .catch(function (err) {
        console.warn('[DPP] Widget no cargado:', err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
