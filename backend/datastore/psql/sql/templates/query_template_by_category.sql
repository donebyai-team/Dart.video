SELECT *
FROM templates
WHERE
    COALESCE(array_length(CAST(:categories AS text[]), 1), 0) = 0
   OR categories && CAST(:categories AS text[])
ORDER BY created_at DESC;