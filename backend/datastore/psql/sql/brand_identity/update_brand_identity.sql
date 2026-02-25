UPDATE brand_identity
SET
    identity = :identity
WHERE
    id = :id
  AND organization_id = :organization_id;
