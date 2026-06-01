import { Router } from 'express';
import { markStoreUninstalled } from '../models/store.js';

const router = Router();

router.post('/store/redact', async (req, res) => {
  const { store_id: storeId } = req.body || {};
  if (storeId) await markStoreUninstalled(storeId);
  res.status(200).json({ received: true });
});

router.post('/customers/redact', (_req, res) => {
  res.status(200).json({ received: true });
});

router.post('/customers/data_request', (_req, res) => {
  res.status(200).json({ received: true });
});

router.post('/app/uninstalled', async (req, res) => {
  const storeId = req.body?.store_id || req.body?.user_id;
  if (storeId) await markStoreUninstalled(storeId);
  res.status(200).json({ received: true });
});

export default router;
