SELECT *
FROM templates
WHERE status = 'AVAILABLE'
  AND :category = ANY(categories)
ORDER BY RANDOM()
    LIMIT 10;