BEGIN;

DROP INDEX IF EXISTS idx_templates_categories_gin;
DROP INDEX IF EXISTS idx_templates_animation_type;

DROP TABLE IF EXISTS templates;

COMMIT;
