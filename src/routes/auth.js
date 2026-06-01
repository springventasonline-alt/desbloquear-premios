import { Router } from 'express';
import { config, getAuthorizeUrl } from '../config/index.js';
import { generateOAuthState } from '../utils/crypto.js';
import {
  consumeOAuthState,
  saveOAuthState,
  upsertStore,
} from '../models/store.js';
import { exchangeCodeForToken } from '../services/tiendanubeAuth.js';
import { getStoreInfo } from '../services/tiendanubeApi.js';
import { activateStoreScript } from '../services/scriptInstaller.js';

const router = Router();

router.get('/install', async (req, res, next) => {
  try {
    const state = generateOAuthState();
    await saveOAuthState(state);
    req.session.oauthState = state;
    res.redirect(getAuthorizeUrl(state));
  } catch (error) {
    next(error);
  }
});

router.get('/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).send(`Error de autorización: ${error}`);
    }

    if (!code) {
      return res.status(400).send('Código de autorización no recibido');
    }

    const savedState = await consumeOAuthState(state);
    if (!savedState || state !== req.session.oauthState) {
      return res.status(403).send('State inválido. Posible ataque CSRF.');
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
