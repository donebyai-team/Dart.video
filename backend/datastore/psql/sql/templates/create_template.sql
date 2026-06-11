INSERT INTO templates (
    name,
    categories,
    description,
    schema,
    config,
    metadata,
    status,
    repeatable
)
VALUES (
        lower(:name),
           :categories,
           :description,
           :schema,
        :config,
           :metadata,
        :status,
           :repeatable
       )
    RETURNING id;