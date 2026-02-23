SELECT *
FROM templates
WHERE categories @> ARRAY[:category]::text[]
  AND animation_type = :animation_type
  AND (
    repeatable = true
        OR id <> ALL(:usedIds::uuid[])
    )
ORDER BY created_at DESC;
