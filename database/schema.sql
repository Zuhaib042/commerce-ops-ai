DROP SCHEMA IF EXISTS commerce CASCADE;
CREATE SCHEMA commerce;

CREATE TABLE commerce.suppliers (
  supplier_id TEXT PRIMARY KEY,
  supplier_name TEXT NOT NULL,
  country TEXT NOT NULL,
  lead_time_days INTEGER NOT NULL,
  reliability_score NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE commerce.products (
  product_id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES commerce.suppliers(supplier_id),
  sku TEXT NOT NULL UNIQUE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  reorder_point INTEGER NOT NULL,
  target_stock INTEGER NOT NULL,
  current_stock INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE commerce.customers (
  customer_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  country TEXT NOT NULL,
  state_region TEXT NOT NULL,
  city TEXT NOT NULL,
  acquisition_channel TEXT NOT NULL,
  customer_segment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE commerce.orders (
  order_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES commerce.customers(customer_id),
  order_number TEXT NOT NULL UNIQUE,
  order_date TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL,
  currency TEXT NOT NULL,
  subtotal NUMERIC(12,2) NOT NULL,
  discount_total NUMERIC(12,2) NOT NULL,
  shipping_total NUMERIC(12,2) NOT NULL,
  tax_total NUMERIC(12,2) NOT NULL,
  refund_total NUMERIC(12,2) NOT NULL,
  grand_total NUMERIC(12,2) NOT NULL,
  scenario_tag TEXT
);

CREATE TABLE commerce.order_items (
  order_item_id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES commerce.orders(order_id),
  product_id TEXT NOT NULL REFERENCES commerce.products(product_id),
  sku TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(12,2) NOT NULL,
  unit_cost NUMERIC(12,2) NOT NULL,
  discount_amount NUMERIC(12,2) NOT NULL,
  refund_quantity INTEGER NOT NULL,
  line_total NUMERIC(12,2) NOT NULL
);

CREATE TABLE commerce.inventory_events (
  inventory_event_id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES commerce.products(product_id),
  event_date TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  stock_after INTEGER NOT NULL,
  reference_id TEXT,
  scenario_tag TEXT
);

CREATE TABLE commerce.ad_campaign_daily_metrics (
  metric_id TEXT PRIMARY KEY,
  metric_date DATE NOT NULL,
  platform TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  objective TEXT NOT NULL,
  spend NUMERIC(12,2) NOT NULL,
  impressions INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  conversions INTEGER NOT NULL,
  attributed_revenue NUMERIC(12,2) NOT NULL,
  scenario_tag TEXT
);

CREATE TABLE commerce.email_campaigns (
  campaign_id TEXT PRIMARY KEY,
  sent_at TIMESTAMPTZ NOT NULL,
  campaign_name TEXT NOT NULL,
  audience_segment TEXT NOT NULL,
  subject_line TEXT NOT NULL,
  recipients INTEGER NOT NULL,
  opens INTEGER NOT NULL,
  clicks INTEGER NOT NULL,
  orders INTEGER NOT NULL,
  attributed_revenue NUMERIC(12,2) NOT NULL,
  scenario_tag TEXT
);

CREATE TABLE commerce.support_threads (
  thread_id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES commerce.customers(customer_id),
  order_id TEXT REFERENCES commerce.orders(order_id),
  opened_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL,
  issue_type TEXT NOT NULL,
  priority TEXT NOT NULL,
  sentiment TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT NOT NULL,
  latest_message TEXT NOT NULL,
  scenario_tag TEXT
);

CREATE TABLE commerce.finance_transactions (
  transaction_id TEXT PRIMARY KEY,
  transaction_date DATE NOT NULL,
  account TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  vendor_or_customer TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  related_order_id TEXT REFERENCES commerce.orders(order_id),
  memo TEXT NOT NULL,
  scenario_tag TEXT
);

CREATE TABLE commerce.workflow_events (
  workflow_event_id TEXT PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL,
  workflow_name TEXT NOT NULL,
  source_system TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  message TEXT NOT NULL,
  scenario_tag TEXT
);

CREATE INDEX idx_orders_order_date ON commerce.orders(order_date);
CREATE INDEX idx_orders_customer_id ON commerce.orders(customer_id);
CREATE INDEX idx_order_items_order_id ON commerce.order_items(order_id);
CREATE INDEX idx_order_items_product_id ON commerce.order_items(product_id);
CREATE INDEX idx_inventory_product_date ON commerce.inventory_events(product_id, event_date);
CREATE INDEX idx_ads_date_platform ON commerce.ad_campaign_daily_metrics(metric_date, platform);
CREATE INDEX idx_support_opened_at ON commerce.support_threads(opened_at);
CREATE INDEX idx_finance_transaction_date ON commerce.finance_transactions(transaction_date);
CREATE INDEX idx_workflow_occurred_at ON commerce.workflow_events(occurred_at);

CREATE VIEW commerce.v_daily_revenue AS
SELECT
  DATE(order_date) AS revenue_date,
  COUNT(*) AS order_count,
  SUM(subtotal) AS subtotal,
  SUM(discount_total) AS discounts,
  SUM(shipping_total) AS shipping,
  SUM(tax_total) AS taxes,
  SUM(refund_total) AS refunds,
  SUM(grand_total) AS revenue,
  SUM(item_costs.total_cost) AS cogs,
  SUM(grand_total - item_costs.total_cost - refund_total) AS gross_profit
FROM commerce.orders o
JOIN (
  SELECT order_id, SUM(quantity * unit_cost) AS total_cost
  FROM commerce.order_items
  GROUP BY order_id
) item_costs ON item_costs.order_id = o.order_id
GROUP BY DATE(order_date);

CREATE VIEW commerce.v_product_performance AS
SELECT
  p.product_id,
  p.sku,
  p.product_name,
  p.category,
  p.brand,
  SUM(oi.quantity) AS units_sold,
  SUM(oi.refund_quantity) AS units_refunded,
  SUM(oi.line_total) AS revenue,
  SUM(oi.quantity * oi.unit_cost) AS cogs,
  SUM(oi.line_total - (oi.quantity * oi.unit_cost)) AS gross_profit
FROM commerce.products p
JOIN commerce.order_items oi ON oi.product_id = p.product_id
GROUP BY p.product_id, p.sku, p.product_name, p.category, p.brand;

CREATE VIEW commerce.v_inventory_risk AS
WITH sales_30d AS (
  SELECT
    oi.product_id,
    SUM(oi.quantity)::NUMERIC / 30.0 AS avg_daily_units
  FROM commerce.order_items oi
  JOIN commerce.orders o ON o.order_id = oi.order_id
  WHERE o.order_date >= (
    SELECT MAX(order_date) - INTERVAL '30 days'
    FROM commerce.orders
  )
  GROUP BY oi.product_id
)
SELECT
  p.product_id,
  p.sku,
  p.product_name,
  p.category,
  p.supplier_id,
  p.current_stock,
  p.reorder_point,
  COALESCE(s.avg_daily_units, 0) AS avg_daily_units,
  CASE
    WHEN COALESCE(s.avg_daily_units, 0) = 0 THEN NULL
    ELSE ROUND(p.current_stock / s.avg_daily_units, 1)
  END AS days_of_cover,
  CASE
    WHEN p.current_stock <= p.reorder_point THEN 'reorder_now'
    WHEN COALESCE(s.avg_daily_units, 0) > 0 AND p.current_stock / s.avg_daily_units <= 14 THEN 'stockout_risk'
    WHEN COALESCE(s.avg_daily_units, 0) > 0 AND p.current_stock / s.avg_daily_units <= 30 THEN 'watch'
    ELSE 'healthy'
  END AS risk_status
FROM commerce.products p
LEFT JOIN sales_30d s ON s.product_id = p.product_id;

CREATE VIEW commerce.v_marketing_performance AS
SELECT
  metric_date,
  platform,
  campaign_id,
  campaign_name,
  objective,
  spend,
  impressions,
  clicks,
  conversions,
  attributed_revenue,
  CASE WHEN spend = 0 THEN NULL ELSE ROUND(attributed_revenue / spend, 2) END AS roas,
  CASE WHEN clicks = 0 THEN NULL ELSE ROUND(spend / clicks, 2) END AS cpc,
  CASE WHEN conversions = 0 THEN NULL ELSE ROUND(spend / conversions, 2) END AS cpa,
  scenario_tag
FROM commerce.ad_campaign_daily_metrics;

CREATE VIEW commerce.v_support_summary AS
SELECT
  DATE(opened_at) AS support_date,
  issue_type,
  priority,
  sentiment,
  COUNT(*) AS thread_count
FROM commerce.support_threads
GROUP BY DATE(opened_at), issue_type, priority, sentiment;
