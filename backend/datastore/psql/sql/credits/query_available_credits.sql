SELECT COALESCE(SUM(amount), 0)
FROM credits_ledger
WHERE org_id = :org_id
  AND (
    CAST(:reference_id AS uuid) IS NULL
        OR reference_id = CAST(:reference_id AS uuid)
    );