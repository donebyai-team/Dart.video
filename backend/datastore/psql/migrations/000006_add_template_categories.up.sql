BEGIN;

CREATE TABLE template_categories
(
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL PRIMARY KEY,
    animation_type varchar(50) NOT NULL,
    name varchar(255) NOT NULL,
    description text NOT NULL,
    created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp,

    -- enforce lowercase name
    CONSTRAINT chk_template_categories_name_lowercase
        CHECK (name = lower(name)),

    -- enforce uniqueness per animation type
    CONSTRAINT uq_template_categories_animation_name
        UNIQUE (animation_type, name)
);

-- index for faster filtering by animation_type
CREATE INDEX idx_template_categories_animation_type
    ON template_categories (animation_type);

COMMIT;
