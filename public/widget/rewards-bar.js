(function () {
  'use strict';

  var APP_BASE = window.DPP_APP_URL || 'http://localhost:3000';
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
    return null;
  }

  function formatMoney(cents, currency) {
    var amount = cents / 100;
    var thousands = (currency && currency.thousands_separator) || '.';
    var parts = amount.toFixed(0).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, thousands);
    var formatted = parts[0];

    if (currency && currency.display_short) {
      var tpl = String(currency.display_short);
      if (/\{\{/.test(tpl)) {
        return tpl
          .replace(/\{\{amount_no_decimals\}\}/g, formatted)
          .replace(/\{\{amount_with_comma_separator\}\}/g, formatted)
          .replace(/\{\{amount\}\}/g, formatted);
      }
      return tpl.trim() + formatted;
    }
    return '$' + formatted;
  }

  function interpolate(template, vars) {
    return template.replace(/\{\{(\w+)\}\}/g, function (_, key) {
      return vars[key] != null ? vars[key] : '';
    });
  }

  function cleanLevelTitle(title) {
    return String(title || '')
      .replace(/\s*\$\s*$/, '')
      .trim();
  }

  function normalizeProgressMessage(template, amountFormatted, rewardTitle) {
    var tpl = String(template || '');
    tpl = tpl.replace(/Agregá\s*\$\s*más/gi, 'Agregá {{amount}} más');
    tpl = tpl.replace(/Te faltan\s*\$\s*para/gi, 'Te faltan {{amount}} para');
    tpl = tpl.replace(/\$\s*(?=más|para)/gi, '{{amount}} ');
    return interpolate(tpl, {
      amount: amountFormatted,
      reward: rewardTitle,
    });
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

  function hexToRgb(hex) {
    var h = String(hex || '').replace('#', '').trim();
    if (h.length === 3) {
      h = h.split('').map(function (c) { return c + c; }).join('');
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

  function resolveBarTheme(config) {
    var primary = config.colors.primary || '#c41e2a';
    var accent = config.colors.accent || primary;
    var secondary = config.colors.secondary || '#ffffff';
    var text = config.colors.text || '#111827';

    var secRgb = hexToRgb(secondary);
    var textRgb = hexToRgb(text);
    var primRgb = hexToRgb(primary);

    var secLum = secRgb ? luminance(secRgb) : 0.95;
    var textLum = textRgb ? luminance(textRgb) : 0.1;
    var primLum = primRgb ? luminance(primRgb) : 0.2;

    var barBg = '#ffffff';
    var barText = '#111827';

    if (secLum < 0.45 && contrastRatio(secLum, textLum) >= 4.5) {
      barBg = secondary;
      barText = text;
    } else if (primLum < 0.4) {
      barBg = primary;
      barText = '#ffffff';
    } else if (secLum >= 0.55 && contrastRatio(secLum, textLum) >= 4.5) {
      barBg = secondary;
      barText = text;
    }

    var isDarkBar = luminance(hexToRgb(barBg) || { r: 255, g: 255, b: 255 }) < 0.45;

    return {
      primary: primary,
      accent: accent,
      barBg: barBg,
      barText: barText,
      isDarkBar: isDarkBar,
      trackBg: isDarkBar ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.1)',
      levelBg: isDarkBar ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.05)',
      levelMuted: isDarkBar ? 'rgba(255,255,255,0.75)' : 'rgba(17,24,39,0.65)',
      levelUnlockedBg: isDarkBar ? 'rgba(255,255,255,0.22)' : accent + '18',
      levelUnlockedBorder: isDarkBar ? 'rgba(255,255,255,0.55)' : accent,
    };
  }

  function computeProgress(cartTotal, levels) {
    var sorted = levels.slice().sort(function (a, b) { return a.order - b.order; });
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

    return { unlocked: unlocked, next: next, progressPercent: progressPercent, maxThreshold: maxThreshold };
  }

  function buildStyles(config) {
    var t = resolveBarTheme(config);
    return [
      '#dpp-rewards-bar-root { font-family: ' + config.typography.fontFamily + '; margin: 12px 0; color: ' + t.barText + '; }',
      '#dpp-rewards-bar-root .dpp-bar { background: ' + t.barBg + ' !important; color: ' + t.barText + ' !important; border-radius: 12px; padding: 14px 16px; border: 1px solid ' + (t.isDarkBar ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)') + '; box-shadow: 0 1px 6px rgba(0,0,0,0.08); }',
      '#dpp-rewards-bar-root .dpp-title { font-size: 15px; font-weight: 700; margin: 0 0 10px; color: inherit; }',
      '#dpp-rewards-bar-root .dpp-track { background: ' + t.trackBg + '; border-radius: 999px; height: 10px; overflow: hidden; }',
      '#dpp-rewards-bar-root .dpp-fill { background: linear-gradient(90deg, ' + t.primary + ', ' + t.accent + '); height: 100%; border-radius: 999px; transition: width 0.35s ease; }',
      '#dpp-rewards-bar-root .dpp-message { font-size: 13px; margin-top: 10px; line-height: 1.4; color: inherit; }',
      '#dpp-rewards-bar-root .dpp-levels { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }',
      '#dpp-rewards-bar-root .dpp-level { flex: 1; min-width: 80px; text-align: center; padding: 8px 6px; border-radius: 8px; background: ' + t.levelBg + '; color: ' + t.levelMuted + '; font-size: 11px; opacity: 1; transition: all 0.25s ease; }',
      '#dpp-rewards-bar-root .dpp-level.is-unlocked { color: ' + t.barText + '; background: ' + t.levelUnlockedBg + '; border: 1px solid ' + t.levelUnlockedBorder + '; }',
      '#dpp-rewards-bar-root .dpp-level-icon { font-size: 18px; display: block; margin-bottom: 4px; }',
      '#dpp-rewards-bar-root .dpp-level-title { font-weight: 600; color: inherit; }',
      '@media (min-width:768px) { #dpp-rewards-bar-root .dpp-bar { background: ' + t.barBg + ' !important; color: ' + t.barText + ' !important; } }',
    ].join('\n');
  }

  function renderBar(config, cartTotal) {
    var progress = computeProgress(cartTotal, config.levels);
    var currency = window.LS && window.LS.currency;
    var message;

    if (progress.unlocked.length === config.levels.length) {
      message = config.texts.allUnlocked;
    } else if (progress.next) {
      var remaining = Math.max(0, progress.next.threshold - cartTotal);
      message = normalizeProgressMessage(
        config.texts.progress,
        formatMoney(remaining * 100, currency),
        cleanLevelTitle(progress.next.title)
      );
    } else {
      message = config.texts.title;
    }

    var levelsHtml = config.levels.map(function (level) {
      var isUnlocked = cartTotal >= level.threshold;
      return (
        '<div class="dpp-level' + (isUnlocked ? ' is-unlocked' : '') + '">' +
          '<span class="dpp-level-icon">' + level.icon + '</span>' +
          '<span class="dpp-level-title">' + cleanLevelTitle(level.title) + '</span>' +
        '</div>'
      );
    }).join('');

    return (
      '<div class="dpp-bar">' +
        '<p class="dpp-title">' + config.texts.title + '</p>' +
        '<div class="dpp-track"><div class="dpp-fill" style="width:' + progress.progressPercent.toFixed(1) + '%"></div></div>' +
        '<p class="dpp-message">' + message + '</p>' +
        '<div class="dpp-levels">' + levelsHtml + '</div>' +
      '</div>'
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
    var style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }
    style.textContent = buildStyles(config);

    var cartTotal = getCartSubtotal();
    container.innerHTML = renderBar(config, cartTotal);
  }

  function fetchConfig(storeId) {
    return fetch(APP_BASE + '/api/widget/' + storeId)
      .then(function (res) {
        if (!res.ok) throw new Error('Config no disponible');
        return res.json();
      });
  }

  function init() {
    var storeId = getStoreId();
    if (!storeId) {
      console.warn('[DPP] No se pudo detectar store ID');
      return;
    }

    fetchConfig(storeId)
      .then(function (config) {
        if (!config.enabled) return;

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
