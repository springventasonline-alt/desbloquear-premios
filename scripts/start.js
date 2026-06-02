import { getDatabaseHostForLog } from '../src/config/index.js';
import { getListenPort } from '../src/utils/port.js';
import { runMigrations } from './migrate.js';

async function start() {
  const port = getListenPort();
  console.log('[start] NODE_ENV=%s', process.env.NODE_ENV || 'development');
  console.log('[start] PORT=%s (escuchará en 0.0.0.0:%s)', process.env.PORT, port);
  console.log('[start] DB host=%s', getDatabaseHostForLog());

  if (!process.env.DATABASE_URL && !process.env.DATABASE_PRIVATE_URL) {
    throw new Error('DATABASE_URL no configurada');
  }

  console.log('[start] Ejecutando migraciones...');
  await runMigrations();

  console.log('[start] Iniciando servidor HTTP...');
  const { startServer } = await import('../src/index.js');
  await startServer();
}

start().catch((error) => {
  console.error('[start] Error al iniciar:', error.message);
  if (error.code) console.error('[start] Código:', error.code);
  if (error.stack) console.error(error.stack);
  process.exit(1);
});
