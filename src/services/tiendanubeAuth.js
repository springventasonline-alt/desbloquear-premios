import { config } from '../config/index.js';

export async function exchangeCodeForToken(code) {
  const { appId, clientSecret, tokenUrl } = config.tiendanube;

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: appId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || 'Error al obtener access token');
  }

  return {
    accessToken: data.access_token,
    scope: data.scope,
    storeId: String(data.user_id),
  };
}
