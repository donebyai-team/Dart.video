INSERT INTO brand_identity (
    name,
    website,
    organization_id,
    identity
)
VALUES (
           :name,
        :domain,
           :organization_id,
           :identity
       )
    RETURNING id;
