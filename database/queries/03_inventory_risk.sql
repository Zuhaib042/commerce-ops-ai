SELECT
  sku,
  product_name,
  category,
  current_stock,
  reorder_point,
  ROUND(avg_daily_units, 2) AS avg_daily_units,
  days_of_cover,
  risk_status
FROM commerce.v_inventory_risk
WHERE risk_status <> 'healthy'
ORDER BY
  CASE risk_status
    WHEN 'reorder_now' THEN 1
    WHEN 'stockout_risk' THEN 2
    WHEN 'watch' THEN 3
    ELSE 4
  END,
  current_stock ASC,
  avg_daily_units DESC
LIMIT 50;

