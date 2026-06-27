# Project 1: E-commerce Data Warehouse

## Goal

Build the data backbone for CommerceOps AI OS. This project should create a realistic warehouse that later dashboards, AI agents, reporting jobs, and workflow automations can use.

## Scope

Project 1 includes:

- Dockerized Postgres
- SQL schema
- Public dataset downloader
- Workbook-to-CSV conversion with `openpyxl`
- Library-based warehouse preparation
- CSV exports
- Repeatable load script
- Warehouse views for first dashboards and agents

Project 1 does not include:

- Full web dashboard
- AI chat UI
- n8n workflows
- Production auth
- Billing

Those come in later projects.

## Core Tables

| Table | Purpose |
| --- | --- |
| `commerce.suppliers` | Supplier and lead-time data |
| `commerce.products` | Product catalog and inventory settings |
| `commerce.customers` | Customer profiles and acquisition channels |
| `commerce.orders` | Shopify-style order headers |
| `commerce.order_items` | Order line items and margin data |
| `commerce.inventory_events` | Stock movements, reorders, adjustments |
| `commerce.ad_campaign_daily_metrics` | Google/Meta daily campaign performance |
| `commerce.email_campaigns` | Klaviyo-style campaign performance |
| `commerce.support_threads` | Gmail/support-style customer messages |
| `commerce.finance_transactions` | QuickBooks-style financial events |
| `commerce.workflow_events` | Automation and alert history |

## Warehouse Views

| View | Purpose |
| --- | --- |
| `commerce.v_daily_revenue` | Orders, revenue, discounts, refunds, COGS, gross profit |
| `commerce.v_product_performance` | Units sold, revenue, profit, refund quantity by product |
| `commerce.v_inventory_risk` | Days of cover and stockout risk |
| `commerce.v_marketing_performance` | Spend, revenue, ROAS, CPC, CPA by platform and campaign |
| `commerce.v_support_summary` | Ticket volume and sentiment by issue type |

## Portfolio Documentation

Project 1.1 makes the warehouse explainable:

- [Architecture](architecture.md)
- [Data Dictionary](data-dictionary.md)
- [Saved SQL Queries](../database/queries/README.md)

## Data Quality Targets

The generated warehouse data should be:

- Deterministic with a seed
- Based on downloaded public data where possible
- Enriched by libraries rather than hand-authored fake rows
- Large enough for dashboards and BI
- Small enough to run on student/free-tier infrastructure
- Scenario-rich enough for AI agents to produce meaningful insights
- Safe for public demo use because it contains no real customer data

## Source Data

The first source dataset is the UCI Online Retail dataset:

- Source: `https://archive.ics.uci.edu/dataset/352/online+retail`
- Download URL: `https://archive.ics.uci.edu/static/public/352/online+retail.zip`
- License: CC BY 4.0
- Shape: invoice-level online retail transactions

The preparation script transforms the public retail transactions into Shopify-style orders and order items. Missing operational systems, such as support threads, marketing metrics, inventory events, and finance transactions, are generated with libraries and derived from the downloaded order data.

## Dataset Scales

| Scale | Customers | Products | Orders | Use case |
| --- | ---: | ---: | ---: | --- |
| small | sampled | sampled | sampled | Fast development and tests |
| medium | sampled | sampled | sampled | Portfolio demo |
| large | all available | all available | all available | Stress/demo benchmark |

## Scenario Events

The generator should intentionally include:

- Black Friday spike in November 2025
- Hero product stockout risk in March 2026
- Refund spike from a quality issue in April 2026
- Meta Ads overspend period in February 2026
- Klaviyo winback campaign lift in May 2026
- Supplier delay for one supplier in March 2026

## Completion Criteria

Project 1 is complete when:

- `npm run data:download` downloads the public retail dataset
- `npm run data:convert` converts the downloaded workbook to CSV
- `npm run data:prepare` creates valid warehouse CSV files
- `database/schema.sql` creates all tables and views
- `data/generated/load.sql` can load generated data into Postgres
- A developer can query daily revenue, product performance, inventory risk, marketing performance, and support summaries
- The README explains how to run everything
