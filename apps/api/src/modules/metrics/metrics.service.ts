import { Inject, Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class MetricsService {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  async overview() {
    const [counts] = await this.database.query(`
      SELECT
        (SELECT COUNT(*)::int FROM commerce.orders) AS orders,
        (SELECT COUNT(*)::int FROM commerce.order_items) AS order_items,
        (SELECT COUNT(*)::int FROM commerce.products) AS products,
        (SELECT COUNT(*)::int FROM commerce.customers) AS customers,
        (SELECT COUNT(*)::int FROM commerce.support_threads) AS support_threads,
        (SELECT MIN(order_date)::text FROM commerce.orders) AS first_order_date,
        (SELECT MAX(order_date)::text FROM commerce.orders) AS latest_order_date
    `);

    const [revenue] = await this.database.query(`
      SELECT
        ROUND(SUM(revenue), 2) AS revenue,
        ROUND(SUM(gross_profit), 2) AS gross_profit,
        ROUND(SUM(refunds), 2) AS refunds,
        SUM(order_count)::int AS orders
      FROM commerce.v_daily_revenue
    `);

    return { counts, revenue };
  }

  revenue(limit: number) {
    return this.database.query(
      `
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
        LIMIT $1
      `,
      [limit],
    );
  }

  inventoryRisk(limit: number, status: string | null) {
    return this.database.query(
      `
        SELECT
          sku,
          product_name,
          category,
          current_stock,
          reorder_point,
          ROUND(avg_daily_units, 2) AS avg_daily_units,
          days_of_cover,
          risk_status
        FROM commerce.v_inventory_risk
        WHERE ($1::text IS NULL OR risk_status = $1)
        ORDER BY
          CASE risk_status
            WHEN 'reorder_now' THEN 1
            WHEN 'stockout_risk' THEN 2
            WHEN 'watch' THEN 3
            ELSE 4
          END,
          current_stock ASC,
          avg_daily_units DESC
        LIMIT $2
      `,
      [status, limit],
    );
  }

  marketingPerformance(limit: number, platform: string | null) {
    return this.database.query(
      `
        SELECT
          metric_date,
          platform,
          campaign_name,
          ROUND(spend, 2) AS spend,
          impressions,
          clicks,
          conversions,
          ROUND(attributed_revenue, 2) AS attributed_revenue,
          roas,
          cpc,
          cpa,
          scenario_tag
        FROM commerce.v_marketing_performance
        WHERE spend > 0
          AND ($1::text IS NULL OR platform = $1)
        ORDER BY roas ASC NULLS LAST, spend DESC
        LIMIT $2
      `,
      [platform, limit],
    );
  }

  supportSummary(limit: number) {
    return this.database.query(
      `
        SELECT
          issue_type,
          priority,
          sentiment,
          SUM(thread_count)::int AS thread_count
        FROM commerce.v_support_summary
        GROUP BY issue_type, priority, sentiment
        ORDER BY thread_count DESC, issue_type, priority, sentiment
        LIMIT $1
      `,
      [limit],
    );
  }

  customerSegments(limit: number) {
    return this.database.query(
      `
        SELECT
          c.customer_segment,
          c.acquisition_channel,
          COUNT(DISTINCT c.customer_id)::int AS customers,
          COUNT(DISTINCT o.order_id)::int AS orders,
          ROUND(SUM(o.grand_total), 2) AS revenue,
          ROUND(SUM(o.grand_total) / NULLIF(COUNT(DISTINCT c.customer_id), 0), 2) AS revenue_per_customer,
          ROUND(SUM(o.grand_total) / NULLIF(COUNT(DISTINCT o.order_id), 0), 2) AS average_order_value
        FROM commerce.customers c
        JOIN commerce.orders o ON o.customer_id = c.customer_id
        GROUP BY c.customer_segment, c.acquisition_channel
        ORDER BY revenue DESC
        LIMIT $1
      `,
      [limit],
    );
  }

  financeAccounts() {
    return this.database.query(`
      SELECT
        account,
        transaction_type,
        COUNT(*)::int AS transaction_count,
        ROUND(SUM(amount), 2) AS net_amount,
        ROUND(AVG(amount), 2) AS average_amount,
        MIN(transaction_date) AS first_transaction_date,
        MAX(transaction_date) AS last_transaction_date
      FROM commerce.finance_transactions
      GROUP BY account, transaction_type
      ORDER BY ABS(SUM(amount)) DESC
    `);
  }

  workflowAlerts() {
    return this.database.query(`
      SELECT
        workflow_name,
        source_system,
        event_type,
        severity,
        COUNT(*)::int AS event_count,
        MIN(occurred_at)::text AS first_seen,
        MAX(occurred_at)::text AS last_seen
      FROM commerce.workflow_events
      GROUP BY workflow_name, source_system, event_type, severity
      ORDER BY
        CASE severity
          WHEN 'critical' THEN 1
          WHEN 'high' THEN 2
          WHEN 'medium' THEN 3
          WHEN 'low' THEN 4
          ELSE 5
        END,
        event_count DESC
    `);
  }

  scenarioEvents(limit: number) {
    return this.database.query(
      `
        WITH scenario_events AS (
          SELECT
            'orders' AS source_table,
            scenario_tag,
            COUNT(*)::int AS event_count,
            MIN(order_date)::text AS first_seen,
            MAX(order_date)::text AS last_seen
          FROM commerce.orders
          WHERE scenario_tag IS NOT NULL AND scenario_tag <> ''
          GROUP BY scenario_tag

          UNION ALL

          SELECT
            'ad_campaign_daily_metrics' AS source_table,
            scenario_tag,
            COUNT(*)::int AS event_count,
            MIN(metric_date)::text AS first_seen,
            MAX(metric_date)::text AS last_seen
          FROM commerce.ad_campaign_daily_metrics
          WHERE scenario_tag IS NOT NULL AND scenario_tag <> ''
          GROUP BY scenario_tag

          UNION ALL

          SELECT
            'email_campaigns' AS source_table,
            scenario_tag,
            COUNT(*)::int AS event_count,
            MIN(sent_at)::text AS first_seen,
            MAX(sent_at)::text AS last_seen
          FROM commerce.email_campaigns
          WHERE scenario_tag IS NOT NULL AND scenario_tag <> ''
          GROUP BY scenario_tag

          UNION ALL

          SELECT
            'support_threads' AS source_table,
            scenario_tag,
            COUNT(*)::int AS event_count,
            MIN(opened_at)::text AS first_seen,
            MAX(opened_at)::text AS last_seen
          FROM commerce.support_threads
          WHERE scenario_tag IS NOT NULL AND scenario_tag <> ''
          GROUP BY scenario_tag

          UNION ALL

          SELECT
            'finance_transactions' AS source_table,
            scenario_tag,
            COUNT(*)::int AS event_count,
            MIN(transaction_date)::text AS first_seen,
            MAX(transaction_date)::text AS last_seen
          FROM commerce.finance_transactions
          WHERE scenario_tag IS NOT NULL AND scenario_tag <> ''
          GROUP BY scenario_tag

          UNION ALL

          SELECT
            'workflow_events' AS source_table,
            scenario_tag,
            COUNT(*)::int AS event_count,
            MIN(occurred_at)::text AS first_seen,
            MAX(occurred_at)::text AS last_seen
          FROM commerce.workflow_events
          WHERE scenario_tag IS NOT NULL AND scenario_tag <> ''
          GROUP BY scenario_tag
        )
        SELECT
          source_table,
          scenario_tag,
          event_count,
          first_seen,
          last_seen
        FROM scenario_events
        ORDER BY event_count DESC, scenario_tag, source_table
        LIMIT $1
      `,
      [limit],
    );
  }
}
