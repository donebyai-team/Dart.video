INSERT INTO templates (
    name,
    animation_type,
    categories,
    description,
    schema,
    preview,
    cdn_url,
    preview_url
)
VALUES (
        lower(:name),
           :animation_type,
           :categories,
           :description,
           :schema,
           :preview,
           :cdn_url,
           :preview_url
       )
    RETURNING id;