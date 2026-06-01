import { config } from '../config/index.js';
import { installScript } from './tiendanubeApi.js';
import { setScriptInstalled } from '../models/store.js';

export async function activateStoreScript(store) {
  const scriptId = config.tiendanube.scriptId;

  if (!scriptId) {
    console.warn('[script] TIENDANUBE_SCRIPT_ID no configurado. Registrá el script en Partner Portal.');
    return { installed: false, reason: 'missing_script_id' };
  }

  await installScript(store.tiendanube_store_id, store.access_token, scriptId, {
    app: 'desbloquear-premios',
  });

  await setScriptInstalled(store.id, true);
  return { installed: true };
}
