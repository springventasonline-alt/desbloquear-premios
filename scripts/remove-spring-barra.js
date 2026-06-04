#!/usr/bin/env node
/**
 * Quita la barra de regalos / widgets del carrito en springvm.com.ar
 * sin tocar archivos FTP (inyectan vía Scripts API + nubesdk-slot).
 *
 * Uso:
 *   TN_ACCESS_TOKEN=xxx TN_STORE_ID=6125057 node scripts/remove-spring-barra.js
 */
const STORE_ID = process.env.TN_STORE_ID || '6125057';
const TOKEN = process.env.TN_ACCESS_TOKEN || process.argv[2];
const API = `https://api.tiendanube.com/v1/${STORE_ID}`;
const UA = process.env.TN_USER_AGENT || 'SpringCleanup (paloma@springvm.com.ar)';

const REMOVE_HANDLES = [
  'desbloquear-premios-barra',
  'desbloquear-premios',
  'barra-regalos',
  'barra_regalos',
  'regalo-carrito',
  'regalo-en-el-carrito',
];

const REMOVE_URL_PARTS = [
  'desbloquear-premios',
  'railway.app',
  '65000',
  'barra regalos',
  'dpp-rewards',
];

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authentication: `bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': UA,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${res.status} ${path}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
  }
  return body;
}

function shouldRemove(script) {
  const blob = JSON.stringify(script).toLowerCase();
  if (REMOVE_HANDLES.some((h) => blob.includes(h))) return true;
  if (REMOVE_URL_PARTS.some((p) => blob.includes(p.toLowerCase()))) return true;
  const src = (script.src || script.url || script.event_url || '').toLowerCase();
  if (REMOVE_URL_PARTS.some((p) => src.includes(p.toLowerCase()))) return true;
  return false;
}

async function main() {
  if (!TOKEN) {
    console.error('Falta TN_ACCESS_TOKEN o pasalo como 2do argumento.');
    process.exit(1);
  }

  console.log(`Tienda ${STORE_ID} — listando scripts instalados...\n`);
  const scripts = await api('/scripts?per_page=100');
  const list = Array.isArray(scripts) ? scripts : scripts.result || [];

  if (!list.length) {
    console.log('No hay scripts asociados a la tienda.');
    return;
  }

  console.log(`Encontrados ${list.length} script(s):\n`);
  for (const s of list) {
    console.log(
      `  id=${s.id} script_id=${s.script_id} event=${s.event || '-'} src=${s.src || s.url || '(n/a)'}`
    );
    if (s.query_params) console.log(`    query_params: ${s.query_params}`);
  }

  const toDelete = list.filter(shouldRemove);
  const maybeManual = list.filter(
    (s) =>
      !shouldRemove(s) &&
      (String(s.event || '').includes('cart') ||
        String(s.src || '').includes('widget') ||
        String(s.src || '').includes('regalo'))
  );

  if (maybeManual.length) {
    console.log('\n⚠ Revisar manualmente (carrito/widget):');
    for (const s of maybeManual) {
      console.log(`  id=${s.id} src=${s.src || s.url}`);
    }
  }

  if (!toDelete.length) {
    console.log('\nNingún script coincide con barra/regalos/desbloquear-premios.');
    console.log('Si la barra sigue visible, revisá:');
    console.log('  - Admin → Configuración → Códigos externos (store.assorted_js)');
    console.log('  - Admin → Tienda de aplicaciones → "Regalo en el carrito" → Desinstalar');
    console.log('  - Diseño → Carrito → sellos con HTML/JS personalizado');
    return;
  }

  console.log(`\nEliminando ${toDelete.length} script(s)...`);
  for (const s of toDelete) {
    await api(`/scripts/${s.id}`, { method: 'DELETE' });
    console.log(`  ✓ DELETE scripts/${s.id} (script_id=${s.script_id})`);
  }

  console.log('\nListo. Probá el carrito en incógnito: https://www.springvm.com.ar/');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
