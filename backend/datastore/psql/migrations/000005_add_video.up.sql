BEGIN;

CREATE TABLE videos
(
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    organization_id uuid  NOT NULL, 
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,

    script jsonb DEFAULT '{}'::jsonb,
    ai_generated_config jsonb DEFAULT '[]'::jsonb,
    config jsonb DEFAULT '[]'::jsonb,  
    updated_at timestamp
);

ALTER TABLE videos ADD CONSTRAINT fk1_videos FOREIGN KEY (organization_id) REFERENCES organizations (id);


COMMIT;
