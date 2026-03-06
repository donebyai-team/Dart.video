INSERT INTO templates (
    name,
    animation_type,
    categories,
    description,
    schema,
    cdn_url,
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
           :cdn_url,
           :preview_url,
           :repeatable,
           :element_registry
       )
    RETURNING id;