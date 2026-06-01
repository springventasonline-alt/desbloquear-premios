import { Router } from 'express';
import { requireStoreSession, attachStore } from '../middleware/auth.js';
import {
  getRewardConfigByStoreId,
  updateRewardConfig,
  replaceRewardLevels,
} from '../models/store.js';
import { activateStoreScript } from '../services/scriptInstaller.js';

const router = Router();

router.use(requireStoreSession, attachStore);

router.get('/config', async (req, res, next) => {
  try {
    const config = await getRewardConfigByStoreId(req.store.id);
    res.json({ store: sanitizeStore(req.store), config });
  } catch (error) {
    next(error);
  }
});

router.put('/config', async (req, res, next) => {
  try {
    const config = await updateRewardConfig(req.store.id, req.body);
    res.json({ config });
  } catch (error) {
    next(error);
  }
});

router.put('/levels', async (req, res, next) => {
  try {
    const { levels } = req.body;
    if (!Array.isArray(levels)) {
      return res.status(400).json({ error: 'levels debe ser un array' });
    }
    const config = await replaceRewardLevels(req.store.id, levels);
    res.json({ config });
  } catch (error) {
    if (error.message.includes('Máximo 6')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/script/install', async (req, res, next) => {
  try {
    const result = await activateStoreScript(req.store);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

function sanitizeStore(store) {
  return {
    id: store.id,
    tiendanubeStoreId: store.tiendanube_store_id,
    storeName: store.store_name,
    storeUrl: store.store_url,
    scriptInstalled: store.script_installed,
    installedAt: store.installed_at,
  };
}

export default router;
