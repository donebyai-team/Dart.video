SELECT t.*
FROM templates t
WHERE t.status = 'AVAILABLE'
  AND :category = ANY(t.categories)
  AND t.description_embedding IS NOT NULL
  AND (
        COALESCE(array_length(CAST(:excluded_template_ids AS text[]), 1), 0) = 0
        OR CAST(t.id AS text) <> ALL(CAST(:excluded_template_ids AS text[]))
      )
ORDER BY t.description_embedding <=> CAST(:embedding AS vector) ASC,
         t.created_at DESC,
         t.id ASC
LIMIT :limit;
