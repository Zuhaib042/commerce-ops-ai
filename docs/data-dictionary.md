# Data Dictionary

## Overview

The `commerce` schema is the operational warehouse for CommerceOps AI OS. It combines public retail transactions with library-based enrichment for systems that would normally come from Shopify, Klaviyo, Google Ads, Meta Ads, QuickBooks, Gmail, Slack, and automation tools.

## Source And Enrichment

| Area | Source |
| --- | --- |
| Orders and order items | UCI Online Retail dataset transformed into Shopify-style records |
| Products | UCI stock codes and descriptions enriched with product metadata |
| Customers | UCI customer IDs enriched with safe demo profile fields |
| Suppliers | Faker-generated supplier profiles |
| Inventory events | Derived from order item quantities and stock assumptions |
| Ad metrics | Library-generated campaign metrics based on daily revenue shape |
| Email campaigns | Library-generated Klaviyo-style campaign records |
| Support threads | Library-generated support records tied to real transformed orders |
| Finance transactions | Derived from orders and refunds |
| Workflow events | Derived from inventory, support, and ad-performance conditions |

## Tables

### `commerce.suppliers`

Supplier profiles used by inventory and purchasing workflows.

| Column | Type | Meaning |
| --- | --- | --- |
| `supplier_id` | text | Primary key |
| `supplier_name` | text | Demo supplier name |
| `country` | text | Supplier country |
| `lead_time_days` | integer | Expected replenishment lead time |
| `reliability_score` | numeric | Supplier reliability score from 0 to 100 |
| `created_at` | timestamptz | Supplier record creation time |

### `commerce.products`

Product catalog with pricing, cost, and inventory planning settings.

| Column | Type | Meaning |
| --- | --- | --- |
| `product_id` | text | Primary key |
| `supplier_id` | text | Supplier foreign key |
| `sku` | text | Public/source SKU |
| `product_name` | text | Product name from source description |
| `category` | text | Demo category |
| `brand` | text | Demo brand |
| `unit_price` | numeric | Product selling price |
| `unit_cost` | numeric | Estimated cost of goods |
| `reorder_point` | integer | Stock level that should trigger replenishment |
| `target_stock` | integer | Ideal restocked inventory level |
| `current_stock` | integer | Current inventory estimate |
| `is_active` | boolean | Whether the product is active |
| `created_at` | timestamptz | Product record creation time |

### `commerce.customers`

Customer profiles used for segmentation, support, and order history.

| Column | Type | Meaning |
| --- | --- | --- |
| `customer_id` | text | Primary key |
| `email` | text | Safe demo email |
| `first_name` | text | Safe demo first name |
| `last_name` | text | Safe demo last name |
| `country` | text | Customer country from source data |
| `state_region` | text | Demo state or region |
| `city` | text | Demo city |
| `acquisition_channel` | text | Marketing channel that acquired the customer |
| `customer_segment` | text | Segment such as new, returning, VIP, at risk, or wholesale |
| `created_at` | timestamptz | Customer record creation time |

### `commerce.orders`

Shopify-style order headers transformed from public invoice data.

| Column | Type | Meaning |
| --- | --- | --- |
| `order_id` | text | Primary key |
| `customer_id` | text | Customer foreign key |
| `order_number` | text | Human-readable order number |
| `order_date` | timestamptz | Order timestamp |
| `channel` | text | Sales channel |
| `status` | text | Payment/fulfillment/refund status |
| `currency` | text | Currency code |
| `subtotal` | numeric | Pre-discount item subtotal |
| `discount_total` | numeric | Total order discount |
| `shipping_total` | numeric | Shipping charged |
| `tax_total` | numeric | Estimated tax |
| `refund_total` | numeric | Refund amount |
| `grand_total` | numeric | Final order total after discounts, shipping, tax, and refunds |
| `scenario_tag` | text | Optional scenario label for demos and agents |

### `commerce.order_items`

Line-level order details for product performance, margin, refunds, and inventory movement.

| Column | Type | Meaning |
| --- | --- | --- |
| `order_item_id` | text | Primary key |
| `order_id` | text | Order foreign key |
| `product_id` | text | Product foreign key |
| `sku` | text | SKU copied for easy inspection |
| `quantity` | integer | Units sold |
| `unit_price` | numeric | Unit selling price |
| `unit_cost` | numeric | Estimated unit cost |
| `discount_amount` | numeric | Line-level discount |
| `refund_quantity` | integer | Refunded units |
| `line_total` | numeric | Line revenue after discount |

### `commerce.inventory_events`

Inventory movement log for sales, restocks, adjustments, and future forecasting.

