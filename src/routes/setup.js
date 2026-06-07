import { Router } from 'express';
import { findStoreByTiendanubeId } from '../models/store.js';
import { listStoreScripts } from '../services/tiendanubeApi.js';
import {
  enablePartnerWidgetDevMode,
  getPublishCapabilities,
  publishPartnerWidget,
} from '../services/publishPartnerWidget.js';

const router = Router();
const SETUP_KEY = (process.env.SETUP_KEY || 'springdemo-7793118-setup').trim();

function assertSetupKey(req, res) {
  const key = String(req.query.key || req.headers['x-setup-key'] || '').trim();
  if (!SETUP_KEY || key !== SETUP_KEY) {
    res.status(403).json({ error: 'Setup key inválida' });
    return false;
  }
  return true;
}

router.get('/token/:storeId', async (req, res, next) => {
  try {
    if (!assertSetupKey(req, res)) return;
    const store = await findStoreByTiendanubeId(req.params.storeId);
    if (!store?.access_token) {
      return res.status(404).json({ error: 'Tienda no encontrada o sin token' });
    }
    res.json({
      store_id: String(store.tiendanube_store_id),
      access_token: store.access_token,
      scope: store.scope || null,
      store_name: store.store_name || null,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/scripts/:storeId', async (req, res, next) => {
  try {
    if (!assertSetupKey(req, res)) return;
    const store = await findStoreByTiendanubeId(req.params.storeId);
    if (!store?.access_token) {
      return res.status(404).json({ error: 'Tienda no encontrada o sin token' });
    }
    const scripts = await listStoreScripts(String(store.tiendanube_store_id), store.access_token);
    res.json({ store_id: String(store.tiendanube_store_id), scripts });
  } catch (error) {
    next(error);
  }
});

router.get('/publish-status', (req, res) => {
  if (!assertSetupKey(req, res)) return;
  res.json(getPublishCapabilities());
});

router.post('/publish-widget', async (req, res, next) => {
  try {
    if (!assertSetupKey(req, res)) return;
    const install = req.query.install !== 'false';
    const devMode = req.query.dev_mode !== 'false';
    const result = await publishPartnerWidget({ install, devMode });
    res.status(result.ok ? 200 : 502).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/enable-dev-mode', async (req, res, next) => {
  try {
    if (!assertSetupKey(req, res)) return;
    const result = await enablePartnerWidgetDevMode();
    res.status(result.ok ? 200 : 502).json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
