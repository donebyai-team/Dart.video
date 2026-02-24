INSERT INTO templates (
    name,
    animation_type,
    categories,
    description,
    schema,
    preview,
    cdn_url,
    preview_url,
    repeatable
)
VALUES (
        lower(:name),
           :animation_type,
           :categories,
           :description,
           :schema,
           :preview,
           :cdn_url,
           :preview_url,
           :repeatable
       )
    RETURNING id;