SELECT *
FROM media_assets
WHERE id = ANY(:ids)
ORDER BY created_at DESC;