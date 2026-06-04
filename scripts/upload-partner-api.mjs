#!/usr/bin/env node
/**
 * Sube widget.js como nueva versión del script 7124 vía API ecosystem (Partner Portal).
 *
 * Obtener token: DevTools en partners.tiendanube.com → Network → cualquier request
 * a services-ecosystem.ms.tiendanube.com → Header Authorization: Bearer ...
 *
 *   PARTNER_BEARER_TOKEN='eyJ...' node scripts/upload-partner-api.mjs
 *   PARTNER_BEARER_TOKEN='eyJ...' node scripts/upload-partner-api.mjs --install
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDGET = path.resolve(__dirname, '../public/partner/widget.js');
const APP_ID = '33285';
const SCRIPT_ID = '7124';
const BASE = `https://services-ecosystem.ms.tiendanube.com/apps/${APP_ID}/scripts/${SCRIPT_ID}`;

const token = process.env.PARTNER_BEARER_TOKEN;
const doInstall = process.argv.includes('--install');

if (!token) {
  console.error('Falta PARTNER_BEARER_TOKEN (Bearer JWT del Partner Portal).');
  process.exit(1);
}

const headers = { Authorization: `Bearer ${token}` };

async function main() {
  if (!fs.existsSync(WIDGET)) {
    console.error('No existe', WIDGET, '— corré: node scripts/build-widget.js');
    process.exit(1);
  }

  const body = new FormData();
  const blob = new Blob([fs.readFileSync(WIDGET)], { type: 'application/javascript' });
  body.append('file', blob, 'widget.js');

  console.log('POST versión…', WIDGET);
  const postRes = await fetch(`${BASE}/versions`, {
    method: 'POST',
    headers,
    body,
  });
  const postText = await postRes.text();
  if (!postRes.ok) {
    console.error('POST versions', postRes.status, postText.slice(0, 500));
    process.exit(1);
  }
  let version;
  try {
    version = JSON.parse(postText);
  } catch {
    version = { raw: postText };
  }
  console.log('Versión creada:', JSON.stringify(version).slice(0, 400));

  if (!doInstall) {
    console.log('OK. Activá con --install o «Instalar en las tiendas» en el portal.');
    return;
  }

  const versionId = version?.id ?? version?.data?.id;
  const patchBody = versionId ? { activeVersionId: versionId } : { installLatest: true };

  console.log('PATCH activar…', patchBody);
  const patchRes = await fetch(BASE, {
    method: 'PATCH',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(patchBody),
  });
  const patchText = await patchRes.text();
  if (!patchRes.ok) {
    console.error('PATCH script', patchRes.status, patchText.slice(0, 500));
    process.exit(1);
  }
  console.log('Activado:', patchText.slice(0, 400));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
