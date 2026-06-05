import { timingSafeEqual } from 'node:crypto';
import { config } from '../config/index.js';

function safeCompare(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function requireAdminExemptSession(req, res, next) {
  if (!req.session?.adminExemptUnlocked) {
    return res.status(401).json({ error: 'Acceso no autorizado. Ingresá la contraseña de administración.' });
  }
  next();
}

export function verifyAdminExemptPassword(password) {
  const expected = config.adminExemptPassword;
  if (!expected) {
    return { ok: false, error: 'ADMIN_EXEMPT_PASSWORD no configurada en el servidor' };
  }
  if (!password || typeof password !== 'string') {
    return { ok: false, error: 'Contraseña requerida' };
  }
  if (!safeCompare(password, expected)) {
    return { ok: false, error: 'Contraseña incorrecta' };
  }
  return { ok: true };
}
