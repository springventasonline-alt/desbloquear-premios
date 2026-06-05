-- Tiendas exentas de pago (acceso completo sin suscripción)
CREATE TABLE IF NOT EXISTS payment_exempt_stores (
  id SERIAL PRIMARY KEY,
  tiendanube_store_id BIGINT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_exempt_stores_tiendanube_id
  ON payment_exempt_stores (tiendanube_store_id);
