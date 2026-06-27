import { config } from '../config/index.js';

function apiUrl(storeId, path) {
  const { apiBaseUrl, apiVersion } = config.tiendanube;
  return `${apiBaseUrl}/${apiVersion}/${String(storeId)}${path}`;
}

function getHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': config.tiendanube.userAgent,
  };
}

function generateCode(prefix) {
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

/**
 * Crea un cupón de un solo uso en Tiendanube.
 * reward_type: 'free_shipping' | 'percentage_discount'
 * reward_value: porcentaje (ej: 10 para 10%) — ignorado para free_shipping
 */
export async function createCoupon(storeId, accessToken, rewardType, rewardValue) {
  const code = generateCode(rewardType === 'free_shipping' ? 'ENVIOGRATIS' : 'DESC');

  const body = {
    code,
    type: rewardType === 'free_shipping' ? 'shipping' : 'percentage',
    value: rewardType === 'free_shipping' ? 0 : Number(rewardValue ?? 10),
    valid: true,
    max_uses: 1,
    used: 0,
    min_price: null,
    includes_shipping: rewardType === 'free_shipping',
  };

  const response = await fetch(apiUrl(storeId, '/coupons'), {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error al crear cupón: ${text}`);
  }

  const data = await response.json();
  return { code: data.code ?? code };
}
