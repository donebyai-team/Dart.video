# Template Filesystem Sync Tool Spec
Inside backend/cmd/coasterai/ create a new tool
check how the tools_integrations.go has implemented a tool, use similar way

## Tool Name
`sync_templates_from_filesystem`
---

## Purpose

Synchronize animation **categories** and **templates** from the frontend filesystem into the backend database.

The tool:

* Walks `frontend/packages/templates`
* Validates strict folder structure
* Upserts categories
* Upserts templates
* Fails fast on invalid structure or content
* Prints a final summary of inserts / updates / unchanged

This tool is **idempotent** and safe to run multiple times.

---

# Database
```
Repo calls exists in backend/datastore/TemplateRepository 
You would need to call GetTemplateCategoryByName and GetTemplateByName.
```

# Base Directory

```
/frontend/packages/templates
```

If this directory does not exist → **FAIL**

---

# Expected Directory Structure

```
templates/
  {animation_type_folder}/
    categories/
      {category_name}.md
    {template_name}/
      embedding.md
      metadata.json
      preview.json
      schema.json
```

---

# Animation Type Rules

Each folder inside:

```
templates/{animation_type_folder}
```

Must map to a valid `AnimationType` defined in:

```
models/templates.go
eg. text-animation maps to AnimationType.TEXT
eg. visual-animation maps to AnimationType.VISUAL
etc
```

### Validation

* If folder does not map to valid animation type → **FAIL**
* Folder name must exactly match expected mapping
* No unknown folders allowed

---

# Category Specification

Location:

```
templates/{animation_type_folder}/categories/{category_name}.md
```

---

## Category Mapping

| Field          | Source                 |
| -------------- | ---------------------- |
| name           | filename without `.md` |
| animation_type | animation_type_folder  |
| description    | contents of `.md` file |

---

## Category Validation Rules

1. `categories` folder must exist → else FAIL
2. Each file must:

    * Match regex: `^[a-z0-9-]+\.md$`
    * Contain non-empty content
    * Trimmed content must not be blank
3. No nested folders allowed inside `categories`

---

## Category Upsert Logic

Use existing repository functions.

For each category:

1. Fetch by:

    * `animation_type`
    * `name`

2. If not exists:

    * Create category
    * Count as **Inserted**

3. If exists:

    * Compare `description`
    * If different → update
    * If identical → unchanged

---

# Template Specification

Location:

```
templates/{animation_type_folder}/{template_name}/
```

Template folders must exist at the same level as `categories`.

---

## Template Folder Validation

Folder name must match:

```
^[a-z0-9-]+$
```

If invalid → FAIL

---

## Required Files Inside Template Folder

| File          | Required | Validation         |
| ------------- | -------- | ------------------ |
| metadata.json | required | must be valid JSON |
| preview.json  | required | must be valid JSON |
| schema.json   | required | must be valid JSON |
| embedding.md  | required | must be non-empty  |

If any missing → **FAIL**

If any JSON invalid → **FAIL**

If `embedding.md` empty → **FAIL**

---

# Template Field Mapping

| Field          | Source                                                  |
| -------------- | ------------------------------------------------------- |
| name           | template folder name                                    |
| animation_type | animation_type_folder                                   |
| preview        | preview.json                                            |
| schema         | schema.json                                             |
| description    | embedding.md                                            |
| cdn_url        | `templates/{animation_type_folder}/{template_name}.mjs` |
| categories     | `metadata.json → categories`                            |
| preview_url    | empty string                                            |

---

# metadata.json Rules

Expected structure:

```json
{
  "categories": ["category-one", "category-two"]
}
```

### Validation

* File must exist
* Must be valid JSON
* `categories` field optional
* If present:

    * Must be array of strings
    * Each category must exist for same animation_type
    * If not found → FAIL

Templates without categories are allowed.

---

# Template Upsert Logic

Use existing repository functions.

For each template:

1. Fetch by:

    * `animation_type`
    * `name`

2. Compare fields:

* preview
* schema
* description
* cdn_url
* categories (sorted comparison)

3. If not exists:

    * Create template
    * Count as **Inserted**

4. If exists:

    * If any field differs → Update
    * Else → Unchanged

Only update if there is an actual change.

---

# Execution Flow

1. Validate base directory exists
2. Walk animation_type folders
3. Validate animation type mapping
4. Validate categories folder exists
5. Upsert categories
6. Walk template folders
7. Validate template structure
8. Validate JSON files
9. Validate category references
10. Upsert templates
11. Print summary

---

# Summary Output

On success:

```
SYNC COMPLETED

Categories:
  Inserted: X
  Updated: Y

Templates:
  Inserted: A
  Updated: B
```

---

On failure:

```
SYNC FAILED
Reason: <clear reason>
```

Examples:

* categories folder missing for animation type text-animation
* metadata.json invalid JSON in template text-cascade
* unknown animation type folder image-motion
* embedding.md empty in template hero-slide

---

# Failure Rules (Fail Fast)

Tool must fail if:

* Base directory missing
* Animation type folder not mapped
* categories folder missing
* Required template file missing
* Any JSON invalid
* embedding.md empty
* Category filename invalid
* metadata.json malformed
* metadata.json references unknown category
* Folder naming convention invalid

Previously inserted records remain. No rollback required.

---

# Idempotency Requirements

* Running tool multiple times must not duplicate records
* Only update if actual field change
* Category and template comparison must be deterministic
* Categories comparison must be sorted before checking equality

---