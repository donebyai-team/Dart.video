INSERT INTO templates (
    name,
    categories,
    description,
    schema,
    metadata,
    status,
    repeatable
)
VALUES (
        lower(:name),
           :categories,
           :description,
           :schema,
           :metadata,
        :status,
           :repeatable
       )
    RETURNING id;