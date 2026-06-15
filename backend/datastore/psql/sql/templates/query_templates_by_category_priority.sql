WITH input_categories AS (
    SELECT *
    FROM unnest(CAST(:categories AS text[]))
             WITH ORDINALITY AS c(category, priority)
),
     ranked_templates AS (
         SELECT
             t.id,
             MIN(ic.priority) AS match_priority
         FROM templates t
                  JOIN input_categories ic
                       ON ic.category = ANY(t.categories)
         WHERE
             t.status = 'AVAILABLE'
           AND t.categories && CAST(:categories AS text[])
GROUP BY t.id
    )
SELECT
    t.*,
    rt.match_priority
FROM ranked_templates rt
         JOIN templates t
              ON t.id = rt.id
WHERE
    (
        CAST(:cursorPriority AS integer) IS NULL
        )
   OR
    (
        rt.match_priority > CAST(:cursorPriority AS integer)
        )
   OR
    (
        rt.match_priority = CAST(:cursorPriority AS integer)
            AND t.created_at < CAST(:cursorCreatedAt AS timestamptz)
        )
   OR
    (
        rt.match_priority = CAST(:cursorPriority AS integer)
            AND t.created_at = CAST(:cursorCreatedAt AS timestamptz)
            AND t.id > CAST(:cursorID AS uuid)
        )
ORDER BY
    rt.match_priority ASC,
    t.created_at DESC,
    t.id ASC
    LIMIT :limit;