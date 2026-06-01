import { runMigrations } from './migrate.js';

async function start() {
  console.log('[start] Ejecutando migraciones...');
  await runMigrations();
  console.log('[start] Iniciando servidor...');
  await import('../src/index.js');
}

start().catch((error) => {
  console.error('[start] Error al iniciar:', error.message);
  process.exit(1);
});
