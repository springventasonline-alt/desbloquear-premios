import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, '..', 'migrations');

export async function runMigrations({ closePool = false } = {}) {
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    console.log(`[migrate] Ejecutando ${file}...`);
    await pool.query(sql);
  }

  console.log('[migrate] Migraciones completadas');

  if (closePool) {
    await pool.end();
  }
}

const isDirectRun = process.argv[1]
  && path.resolve(process.argv[1]) === __filename;

if (isDirectRun) {
  runMigrations({ closePool: true }).catch((err) => {
    console.error('[migrate] Error:', err);
    process.exit(1);
  });
}
