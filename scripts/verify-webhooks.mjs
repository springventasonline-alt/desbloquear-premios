/**
 * Verificación rápida: rutas registradas y respuestas de webhooks GDPR.
 * Requiere DATABASE_URL y migración 003_privacy_events aplicada.
 */
import http from 'node:http';
import { createApp } from '../src/app.js';
import { pool } from '../src/db/pool.js';

const app = createApp();
const server = http.createServer(app);

function request(port, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          let json = null;
          try {
            json = raw ? JSON.parse(raw) : null;
          } catch {
            json = raw;
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const TEST_STORE_ID = 999999999;

server.listen(0, async () => {
  const port = server.address().port;
  const endpoints = [
    ['/webhooks/store/redact', { store_id: TEST_STORE_ID }],
    ['/webhooks/customers/redact', { store_id: TEST_STORE_ID, customer: { id: 1 } }],
    ['/webhooks/customers/data_request', { store_id: TEST_STORE_ID, customer: { id: 1 } }],
    ['/webhooks/app/uninstalled', { store_id: TEST_STORE_ID }],
  ];

  let failed = false;

  for (const [path, body] of endpoints) {
    const res = await request(port, 'POST', path, body);
    if (res.status !== 200 || res.body?.received !== true) {
      console.error(`[verify] FAIL ${path}`, res);
      failed = true;
    } else {
      console.log(`[verify] OK ${path} → 200 { received: true }`);
    }
  }

  const widgetRes = await request(port, 'GET', `/api/widget/${TEST_STORE_ID}`);
  if (widgetRes.status !== 404) {
    console.error('[verify] FAIL GET /api/widget (esperado 404 para tienda desinstalada)', widgetRes);
    failed = true;
  } else {
    console.log('[verify] OK GET /api/widget/:storeId → 404 (tienda desinstalada)');
  }

  const count = await pool.query(
    `SELECT COUNT(*)::int AS n FROM privacy_events WHERE store_id = $1`,
    [TEST_STORE_ID]
  );
  const n = count.rows[0]?.n ?? 0;
  if (n < 4) {
    console.error(`[verify] FAIL privacy_events: esperado >= 4, encontrado ${n}`);
    failed = true;
  } else {
    console.log(`[verify] OK privacy_events: ${n} filas para store_id de prueba`);
  }

  await pool.query('DELETE FROM privacy_events WHERE store_id = $1', [TEST_STORE_ID]);
  await pool.end();
  server.close();

  if (failed) process.exit(1);
  console.log('[verify] Todas las comprobaciones pasaron');
});
