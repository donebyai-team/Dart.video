BEGIN;

CREATE TABLE media_assets
(
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    organization_id uuid  NOT NULL,
    path text NOT NULL,
    mime_type text NOT NULL,
    media_type text NOT NULL,
    provider character varying(255),
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp
);

ALTER TABLE media_assets ADD CONSTRAINT fk1_media_assets FOREIGN KEY (organization_id) REFERENCES organizations (id);


COMMIT;
