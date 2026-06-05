import { Router } from 'express';
import { markStoreUninstalled } from '../models/store.js';
import { recordPrivacyEvent, PRIVACY_EVENT_TYPES } from '../models/privacyEvent.js';

const router = Router();

function getStoreIdFromBody(body) {
  return body?.store_id ?? body?.user_id ?? null;
}

async function handlePrivacyWebhook(req, res, eventType, { markUninstalled = false } = {}) {
  const storeId = getStoreIdFromBody(req.body);
  const payload = req.body ?? {};

  await recordPrivacyEvent(eventType, storeId, payload);

  if (markUninstalled && storeId) {
    await markStoreUninstalled(storeId);
  }

  res.status(200).json({ received: true });
}

router.post('/store/redact', (req, res, next) => {
  handlePrivacyWebhook(req, res, PRIVACY_EVENT_TYPES.STORE_REDACT, { markUninstalled: true })
    .catch(next);
});

router.post('/customers/redact', (req, res, next) => {
  handlePrivacyWebhook(req, res, PRIVACY_EVENT_TYPES.CUSTOMERS_REDACT)
    .catch(next);
});

router.post('/customers/data_request', (req, res, next) => {
  handlePrivacyWebhook(req, res, PRIVACY_EVENT_TYPES.CUSTOMERS_DATA_REQUEST)
    .catch(next);
});

router.post('/app/uninstalled', async (req, res, next) => {
  try {
    const storeId = getStoreIdFromBody(req.body);
    await recordPrivacyEvent(PRIVACY_EVENT_TYPES.APP_UNINSTALLED, storeId, req.body ?? {});
    if (storeId) await markStoreUninstalled(storeId);
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
});

export default router;
