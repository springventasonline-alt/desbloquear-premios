/**
 * Railway inyecta PORT (típicamente 8080). El proxy público debe apuntar al mismo puerto.
 * @see https://docs.railway.com/networking/troubleshooting/application-failed-to-respond
 */
export function getListenPort() {
  const raw = process.env.PORT;

  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      // Fallback al puerto habitual de Railway si PORT no está visible aún
      console.warn('[port] PORT no definida, usando 8080 (default Railway)');
      return 8080;
    }
    return 3000;
  }

  const port = parseInt(raw, 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`PORT inválido: "${raw}"`);
  }

  return port;
}
