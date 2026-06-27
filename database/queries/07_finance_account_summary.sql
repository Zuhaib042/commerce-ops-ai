SELECT
  account,
  transaction_type,
  COUNT(*) AS transaction_count,
  ROUND(SUM(amount), 2) AS net_amount,
  ROUND(AVG(amount), 2) AS average_amount,
  MIN(transaction_date) AS first_transaction_date,
  MAX(transaction_date) AS last_transaction_date
FROM commerce.finance_transactions
GROUP BY account, transaction_type
ORDER BY ABS(SUM(amount)) DESC;

