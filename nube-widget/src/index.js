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

// Cupones ya generados en esta sesión — evita llamadas repetidas
const couponCache = {};

async function getCoupon(storeId, levelId, rewardType, rewardValue) {
  const key = `${storeId}-${levelId}`;
  if (couponCache[key]) return couponCache[key];

  try {
    const res = await fetch(`${APP_BASE}/api/coupon`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id: storeId,
        reward_type: rewardType,
        reward_value: rewardValue,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    couponCache[key] = data.code;
    return data.code;
  } catch {
    return null;
  }
}

function buildCouponBox(code, cfg) {
  return box({
    background: cfg.colors.accent + '18',
    border: `1px solid ${cfg.colors.accent}`,
    borderRadius: '8px',
    padding: '10px 14px',
    marginTop: '8px',
    children: [
      txt({ children: '🎉 ¡Premio desbloqueado! Usá este cupón:', fontSize: '13px', fontWeight: '600', display: 'block', marginBottom: '6px' }),
      box({
        background: '#fff',
        border: `2px dashed ${cfg.colors.accent}`,
        borderRadius: '6px',
        padding: '8px 12px',
        textAlign: 'center',
        children: [
          txt({ children: code, fontSize: '18px', fontWeight: '700', letterSpacing: '2px', color: cfg.colors.primary }),
        ],
      }),
      txt({ children: 'Copiá el código y aplicalo en el checkout.', fontSize: '11px', marginTop: '6px', display: 'block', opacity: '0.7' }),
    ],
  });
}

function buildUI(cfg, subtotal, activeCoupons) {
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

  // Cupones activos para mostrar
  const couponBoxes = Object.entries(activeCoupons).map(([, code]) =>
    buildCouponBox(code, cfg)
  );

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
          row({ gap: '8px', marginTop: '12px', flexWrap: 'wrap', children: levelItems }),
          ...couponBoxes,
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
  const activeCoupons = {};

  async function checkAndGenerateCoupons(subtotal) {
    if (!cfg) return;
    const sorted = [...cfg.levels].sort((a, b) => a.order - b.order);
    for (const level of sorted) {
      if (
        subtotal >= level.threshold &&
        (level.rewardType === 'free_shipping' || level.rewardType === 'percentage_discount') &&
        !activeCoupons[level.id]
      ) {
        const code = await getCoupon(storeId, level.id, level.rewardType, level.rewardValue);
        if (code) {
          activeCoupons[level.id] = code;
        }
      }
    }
  }

  fetch(`${APP_BASE}/api/widget/${storeId}`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(async (data) => {
      if (!data?.enabled) return;
      cfg = data;

      const currentState = nube.getState();
      const subtotal = (currentState?.cart?.prices?.subtotal ?? 0) / 100;

      await checkAndGenerateCoupons(subtotal);
      nube.render('before_start_checkout_button', () => buildUI(cfg, subtotal, { ...activeCoupons }));

      nube.on('cart:update', async ({ cart }) => {
        if (!cfg) return;
        const total = (cart?.prices?.subtotal ?? 0) / 100;
        await checkAndGenerateCoupons(total);
        nube.render('before_start_checkout_button', () => buildUI(cfg, total, { ...activeCoupons }));
      });
    })
    .catch((err) => {
      console.warn('[DPP] Widget no cargado:', err.message);
    });
}
