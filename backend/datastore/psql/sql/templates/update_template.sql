UPDATE templates
SET categories  = :categories,
    description = :description,
    config     = :config,
    metadata   = :metadata,
    status     = :status,
    name       = :name,
    repeatable  = :repeatable
WHERE id = :id;
