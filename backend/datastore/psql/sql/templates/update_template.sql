UPDATE templates
SET categories  = :categories,
    description = :description,
    schema      = :schema,
    cdn_url     = :cdn_url,
    repeatable  = :repeatable,
    preview_url = :preview_url,
    element_registry = :element_registry
WHERE id = :id;
