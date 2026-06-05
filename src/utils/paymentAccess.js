/**
 * Control de acceso por pago / facturación.
 *
 * Hoy la app no cobra suscripción; este módulo centraliza la lógica para cuando
 * se agreguen chequeos de billing. Las tiendas en payment_exempt_stores obtienen
 * acceso completo sin restricciones de pago.
 *
 * Uso futuro:
 *   if (!(await hasPaymentAccess(store.tiendanube_store_id))) {
 *     return res.status(402).json({ error: 'Suscripción requerida' });
 *   }
 */
import { isPaymentExempt } from '../models/paymentExempt.js';

export async function hasPaymentAccess(tiendanubeStoreId) {
  if (await isPaymentExempt(tiendanubeStoreId)) return true;
  // TODO: verificar suscripción activa cuando exista billing
  return true;
}

export { isPaymentExempt };
