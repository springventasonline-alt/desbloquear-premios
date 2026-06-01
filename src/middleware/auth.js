export function requireStoreSession(req, res, next) {
  if (!req.session?.storeId) {
    return res.status(401).json({ error: 'Sesión no autenticada. Instalá la app desde Tiendanube.' });
  }
  next();
}

export async function attachStore(req, res, next) {
  try {
    const { findStoreById } = await import('../models/store.js');
    const store = await findStoreById(req.session.storeId);
    if (!store) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Tienda no encontrada o app desinstalada' });
    }
    req.store = store;
    next();
  } catch (error) {
    next(error);
  }
}
