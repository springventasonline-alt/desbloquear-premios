import { config } from '../config/index.js';
import {
  associateScriptToStore,
  listStoreScripts,
  verifyScriptOnStore,
} from './tiendanubeApi.js';
import { setScriptInstalled } from '../models/store.js';

function getScriptQueryParams() {
  return {
    app: 'desbloquear-premios',
    ...(config.appUrl ? { appUrl: config.appUrl } : {}),
  };
}

/**
 * Scripts con "Auto instalado" en Partner Portal:
 * - Tiendanube los carga sin POST /scripts
 * - GET /scripts suele NO listarlos (la API es para scripts manuales)
 * - No hay conflicto real: el POST de nuestra app es innecesario y puede fallar
 */
export async function activateStoreScript(store) {
  const scriptId = config.tiendanube.scriptId;

  if (!scriptId) {
    const message =
      'TIENDANUBE_SCRIPT_ID no está configurado en Railway. ' +
      'Copiá el ID del script (7124) desde partners.tiendanube.com → App 33285 → Scripts.';
    console.error('[script]', message);
    throw new Error(message);
  }

  const storeId = String(store.tiendanube_store_id);
  const accessToken = store.access_token;

  if (!accessToken) {
    throw new Error('La tienda no tiene access_token. Reinstalá la app desde Tiendanube.');
  }

  const autoInstall = config.tiendanube.scriptAutoInstall;

  console.log(
    '[script] Tienda %s | script_id=%s | modo=%s',
    storeId,
    scriptId,
    autoInstall ? 'auto-install (Partner Portal)' : 'manual (API POST)'
  );

  if (autoInstall) {
    return activateAutoInstallScript(store, storeId, accessToken, scriptId);
  }

  return activateManualScript(store, storeId, accessToken, scriptId);
}

async function activateAutoInstallScript(store, storeId, accessToken, scriptId) {
  // Verificación opcional: a veces aparece en GET, a veces no
  let apiScripts = [];
  try {
    apiScripts = await listStoreScripts(storeId, accessToken);
  } catch (error) {
    console.warn('[script] GET /scripts no disponible (normal en auto-install):', error.message);
  }

  const found = apiScripts.find((s) => Number(s.id) === Number(scriptId));
  const apiVisible = Boolean(found);
  const apiActive = found && (found.status === 'active' || found.status === 'testing');

  await setScriptInstalled(store.id, true);

  console.log(
    '[script] Auto-install: marcado instalado en DB. API visible=%s active=%s',
    apiVisible,
    apiActive
  );

  return {
    installed: true,
    mode: 'auto_install',
    scriptId: Number(scriptId),
    storeId,
    apiVisible,
    apiActive,
    status: found?.status ?? 'managed_by_tiendanube',
    message:
      'Script con Auto instalado: Tiendanube lo carga al instalar la app. ' +
      'No hace falta POST /scripts. Si no ves el widget: Deploy del script en "active" o "testing" ' +
      'en tienda demo, y reinstalá la app en esa tienda.',
  };
}

async function activateManualScript(store, storeId, accessToken, scriptId) {
  const preCheck = await verifyScriptOnStore(storeId, accessToken, scriptId);

  if (preCheck.installed) {
    console.log('[script] Script ya activo (status=%s)', preCheck.script?.status);
    await setScriptInstalled(store.id, true);
    return {
      installed: true,
      mode: 'manual',
      scriptId: Number(scriptId),
      storeId,
      status: preCheck.script?.status,
      alreadyActive: true,
    };
  }

  const queryParams = getScriptQueryParams();

  try {
    const result = await associateScriptToStore(storeId, accessToken, scriptId, queryParams);
    console.log('[script] POST/PUT OK:', result?.name ?? result?.id ?? 'ok');

    const verification = await verifyScriptOnStore(storeId, accessToken, scriptId);

    if (verification.reason === 'not_found_on_store') {
      throw new Error(
        `El script ${scriptId} no aparece en la tienda. Desactivá "Auto instalado" en el portal ` +
          'o verificá que el script esté en estado "active".'
      );
    }

    await setScriptInstalled(store.id, true);

    return {
      installed: true,
      mode: 'manual',
      scriptId: Number(scriptId),
      storeId,
      status: verification.script?.status ?? 'associated',
    };
  } catch (error) {
    console.error('[script] Error instalación manual:', error.message);
    await setScriptInstalled(store.id, false);
    throw error;
  }
}
