SELECT *
FROM videos
WHERE organization_id = :organization_id
  AND status IN ('COMPLETED', 'PROCESSING', 'USER_CANCELLED');