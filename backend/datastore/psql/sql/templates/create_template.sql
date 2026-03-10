INSERT INTO templates (
    name,
    animation_type,
    categories,
    description,
    schema,
    code_registry,
    preview_url,
    repeatable,
    element_registry,
    duration
)
VALUES (
        lower(:name),
           :animation_type,
           :categories,
           :description,
           :schema,
           :code_registry,
           :preview_url,
           :repeatable,
           :element_registry,
           :duration
       )
    RETURNING id;