import { config } from '../config/index.js';
import {
  associateScriptToStore,
  verifyScriptOnStore,
} from './tiendanubeApi.js';
import { setScriptInstalled } from '../models/store.js';

function getScriptQueryParams() {
  return {
    app: 'desbloquear-premios',
    ...(config.appUrl ? { appUrl: config.appUrl } : {}),
  };
}

export async function activateStoreScript(store) {
  const scriptId = config.tiendanube.scriptId;

  if (!scriptId) {
    const message =
      'TIENDANUBE_SCRIPT_ID no está configurado en Railway. ' +
      'Copiá el ID del script desde partners.tiendanube.com → App 33285 → Scripts.';
    console.error('[script]', message);
    throw new Error(message);
  }

  const storeId = String(store.tiendanube_store_id);
  const accessToken = store.access_token;

  if (!accessToken) {
    throw new Error('La tienda no tiene access_token. Reinstalá la app desde Tiendanube.');
  }

  console.log('[script] Instalando script %s en tienda %s (%s)', scriptId, storeId, store.store_name);

  const preCheck = await verifyScriptOnStore(storeId, accessToken, scriptId);

  if (preCheck.installed) {
    console.log('[script] Script ya activo en la tienda (status=%s)', preCheck.script?.status);
    await setScriptInstalled(store.id, true);
    return {
      installed: true,
      scriptId: Number(scriptId),
      storeId,
      status: preCheck.script?.status,
      alreadyActive: true,
    };
  }

  if (preCheck.script?.is_auto_install) {
    await setScriptInstalled(store.id, true);
    return {
      installed: true,
      scriptId: Number(scriptId),
      storeId,
      status: preCheck.script.status,
      autoInstall: true,
    };
  }

  const queryParams = getScriptQueryParams();

  try {
    const result = await associateScriptToStore(storeId, accessToken, scriptId, queryParams);
    console.log('[script] API respondió OK:', result?.name ?? result?.id ?? 'ok');

    const verification = await verifyScriptOnStore(storeId, accessToken, scriptId);

    if (verification.reason === 'not_found_on_store') {
      throw new Error(
        `El script ${scriptId} no aparece en la tienda. Verificá que esté en estado "active" en Partner Portal.`
      );
    }

    await setScriptInstalled(store.id, true);

    return {
      installed: true,
      scriptId: Number(scriptId),
      storeId,
      status: verification.script?.status ?? 'associated',
    };
  } catch (error) {
    console.error('[script] Error instalando script:', error.message);
    await setScriptInstalled(store.id, false);
    throw error;
  }
}
