import dotenv from 'dotenv';

const isProduction = process.env.NODE_ENV === 'production';

// En Railway/producción solo usamos variables del entorno (nunca .env local)
if (!isProduction) {
  dotenv.config();
}

function resolveDatabaseUrl() {
  // Railway inyecta DATABASE_URL al referenciar ${{Postgres.DATABASE_URL}}
  const candidates = [
    process.env.DATABASE_URL,
    process.env.DATABASE_PRIVATE_URL,
    process.env.POSTGRES_URL,
  ].filter(Boolean);

  const url = candidates[0];

  if (!url && isProduction) {
    throw new Error(
      'DATABASE_URL no está definida. En Railway: Variables → DATABASE_URL=${{Postgres.DATABASE_URL}}'
    );
  }

  if (url && isProduction && isLocalDatabaseUrl(url)) {
    throw new Error(
      'DATABASE_URL apunta a localhost en producción. En Railway eliminá el valor manual y usá: DATABASE_URL=${{Postgres.DATABASE_URL}}'
    );
  }

  return url || null;
}

function isLocalDatabaseUrl(url) {
  try {
    const parsed = new URL(url);
    const host = (parsed.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '::1';
  } catch {
    return /localhost|127\.0\.0\.1/.test(url);
  }
}

const databaseUrl = resolveDatabaseUrl();

const required = isProduction
  ? ['TIENDANUBE_CLIENT_SECRET', 'DATABASE_URL']
  : ['TIENDANUBE_APP_ID', 'TIENDANUBE_CLIENT_SECRET', 'DATABASE_URL'];

for (const key of required) {
  if (key === 'DATABASE_URL') {
    if (!databaseUrl) console.warn('[config] Falta la variable de entorno: DATABASE_URL');
    continue;
  }
  if (!process.env[key]) {
    console.warn(`[config] Falta la variable de entorno: ${key}`);
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  databaseUrl,
  tiendanube: {
    appId: process.env.TIENDANUBE_APP_ID || '33285',
    clientSecret: process.env.TIENDANUBE_CLIENT_SECRET,
    redirectUri: process.env.TIENDANUBE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    apiVersion: process.env.TIENDANUBE_API_VERSION || '2025-03',
    userAgent: process.env.TIENDANUBE_USER_AGENT || 'DesbloquearPremios (dev@localhost)',
    scriptId: process.env.TIENDANUBE_SCRIPT_ID || null,
    /** true = script "Auto instalado" en Partner Portal; no usar POST /scripts */
    scriptAutoInstall: process.env.TIENDANUBE_SCRIPT_AUTO_INSTALL !== 'false',
    authUrl: 'https://www.tiendanube.com/apps',
    tokenUrl: 'https://www.tiendanube.com/apps/authorize/token',
    apiBaseUrl: 'https://api.tiendanube.com',
  },
};

export function getAuthorizeUrl(state) {
  const { appId, authUrl, redirectUri } = config.tiendanube;
  const params = new URLSearchParams({ state });
  return `${authUrl}/${appId}/authorize?${params.toString()}`;
}

export function getDatabaseHostForLog() {
  if (!config.databaseUrl) return '(no configurada)';
  try {
    return new URL(config.databaseUrl).hostname;
  } catch {
    return '(url inválida)';
  }
}
