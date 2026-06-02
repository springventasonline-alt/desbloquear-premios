import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

function getSslConfig() {
  if (config.nodeEnv !== 'production') return false;

  const url = config.databaseUrl || '';
  // Railway Postgres interno suele no requerir SSL; URLs públicas sí
  if (url.includes('railway.internal') || url.includes('rlwy.net')) {
    return { rejectUnauthorized: false };
  }

  return { rejectUnauthorized: false };
}

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: getSslConfig(),
});

pool.on('error', (err) => {
  console.error('[db] Error inesperado en el pool de PostgreSQL', err);
});

export async function query(text, params) {
  return pool.query(text, params);
}
