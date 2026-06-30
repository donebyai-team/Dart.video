
BEGIN;

ALTER TABLE templates
    DROP COLUMN IF EXISTS description_embedding;

COMMIT;
