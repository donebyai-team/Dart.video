SELECT *
FROM templates
WHERE categories @> ARRAY[:category]
  AND animation_type = :animation_type
  AND (
    repeatable = true
        OR id <> ALL(CAST(:usedIds AS uuid[]))
    )
ORDER BY created_at DESC;