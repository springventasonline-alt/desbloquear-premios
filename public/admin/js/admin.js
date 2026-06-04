const REWARD_TYPES = [
  { value: 'free_shipping', label: 'Envío gratis' },
  { value: 'percentage_discount', label: 'Descuento %' },
  { value: 'fixed_discount', label: 'Descuento fijo' },
  { value: 'gift', label: 'Regalo' },
  { value: 'custom', label: 'Personalizado' },
];

let state = { store: null, config: null, levels: [] };

const els = {
  loginView: document.getElementById('login-view'),
  panelView: document.getElementById('panel-view'),
  logoutBtn: document.getElementById('logout-btn'),
  installBtn: document.getElementById('install-btn'),
  storeName: document.getElementById('store-name'),
  storeId: document.getElementById('store-id'),
  scriptStatus: document.getElementById('script-status'),
  enabled: document.getElementById('enabled'),
  showInCart: document.getElementById('show-in-cart'),
  showInCheckout: document.getElementById('show-in-checkout'),
  primaryColor: document.getElementById('primary-color'),
  secondaryColor: document.getElementById('secondary-color'),
  accentColor: document.getElementById('accent-color'),
  textColor: document.getElementById('text-color'),
  fontFamily: document.getElementById('font-family'),
  titleText: document.getElementById('title-text'),
  progressText: document.getElementById('progress-text'),
  unlockedText: document.getElementById('unlocked-text'),
  allUnlockedText: document.getElementById('all-unlocked-text'),
  levelsContainer: document.getElementById('levels-container'),
  addLevel: document.getElementById('add-level'),
  saveBtn: document.getElementById('save-btn'),
  saveStatus: document.getElementById('save-status'),
  previewRoot: document.getElementById('preview-root'),
  reinstallScript: document.getElementById('reinstall-script'),
};

async function api(path, options = {}) {
  const res = await fetch('/admin/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  if (res.status === 401) {
    showLogin();
    throw new Error('No autenticado');
  }
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la API');
  return data;
}

function showLogin() {
  els.loginView.hidden = false;
  els.panelView.hidden = true;
  els.logoutBtn.hidden = true;
}

function showPanel() {
  els.loginView.hidden = true;
  els.panelView.hidden = false;
  els.logoutBtn.hidden = false;
  els.installBtn.hidden = true;
}

