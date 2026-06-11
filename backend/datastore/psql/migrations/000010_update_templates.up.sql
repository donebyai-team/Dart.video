BEGIN;

-- Remove obsolete columns
ALTER TABLE templates
DROP COLUMN IF EXISTS animation_type,
    DROP COLUMN IF EXISTS preview_url;

-- Add new columns
ALTER TABLE templates
    ADD COLUMN metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN status varchar(50) NOT NULL DEFAULT 'CREATED';

-- Remove indexes that depend on animation_type
DROP INDEX IF EXISTS idx_templates_animation_type;
DROP INDEX IF EXISTS idx_templates_name;

-- Recreate unique index based only on name
CREATE UNIQUE INDEX idx_templates_name
    ON templates (name);

COMMIT;