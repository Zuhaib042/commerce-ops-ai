# CommerceOps AI OS

CommerceOps AI OS is a portfolio-grade AI automation and systems engineering project for e-commerce operations. The goal is to build a realistic operating system that connects data, workflows, dashboards, and AI agents across sales, marketing, inventory, finance, support, and executive reporting.

This repository starts with Project 1: the e-commerce data warehouse and demo data factory. Later projects will add dashboards, workflow automations, Gemini-powered agents, n8n flows, Slack/Gmail notifications, and SaaS deployment.

## Project 1: Data Warehouse

Project 1 creates the data backbone for the whole system:

- Postgres schema for commerce, marketing, support, finance, and workflow data
- Public retail dataset ingestion from the UCI Machine Learning Repository
- Library-based enrichment with Faker for adjacent systems
- CSV exports for inspection and repeatable loading
- SQL views for revenue, product performance, inventory risk, and marketing performance
- Docker Compose setup for local Postgres

## Quick Start

Install dependencies:

```bash
npm run setup
```

This creates a local Python virtual environment in `.venv`, so Homebrew/macOS will not block package installation with an `externally-managed-environment` error.

If you already ran `npm install`, you can set up only the Python side:

```bash
npm run py:venv
npm run py:install
```

Download the public retail dataset:

```bash
npm run data:download
```

Convert the downloaded workbook to CSV:

```bash
npm run data:convert
```

Prepare a small warehouse dataset:

```bash
npm run data:prepare
```

Start Postgres:

```bash
npm run db:up
```

Create schema:

```bash
npm run db:schema
```

Load generated data:

```bash
npm run db:load
```

Adminer is available at `http://localhost:8080` after Docker starts.

## Dataset Scales

```bash
npm run data:prepare
npm run data:prepare:medium
npm run data:prepare:large
```

Raw downloaded files are written to `data/raw`. Warehouse CSV files are written to `data/generated`.

## Planning Docs

- [CommerceOps AI OS Plan](docs/commerceops-ai-os-plan.md)
- [Project 1 Data Warehouse](docs/project-1-data-warehouse.md)
