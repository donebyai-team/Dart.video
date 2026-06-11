BEGIN;

-- Remove new index
DROP INDEX IF EXISTS idx_templates_name;

-- Restore old columns
ALTER TABLE templates
    ADD COLUMN animation_type varchar(50) NOT NULL DEFAULT '',
    ADD COLUMN preview_url text;

-- Remove new columns
ALTER TABLE templates
DROP COLUMN IF EXISTS metadata,
    DROP COLUMN IF EXISTS status;

-- Restore old indexes
CREATE UNIQUE INDEX idx_templates_name
    ON templates (animation_type, name);

CREATE INDEX idx_templates_animation_type
    ON templates (animation_type);

COMMIT;