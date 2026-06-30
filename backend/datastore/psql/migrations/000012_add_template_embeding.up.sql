
BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE templates
    ADD COLUMN description_embedding vector;

COMMIT;
