INSERT INTO media_assets (
    path,
    mime_type,
    organization_id,
    media_type,
    provider,
    metadata
)
VALUES (
           :path,
           :mime_type,
           :organization_id,
           :media_type,
           :provider,
            :metadata
       )
    RETURNING id;