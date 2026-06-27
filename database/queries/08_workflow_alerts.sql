SELECT
  workflow_name,
  source_system,
  event_type,
  severity,
  COUNT(*) AS event_count,
  MIN(occurred_at) AS first_seen,
  MAX(occurred_at) AS last_seen
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
  event_count DESC;

