-- Eventos de webhooks GDPR / privacidad (Tiendanube)
CREATE TABLE IF NOT EXISTS privacy_events (
  id SERIAL PRIMARY KEY,
  type VARCHAR(64) NOT NULL,
  store_id BIGINT,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_privacy_events_store_id ON privacy_events (store_id);
CREATE INDEX IF NOT EXISTS idx_privacy_events_type ON privacy_events (type);
CREATE INDEX IF NOT EXISTS idx_privacy_events_created_at ON privacy_events (created_at DESC);
