SELECT
  issue_type,
  priority,
  sentiment,
  SUM(thread_count) AS thread_count
FROM commerce.v_support_summary
GROUP BY issue_type, priority, sentiment
ORDER BY thread_count DESC, issue_type, priority, sentiment
LIMIT 40;

