UPDATE videos
SET
    config = :config,
    ai_generated_config = :ai_generated_config,
    status = :status,
    name = :name,
    metadata = :metadata
WHERE
    id = :id
    AND organization_id = :organization_id;
