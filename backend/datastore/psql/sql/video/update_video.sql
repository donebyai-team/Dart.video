UPDATE videos
SET
    config = :config,
    ai_generated_config = :ai_generated_config,
    status = :status,
    name = :name,
    version = :version,
    metadata = :metadata,
    updated_at = :updated_at
WHERE
    id = :id
    AND organization_id = :organization_id;
