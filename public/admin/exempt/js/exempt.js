const API_BASE = '/admin/api/exempt';

const els = {
  loginView: document.getElementById('login-view'),
  panelView: document.getElementById('panel-view'),
  loginForm: document.getElementById('login-form'),
  password: document.getElementById('password'),
  loginError: document.getElementById('login-error'),
  logoutBtn: document.getElementById('logout-btn'),
  addForm: document.getElementById('add-form'),
  storeIdInput: document.getElementById('store-id-input'),
  addStatus: document.getElementById('add-status'),
  storesList: document.getElementById('stores-list'),
  storesEmpty: document.getElementById('stores-empty'),
  storeCount: document.getElementById('store-count'),
};

async function api(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options,
  });
  const data = await res.json().catch(() => ({}));
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
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return '—';
  }
}

function renderStores(stores) {
  els.storeCount.textContent = String(stores.length);
  els.storesEmpty.hidden = stores.length > 0;
  els.storesList.innerHTML = stores
    .map(
      (store) => `
    <li class="exempt-list-item" data-id="${store.tiendanubeStoreId}">
      <div class="exempt-list-info">
        <span class="exempt-store-id">${store.tiendanubeStoreId}</span>
        <span class="exempt-store-date">Agregada ${formatDate(store.createdAt)}</span>
      </div>
      <button type="button" class="btn btn-ghost" data-action="remove">Quitar</button>
    </li>`
    )
    .join('');

  els.storesList.querySelectorAll('[data-action="remove"]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.closest('.exempt-list-item').dataset.id;
      if (!confirm(`¿Quitar la tienda ${id} de la lista de exentas?`)) return;

      btn.disabled = true;
      try {
        await api(`/stores/${id}`, { method: 'DELETE' });
        await loadStores();
      } catch (error) {
        alert(error.message);
        btn.disabled = false;
      }
    });
  });
}

async function loadStores() {
  const data = await api('/stores');
  renderStores(data.stores || []);
}

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.loginError.hidden = true;

  try {
    await api('/auth', {
      method: 'POST',
      body: JSON.stringify({ password: els.password.value }),
    });
    els.password.value = '';
    await loadStores();
    showPanel();
  } catch (error) {
    els.loginError.textContent = error.message;
    els.loginError.hidden = false;
  }
});

els.addForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  els.addStatus.textContent = '';
  els.addStatus.className = 'save-status';

  const tiendanubeStoreId = Number(els.storeIdInput.value);
  if (!Number.isInteger(tiendanubeStoreId) || tiendanubeStoreId <= 0) {
    els.addStatus.textContent = 'ID inválido';
    return;
  }

  try {
    await api('/stores', {
      method: 'POST',
      body: JSON.stringify({ tiendanubeStoreId }),
    });
    els.storeIdInput.value = '';
    els.addStatus.textContent = `Tienda ${tiendanubeStoreId} agregada ✓`;
    els.addStatus.className = 'save-status success';
    await loadStores();
  } catch (error) {
    els.addStatus.textContent = error.message;
  }
});

els.logoutBtn.addEventListener('click', async () => {
  try {
    await api('/logout', { method: 'POST' });
  } catch {
    // ignore
  }
  showLogin();
});

async function init() {
  try {
    const status = await api('/auth/status');
    if (status.authenticated) {
      await loadStores();
      showPanel();
    } else {
      showLogin();
    }
  } catch {
    showLogin();
  }
}

init();
