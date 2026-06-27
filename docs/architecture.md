# CommerceOps AI OS Architecture

## Project 1 Context

Project 1 is the data foundation for CommerceOps AI OS. It turns a public retail transaction dataset into a Postgres warehouse that can support dashboards, agents, reporting jobs, and workflow automations.

The current system is intentionally free-tier friendly:

- Local and cloud demo infrastructure can run with Docker Compose.
- Postgres stores the operational warehouse.
- Adminer gives a lightweight database browser.
- Source data comes from the UCI Online Retail dataset.
- Faker enriches missing operational systems such as suppliers, support, finance, ads, and workflow events.

## Runtime Architecture

```mermaid
flowchart LR
  UCI["UCI Online Retail Dataset"] --> DL["data:download"]
  DL --> RAW["data/raw/online-retail.zip"]
  RAW --> CONVERT["data:convert<br/>openpyxl"]
  CONVERT --> RAWCSV["data/raw/online-retail/online_retail.csv"]
  RAWCSV --> PREPARE["data:prepare<br/>Node.js + Faker"]
  PREPARE --> CSV["data/generated/*.csv"]
  CSV --> LOAD["db:load<br/>psql copy"]
  LOAD --> PG[("Postgres<br/>commerce schema")]
  PG --> VIEWS["Warehouse Views"]
  PG --> ADMINER["Adminer<br/>localhost:8080"]
  VIEWS --> DASH["Future Next.js Dashboard"]
  VIEWS --> API["Future NestJS API"]
  VIEWS --> AGENTS["Future Gemini Agents"]
  VIEWS --> N8N["Future n8n Workflows"]
```

## Planned Application Architecture

```mermaid
flowchart TB
  subgraph "Frontend"
    NEXT["Next.js Dashboard"]
  end

  subgraph "Backend"
    NEST["NestJS API"]
    WORKER["Background Workers"]
    AGENT["Gemini Agent Service"]
  end

  subgraph "Automation"
    N8N["n8n Workflows"]
    MAKE["Make Demo Workflows"]
    ZAPIER["Zapier Demo Workflows"]
  end

  subgraph "Data"
    PG[("Postgres Warehouse")]
    REDIS[("Redis Queue/Cache")]
    FILES["Generated CSV + Raw Data"]
  end

  subgraph "External Systems"
    SHOPIFY["Shopify or Mock Connector"]
    KLAVIYO["Klaviyo or Mock Connector"]
    ADS["Google/Meta Ads or Mock Connector"]
    QUICKBOOKS["QuickBooks Sandbox or Mock Connector"]
    SLACK["Slack"]
    GMAIL["Gmail"]
  end

  NEXT --> NEST
  NEST --> PG
  NEST --> REDIS
  NEST --> AGENT
  WORKER --> PG
  WORKER --> REDIS
  AGENT --> PG
  N8N --> NEST
  N8N --> SLACK
  N8N --> GMAIL
  MAKE --> NEST
  ZAPIER --> NEST
  SHOPIFY --> WORKER
  KLAVIYO --> WORKER
  ADS --> WORKER
  QUICKBOOKS --> WORKER
  FILES --> PG
```

## ERD

```mermaid
erDiagram
  SUPPLIERS ||--o{ PRODUCTS : supplies
  PRODUCTS ||--o{ ORDER_ITEMS : sold_as
  PRODUCTS ||--o{ INVENTORY_EVENTS : changes_stock
  CUSTOMERS ||--o{ ORDERS : places
  CUSTOMERS ||--o{ SUPPORT_THREADS : opens
  ORDERS ||--o{ ORDER_ITEMS : contains
  ORDERS ||--o{ SUPPORT_THREADS : referenced_by
  ORDERS ||--o{ FINANCE_TRANSACTIONS : posts

  SUPPLIERS {
    text supplier_id PK
    text supplier_name
    text country
    integer lead_time_days
    numeric reliability_score
    timestamptz created_at
  }

  PRODUCTS {
    text product_id PK
    text supplier_id FK
    text sku
    text product_name
    text category
    text brand
    numeric unit_price
    numeric unit_cost
    integer reorder_point
    integer target_stock
    integer current_stock
    boolean is_active
    timestamptz created_at
  }

  CUSTOMERS {
    text customer_id PK
    text email
    text first_name
    text last_name
    text country
    text state_region
    text city
    text acquisition_channel
    text customer_segment
    timestamptz created_at
  }

  ORDERS {
    text order_id PK
    text customer_id FK
    text order_number
    timestamptz order_date
    text channel
    text status
    text currency
    numeric subtotal
    numeric discount_total
    numeric shipping_total
    numeric tax_total
    numeric refund_total
    numeric grand_total
    text scenario_tag
  }

  ORDER_ITEMS {
    text order_item_id PK
    text order_id FK
    text product_id FK
    text sku
    integer quantity
    numeric unit_price
    numeric unit_cost
    numeric discount_amount
    integer refund_quantity
    numeric line_total
  }

  INVENTORY_EVENTS {
    text inventory_event_id PK
    text product_id FK
    timestamptz event_date
    text event_type
    integer quantity_delta
    integer stock_after
    text reference_id
    text scenario_tag
  }

  AD_CAMPAIGN_DAILY_METRICS {
    text metric_id PK
    date metric_date
    text platform
    text campaign_id
    text campaign_name
    text objective
    numeric spend
    integer impressions
    integer clicks
    integer conversions
    numeric attributed_revenue
    text scenario_tag
  }

  EMAIL_CAMPAIGNS {
    text campaign_id PK
    timestamptz sent_at
    text campaign_name
    text audience_segment
    text subject_line
    integer recipients
    integer opens
    integer clicks
    integer orders
    numeric attributed_revenue
    text scenario_tag
  }

  SUPPORT_THREADS {
    text thread_id PK
    text customer_id FK
    text order_id FK
    timestamptz opened_at
    text channel
    text issue_type
    text priority
    text sentiment
    text status
    text subject
    text latest_message
    text scenario_tag
  }

  FINANCE_TRANSACTIONS {
    text transaction_id PK
    date transaction_date
    text account
    text transaction_type
    text vendor_or_customer
    numeric amount
    text related_order_id FK
    text memo
    text scenario_tag
  }

  WORKFLOW_EVENTS {
    text workflow_event_id PK
    timestamptz occurred_at
    text workflow_name
    text source_system
    text event_type
    text severity
    text entity_type
    text entity_id
    text message
    text scenario_tag
  }
```

## Data Flow

1. `npm run data:download` downloads the UCI Online Retail archive.
2. `npm run data:convert` converts the workbook to CSV through a local Python virtual environment.
3. `npm run data:prepare` transforms public transactions into warehouse-ready CSV files.
4. `npm run db:up` starts Postgres and Adminer.
5. `npm run db:schema` creates tables, indexes, and views.
6. `npm run db:load` loads generated CSV files into Postgres.

## Business Questions This Warehouse Can Answer

- What happened to revenue, order count, refunds, and gross profit over time?
- Which products drive the most revenue and margin?
- Which products are at reorder risk or stockout risk?
- Which ad campaigns are wasting spend because ROAS is low?
- Which acquisition channels and customer segments produce the most customers?
- Which support issues are increasing, and are they tied to refund or quality problems?
- Which workflow alerts are most frequent or severe?
- Which finance accounts are driving income and expense movement?
- Which scenario tags explain notable events such as Black Friday, support escalations, or stock risk?

## Why This Matters For The Portfolio

This architecture shows that the project is more than a chatbot. It has a real operating data layer, a repeatable data pipeline, warehouse views, operational entities, and clear places for future dashboards, agents, and automations to connect.

