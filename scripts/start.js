import { getDatabaseHostForLog } from '../src/config/index.js';
import { getListenPort } from '../src/utils/port.js';

async function start() {
  const port = getListenPort();
  console.log('[start] NODE_ENV=%s', process.env.NODE_ENV || 'development');
  console.log('[start] PORT=%s → escuchando en 0.0.0.0:%s', process.env.PORT ?? '(default 8080)', port);
  console.log('[start] DB host=%s', getDatabaseHostForLog());

  if (!process.env.DATABASE_URL && !process.env.DATABASE_PRIVATE_URL) {
    throw new Error('DATABASE_URL no configurada');
  }

  const { startServer, runStartupTasks } = await import('../src/index.js');

  // Abrir puerto ANTES de migraciones → Railway healthcheck / proxy no reciben 502
  console.log('[start] Abriendo puerto HTTP...');
  await startServer();

  await runStartupTasks();
}

start().catch((error) => {
  console.error('[start] Error al iniciar:', error.message);
  if (error.code) console.error('[start] Código:', error.code);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});
