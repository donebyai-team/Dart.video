SELECT *
FROM credits_ledger
WHERE org_id = :org_id
  AND type = 'CREDIT'
ORDER BY created_at DESC;
