import { createApp } from './app.js';
import { config } from './config/index.js';
import { pool } from './db/pool.js';
import { getListenPort } from './utils/port.js';
import { runMigrations } from '../scripts/migrate.js';

let httpServer = null;

export async function startServer() {
  const port = getListenPort();
  const app = createApp();

  if (httpServer) {
    return httpServer;
  }

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      httpServer = server;
      console.log(`[server] Escuchando en 0.0.0.0:${port} (process.env.PORT=${process.env.PORT ?? '8080'})`);
      console.log(`[server] Healthcheck: GET /health`);
      console.log(`[server] Desbloquear Premios — ${config.appUrl}`);
      resolve(server);
    });

    server.on('error', (err) => {
      console.error('[server] Error al abrir puerto:', err.message);
      reject(err);
    });
  });
}

export async function runStartupTasks() {
  try {
    await pool.query('SELECT 1');
    console.log('[db] Conexión a PostgreSQL OK');
  } catch (error) {
    console.error('[db] No se pudo conectar a PostgreSQL:', error.message);
    throw error;
  }

  console.log('[start] Ejecutando migraciones...');
  await runMigrations();
  console.log('[start] Migraciones completadas');
}