| Column | Type | Meaning |
| --- | --- | --- |
| `inventory_event_id` | text | Primary key |
| `product_id` | text | Product foreign key |
| `event_date` | timestamptz | Inventory event timestamp |
| `event_type` | text | Movement type such as sale or restock |
| `quantity_delta` | integer | Positive or negative stock movement |
| `stock_after` | integer | Stock after the movement |
| `reference_id` | text | Related order, purchase order, or adjustment ID |
| `scenario_tag` | text | Optional scenario label |

### `commerce.ad_campaign_daily_metrics`

Google/Meta-style daily campaign metrics for marketing reporting.

| Column | Type | Meaning |
| --- | --- | --- |
| `metric_id` | text | Primary key |
| `metric_date` | date | Metric date |
| `platform` | text | Marketing platform |
| `campaign_id` | text | Campaign identifier |
| `campaign_name` | text | Campaign display name |
| `objective` | text | Campaign objective |
| `spend` | numeric | Daily ad spend |
| `impressions` | integer | Daily impressions |
| `clicks` | integer | Daily clicks |
| `conversions` | integer | Daily conversions |
| `attributed_revenue` | numeric | Revenue attributed to the campaign |
| `scenario_tag` | text | Optional scenario label |

### `commerce.email_campaigns`

Klaviyo-style campaign metrics for email marketing reporting.

| Column | Type | Meaning |
| --- | --- | --- |
| `campaign_id` | text | Primary key |
| `sent_at` | timestamptz | Send timestamp |
| `campaign_name` | text | Campaign name |
| `audience_segment` | text | Target segment |
| `subject_line` | text | Email subject line |
| `recipients` | integer | Recipient count |
| `opens` | integer | Open count |
| `clicks` | integer | Click count |
| `orders` | integer | Orders attributed to campaign |
| `attributed_revenue` | numeric | Revenue attributed to campaign |
| `scenario_tag` | text | Optional scenario label |

### `commerce.support_threads`

Gmail/support-style customer conversations for service automation.

| Column | Type | Meaning |
| --- | --- | --- |
| `thread_id` | text | Primary key |
| `customer_id` | text | Customer foreign key |
| `order_id` | text | Optional related order foreign key |
| `opened_at` | timestamptz | Thread open timestamp |
| `channel` | text | Support source channel |
| `issue_type` | text | Issue category |
| `priority` | text | Priority level |
| `sentiment` | text | Sentiment label |
| `status` | text | Support status |
| `subject` | text | Thread subject |
| `latest_message` | text | Latest customer/internal message |
| `scenario_tag` | text | Optional scenario label |

### `commerce.finance_transactions`

QuickBooks-style ledger transactions derived from sales, refunds, and expenses.

| Column | Type | Meaning |
| --- | --- | --- |
| `transaction_id` | text | Primary key |
| `transaction_date` | date | Posting date |
| `account` | text | Ledger account |
| `transaction_type` | text | Income, expense, refund, or similar type |
| `vendor_or_customer` | text | Vendor, customer, or platform name |
| `amount` | numeric | Signed transaction amount |
| `related_order_id` | text | Optional related order foreign key |
| `memo` | text | Human-readable transaction note |
| `scenario_tag` | text | Optional scenario label |

### `commerce.workflow_events`

Automation and alert history for operations workflows.

| Column | Type | Meaning |
| --- | --- | --- |
| `workflow_event_id` | text | Primary key |
| `occurred_at` | timestamptz | Event timestamp |
| `workflow_name` | text | Workflow name |
| `source_system` | text | Originating system |
| `event_type` | text | Alert, escalation, budget event, or similar type |
| `severity` | text | Severity label |
| `entity_type` | text | Type of entity involved |
| `entity_id` | text | Entity identifier |
| `message` | text | Event message |
| `scenario_tag` | text | Optional scenario label |

## Views

| View | Purpose |
| --- | --- |
| `commerce.v_daily_revenue` | Daily order count, revenue, refunds, COGS, and gross profit |
| `commerce.v_product_performance` | Product-level units sold, revenue, COGS, and gross profit |
| `commerce.v_inventory_risk` | Current stock, reorder point, average daily units, days of cover, and risk status |
| `commerce.v_marketing_performance` | Daily campaign spend, revenue, ROAS, CPC, and CPA |
| `commerce.v_support_summary` | Support thread volume by date, issue type, priority, and sentiment |

## Scenario Tags

`scenario_tag` marks rows that belong to a demo business event. These tags help dashboards and AI agents explain unusual patterns.

Current examples:

- `black_friday_2025`
- `hero_sku_stockout_risk`
- `vip_customer_escalation`
- `paid_media_efficiency_alert`

