import { config } from '../config/index.js';

function getHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'User-Agent': config.tiendanube.userAgent,
  };
}

function apiUrl(storeId, path) {
  const { apiBaseUrl, apiVersion } = config.tiendanube;
  return `${apiBaseUrl}/${apiVersion}/${storeId}${path}`;
}

export async function getStoreInfo(storeId, accessToken) {
  const response = await fetch(apiUrl(storeId, '/store'), {
    headers: getHeaders(accessToken),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al obtener tienda: ${error}`);
  }

  return response.json();
}

export async function installScript(storeId, accessToken, scriptId, queryParams = {}) {
  const response = await fetch(apiUrl(storeId, '/scripts'), {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      script_id: Number(scriptId),
      query_params: JSON.stringify(queryParams),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Error al instalar script: ${error}`);
  }

  return response.json();
}

export async function uninstallScript(storeId, accessToken, scriptAssociationId) {
  const response = await fetch(apiUrl(storeId, `/scripts/${scriptAssociationId}`), {
    method: 'DELETE',
    headers: getHeaders(accessToken),
  });

  if (!response.ok && response.status !== 404) {
    const error = await response.text();
    throw new Error(`Error al desinstalar script: ${error}`);
  }

  return true;
}
