UPDATE templates
SET categories  = :categories,
    description = :description,
    description_embedding = :description_embedding,
    config     = :config,
    metadata   = :metadata,
    status     = :status,
    name       = :name,
    repeatable  = :repeatable,
    version    = :version
WHERE id = :id;
