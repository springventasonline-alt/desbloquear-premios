import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from '../db/pool.js';
import { config } from './index.js';

const PgSession = connectPgSimple(session);

export function getSessionMiddleware() {
  const options = {
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'dpp.sid',
    cookie: {
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
    },
  };

  if (!config.databaseUrl) {
    console.warn('[session] Sin DATABASE_URL — MemoryStore (solo desarrollo local)');
    return session(options);
  }

  options.store = new PgSession({
    pool,
    tableName: 'user_sessions',
    createTableIfMissing: true,
  });

  console.log('[session] PostgreSQL session store (user_sessions)');
  return session(options);
}
