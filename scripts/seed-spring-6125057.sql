-- Configuración recomendada para Spring Villa María (tiendanube_store_id 6125057)
-- Ejecutar en Railway PostgreSQL: psql $DATABASE_URL -f scripts/seed-spring-6125057.sql

UPDATE reward_configs rc
SET
  enabled = TRUE,
  primary_color = '#1a1a1a',
  secondary_color = '#faf9f7',
  accent_color = '#c9a962',
  text_color = '#1a1a1a',
  font_family = '''Montserrat'', ''Helvetica Neue'', Arial, sans-serif',
  title_text = 'Beneficios Spring',
  progress_text = 'Te faltan {{amount}} para {{reward}}',
  unlocked_text = '¡Ya tenés {{reward}} en tu compra!',
  all_unlocked_text = '¡Felicitaciones! Desbloqueaste todos los beneficios 🎉',
  show_in_cart = TRUE,
  show_in_checkout = TRUE,
  updated_at = NOW()
FROM stores s
WHERE rc.store_id = s.id
  AND s.tiendanube_store_id = 6125057;

DELETE FROM reward_levels
WHERE config_id IN (
  SELECT rc.id FROM reward_configs rc
  JOIN stores s ON s.id = rc.store_id
  WHERE s.tiendanube_store_id = 6125057
);

INSERT INTO reward_levels
  (config_id, level_order, threshold_amount, reward_type, reward_value, title, description, icon, active)
SELECT
  rc.id,
  v.level_order,
  v.threshold_amount,
  v.reward_type::reward_type,
  v.reward_value,
  v.title,
  v.description,
  v.icon,
  TRUE
FROM reward_configs rc
JOIN stores s ON s.id = rc.store_id
CROSS JOIN (
  VALUES
    (1, 60000, 'gift', NULL, 'Aros de regalo', 'Un par de aros Spring de regalo', '💍'),
    (2, 90000, 'gift', NULL, 'Collar de regalo', 'Collar Spring de regalo', '📿'),
    (3, 120000, 'gift', NULL, 'Perfume de regalo', 'Perfume Spring de regalo', '🎁'),
    (4, 150000, 'gift', NULL, 'Remera de regalo', 'Remera Spring de regalo', '👕')
) AS v(level_order, threshold_amount, reward_type, reward_value, title, description, icon)
WHERE s.tiendanube_store_id = 6125057;
