/**
 * Railway inyecta PORT; el servidor debe escuchar exactamente en ese puerto.
 */
export function getListenPort() {
  const raw = process.env.PORT;

  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PORT no está definida. Railway debe inyectar process.env.PORT');
    }
    return 3000;
  }

  const port = parseInt(raw, 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`PORT inválido: "${raw}"`);
  }

  return port;
}
