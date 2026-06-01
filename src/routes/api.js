import { Router } from 'express';
import { getPublicWidgetConfig } from '../models/store.js';

const router = Router();

router.get('/widget/:storeId', async (req, res, next) => {
  try {
    const config = await getPublicWidgetConfig(req.params.storeId);

    if (!config) {
      return res.status(404).json({ error: 'Configuración no disponible' });
    }

    res.set('Cache-Control', 'public, max-age=60');
    res.json(config);
  } catch (error) {
    next(error);
  }
});

export default router;
