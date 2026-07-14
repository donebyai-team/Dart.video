SELECT *
FROM credits_ledger
WHERE org_id = :org_id
  AND (NULLIF(:reference_id, '') IS NULL OR reference_id = NULLIF(:reference_id, '')::uuid)
  AND (NULLIF(:entry_type, '') IS NULL OR type = NULLIF(:entry_type, ''))
ORDER BY created_at DESC;
