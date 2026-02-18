INSERT INTO template_categories (
    animation_type,
    name,
    description
)
VALUES (
           :animation_type,
           lower(:name),
           :description
       )
    RETURNING id;
