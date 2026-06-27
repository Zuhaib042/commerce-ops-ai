SELECT
  sku,
  product_name,
  category,
  brand,
  units_sold,
  units_refunded,
  ROUND(revenue, 2) AS revenue,
  ROUND(gross_profit, 2) AS gross_profit,
  ROUND(gross_profit / NULLIF(revenue, 0), 4) AS gross_margin_rate
FROM commerce.v_product_performance
ORDER BY gross_profit DESC
LIMIT 25;

