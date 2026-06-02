import { createApp } from './app.js';
import { config } from './config/index.js';
import { pool } from './db/pool.js';

const app = createApp();

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] Conexión a PostgreSQL OK');
  } catch (error) {
    console.error('[db] No se pudo conectar a PostgreSQL:', error.message);
    console.error('[db] Ejecutá: docker compose up -d && npm run db:migrate');
  }

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`[server] Desbloquear Premios corriendo en ${config.appUrl}`);
    console.log(`[server] App ID Tiendanube: ${config.tiendanube.appId}`);
    console.log(`[server] Instalar app: ${config.appUrl}/auth/install`);
    console.log(`[server] Panel admin: ${config.appUrl}/admin`);
  });
}

start();
