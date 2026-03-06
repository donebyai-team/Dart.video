INSERT INTO templates (
    name,
    animation_type,
    categories,
    description,
    schema,
    code_registry,
    preview_url,
    repeatable,
    element_registry
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
           :element_registry
       )
    RETURNING id;