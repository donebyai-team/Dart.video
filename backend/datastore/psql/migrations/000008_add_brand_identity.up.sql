BEGIN;

CREATE TABLE brand_identity
(
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name character varying(255) NOT NULL,
    website character varying(255) NOT NULL,
    organization_id uuid  NOT NULL,
    identity jsonb DEFAULT '{}'::jsonb,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp
);

ALTER TABLE brand_identity ADD CONSTRAINT fk1_brand_identity FOREIGN KEY (organization_id) REFERENCES organizations (id);


COMMIT;
