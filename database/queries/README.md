# Saved Analysis Queries

These SQL files are portfolio-friendly examples of the business questions the Project 1 warehouse can answer.

Run any query with:

```bash
psql "postgresql://commerceops:commerceops@localhost:5432/commerceops" -f database/queries/<file>.sql
```

## Query Pack

| File | Business question |
| --- | --- |
| `01_daily_revenue.sql` | What happened to revenue, order count, refunds, and gross profit over time? |
| `02_top_products_by_margin.sql` | Which products generate the most gross profit? |
| `03_inventory_risk.sql` | Which products are at reorder or stockout risk? |
| `04_marketing_efficiency.sql` | Which campaigns have weak ROAS, CPC, or CPA? |
| `05_support_issue_summary.sql` | Which support issue types and sentiments are most common? |
| `06_customer_segment_revenue.sql` | Which customer segments drive the most revenue? |
| `07_finance_account_summary.sql` | Which finance accounts explain income, refunds, and expenses? |
| `08_workflow_alerts.sql` | Which automations are firing most often and with what severity? |

