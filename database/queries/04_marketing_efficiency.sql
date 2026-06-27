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
ORDER BY roas ASC NULLS LAST, spend DESC
LIMIT 40;

