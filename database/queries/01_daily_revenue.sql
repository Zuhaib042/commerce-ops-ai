SELECT
  revenue_date,
  order_count,
  ROUND(revenue, 2) AS revenue,
  ROUND(refunds, 2) AS refunds,
  ROUND(cogs, 2) AS cogs,
  ROUND(gross_profit, 2) AS gross_profit,
  ROUND(gross_profit / NULLIF(revenue, 0), 4) AS gross_margin_rate
FROM commerce.v_daily_revenue
ORDER BY revenue_date DESC
LIMIT 30;

