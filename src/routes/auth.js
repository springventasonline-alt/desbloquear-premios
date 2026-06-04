import { Router } from 'express';
import { config, getAuthorizeUrl } from '../config/index.js';
import { generateOAuthState } from '../utils/crypto.js';
import { normalizeQueryParam } from '../utils/query.js';
import {
  consumeOAuthState,
  saveOAuthState,
  upsertStore,
} from '../models/store.js';
import { exchangeCodeForToken } from '../services/tiendanubeAuth.js';
import { getStoreInfo } from '../services/tiendanubeApi.js';
import { activateStoreScript } from '../services/scriptInstaller.js';

const router = Router();

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((err) => (err ? reject(err) : resolve()));
  });
}

/**
 * Valida el state CSRF contra PostgreSQL (fuente de verdad).
 * La sesión no se usa: se pierde al redirigir a tiendanube.com y volver.
 */
async function validateOAuthState(stateParam) {
  if (!stateParam) {
    return { valid: false, reason: 'missing', fromDatabase: false };
  }

  const saved = await consumeOAuthState(stateParam);
  if (saved) {
    return { valid: true, reason: 'ok', fromDatabase: true };
  }

  return { valid: false, reason: 'not_found_or_expired', fromDatabase: false };
}

router.get('/install', async (req, res, next) => {
  try {
    const state = generateOAuthState();
    await saveOAuthState(state);
    req.session.oauthState = state;
    await saveSession(req);
    res.redirect(getAuthorizeUrl(state));
  } catch (error) {
    next(error);
  }
});

router.get('/callback', async (req, res, next) => {
  try {
    const code = normalizeQueryParam(req.query.code);
    const stateParam = normalizeQueryParam(req.query.state);
    const error = normalizeQueryParam(req.query.error);

    if (error) {
      return res.status(400).send(`Error de autorización: ${error}`);
    }

    if (!code) {
      return res.status(400).send('Código de autorización no recibido');
    }

    const stateCheck = await validateOAuthState(stateParam);

    if (stateCheck.valid) {
      console.log('[auth] State CSRF validado (PostgreSQL)');
    } else if (stateParam) {
      // State en URL pero no en nuestra DB: instalación desde Tiendanube sin pasar por /auth/install.
      // El authorization code es de un solo uso y requiere client_secret.
      console.warn('[auth] State no encontrado en DB (%s), continuando con code OAuth', stateCheck.reason);
    } else {
      console.warn('[auth] Callback sin state (instalación directa desde Tiendanube)');
    }

    const tokenData = await exchangeCodeForToken(code);
    let storeInfo = null;

    try {
      storeInfo = await getStoreInfo(tokenData.storeId, tokenData.accessToken);
    } catch (storeError) {
      console.warn('[auth] No se pudo obtener info de tienda:', storeError.message);
    }

    const store = await upsertStore({
      storeId: tokenData.storeId,
      accessToken: tokenData.accessToken,
      scope: tokenData.scope,
      storeName: storeInfo?.name?.es || storeInfo?.name || null,
      storeUrl: storeInfo?.url_with_protocol || storeInfo?.url || null,
    });

    try {
      await activateStoreScript(store);
    } catch (scriptError) {
      console.warn('[auth] Script no instalado:', scriptError.message);
    }

    req.session.storeId = store.id;
    req.session.tiendanubeStoreId = store.tiendanube_store_id;
    delete req.session.oauthState;
    await saveSession(req);

    res.redirect('/admin');
  } catch (error) {
    next(error);
  }
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

router.get('/status', (req, res) => {
  res.json({
    authenticated: Boolean(req.session?.storeId),
    appId: config.tiendanube.appId,
    installUrl: `${config.appUrl}/auth/install`,
  });
});

export default router;
