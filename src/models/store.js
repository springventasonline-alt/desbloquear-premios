import { query } from '../db/pool.js';

const DEFAULT_LEVELS = [
  {
    level_order: 1,
    threshold_amount: 100,
    reward_type: 'free_shipping',
    reward_value: null,
    title: 'Envío gratis',
    description: 'Desbloqueá envío gratis en tu compra',
    icon: '🚚',
  },
  {
    level_order: 2,
    threshold_amount: 200,
    reward_type: 'percentage_discount',
    reward_value: 5,
    title: '5% OFF',
    description: 'Descuento del 5% en tu pedido',
    icon: '🏷️',
  },
  {
    level_order: 3,
    threshold_amount: 350,
    reward_type: 'gift',
    reward_value: null,
    title: 'Regalo sorpresa',
    description: 'Te regalamos un producto especial',
    icon: '🎁',
  },
];

export async function findStoreByTiendanubeId(tiendanubeStoreId) {
  const result = await query(
    'SELECT * FROM stores WHERE tiendanube_store_id = $1 AND uninstalled_at IS NULL',
    [tiendanubeStoreId]
  );
  return result.rows[0] || null;
}

export async function findStoreById(id) {
  const result = await query(
    'SELECT * FROM stores WHERE id = $1 AND uninstalled_at IS NULL',
    [id]
  );
  return result.rows[0] || null;
}

export async function upsertStore({ storeId, accessToken, scope, storeName, storeUrl }) {
  const result = await query(
    `INSERT INTO stores (tiendanube_store_id, access_token, scope, store_name, store_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tiendanube_store_id) DO UPDATE SET
       access_token = EXCLUDED.access_token,
       scope = EXCLUDED.scope,
       store_name = EXCLUDED.store_name,
       store_url = EXCLUDED.store_url,
       uninstalled_at = NULL,
       updated_at = NOW()
     RETURNING *`,
    [storeId, accessToken, scope, storeName, storeUrl]
  );

  const store = result.rows[0];
  await ensureDefaultConfig(store.id);
  return store;
}

export async function markStoreUninstalled(tiendanubeStoreId) {
  await query(
    `UPDATE stores SET uninstalled_at = NOW(), updated_at = NOW()
     WHERE tiendanube_store_id = $1`,
    [tiendanubeStoreId]
  );
}

export async function setScriptInstalled(storeId, installed) {
  await query(
    'UPDATE stores SET script_installed = $2, updated_at = NOW() WHERE id = $1',
    [storeId, installed]
  );
}

async function ensureDefaultConfig(storeId) {
  const existing = await query('SELECT id FROM reward_configs WHERE store_id = $1', [storeId]);
  if (existing.rows.length > 0) return;

  const configResult = await query(
    `INSERT INTO reward_configs (store_id) VALUES ($1) RETURNING id`,
    [storeId]
  );

  const configId = configResult.rows[0].id;

  for (const level of DEFAULT_LEVELS) {
    await query(
      `INSERT INTO reward_levels
        (config_id, level_order, threshold_amount, reward_type, reward_value, title, description, icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        configId,
        level.level_order,
        level.threshold_amount,
        level.reward_type,
        level.reward_value,
        level.title,
        level.description,
        level.icon,
      ]
    );
  }
}

export async function getRewardConfigByStoreId(storeId) {
  const configResult = await query(
    'SELECT * FROM reward_configs WHERE store_id = $1',
    [storeId]
  );

  if (configResult.rows.length === 0) return null;

  const config = configResult.rows[0];
  const levelsResult = await query(
    `SELECT * FROM reward_levels
     WHERE config_id = $1 AND active = TRUE
     ORDER BY level_order ASC`,
    [config.id]
  );

  return { ...config, levels: levelsResult.rows };
}

export async function updateRewardConfig(storeId, payload) {
  const fields = [
    'enabled',
    'primary_color',
    'secondary_color',
    'accent_color',
    'text_color',
    'font_family',
    'title_text',
    'progress_text',
    'unlocked_text',
    'all_unlocked_text',
    'show_in_cart',
    'show_in_checkout',
  ];

  const updates = [];
  const values = [storeId];
  let index = 2;

  for (const field of fields) {
    if (payload[field] !== undefined) {
      updates.push(`${field} = $${index}`);
      values.push(payload[field]);
      index += 1;
    }
  }

  if (updates.length === 0) {
    return getRewardConfigByStoreId(storeId);
  }

  updates.push('updated_at = NOW()');

  await query(
    `UPDATE reward_configs SET ${updates.join(', ')} WHERE store_id = $1`,
    values
  );

  return getRewardConfigByStoreId(storeId);
}

export async function replaceRewardLevels(storeId, levels) {
  const config = await getRewardConfigByStoreId(storeId);
  if (!config) throw new Error('Configuración no encontrada');

  if (levels.length > 6) {
    throw new Error('Máximo 6 niveles de premios permitidos');
  }

  await query('DELETE FROM reward_levels WHERE config_id = $1', [config.id]);

  for (const level of levels) {
    await query(
      `INSERT INTO reward_levels
        (config_id, level_order, threshold_amount, reward_type, reward_value, title, description, icon, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        config.id,
        level.level_order,
        level.threshold_amount,
        level.reward_type,
        level.reward_value ?? null,
        level.title,
        level.description ?? null,
        level.icon || '🎁',
        level.active !== false,
      ]
    );
  }

  return getRewardConfigByStoreId(storeId);
}

export async function getPublicWidgetConfig(tiendanubeStoreId) {
  const store = await findStoreByTiendanubeId(tiendanubeStoreId);
  if (!store) return null;

  const config = await getRewardConfigByStoreId(store.id);
  if (!config || !config.enabled) return null;

  return {
    storeId: store.tiendanube_store_id,
    enabled: config.enabled,
    colors: {
      primary: config.primary_color,
      secondary: config.secondary_color,
      accent: config.accent_color,
      text: config.text_color,
    },
    typography: {
      fontFamily: config.font_family,
    },
    texts: {
      title: config.title_text,
      progress: config.progress_text,
      unlocked: config.unlocked_text,
      allUnlocked: config.all_unlocked_text,
    },
    visibility: {
      cart: config.show_in_cart,
      checkout: config.show_in_checkout,
    },
    levels: config.levels.map((level) => ({
      order: level.level_order,
      threshold: Number(level.threshold_amount),
      type: level.reward_type,
      value: level.reward_value ? Number(level.reward_value) : null,
      title: level.title,
      description: level.description,
      icon: level.icon,
    })),
  };
}

export async function saveOAuthState(state) {
  // Limpiar states expirados (>15 min) para evitar acumulación
  await query(
    `DELETE FROM oauth_states WHERE created_at < NOW() - INTERVAL '15 minutes'`
  );
  await query('INSERT INTO oauth_states (state) VALUES ($1)', [state]);
}

export async function consumeOAuthState(state) {
  const result = await query(
    `DELETE FROM oauth_states
     WHERE state = $1
       AND created_at >= NOW() - INTERVAL '15 minutes'
     RETURNING state`,
    [state]
  );
  return result.rows[0] || null;
}
