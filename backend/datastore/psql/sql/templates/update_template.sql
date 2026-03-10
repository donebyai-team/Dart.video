UPDATE templates
SET categories  = :categories,
    description = :description,
    schema      = :schema,
    code_registry     = :code_registry,
    repeatable  = :repeatable,
    preview_url = :preview_url,
    element_registry = :element_registry,
    duration = :duration
WHERE id = :id;
