import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDGET_PATH = path.resolve(__dirname, '../../public/partner/widget.js');
const APP_ID = config.tiendanube.appId || '33285';
const SCRIPT_ID = process.env.TIENDANUBE_SCRIPT_ID || '7124';
const API_VERSION = config.tiendanube.apiVersion || '2025-03';
const ECOSYSTEM_BASE = `https://services-ecosystem.ms.tiendanube.com/apps/${APP_ID}/scripts/${SCRIPT_ID}`;
const PUBLIC_SCRIPT_BASE = `${config.tiendanube.apiBaseUrl}/${API_VERSION}/apps/${APP_ID}/scripts/${SCRIPT_ID}`;
const DEV_WIDGET_URL = `${String(config.appUrl || '').trim().replace(/\/$/, '')}/widget.js`;

function getAuthTokens() {
  const tokens = [];
  const partnerBearer = (process.env.PARTNER_BEARER_TOKEN || '').trim();
  const clientSecret = (config.tiendanube.clientSecret || '').trim();

  if (partnerBearer) tokens.push({ label: 'partner_bearer', value: partnerBearer });
  if (clientSecret) tokens.push({ label: 'client_secret', value: clientSecret });

  return tokens;
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return { status: response.status, ok: response.ok, body: JSON.parse(text), raw: text };
  } catch {
    return { status: response.status, ok: response.ok, body: null, raw: text };
  }
}

function buildHeaders(authToken, contentType) {
  const headers = {
    Authorization: `Bearer ${authToken}`,
    'User-Agent': config.tiendanube.userAgent,
  };
  if (contentType) headers['Content-Type'] = contentType;
  return headers;
}

async function uploadVersionEcosystem(authToken) {
  if (!fs.existsSync(WIDGET_PATH)) {
    throw new Error(`No existe ${WIDGET_PATH}`);
  }

  const body = new FormData();
  const blob = new Blob([fs.readFileSync(WIDGET_PATH)], { type: 'application/javascript' });
  body.append('file', blob, 'widget.js');

  const response = await fetch(`${ECOSYSTEM_BASE}/versions`, {
    method: 'POST',
    headers: buildHeaders(authToken),
    body,
  });

  return { api: 'ecosystem', ...(await parseResponse(response)) };
}

async function uploadVersionPublic(authToken) {
  if (!fs.existsSync(WIDGET_PATH)) {
    throw new Error(`No existe ${WIDGET_PATH}`);
  }

  const body = new FormData();
  const blob = new Blob([fs.readFileSync(WIDGET_PATH)], { type: 'application/javascript' });
  body.append('file', blob, 'widget.js');

  const response = await fetch(`${PUBLIC_SCRIPT_BASE}/versions`, {
    method: 'POST',
    headers: buildHeaders(authToken),
    body,
  });

  return { api: 'public_api', ...(await parseResponse(response)) };
}

async function activateVersionEcosystem(authToken, versionId) {
  const patchBody = versionId ? { activeVersionId: versionId } : { installLatest: true };
  const response = await fetch(ECOSYSTEM_BASE, {
    method: 'PATCH',
    headers: buildHeaders(authToken, 'application/json'),
    body: JSON.stringify(patchBody),
  });

  return { api: 'ecosystem', ...(await parseResponse(response)) };
}

async function activateVersionPublic(authToken, versionId) {
  const candidates = [
    { activeVersionId: versionId },
    { installLatest: true },
    { active_version_id: versionId },
  ].filter((body) => versionId || body.installLatest);

  const results = [];
  for (const patchBody of candidates) {
    const response = await fetch(PUBLIC_SCRIPT_BASE, {
      method: 'PATCH',
      headers: buildHeaders(authToken, 'application/json'),
      body: JSON.stringify(patchBody),
    });
    const parsed = { api: 'public_api', body: patchBody, ...(await parseResponse(response)) };
    results.push(parsed);
    if (parsed.ok) return parsed;
  }

  return results[results.length - 1] || { api: 'public_api', ok: false, raw: 'no attempts' };
}

async function enableDevModeOnBase(baseUrl, authToken, apiLabel) {
  const candidates = [
    { developmentMode: true, developmentUrl: DEV_WIDGET_URL },
    { development_mode: true, development_url: DEV_WIDGET_URL },
    { dev_mode: true, development_url: DEV_WIDGET_URL },
  ];

  const results = [];
  for (const patchBody of candidates) {
    const response = await fetch(baseUrl, {
      method: 'PATCH',
      headers: buildHeaders(authToken, 'application/json'),
      body: JSON.stringify(patchBody),
    });
    const parsed = { api: apiLabel, body: patchBody, ...(await parseResponse(response)) };
    results.push(parsed);
    if (parsed.ok) return parsed;
  }

  return results;
}

