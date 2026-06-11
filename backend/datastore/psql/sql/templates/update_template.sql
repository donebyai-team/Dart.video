UPDATE templates
SET categories  = :categories,
    description = :description,
    schema      = :schema,
    config     = :config,
    metadata   = :metadata,
    status     = :status,
    name       = :name,
    repeatable  = :repeatable
WHERE id = :id;