function renderLevels() {
  els.levelsContainer.innerHTML = state.levels.map((level, index) => `
    <div class="level-row" data-index="${index}">
      <div class="level-order">${level.level_order}</div>
      <label>Icono<input type="text" data-field="icon" value="${level.icon || '🎁'}" maxlength="4"></label>
      <label>Título<input type="text" data-field="title" value="${escapeHtml(level.title)}" maxlength="120"></label>
      <label>Monto mínimo ($)<input type="number" data-field="threshold_amount" value="${level.threshold_amount}" min="0" step="0.01"></label>
      <label>Tipo
        <select data-field="reward_type">
          ${REWARD_TYPES.map(t => `<option value="${t.value}" ${level.reward_type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
        </select>
      </label>
      <button type="button" class="btn btn-ghost" data-action="remove">Eliminar</button>
    </div>
  `).join('');

  els.levelsContainer.querySelectorAll('[data-action="remove"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const index = Number(btn.closest('.level-row').dataset.index);
      state.levels.splice(index, 1);
      state.levels = state.levels.map((l, i) => ({ ...l, level_order: i + 1 }));
      renderLevels();
      renderPreview();
    });
  });

  els.levelsContainer.querySelectorAll('input, select').forEach((input) => {
    input.addEventListener('input', onLevelChange);
    input.addEventListener('change', onLevelChange);
  });
}

function onLevelChange(event) {
  const row = event.target.closest('.level-row');
  const index = Number(row.dataset.index);
  const field = event.target.dataset.field;
  let value = event.target.value;
  if (field === 'threshold_amount') value = Number(value);
  state.levels[index][field] = value;
  renderPreview();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function readFormConfig() {
  return {
    enabled: els.enabled.checked,
    show_in_cart: els.showInCart.checked,
    show_in_checkout: els.showInCheckout.checked,
    primary_color: els.primaryColor.value,
    secondary_color: els.secondaryColor.value,
    accent_color: els.accentColor.value,
    text_color: els.textColor.value,
    font_family: els.fontFamily.value,
    title_text: els.titleText.value,
    progress_text: els.progressText.value,
    unlocked_text: els.unlockedText.value,
    all_unlocked_text: els.allUnlockedText.value,
  };
}

function populateForm(config) {
  els.enabled.checked = config.enabled;
  els.showInCart.checked = config.show_in_cart;
  els.showInCheckout.checked = config.show_in_checkout;
  els.primaryColor.value = config.primary_color;
  els.secondaryColor.value = config.secondary_color;
  els.accentColor.value = config.accent_color;
  els.textColor.value = config.text_color;
  els.fontFamily.value = config.font_family;
  els.titleText.value = config.title_text;
  els.progressText.value = config.progress_text;
  els.unlockedText.value = config.unlocked_text;
  els.allUnlockedText.value = config.all_unlocked_text;
  state.levels = (config.levels || []).map((l) => ({ ...l }));
  renderLevels();
  renderPreview();
}

function renderPreview() {
  const config = readFormConfig();
  const previewConfig = {
    typography: { fontFamily: config.font_family },
    colors: {
      primary: config.primary_color,
      secondary: config.secondary_color,
      accent: config.accent_color,
      text: config.text_color,
    },
    texts: {
      title: config.title_text,
      progress: config.progress_text,
      unlocked: config.unlocked_text,
      allUnlocked: config.all_unlocked_text,
    },
    levels: state.levels.map((l, i) => ({
      order: i + 1,
      threshold: Number(l.threshold_amount),
      title: l.title,
      icon: l.icon || '🎁',
    })),
  };

  const cartTotal = state.levels.length
    ? Number(state.levels[Math.min(1, state.levels.length - 1)].threshold_amount) * 0.6
    : 0;

  els.previewRoot.innerHTML = buildPreviewHtml(previewConfig, cartTotal);
}

function buildPreviewHtml(config, cartTotal) {
  const max = config.levels.length ? config.levels[config.levels.length - 1].threshold : 0;
  const percent = max > 0 ? Math.min(100, (cartTotal / max) * 100) : 0;
  const next = config.levels.find((l) => cartTotal < l.threshold);

  let message = config.texts.title;
  if (next) {
    const remaining = Math.max(0, next.threshold - cartTotal);
    message = config.texts.progress
      .replace('{{amount}}', '$' + remaining.toFixed(0))
      .replace('{{reward}}', next.title);
  }

  return `
    <div style="font-family:${config.typography.fontFamily};background:${config.colors.secondary};border-radius:12px;padding:16px;color:${config.colors.text}">
      <p style="font-weight:700;margin:0 0 10px">${config.texts.title}</p>
      <div style="background:rgba(0,0,0,.08);border-radius:999px;height:10px;overflow:hidden">
        <div style="width:${percent}%;height:100%;background:linear-gradient(90deg,${config.colors.primary},${config.colors.accent});border-radius:999px"></div>
      </div>
      <p style="font-size:13px;margin-top:10px">${message}</p>
    </div>
  `;
}

async function loadPanel() {
  const data = await api('/config');
  state.store = data.store;
  state.config = data.config;

  els.storeName.textContent = data.store.storeName || '—';
  els.storeId.textContent = data.store.tiendanubeStoreId;
  els.scriptStatus.textContent = data.store.scriptInstalled ? 'Sí ✓' : 'No — reinstalá el widget';

  populateForm(data.config);
  showPanel();
}

async function save() {
  els.saveStatus.textContent = 'Guardando...';
  els.saveStatus.className = 'save-status';

  try {
    await api('/config', { method: 'PUT', body: JSON.stringify(readFormConfig()) });
    await api('/levels', {
      method: 'PUT',
      body: JSON.stringify({
        levels: state.levels.map((l, i) => ({
          level_order: i + 1,
          threshold_amount: Number(l.threshold_amount),
          reward_type: l.reward_type,
          reward_value: l.reward_value ? Number(l.reward_value) : null,
          title: l.title,
          description: l.description || null,
          icon: l.icon || '🎁',
          active: true,
        })),
      }),
    });

    els.saveStatus.textContent = 'Guardado correctamente ✓';
    els.saveStatus.className = 'save-status success';
  } catch (error) {
    els.saveStatus.textContent = error.message;
  }
}

els.addLevel.addEventListener('click', () => {
  if (state.levels.length >= 6) {
    alert('Máximo 6 niveles permitidos');
    return;
  }
  state.levels.push({
    level_order: state.levels.length + 1,
    threshold_amount: (state.levels[state.levels.length - 1]?.threshold_amount || 0) + 100,
    reward_type: 'custom',
    title: 'Nuevo premio',
    icon: '🎁',
  });
  renderLevels();
  renderPreview();
});

els.saveBtn.addEventListener('click', save);
els.reinstallScript.addEventListener('click', async () => {
  els.reinstallScript.disabled = true;
  els.scriptStatus.textContent = 'Instalando...';

  try {
    const res = await fetch('/admin/api/script/install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    });
    const data = await res.json();

    if (!res.ok || !data.installed) {
      throw new Error(data.error || data.hint || 'No se pudo instalar el widget');
    }

    if (data.store) {
      state.store = data.store;
      els.scriptStatus.textContent = data.store.scriptInstalled ? 'Sí ✓' : 'No';
    } else {
      els.scriptStatus.textContent = 'Sí ✓';
    }

    const msg = data.message
      ? data.message
      : `Widget OK (script ${data.scriptId}, modo ${data.mode || 'manual'})`;
    alert(msg);
  } catch (error) {
    els.scriptStatus.textContent = 'Error — ver configuración';
    alert(error.message);
  } finally {
    els.reinstallScript.disabled = false;
  }
});

[
  els.enabled, els.showInCart, els.showInCheckout,
  els.primaryColor, els.secondaryColor, els.accentColor, els.textColor,
  els.fontFamily, els.titleText, els.progressText, els.unlockedText, els.allUnlockedText,
].forEach((el) => el.addEventListener('input', renderPreview));

async function init() {
  try {
    const status = await fetch('/auth/status').then((r) => r.json());
    if (status.authenticated) {
      await loadPanel();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

init();
