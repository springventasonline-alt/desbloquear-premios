import { config, getDatabaseHostForLog } from '../src/config/index.js';
import { runMigrations } from './migrate.js';

async function start() {
  console.log('[start] NODE_ENV=%s', config.nodeEnv);
  console.log('[start] DB host=%s', getDatabaseHostForLog());

  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL no configurada');
  }

  console.log('[start] Ejecutando migraciones...');
  await runMigrations();
  console.log('[start] Iniciando servidor...');
  await import('../src/index.js');
}

start().catch((error) => {
  console.error('[start] Error al iniciar:', error.message);
  if (error.code) console.error('[start] Código:', error.code);
  process.exit(1);
});
