UPDATE brand_identity
SET
    identity = :identity,
    name = :name
WHERE
    id = :id
  AND organization_id = :organization_id;
