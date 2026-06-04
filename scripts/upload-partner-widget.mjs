#!/usr/bin/env node
/**
 * Sube public/partner/widget.js al script 7124 (app 33285) en Partner Portal.
 * El browser MCP de Cursor no puede usar <input type="file">; esto sí.
 *
 * Uso:
 *   npm run build:widget
 *   npx playwright install chromium
 *   npm run upload:partner-widget
 *
 * Se abre Chrome visible: logueate si hace falta, luego Enter en la terminal.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'node:readline';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WIDGET_PATH = path.resolve(__dirname, '../public/partner/widget.js');
const SCRIPT_URL =
  'https://partners.tiendanube.com/applications/details/33285/script/7124';

function waitEnter(message) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(message, () => {
      rl.close();
      resolve();
    });
  });
}

async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    console.error(
      'Instalá Playwright: npx playwright install chromium\n' +
        'Opcional en el proyecto: npm install -D playwright'
    );
    process.exit(1);
  }
}

async function main() {
  if (!fs.existsSync(WIDGET_PATH)) {
    console.error('No existe:', WIDGET_PATH);
    console.error('Corré: npm run build:widget');
    process.exit(1);
  }

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ headless: false, slowMo: 80 });
  const page = await browser.newPage();

  console.log('Abriendo Partner Portal…');
  await page.goto(SCRIPT_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });

  await waitEnter(
    '\n→ Si ves login, iniciá sesión en el browser.\n→ Cuando estés en el detalle del script #7124, presioná ENTER acá…\n'
  );

  const addVersion = page.getByRole('button', { name: /agregar versi[oó]n/i }).first();
  await addVersion.click({ timeout: 30000 });

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.waitFor({ state: 'attached', timeout: 15000 });
  await fileInput.setInputFiles(WIDGET_PATH);
  console.log('Archivo enviado:', WIDGET_PATH);

  await page.waitForTimeout(3000);

  const installBtn = page.getByRole('button', { name: /instalar en las tiendas/i }).first();
  if (await installBtn.isVisible().catch(() => false)) {
    await installBtn.click();
    console.log('Clic en «Instalar en las tiendas».');
  } else {
    const menu = page.locator('button').filter({ hasText: '⋮' }).first();
    if (await menu.isVisible().catch(() => false)) {
      await menu.click();
      await page.getByRole('menuitem', { name: /instalar en las tiendas/i }).click();
      console.log('Instalar vía menú ⋮.');
    } else {
      console.warn(
        'No encontré «Instalar en las tiendas». Hacelo manualmente en la fila de la versión nueva.'
      );
    }
  }

  await waitEnter('\n→ Si la versión quedó Activada, presioná ENTER para cerrar el browser…\n');
  await browser.close();
  console.log('Listo. Probá https://www.springvm.com.ar/comprar/ en incógnito en 2–3 min.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
