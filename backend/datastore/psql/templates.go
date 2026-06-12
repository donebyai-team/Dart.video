package psql

import (
	"context"
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
		"name":        t.Name,
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
		"name":        t.Name,
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
