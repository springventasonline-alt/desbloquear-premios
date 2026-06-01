-- Tiendas instaladas via OAuth
CREATE TABLE IF NOT EXISTS stores (
  id SERIAL PRIMARY KEY,
  tiendanube_store_id BIGINT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  scope TEXT,
  store_name TEXT,
  store_url TEXT,
  script_installed BOOLEAN NOT NULL DEFAULT FALSE,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uninstalled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stores_tiendanube_id ON stores (tiendanube_store_id);

-- Configuración visual y textos del widget (1 por tienda)
CREATE TABLE IF NOT EXISTS reward_configs (
  id SERIAL PRIMARY KEY,
  store_id INTEGER NOT NULL UNIQUE REFERENCES stores (id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  primary_color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#E0E7FF',
  accent_color VARCHAR(7) NOT NULL DEFAULT '#10B981',
  text_color VARCHAR(7) NOT NULL DEFAULT '#111827',
  font_family VARCHAR(120) NOT NULL DEFAULT 'Inter, system-ui, sans-serif',
  title_text VARCHAR(200) NOT NULL DEFAULT '¡Desbloqueá premios!',
  progress_text VARCHAR(200) NOT NULL DEFAULT 'Agregá {{amount}} más para desbloquear: {{reward}}',
  unlocked_text VARCHAR(200) NOT NULL DEFAULT '¡Desbloqueaste: {{reward}}!',
  all_unlocked_text VARCHAR(200) NOT NULL DEFAULT '¡Felicitaciones! Desbloqueaste todos los premios 🎉',
  show_in_cart BOOLEAN NOT NULL DEFAULT TRUE,
  show_in_checkout BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hasta 6 niveles de premios por tienda
CREATE TYPE reward_type AS ENUM (
  'free_shipping',
  'percentage_discount',
  'fixed_discount',
  'gift',
  'custom'
);

CREATE TABLE IF NOT EXISTS reward_levels (
  id SERIAL PRIMARY KEY,
  config_id INTEGER NOT NULL REFERENCES reward_configs (id) ON DELETE CASCADE,
  level_order SMALLINT NOT NULL CHECK (level_order BETWEEN 1 AND 6),
  threshold_amount NUMERIC(12, 2) NOT NULL CHECK (threshold_amount >= 0),
  reward_type reward_type NOT NULL DEFAULT 'custom',
  reward_value NUMERIC(12, 2),
  title VARCHAR(120) NOT NULL,
  description TEXT,
  icon VARCHAR(40) NOT NULL DEFAULT '🎁',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (config_id, level_order)
);

CREATE INDEX IF NOT EXISTS idx_reward_levels_config ON reward_levels (config_id, level_order);

-- Sesiones OAuth CSRF
CREATE TABLE IF NOT EXISTS oauth_states (
  state VARCHAR(64) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