async function enableDevMode(authToken) {
  const ecosystem = await enableDevModeOnBase(ECOSYSTEM_BASE, authToken, 'ecosystem');
  if (Array.isArray(ecosystem) ? ecosystem.some((r) => r.ok) : ecosystem.ok) {
    return Array.isArray(ecosystem) ? ecosystem.find((r) => r.ok) : ecosystem;
  }

  const publicResults = await enableDevModeOnBase(PUBLIC_SCRIPT_BASE, authToken, 'public_api');
  const publicOk = Array.isArray(publicResults) ? publicResults.find((r) => r.ok) : publicResults;
  if (publicOk?.ok) return publicOk;

  return {
    api: 'all_failed',
    ecosystem,
    public_api: publicResults,
  };
}

export function getPublishCapabilities() {
  const tokens = getAuthTokens();
  return {
    widget_path: WIDGET_PATH,
    widget_exists: fs.existsSync(WIDGET_PATH),
    widget_bytes: fs.existsSync(WIDGET_PATH) ? fs.statSync(WIDGET_PATH).size : 0,
    app_id: APP_ID,
    script_id: SCRIPT_ID,
    dev_widget_url: DEV_WIDGET_URL,
    ecosystem_base: ECOSYSTEM_BASE,
    public_script_base: PUBLIC_SCRIPT_BASE,
    auth_methods: tokens.map((t) => t.label),
    has_partner_bearer: tokens.some((t) => t.label === 'partner_bearer'),
    has_client_secret: tokens.some((t) => t.label === 'client_secret'),
  };
}

export async function enablePartnerWidgetDevMode() {
  const tokens = getAuthTokens();
  if (!tokens.length) {
    return {
      ok: false,
      error: 'Faltan PARTNER_BEARER_TOKEN o TIENDANUBE_CLIENT_SECRET en Railway',
      capabilities: getPublishCapabilities(),
    };
  }

  const attempts = [];
  for (const token of tokens) {
    const devMode = await enableDevMode(token.value);
    attempts.push({ auth: token.label, dev_mode: devMode });
    if (devMode?.ok) {
      return { ok: true, auth: token.label, dev_mode: devMode, attempts };
    }
  }

  return {
    ok: false,
    error: 'No se pudo activar development mode en script 7124',
    attempts,
    capabilities: getPublishCapabilities(),
  };
}

export async function publishPartnerWidget({ install = true, devMode = true } = {}) {
  const tokens = getAuthTokens();
  if (!tokens.length) {
    return {
      ok: false,
      error: 'Faltan PARTNER_BEARER_TOKEN o TIENDANUBE_CLIENT_SECRET en Railway',
      capabilities: getPublishCapabilities(),
    };
  }

  const attempts = [];

  for (const token of tokens) {
    const attempt = { auth: token.label, upload: null, activate: null, dev_mode: null };

    attempt.upload = await uploadVersionEcosystem(token.value);
    if (!attempt.upload.ok) {
      attempt.upload_public = await uploadVersionPublic(token.value);
      if (attempt.upload_public.ok) attempt.upload = attempt.upload_public;
    }

    if (!attempt.upload.ok) {
      if (devMode) {
        attempt.dev_mode = await enableDevMode(token.value);
        if (attempt.dev_mode?.ok) {
          attempts.push(attempt);
          return {
            ok: true,
            auth: token.label,
            mode: 'dev_mode_only',
            dev_mode: attempt.dev_mode,
            attempts,
          };
        }
      }
      attempts.push(attempt);
      continue;
    }

    const versionId = attempt.upload.body?.id ?? attempt.upload.body?.data?.id ?? null;

    if (install) {
      attempt.activate = await activateVersionEcosystem(token.value, versionId);
      if (!attempt.activate.ok) {
        attempt.activate_public = await activateVersionPublic(token.value, versionId);
        if (attempt.activate_public?.ok) attempt.activate = attempt.activate_public;
      }
    }

    if (devMode) {
      attempt.dev_mode = await enableDevMode(token.value);
    }

    attempts.push(attempt);

    const activated = !install || attempt.activate?.ok;
    const devEnabled = !devMode || attempt.dev_mode?.ok;

    if (attempt.upload.ok && activated && devEnabled) {
      return {
        ok: true,
        auth: token.label,
        version_id: versionId,
        upload: attempt.upload,
        activate: attempt.activate,
        dev_mode: attempt.dev_mode,
        attempts,
      };
    }

    if (devMode && attempt.dev_mode?.ok) {
      return {
        ok: true,
        auth: token.label,
        mode: devMode && !activated ? 'dev_mode_fallback' : 'partial',
        version_id: versionId,
        upload: attempt.upload,
        activate: attempt.activate,
        dev_mode: attempt.dev_mode,
        attempts,
      };
    }
  }

  return {
    ok: false,
    error: 'No se pudo publicar el widget con ningún método de auth disponible',
    attempts,
    capabilities: getPublishCapabilities(),
  };
}
