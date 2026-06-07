import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDGET_PATH = path.resolve(__dirname, '../../public/partner/widget.js');
const APP_ID = config.tiendanube.appId || '33285';
const SCRIPT_ID = process.env.TIENDANUBE_SCRIPT_ID || '7124';
const ECOSYSTEM_BASE = `https://services-ecosystem.ms.tiendanube.com/apps/${APP_ID}/scripts/${SCRIPT_ID}`;
const DEV_WIDGET_URL = `${config.appUrl.replace(/\/$/, '')}/widget.js`;

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

async function uploadVersion(authToken) {
  if (!fs.existsSync(WIDGET_PATH)) {
    throw new Error(`No existe ${WIDGET_PATH}`);
  }

  const body = new FormData();
  const blob = new Blob([fs.readFileSync(WIDGET_PATH)], { type: 'application/javascript' });
  body.append('file', blob, 'widget.js');

  const response = await fetch(`${ECOSYSTEM_BASE}/versions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'User-Agent': config.tiendanube.userAgent,
    },
    body,
  });

  return parseResponse(response);
}

async function activateVersion(authToken, versionId) {
  const patchBody = versionId ? { activeVersionId: versionId } : { installLatest: true };
  const response = await fetch(ECOSYSTEM_BASE, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'User-Agent': config.tiendanube.userAgent,
    },
    body: JSON.stringify(patchBody),
  });

  return parseResponse(response);
}

async function enableDevMode(authToken) {
  const response = await fetch(ECOSYSTEM_BASE, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      'User-Agent': config.tiendanube.userAgent,
    },
    body: JSON.stringify({
      developmentMode: true,
      developmentUrl: DEV_WIDGET_URL,
    }),
  });

  return parseResponse(response);
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
    auth_methods: tokens.map((t) => t.label),
    has_partner_bearer: tokens.some((t) => t.label === 'partner_bearer'),
    has_client_secret: tokens.some((t) => t.label === 'client_secret'),
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

    attempt.upload = await uploadVersion(token.value);
    if (!attempt.upload.ok) {
      attempts.push(attempt);
      continue;
    }

    const versionId = attempt.upload.body?.id ?? attempt.upload.body?.data?.id ?? null;

    if (install) {
      attempt.activate = await activateVersion(token.value, versionId);
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
  }

  return {
    ok: false,
    error: 'No se pudo publicar el widget con ningún método de auth disponible',
    attempts,
    capabilities: getPublishCapabilities(),
  };
}
