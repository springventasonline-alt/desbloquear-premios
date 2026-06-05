import { query } from '../db/pool.js';

export async function listExemptStores() {
  const result = await query(
    `SELECT tiendanube_store_id, created_at
     FROM payment_exempt_stores
     ORDER BY created_at ASC`
  );
  return result.rows;
}

export async function addExemptStore(tiendanubeStoreId) {
  const result = await query(
    `INSERT INTO payment_exempt_stores (tiendanube_store_id)
     VALUES ($1)
     ON CONFLICT (tiendanube_store_id) DO NOTHING
     RETURNING tiendanube_store_id, created_at`,
    [tiendanubeStoreId]
  );
  return result.rows[0] || null;
}

export async function removeExemptStore(tiendanubeStoreId) {
  const result = await query(
    `DELETE FROM payment_exempt_stores
     WHERE tiendanube_store_id = $1
     RETURNING tiendanube_store_id`,
    [tiendanubeStoreId]
  );
  return result.rows[0] || null;
}

export async function isPaymentExempt(tiendanubeStoreId) {
  const result = await query(
    'SELECT 1 FROM payment_exempt_stores WHERE tiendanube_store_id = $1',
    [tiendanubeStoreId]
  );
  return result.rows.length > 0;
}
