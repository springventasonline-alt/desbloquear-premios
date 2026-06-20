import { box, txt, row } from '@tiendanube/nube-sdk-ui';

const APP_BASE = 'https://desbloquear-premios-production.up.railway.app';

function formatARS(pesos) {
  return '$' + Math.round(pesos).toLocaleString('es-AR');
}

function computeProgress(subtotal, levels) {
  const sorted = [...levels].sort((a, b) => a.order - b.order);
  const unlocked = sorted.filter((l) => subtotal >= l.threshold);
  const next = sorted.find((l) => subtotal < l.threshold) ?? null;
  const max = sorted.at(-1)?.threshold ?? 0;
  const percent = max > 0 ? Math.min(100, (subtotal / max) * 100) : 0;
  return { unlocked, next, percent };
}

function buildUI(cfg, subtotal) {
  const { unlocked, next, percent } = computeProgress(subtotal, cfg.levels);
  const allUnlocked = unlocked.length === cfg.levels.length;

  const message = allUnlocked
    ? cfg.texts.allUnlocked
    : next
    ? cfg.texts.progress
        .replace('{{amount}}', formatARS(Math.max(0, next.threshold - subtotal)))
        .replace('{{reward}}', next.title)
    : cfg.texts.title;

  const levelItems = [...cfg.levels]
    .sort((a, b) => a.order - b.order)
    .map((level) => {
      const isUnlocked = subtotal >= level.threshold;
      return box({
        padding: '8px 6px',
        borderRadius: '8px',
        background: isUnlocked ? cfg.colors.accent + '22' : 'rgba(255,255,255,0.6)',
        border: isUnlocked ? `1px solid ${cfg.colors.accent}` : '1px solid transparent',
        opacity: isUnlocked ? '1' : '0.55',
        textAlign: 'center',
        minWidth: '80px',
        flex: '1',
        children: [
          txt({ children: level.icon, fontSize: '18px', display: 'block', marginBottom: '4px' }),
          txt({ children: level.title, fontWeight: '700', fontSize: '11px', display: 'block' }),
          txt({ children: formatARS(level.threshold), fontSize: '11px', display: 'block' }),
        ],
      });
    });

  return box({
    fontFamily: cfg.typography?.fontFamily ?? 'sans-serif',
    margin: '12px 0',
    children: [
      box({
        background: cfg.colors.secondary,
        borderRadius: '12px',
        padding: '14px 16px',
        color: cfg.colors.text,
        children: [
          txt({ children: cfg.texts.title, fontSize: '15px', fontWeight: '700', marginBottom: '10px', display: 'block' }),
          box({
            background: 'rgba(0,0,0,0.08)',
            borderRadius: '999px',
            height: '10px',
            overflow: 'hidden',
            children: [
              box({
                background: `linear-gradient(90deg, ${cfg.colors.primary}, ${cfg.colors.accent})`,
                height: '100%',
                borderRadius: '999px',
                width: `${percent.toFixed(1)}%`,
              }),
            ],
          }),
          txt({ children: message, fontSize: '13px', marginTop: '10px', lineHeight: '1.4', display: 'block' }),
          row({
            gap: '8px',
            marginTop: '12px',
            flexWrap: 'wrap',
            children: levelItems,
          }),
        ],
      }),
    ],
  });
}

export function App(nube) {
  const state = nube.getState();
  const storeId = state?.store?.id;

  if (!storeId) {
    console.warn('[DPP] No se encontró store ID en el estado de NubeSDK');
    return;
  }

  let cfg = null;

  fetch(`${APP_BASE}/api/widget/${storeId}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      if (!data?.enabled) return;
      cfg = data;

      const currentState = nube.getState();
      const subtotal = (currentState?.cart?.prices?.subtotal ?? 0) / 100;

      nube.render('before_start_checkout_button', () => buildUI(cfg, subtotal));

      nube.on('cart:update', ({ cart }) => {
        if (!cfg) return;
        const total = (cart?.prices?.subtotal ?? 0) / 100;
        nube.render('before_start_checkout_button', () => buildUI(cfg, total));
      });
    })
    .catch((err) => {
      console.warn('[DPP] Widget no cargado:', err.message);
    });
}
