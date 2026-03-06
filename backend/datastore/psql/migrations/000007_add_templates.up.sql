BEGIN;

CREATE TABLE templates
(
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name varchar(255) NOT NULL,
    animation_type varchar(50) NOT NULL,
    categories text[] NOT NULL DEFAULT '{}',
    description text,
    schema jsonb NOT NULL DEFAULT '{}'::jsonb,
    element_registry jsonb NOT NULL DEFAULT '{}'::jsonb,
    cdn_url text NOT NULL,
    repeatable bool DEFAULT false,
    preview_url text,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp
);

CREATE UNIQUE INDEX idx_templates_name ON templates USING btree (animation_type, name);

-- Fast filter by animation_type
CREATE INDEX idx_templates_animation_type
    ON templates (animation_type);

-- Fast array containment queries
CREATE INDEX idx_templates_categories_gin
    ON templates USING GIN (categories);

COMMIT;
