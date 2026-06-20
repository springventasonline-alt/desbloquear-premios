#!/usr/bin/env node
/**
 * Publica widget.js (v9 con Asesora) en script 7124 vía Partner Portal UI.
 * Requiere sesión activa en partners.tiendanube.com (browser visible).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDGET = path.resolve(__dirname, '../public/partner/widget.js');
const PORTAL_URL = 'https://partners.tiendanube.com/applications/details/33285/script/7124';

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 30 });
  const page = await browser.newPage();
  let bearer = process.env.PARTNER_BEARER_TOKEN || null;

  page.on('request', (req) => {
    if (bearer) return;
    if (!req.url().includes('services-ecosystem.ms.tiendanube.com')) return;
    const auth = req.headers().authorization || req.headers().Authorization;
    if (auth?.startsWith('Bearer ')) bearer = auth.slice(7);
  });

  console.log('[publish] Abriendo Partner Portal (logueate si hace falta, 3 min max)…');
  await page.goto(PORTAL_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });

  for (let i = 0; i < 180; i += 1) {
    await page.waitForTimeout(1000);
    if (page.url().includes('script/7124') && !page.url().includes('login')) break;
  }

  await page.getByRole('button', { name: /agregar versi[oó]n/i }).first().click({ timeout: 30000 });
  await page.locator('input[type="file"]').first().setInputFiles(WIDGET);
  console.log('[publish] Archivo subido:', WIDGET);
  await page.waitForTimeout(4000);

  const installBtn = page.getByRole('button', { name: /instalar en las tiendas/i }).first();
  if (await installBtn.isVisible().catch(() => false)) {
    await installBtn.click();
    console.log('[publish] Instalar en las tiendas — clic');
  }

  await page.waitForTimeout(8000);
  if (bearer) console.log('[publish] Bearer capturado (len=%d)', bearer.length);
  console.log('[publish] DONE — probá springvm.com.ar en incógnito tras scroll/clic');
  await browser.close();
}

main().catch((err) => {
  console.error('[publish]', err.message);
  process.exit(1);
});
