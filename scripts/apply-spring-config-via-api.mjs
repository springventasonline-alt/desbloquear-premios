#!/usr/bin/env node
/**
 * Aplica la config Spring Villa María (tiendanube_store_id 6125057) en producción.
 *
 * Modo Postgres (recomendado — equivalente a seed-spring-6125057.sql):
 *   DATABASE_URL=postgres://... node scripts/apply-spring-config-via-api.mjs
 *
 * Modo Admin API (sesión OAuth de la tienda en /admin):
 *   APP_URL=https://desbloquear-premios-production.up.railway.app \
 *   ADMIN_COOKIE="connect.sid=..." \
 *   node scripts/apply-spring-config-via-api.mjs --api
 *
 * Obtener ADMIN_COOKIE: DevTools → Application → Cookies → connect.sid
 * tras abrir /admin logueado como Spring (6125057).
 */
import pg from 'pg';

const STORE_TN_ID = Number(process.env.TN_STORE_ID || '6125057');
const APP_URL = (process.env.APP_URL || 'https://desbloquear-premios-production.up.railway.app').replace(/\/$/, '');
const USE_API = process.argv.includes('--api');

const CONFIG = {
  enabled: true,
  primary_color: '#1a1a1a',
  secondary_color: '#faf9f7',
  accent_color: '#c9a962',
  text_color: '#1a1a1a',
  font_family: "'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  title_text: 'Beneficios Spring',
  progress_text: 'Te faltan {{amount}} para {{reward}}',
  unlocked_text: '¡Ya tenés {{reward}} en tu compra!',
  all_unlocked_text: '¡Felicitaciones! Desbloqueaste todos los beneficios 🎉',
  show_in_cart: true,
  show_in_checkout: true,
};

const LEVELS = [
  {
    level_order: 1,
    threshold_amount: 60000,
    reward_type: 'gift',
    reward_value: null,
    title: 'Aros de regalo',
    description: 'Un par de aros Spring de regalo',
    icon: '💍',
  },
  {
    level_order: 2,
    threshold_amount: 90000,
    reward_type: 'gift',
    reward_value: null,
    title: 'Collar de regalo',
    description: 'Collar Spring de regalo',
    icon: '📿',
  },
  {
    level_order: 3,
    threshold_amount: 120000,
    reward_type: 'gift',
    reward_value: null,
    title: 'Perfume de regalo',
    description: 'Perfume Spring de regalo',
    icon: '🎁',
  },
  {
    level_order: 4,
    threshold_amount: 150000,
    reward_type: 'gift',
    reward_value: null,
    title: 'Remera de regalo',
    description: 'Remera Spring de regalo',
    icon: '👕',
  },
];

async function applyViaDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no definida. Usá --api o exportá DATABASE_URL de Railway Postgres.');
  }

  const client = new pg.Client({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const storeRes = await client.query(
      `SELECT id FROM stores WHERE tiendanube_store_id = $1 AND uninstalled_at IS NULL`,
      [STORE_TN_ID]
    );
    if (storeRes.rows.length === 0) {
      throw new Error(`Tienda ${STORE_TN_ID} no encontrada en stores (¿app instalada?)`);
    }
    const storeId = storeRes.rows[0].id;

    await client.query(
      `UPDATE reward_configs SET
        enabled = $2,
        primary_color = $3,
        secondary_color = $4,
        accent_color = $5,
        text_color = $6,
        font_family = $7,
        title_text = $8,
        progress_text = $9,
        unlocked_text = $10,
        all_unlocked_text = $11,
        show_in_cart = $12,
        show_in_checkout = $13,
        updated_at = NOW()
      WHERE store_id = $1`,
      [
        storeId,
        CONFIG.enabled,
        CONFIG.primary_color,
        CONFIG.secondary_color,
        CONFIG.accent_color,
        CONFIG.text_color,
        CONFIG.font_family,
        CONFIG.title_text,
        CONFIG.progress_text,
        CONFIG.unlocked_text,
        CONFIG.all_unlocked_text,
        CONFIG.show_in_cart,
        CONFIG.show_in_checkout,
      ]
    );

    const cfgRes = await client.query(`SELECT id FROM reward_configs WHERE store_id = $1`, [storeId]);
    const configId = cfgRes.rows[0].id;

    await client.query(`DELETE FROM reward_levels WHERE config_id = $1`, [configId]);

    for (const level of LEVELS) {
      await client.query(
        `INSERT INTO reward_levels
          (config_id, level_order, threshold_amount, reward_type, reward_value, title, description, icon, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
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

    console.log('[apply-spring-config] OK via Postgres — store', STORE_TN_ID);
  } finally {
    await client.end();
  }
}

async function applyViaAdminApi() {
  const cookie = process.env.ADMIN_COOKIE;
  if (!cookie) {
    throw new Error('ADMIN_COOKIE no definida. Logueate en /admin y copiá connect.sid.');
  }

  const headers = {
    'Content-Type': 'application/json',
    Cookie: cookie.includes('=') ? cookie : `connect.sid=${cookie}`,
  };

  const configRes = await fetch(`${APP_URL}/admin/api/config`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(CONFIG),
  });
  const configBody = await configRes.json();
  if (!configRes.ok) {
    throw new Error(`PUT /admin/api/config ${configRes.status}: ${configBody.error || JSON.stringify(configBody)}`);
  }

  const levelsRes = await fetch(`${APP_URL}/admin/api/levels`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ levels: LEVELS }),
  });
  const levelsBody = await levelsRes.json();
  if (!levelsRes.ok) {
    throw new Error(`PUT /admin/api/levels ${levelsRes.status}: ${levelsBody.error || JSON.stringify(levelsBody)}`);
  }

  console.log('[apply-spring-config] OK via Admin API — store', STORE_TN_ID);
  console.log(JSON.stringify(levelsBody.config?.levels?.length ?? LEVELS.length, null, 0), 'niveles');
}

async function main() {
  if (USE_API) {
    await applyViaAdminApi();
  } else {
    await applyViaDatabase();
  }
}

main().catch((err) => {
  console.error('[apply-spring-config] Error:', err.message);
  process.exit(1);
});
