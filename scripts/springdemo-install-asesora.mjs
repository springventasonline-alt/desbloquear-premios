#!/usr/bin/env node
/**
 * Obtiene token de springdemo desde desbloquear-premios producción,
 * registra la tienda en asesora-backend e intenta asociar script 7169.
 *
 *   node scripts/springdemo-install-asesora.mjs
 */
const DPP_URL = (process.env.DPP_URL || 'https://desbloquear-premios-production.up.railway.app').replace(/\/$/, '');
const ASESORA_URL = (process.env.ASESORA_URL || 'https://asesora-moda-backend-production.up.railway.app').replace(/\/$/, '');
const STORE_ID = process.env.TN_STORE_ID || '7793118';
const SETUP_KEY = process.env.SETUP_KEY || 'springdemo-7793118-setup';
const UA = process.env.TN_USER_AGENT || 'SpringSetup (springventasonline@gmail.com)';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${url}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

async function tnApi(storeId, token, path, options = {}) {
  const res = await fetch(`https://api.tiendanube.com/v1/${storeId}${path}`, {
    ...options,
    headers: {
      Authentication: `bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': UA,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { ok: res.ok, status: res.status, body };
}

async function main() {
  console.log('[setup] Token desde desbloquear…');
  const tokenPayload = await fetchJson(`${DPP_URL}/setup/token/${STORE_ID}?key=${encodeURIComponent(SETUP_KEY)}`);
  const token = tokenPayload.access_token;
  console.log('[setup] store', tokenPayload.store_id, 'scope', tokenPayload.scope);

  console.log('[setup] Scripts en tienda…');
  const scriptsRes = await tnApi(STORE_ID, token, '/scripts?per_page=100');
  console.log('[setup] GET /scripts', scriptsRes.status, JSON.stringify(scriptsRes.body).slice(0, 500));

  console.log('[setup] Intentando POST script 7169 (Asesora)…');
  const post7169 = await tnApi(STORE_ID, token, '/scripts', {
    method: 'POST',
    body: JSON.stringify({ script_id: 7169 }),
  });
  console.log('[setup] POST script 7169', post7169.status, JSON.stringify(post7169.body));

  console.log('[setup] Registrando token en asesora-backend…');
  try {
    const register = await fetchJson(`${ASESORA_URL}/auth/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-install-secret': process.env.INSTALL_SECRET || '',
      },
      body: JSON.stringify({
        store_id: STORE_ID,
        access_token: token,
        secret: process.env.INSTALL_SECRET || '',
      }),
    });
    console.log('[setup] asesora register-token', register);
  } catch (err) {
    console.warn('[setup] register-token falló (configurá INSTALL_SECRET en Railway):', err.message);
  }

  console.log('[setup] setup-scripts en asesora…');
  try {
    const setup = await fetchJson(`${ASESORA_URL}/auth/setup-scripts`, { method: 'POST' });
    console.log('[setup] setup-scripts', setup);
  } catch (err) {
    console.warn('[setup] setup-scripts:', err.message);
  }
}

main().catch((err) => {
  console.error('[setup] Error:', err.message);
  process.exit(1);
});
