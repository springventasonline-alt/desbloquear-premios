import { createApp } from './app.js';
import { config } from './config/index.js';
import { pool } from './db/pool.js';
import { getListenPort } from './utils/port.js';

export async function startServer() {
  const port = getListenPort();
  const app = createApp();

  try {
    await pool.query('SELECT 1');
    console.log('[db] Conexión a PostgreSQL OK');
  } catch (error) {
    console.error('[db] No se pudo conectar a PostgreSQL:', error.message);
    throw error;
  }

  return new Promise((resolve) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`[server] Escuchando en 0.0.0.0:${port} (process.env.PORT=${process.env.PORT})`);
      console.log(`[server] Desbloquear Premios — ${config.appUrl}`);
      console.log(`[server] App ID Tiendanube: ${config.tiendanube.appId}`);
      console.log(`[server] Instalar: ${config.appUrl}/auth/install`);
      console.log(`[server] Panel: ${config.appUrl}/admin`);
      resolve(server);
    });

    server.on('error', (err) => {
      console.error('[server] Error al abrir puerto:', err.message);
      process.exit(1);
    });
  });
}
