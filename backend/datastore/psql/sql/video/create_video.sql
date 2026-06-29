INSERT INTO videos (
    name,
    status,
    organization_id,
    metadata
)
VALUES (
    :name,
    :status,
    :organization_id,
    :metadata
)
RETURNING id;
