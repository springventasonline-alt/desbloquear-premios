import { Router } from 'express';
import { getPublicWidgetConfig, findStoreByTiendanubeId } from '../models/store.js';
import { createCoupon } from '../services/couponService.js';

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

// Genera un cupón de un solo uso para el premio desbloqueado
router.post('/coupon', async (req, res, next) => {
  try {
    const { store_id, reward_type, reward_value } = req.body;

    if (!store_id || !reward_type) {
      return res.status(400).json({ error: 'Faltan parámetros: store_id, reward_type' });
    }

    if (!['free_shipping', 'percentage_discount'].includes(reward_type)) {
      return res.status(400).json({ error: 'reward_type inválido' });
    }

    const store = await findStoreByTiendanubeId(store_id);
    if (!store || !store.access_token) {
      return res.status(404).json({ error: 'Tienda no encontrada' });
    }

    const { code } = await createCoupon(
      store.tiendanube_store_id,
      store.access_token,
      reward_type,
      reward_value
    );

    res.json({ code });
  } catch (error) {
    next(error);
  }
});

export default router;
