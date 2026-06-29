# Project 2: NestJS Backend API

## Goal

Expose the Project 1 warehouse through a clean backend API that dashboards, agents, and workflow automations can call.

This API is read-only for now. Write actions, approvals, and automation triggers will come after authentication and audit logs exist.

## Runtime

- Framework: NestJS
- HTTP adapter: Fastify
- Database: Postgres
- Query layer: direct parameterized SQL through `pg`
- Local port: `4000`
- Base path: `/api`

## Local Commands

Start Postgres first:

```bash
npm run db:up
```

Start the API in watch mode:

```bash
npm run api:dev
```

Build the API:

```bash
npm run api:build
```

Run the compiled API:

```bash
npm run api:prod
```

## Docker

Build and run the API container with Postgres:

```bash
docker compose up -d postgres adminer api
```

Inside Docker, the API connects to Postgres through:

```text
postgresql://commerceops:commerceops@postgres:5432/commerceops
```

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Service and database health |
| `GET` | `/api/metrics/overview` | Warehouse counts and aggregate revenue |
| `GET` | `/api/metrics/revenue?limit=30` | Daily revenue, refunds, COGS, and gross profit |
| `GET` | `/api/metrics/inventory-risk?status=reorder_now&limit=50` | Inventory risk list |
| `GET` | `/api/metrics/marketing-performance?platform=meta&limit=40` | Campaign efficiency |
| `GET` | `/api/metrics/support-summary?limit=40` | Support issue volume |
| `GET` | `/api/metrics/customer-segments?limit=40` | Revenue by segment and acquisition channel |
| `GET` | `/api/metrics/finance-accounts` | Finance account summary |
| `GET` | `/api/metrics/workflow-alerts` | Workflow alert summary |
| `GET` | `/api/products/top?limit=25` | Top products by gross profit |
| `GET` | `/api/orders/recent?limit=25` | Recent orders |

## Example Requests

```bash
curl http://localhost:4000/api/health
curl "http://localhost:4000/api/metrics/revenue?limit=7"
curl "http://localhost:4000/api/metrics/inventory-risk?status=reorder_now&limit=10"
curl "http://localhost:4000/api/products/top?limit=10"
```

## Why This Matters

This turns the warehouse into a real application backend. The future dashboard will consume these endpoints, and the future AI agents can call the same API as tools instead of querying the database directly.
