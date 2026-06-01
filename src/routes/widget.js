import { Router } from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config/index.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const widgetPath = path.join(__dirname, '..', '..', 'public', 'widget', 'rewards-bar.js');

let cachedWidget = null;

async function getWidgetSource() {
  if (!cachedWidget || config.nodeEnv !== 'production') {
    cachedWidget = await fs.readFile(widgetPath, 'utf8');
  }
  return cachedWidget;
}

router.get('/rewards-bar.js', async (_req, res, next) => {
  try {
    const source = await getWidgetSource();
    const bootstrap = `window.DPP_APP_URL = ${JSON.stringify(config.appUrl)};\n`;

    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': config.nodeEnv === 'production' ? 'public, max-age=300' : 'no-cache',
    });
    res.send(bootstrap + source);
  } catch (error) {
    next(error);
  }
});

export default router;
