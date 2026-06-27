SELECT
  c.customer_segment,
  c.acquisition_channel,
  COUNT(DISTINCT c.customer_id) AS customers,
  COUNT(DISTINCT o.order_id) AS orders,
  ROUND(SUM(o.grand_total), 2) AS revenue,
  ROUND(SUM(o.grand_total) / NULLIF(COUNT(DISTINCT c.customer_id), 0), 2) AS revenue_per_customer,
  ROUND(SUM(o.grand_total) / NULLIF(COUNT(DISTINCT o.order_id), 0), 2) AS average_order_value
FROM commerce.customers c
JOIN commerce.orders o ON o.customer_id = c.customer_id
GROUP BY c.customer_segment, c.acquisition_channel
ORDER BY revenue DESC
LIMIT 40;

