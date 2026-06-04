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
  var CREAM_BG = '#faf9f7';
  var SPRING_PRIMARY = '#1a1a1a';
  var SPRING_ACCENT = '#c9a962';

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

  function isCartContext() {
    var path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('/comprar') !== -1 || path.indexOf('/cart') !== -1) return true;
    return !!document.querySelector(
      '#modal-cart.show, #modal-cart.in, .js-ajax-cart-panel.is-open, .js-cart-drawer.is-open'
    );
  }

  function shouldShowInCart(config) {
    if (!config.visibility || config.visibility.cart !== false) return true;
    return false;
  }

  function normalizeBrandColors(colors) {
    var primary = (colors && colors.primary) || SPRING_PRIMARY;
    var accent = (colors && colors.accent) || SPRING_ACCENT;
    var secondary = (colors && colors.secondary) || CREAM_BG;
    var text = (colors && colors.text) || SPRING_PRIMARY;
    var p = String(primary).toLowerCase();
    if (p === '#ff0000' || p === '#f00' || p === 'red') {
      primary = SPRING_PRIMARY;
      if (String(accent).toLowerCase() === '#000000') accent = SPRING_ACCENT;
    }
    return { primary: primary, accent: accent, secondary: secondary, text: text };
  }

  function formatMoney(cents, currency) {
    var amount = cents / 100;
    var separator = (currency && currency.cents_separator) || ',';
    var thousands = (currency && currency.thousands_separator) || '.';
    var parts = amount.toFixed(0).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    var formatted = parts[0];
    if (currency && currency.display_short) {
      return currency.display_short
        .replace('{{amount}}', formatted)
        .replace('{{amount_no_decimals}}', formatted);
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

  function capitalizeFirst(str) {
    var s = String(str || '').trim();
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
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
      'form[action*="cart"]',
      '[data-store="cart-form"]',
      '.cart-page',
      '.cart-summary',
      '[data-store="cart-summary"]',
      '.cart-widget',
      '.cart-container',
    ];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  }

  function findInsertAnchor() {
    var scopes = [];
    var form = document.querySelector('form[action*="cart"], [data-store="cart-form"]');
    if (form) scopes.push(form);
    var modal = document.querySelector('#modal-cart .modal-body');
    if (modal) scopes.push(modal);
    var panel = findCartContainer();
    if (panel && scopes.indexOf(panel) === -1) scopes.push(panel);

    var totalSelectors =
      '.cart-totals, .js-cart-totals, [data-store="cart-totals"], .cart-summary-totals, .cart-total, .subtotal-container, .total-price';

    for (var s = 0; s < scopes.length; s++) {
      var scope = scopes[s];
      var totals = scope.querySelector(totalSelectors);
      if (totals && totals.parentNode) {
        return { parent: totals.parentNode, before: totals };
      }
      var items = scope.querySelector(
        '.cart-items, .js-cart-items, [data-store="cart-items"], table.cart, .cart-item-list'
      );
      if (items && items.parentNode) {
        return { parent: items.parentNode, before: items.nextSibling };
      }
    }

    var headings = document.querySelectorAll('h1, h2');
    for (var h = 0; h < headings.length; h++) {
      if (/carrito/i.test(headings[h].textContent || '')) {
        return { parent: headings[h].parentNode, before: headings[h].nextSibling };
      }
    }
    return null;
  }

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) {
      h = h
        .split('')
        .map(function (c) {
          return c + c;
        })
        .join('');
    }
    if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function luminance(rgb) {
    var channels = [rgb.r, rgb.g, rgb.b].map(function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function contrastRatio(lumA, lumB) {
    var lighter = Math.max(lumA, lumB);
    var darker = Math.min(lumA, lumB);
    return (lighter + 0.05) / (darker + 0.05);
  }

  /** Tarjeta clara legible sobre paneles claros u oscuros del carrito. */
  function resolveBarTheme(config) {
    var colors = normalizeBrandColors(config.colors);
    var primary = colors.primary;
    var accent = colors.accent;
    var secondary = colors.secondary;
    var text = colors.text;

    var secRgb = hexToRgb(secondary);
    var textRgb = hexToRgb(text);
    var secLum = secRgb ? luminance(secRgb) : 0.95;
    var textLum = textRgb ? luminance(textRgb) : 0.1;

    var barBg = CREAM_BG;
    var barText = SPRING_PRIMARY;

    if (secLum >= 0.5 && textRgb && contrastRatio(secLum, textLum) >= 4.5) {
      barBg = secondary;
      barText = text;
    }

    var isDarkBar = luminance(hexToRgb(barBg) || { r: 250, g: 249, b: 247 }) < 0.45;

    return {
      primary: primary,
      accent: accent,
      barBg: barBg,
      barText: barText,
      isDarkBar: isDarkBar,
      trackBg: isDarkBar ? 'rgba(255,255,255,0.28)' : 'rgba(26,26,26,0.12)',
      levelBg: isDarkBar ? 'rgba(255,255,255,0.14)' : 'rgba(26,26,26,0.05)',
      levelMuted: isDarkBar ? 'rgba(255,255,255,0.78)' : 'rgba(26,26,26,0.55)',
      levelUnlockedBg: isDarkBar ? 'rgba(255,255,255,0.22)' : 'rgba(201,169,98,0.18)',
      levelUnlockedBorder: isDarkBar ? 'rgba(255,255,255,0.55)' : accent,
    };
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
    var t = resolveBarTheme(config);
    var font = config.typography.fontFamily || "'Montserrat', sans-serif";
    return [
      '#dpp-rewards-bar-root{font-family:' + font + ';margin:16px 0 20px;color:' + t.barText + ';width:100%;box-sizing:border-box}',
      '#dpp-rewards-bar-root .dpp-bar{background:' + t.barBg + '!important;color:' + t.barText + '!important;border-radius:10px;padding:16px;border:1px solid rgba(26,26,26,0.1);box-shadow:0 2px 12px rgba(0,0,0,0.06)}',
      '#dpp-rewards-bar-root .dpp-title{font-size:16px;font-weight:700;margin:0 0 12px;color:inherit;letter-spacing:0.02em}',
      '#dpp-rewards-bar-root .dpp-track{background:' + t.trackBg + ';border-radius:999px;height:8px;overflow:hidden}',
      '#dpp-rewards-bar-root .dpp-fill{background:linear-gradient(90deg,' + t.primary + ',' + t.accent + ');height:100%;border-radius:999px;transition:width .35s ease;min-width:2%}',
      '#dpp-rewards-bar-root .dpp-message{font-size:14px;margin-top:12px;line-height:1.45;color:inherit}',
      '#dpp-rewards-bar-root .dpp-levels{display:grid;grid-template-columns:repeat(auto-fit,minmax(72px,1fr));gap:8px;margin-top:14px}',
      '#dpp-rewards-bar-root .dpp-level{text-align:center;padding:10px 6px;border-radius:8px;background:' + t.levelBg + ';color:' + t.levelMuted + ';font-size:11px;line-height:1.3}',
      '#dpp-rewards-bar-root .dpp-level.is-unlocked{color:' + t.barText + ';background:' + t.levelUnlockedBg + ';border:1px solid ' + t.levelUnlockedBorder + '}',
      '#dpp-rewards-bar-root .dpp-level-icon{font-size:20px;display:block;margin-bottom:4px}',
      '#dpp-rewards-bar-root .dpp-level-title{font-weight:600;color:inherit;display:block}',
      '#dpp-rewards-bar-root .dpp-level-meta{font-size:10px;margin-top:4px;opacity:0.85;display:block}',
      '@media (max-width:480px){#dpp-rewards-bar-root .dpp-title{font-size:15px}#dpp-rewards-bar-root .dpp-message{font-size:13px}#dpp-rewards-bar-root .dpp-levels{grid-template-columns:repeat(2,1fr)}}',
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
        reward: capitalizeFirst(progress.next.title),
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
          escapeHtml(capitalizeFirst(level.title)) +
          '</span><span class="dpp-level-meta">Desde ' +
          escapeHtml(formatMoney(level.threshold * 100, currency)) +
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

  function placeContainer(container) {
    var anchor = findInsertAnchor();
    if (anchor && anchor.parent) {
      anchor.parent.insertBefore(container, anchor.before);
      return;
    }
    var target = findCartContainer();
    if (target) {
      target.insertBefore(container, target.firstChild);
      return;
    }
    document.body.appendChild(container);
  }

  function isCartPanelOpen() {
    return !!document.querySelector(
      '#modal-cart.show, #modal-cart.in, #modal-cart.open, .js-ajax-cart-panel.is-open, .js-cart-drawer.is-open'
    );
  }

  function mount(config) {
    if (!shouldShowInCart(config)) return;
    if (!isCartContext() && !isCartPanelOpen()) {
      var hidden = document.getElementById(CONTAINER_ID);
      if (hidden) hidden.remove();
      return;
    }

    var container = document.getElementById(CONTAINER_ID);
    if (!container) {
      container = document.createElement('div');
      container.id = CONTAINER_ID;
      placeContainer(container);
    } else {
      placeContainer(container);
    }

    var styleId = 'dpp-rewards-bar-styles';
    var style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = buildStyles(config);
    container.innerHTML = renderBar(config, getCartSubtotal());
  }

  function prepareConfig(raw) {
    var colors = normalizeBrandColors(raw.colors || {});
    return {
      enabled: raw.enabled,
      visibility: raw.visibility || { cart: true, checkout: true },
      colors: colors,
      typography: raw.typography || { fontFamily: "'Montserrat', sans-serif" },
      texts: raw.texts || {},
      levels: raw.levels || [],
    };
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
      .then(function (raw) {
        if (!raw || !raw.enabled) return;
        var config = prepareConfig(raw);
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
