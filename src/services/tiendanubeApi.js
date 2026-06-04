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
  return `${apiBaseUrl}/${apiVersion}/${String(storeId)}${path}`;
}

async function parseApiError(response) {
  const text = await response.text();
  try {
    const json = JSON.parse(text);
    if (typeof json === 'string') return json;
    if (json.message) return json.message;
    if (json.error) return json.error;
    if (json.description) return json.description;
    return JSON.stringify(json);
  } catch {
    return text || `HTTP ${response.status}`;
  }
}

export async function getStoreInfo(storeId, accessToken) {
  const response = await fetch(apiUrl(storeId, '/store'), {
    headers: getHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(`Error al obtener tienda: ${await parseApiError(response)}`);
  }

  return response.json();
}

export async function listStoreScripts(storeId, accessToken) {
  const response = await fetch(apiUrl(storeId, '/scripts?per_page=100'), {
    headers: getHeaders(accessToken),
  });

  if (!response.ok) {
    throw new Error(`Error al listar scripts: ${await parseApiError(response)}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.result ?? []);
}

export async function createScriptAssociation(storeId, accessToken, scriptId, queryParams = {}) {
  const response = await fetch(apiUrl(storeId, '/scripts'), {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      script_id: Number(scriptId),
      query_params: JSON.stringify(queryParams),
    }),
  });

  if (!response.ok) {
    const message = await parseApiError(response);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

export async function updateScriptAssociation(storeId, accessToken, associationId, scriptId, queryParams = {}) {
  const response = await fetch(apiUrl(storeId, `/scripts/${associationId}`), {
    method: 'PUT',
    headers: getHeaders(accessToken),
    body: JSON.stringify({
      script_id: Number(scriptId),
      query_params: JSON.stringify(queryParams),
    }),
  });

  if (!response.ok) {
    throw new Error(`Error al actualizar script: ${await parseApiError(response)}`);
  }

  return response.json();
}

/**
 * Asocia el script de la app a la tienda (idempotente).
 * - Si ya existe asociación → PUT
 * - Si no existe → POST
 * - Si POST devuelve 422 (duplicado) → PUT
 */
export async function associateScriptToStore(storeId, accessToken, scriptId, queryParams = {}) {
  const numericScriptId = Number(scriptId);

  if (!numericScriptId || Number.isNaN(numericScriptId)) {
    throw new Error(`script_id inválido: ${scriptId}`);
  }

  const scripts = await listStoreScripts(storeId, accessToken);
  const existing = scripts.find((s) => Number(s.id) === numericScriptId);

  if (existing) {
    console.log('[script] Asociación existente (id=%s), actualizando...', existing.id);
    return updateScriptAssociation(storeId, accessToken, existing.id, numericScriptId, queryParams);
  }

  try {
    console.log('[script] Creando asociación script_id=%s en tienda %s', numericScriptId, storeId);
    return await createScriptAssociation(storeId, accessToken, numericScriptId, queryParams);
  } catch (error) {
    if (error.status === 422) {
      console.warn('[script] POST 422, reintentando con PUT...', error.message);
      const refreshed = await listStoreScripts(storeId, accessToken);
      const retry = refreshed.find((s) => Number(s.id) === numericScriptId);
      if (retry) {
        return updateScriptAssociation(storeId, accessToken, retry.id, numericScriptId, queryParams);
      }
    }
    throw error;
  }
}

/** @deprecated Usar associateScriptToStore */
export async function installScript(storeId, accessToken, scriptId, queryParams = {}) {
  return associateScriptToStore(storeId, accessToken, scriptId, queryParams);
}

export async function uninstallScript(storeId, accessToken, scriptAssociationId) {
  const response = await fetch(apiUrl(storeId, `/scripts/${scriptAssociationId}`), {
    method: 'DELETE',
    headers: getHeaders(accessToken),
  });

  if (!response.ok && response.status !== 404) {
    throw new Error(`Error al desinstalar script: ${await parseApiError(response)}`);
  }

  return true;
}

export async function verifyScriptOnStore(storeId, accessToken, scriptId) {
  const scripts = await listStoreScripts(storeId, accessToken);
  const numericScriptId = Number(scriptId);
  const found = scripts.find((s) => Number(s.id) === numericScriptId);

  if (!found) {
    return { installed: false, reason: 'not_found_on_store' };
  }

  const active = found.status === 'active' || found.status === 'testing';
  return {
    installed: active,
    reason: active ? 'active' : `status_${found.status}`,
    script: found,
  };
}
