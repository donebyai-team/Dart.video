package psql

import (
	"context"
	"fmt"
	"github.com/lib/pq"
	"github.com/shank318/coasterai/models"
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
	animationType models.AnimationType,
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
	animationType models.AnimationType,
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
		"name":           t.Name,
		"animation_type": t.AnimationType,
		"categories":     pq.Array(t.Categories),
		"description":    t.Description,
		"schema":         t.Schema,
		"preview":        t.Preview,
		"cdn_url":        t.CDNUrl,
		"repeatable":     t.Repeatable,
		"preview_url":    t.PreviewUrl,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create template: %w", err)
	}

	t.ID = id
	return t, nil
}

func (r *Database) UpdateTemplate(ctx context.Context, t *models.Template) error {
	stmt := r.mustGetStmt("templates/update_template.sql")
	_, err := stmt.ExecContext(ctx, map[string]interface{}{
		"id":          t.ID,
		"categories":  pq.Array(t.Categories),
		"description": t.Description,
		"schema":      t.Schema,
		"preview":     t.Preview,
		"cdn_url":     t.CDNUrl,
		"repeatable":  t.Repeatable,
		"preview_url": t.PreviewUrl,
	})
	if err != nil {
		return fmt.Errorf("failed to update template: %w", err)
	}
	return nil
}

func (r *Database) GetTemplatesByCategory(
	ctx context.Context,
	category string,
) ([]*models.Template, error) {
	return getMany[models.Template](
		ctx,
		r,
		"templates/query_template_by_category.sql",
		map[string]any{
			"category": category,
		},
	)
}

func (r *Database) GetTemplateByName(
	ctx context.Context,
	animationType string,
	name string,
) (*models.Template, error) {
	return getOne[models.Template](
		ctx,
		r,
		"templates/query_template_by_name.sql",
		map[string]any{
			"animation_type": animationType,
			"name":           name,
		},
	)
}
