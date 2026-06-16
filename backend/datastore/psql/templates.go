package psql

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/lib/pq"
	"github.com/shank318/coasterai/models"
	"strings"
)

func init() {
	registerFiles([]string{
		// template category
		"templates/create_template_category.sql",
		"templates/update_template_category.sql",
		"templates/query_template_categories_by_animation.sql",
		"templates/query_template_categories_by_name.sql",

		// templates
		"templates/create_template.sql",
		"templates/update_template.sql",
		"templates/query_template_by_category.sql",
		"templates/query_template_by_id.sql",
		"templates/delete_template_by_id.sql",
		"templates/query_templates_by_category_priority.sql",
		"templates/query_templates_random.sql",
		"templates/query_template_by_name.sql",
	})
}

func (r *Database) CreateTemplateCategory(ctx context.Context, tc *models.TemplateCategory) (*models.TemplateCategory, error) {
	stmt := r.mustGetStmt("templates/create_template_category.sql")
	var id string

	err := stmt.GetContext(ctx, &id, map[string]interface{}{
		"animation_type": tc.AnimationType,
		"name":           tc.Name,
		"description":    tc.Description,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create template category: %w", err)
	}

	tc.ID = id
	return tc, nil
}

func (r *Database) UpdateTemplateCategory(ctx context.Context, tc *models.TemplateCategory) error {
	stmt := r.mustGetStmt("templates/update_template_category.sql")
	_, err := stmt.ExecContext(ctx, map[string]interface{}{
		"id":          tc.ID,
		"description": tc.Description,
	})
	if err != nil {
		return fmt.Errorf("failed to update template category: %w", err)
	}
	return nil
}

func (r *Database) GetTemplateCategoriesByAnimationType(
	ctx context.Context,
	animationType string,
) ([]*models.TemplateCategory, error) {
	return getMany[models.TemplateCategory](
		ctx,
		r,
		"templates/query_template_categories_by_animation.sql",
		map[string]any{
			"animation_type": animationType,
		},
	)
}

func (r *Database) GetTemplateCategoryByName(
	ctx context.Context,
	animationType string,
	name string,
) (*models.TemplateCategory, error) {
	return getOne[models.TemplateCategory](ctx, r, "templates/query_template_categories_by_name.sql", map[string]any{
		"animation_type": animationType,
		"name":           name,
	},
	)
}

func (r *Database) CreateTemplate(ctx context.Context, t *models.Template) (*models.Template, error) {
	stmt := r.mustGetStmt("templates/create_template.sql")
	var id string

	err := stmt.GetContext(ctx, &id, map[string]interface{}{
		"name":        strings.ToLower(t.Name),
		"categories":  pq.Array(toUpperCategories(t.Categories)),
		"description": t.Description,
		"schema":      t.Schema,
		"config":      t.Config,
		"repeatable":  t.Repeatable,
		"metadata":    t.Metadata,
		"status":      t.Status,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create template: %w", err)
	}

	t.ID = id
	return t, nil
}

func toUpperCategories(categories []string) []string {
	result := make([]string, len(categories))
	for i, category := range categories {
		result[i] = strings.ToUpper(category)
	}
	return result
}

func (r *Database) DeleteTemplateByID(ctx context.Context, id string) error {
	stmt := r.mustGetStmt("templates/delete_template_by_id.sql")
	_, err := stmt.ExecContext(ctx, map[string]interface{}{
		"id": id,
	})
	if err != nil {
		return fmt.Errorf("failed to delete template %w", err)
	}
	return nil
}

func (r *Database) UpdateTemplate(ctx context.Context, t *models.Template) error {
	stmt := r.mustGetStmt("templates/update_template.sql")
	_, err := stmt.ExecContext(ctx, map[string]interface{}{
		"id":          t.ID,
		"categories":  pq.Array(toUpperCategories(t.Categories)),
		"description": t.Description,
		"config":      t.Config,
		"repeatable":  t.Repeatable,
		"metadata":    t.Metadata,
		"status":      t.Status,
		"name":        strings.ToLower(t.Name),
	})
	if err != nil {
		return fmt.Errorf("failed to update template: %w", err)
	}
	return nil
}

func (r *Database) GetTemplatesByCategory(
	ctx context.Context,
	category []string,
) ([]*models.Template, error) {
	return getMany[models.Template](
		ctx,
		r,
		"templates/query_template_by_category.sql",
		map[string]any{
			"categories": pq.Array(category),
		},
	)
}

func (r *Database) GetTemplateByID(
	ctx context.Context,
	ID string,
) (*models.Template, error) {
	return getOne[models.Template](
		ctx,
		r,
		"templates/query_template_by_id.sql",
		map[string]any{
			"id": ID,
		},
	)
}

func (r *Database) GetTemplateByName(
	ctx context.Context,
	name string,
) (*models.Template, error) {
	return getOne[models.Template](
		ctx,
		r,
		"templates/query_template_by_name.sql",
		map[string]any{
			"name": strings.ToLower(name),
		},
	)
}

func (r *Database) GetTemplatesByCategoryRandom(
	ctx context.Context,
	category string,
) ([]*models.Template, error) {
	return getMany[models.Template](
		ctx,
		r,
		"templates/query_templates_random.sql",
		map[string]any{
			"category": category,
		},
	)
}

type templateWithPriority struct {
	models.Template
	MatchPriority int `db:"match_priority"`
}

func (r *Database) ListTemplatesByCategories(
	ctx context.Context,
	categories []string,
	pageSize int,
	cursor *models.TemplateCursor,
) (*models.TemplatePage, error) {

	args := map[string]any{
		"categories": pq.Array(categories),
		"limit":      pageSize + 1,
	}

	if cursor != nil {
		args["cursorPriority"] = cursor.MatchPriority
		args["cursorCreatedAt"] = cursor.CreatedAt
		args["cursorID"] = cursor.ID
	} else {
		args["cursorPriority"] = nil
		args["cursorCreatedAt"] = nil
		args["cursorID"] = nil
	}

	rows, err := getMany[templateWithPriority](
		ctx,
		r,
		"templates/query_templates_by_category_priority.sql",
		args,
	)
	if err != nil {
		return nil, err
	}

	hasNextPage := len(rows) > pageSize

	if hasNextPage {
		rows = rows[:pageSize]
	}

	templates := make([]models.Template, len(rows))
	for i, row := range rows {
		templates[i] = row.Template
	}

	var nextCursor *string

	if hasNextPage {
		last := rows[len(rows)-1]

		c := models.TemplateCursor{
			Categories:    categories,
			MatchPriority: last.MatchPriority,
			CreatedAt:     last.CreatedAt,
			ID:            last.ID,
		}

		data, err := json.Marshal(c)
		if err != nil {
			return nil, err
		}

		encoded := base64.RawURLEncoding.EncodeToString(data)
		nextCursor = &encoded
	}

	return &models.TemplatePage{
		Templates:  templates,
		NextCursor: nextCursor,
	}, nil
}
