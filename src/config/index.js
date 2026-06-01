import dotenv from 'dotenv';

dotenv.config();

const required = ['TIENDANUBE_APP_ID', 'TIENDANUBE_CLIENT_SECRET', 'DATABASE_URL'];

for (const key of required) {
  if (!process.env[key]) {
    console.warn(`[config] Falta la variable de entorno: ${key}`);
  }
}

export const config = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  appUrl: process.env.APP_URL || 'http://localhost:3000',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  databaseUrl: process.env.DATABASE_URL,
  tiendanube: {
    appId: process.env.TIENDANUBE_APP_ID || '33285',
    clientSecret: process.env.TIENDANUBE_CLIENT_SECRET,
    redirectUri: process.env.TIENDANUBE_REDIRECT_URI || 'http://localhost:3000/auth/callback',
    apiVersion: process.env.TIENDANUBE_API_VERSION || '2025-03',
    userAgent: process.env.TIENDANUBE_USER_AGENT || 'DesbloquearPremios (dev@localhost)',
    scriptId: process.env.TIENDANUBE_SCRIPT_ID || null,
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
