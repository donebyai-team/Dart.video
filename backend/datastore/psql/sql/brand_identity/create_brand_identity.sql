INSERT INTO brand_identity (
    name,
    organization_id,
    identity
)
VALUES (
           :name,
           :organization_id,
           :identity
       )
    RETURNING id;
