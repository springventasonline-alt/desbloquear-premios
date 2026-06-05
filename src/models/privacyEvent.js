import { query } from '../db/pool.js';

export const PRIVACY_EVENT_TYPES = {
  STORE_REDACT: 'store_redact',
  CUSTOMERS_REDACT: 'customers_redact',
  CUSTOMERS_DATA_REQUEST: 'customers_data_request',
  APP_UNINSTALLED: 'app_uninstalled',
};

export async function recordPrivacyEvent(type, storeId, payload = {}) {
  const normalizedStoreId = storeId != null && storeId !== ''
    ? Number(storeId)
    : null;

  await query(
    `INSERT INTO privacy_events (type, store_id, payload)
     VALUES ($1, $2, $3::jsonb)`,
    [type, normalizedStoreId, JSON.stringify(payload ?? {})]
  );
}
