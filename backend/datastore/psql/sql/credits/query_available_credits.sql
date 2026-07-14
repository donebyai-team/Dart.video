SELECT COALESCE(SUM(amount), 0)
FROM credits_ledger
WHERE org_id = :org_id
  AND (NULLIF(:reference_id, '') IS NULL OR reference_id = NULLIF(:reference_id, '')::uuid);
