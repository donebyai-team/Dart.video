SELECT *
FROM media_assets
WHERE organization_id = :organization_id
  AND media_type != '5'
ORDER BY created_at DESC
    LIMIT 30;