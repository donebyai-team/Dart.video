SELECT * from templates WHERE categories @> ARRAY[:category] ORDER BY created_at DESC;
