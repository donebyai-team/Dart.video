UPDATE templates
SET categories  = :categories,
    description = :description,
    schema      = :schema,
    config     = :config,
    repeatable  = :repeatable,
    preview_url = :preview_url
WHERE id = :id;
