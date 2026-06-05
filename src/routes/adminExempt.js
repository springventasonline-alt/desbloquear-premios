import { Router } from 'express';
import {
  requireAdminExemptSession,
  verifyAdminExemptPassword,
} from '../middleware/adminExemptAuth.js';
import {
  listExemptStores,
  addExemptStore,
  removeExemptStore,
} from '../models/paymentExempt.js';

const router = Router();

router.get('/auth/status', (req, res) => {
  res.json({ authenticated: Boolean(req.session?.adminExemptUnlocked) });
});

router.post('/auth', (req, res) => {
  const { password } = req.body;
  const result = verifyAdminExemptPassword(password);

  if (!result.ok) {
    return res.status(result.error?.includes('no configurada') ? 503 : 401).json({
      error: result.error,
    });
  }

  req.session.adminExemptUnlocked = true;
  res.json({ authenticated: true });
});

router.post('/logout', (req, res) => {
  req.session.adminExemptUnlocked = false;
  res.json({ authenticated: false });
});

router.use(requireAdminExemptSession);

router.get('/stores', async (_req, res, next) => {
  try {
    const stores = await listExemptStores();
    res.json({
      stores: stores.map((row) => ({
        tiendanubeStoreId: Number(row.tiendanube_store_id),
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/stores', async (req, res, next) => {
  try {
    const raw = req.body?.tiendanubeStoreId ?? req.body?.tiendanube_store_id;
    const tiendanubeStoreId = Number(raw);

    if (!Number.isInteger(tiendanubeStoreId) || tiendanubeStoreId <= 0) {
      return res.status(400).json({ error: 'tiendanubeStoreId debe ser un entero positivo' });
    }

    const added = await addExemptStore(tiendanubeStoreId);
    if (!added) {
      return res.status(409).json({ error: 'La tienda ya está en la lista de exentas' });
    }

    res.status(201).json({
      store: {
        tiendanubeStoreId: Number(added.tiendanube_store_id),
        createdAt: added.created_at,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.delete('/stores/:tiendanubeStoreId', async (req, res, next) => {
  try {
    const tiendanubeStoreId = Number(req.params.tiendanubeStoreId);

    if (!Number.isInteger(tiendanubeStoreId) || tiendanubeStoreId <= 0) {
      return res.status(400).json({ error: 'ID de tienda inválido' });
    }

    const removed = await removeExemptStore(tiendanubeStoreId);
    if (!removed) {
      return res.status(404).json({ error: 'Tienda no encontrada en la lista de exentas' });
    }

    res.json({ removed: true, tiendanubeStoreId });
  } catch (error) {
    next(error);
  }
});

export default router;
