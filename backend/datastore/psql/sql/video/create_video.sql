INSERT INTO videos (
    name,
    status,
    organization_id,
    script,
    metadata
)
VALUES (
    :name,
    :status,
    :organization_id,
    :script,
    :metadata
)
RETURNING id;
