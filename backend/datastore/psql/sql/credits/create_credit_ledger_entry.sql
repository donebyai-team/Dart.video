INSERT INTO credits_ledger (org_id, reference_id, type, action, cost, amount, metadata)
VALUES (:org_id, :reference_id, :type, :action, :cost, :amount, :metadata)
RETURNING id, created_at;
