UPDATE templates
SET categories  = :categories,
    description = :description,
    schema      = :schema,
    preview     = :preview,
    cdn_url     = :cdn_url,
    preview_url = :preview_url
WHERE id = :id;
