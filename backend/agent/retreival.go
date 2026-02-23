package agent

import (
	"context"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
)

// RetrievalService handles category and template lookup.
// Implementations:
//   - FullListRetrievalService  (current)  — receives full list, ranks in-process
//   - SemanticRetrievalService  (future)   — calls vector DB with embeddings
type RetrievalService interface {
	// MatchCategories takes a semantic query and returns ranked category matches.
	// topK controls how many to return (e.g. 3 for fallback chain).
	MatchCategories(ctx context.Context, animationType types.AnimationType, query string) ([]*models.TemplateCategory, error)

	// FetchTemplates returns templates for a given category, applying filters.
	// usedTemplateIDs: non-repeatable templates with these IDs are excluded
	// returns top k.
	FetchTemplates(ctx context.Context, animationType types.AnimationType, category string, usedIds []string) ([]*models.Template, error)

	// MatchTemplates takes a query and a pre-filtered pool, returns ranked candidates.
	// topK controls shortlist size for the LLM selector.
	//MatchTemplates(ctx context.Context, query string, pool []Template, topK int) ([]TemplateCandidate, error)
}

type llmRetrievalService struct {
	db datastore.Repository
}

func NewLlmRetrievalService(db datastore.Repository) RetrievalService {
	return &llmRetrievalService{db: db}
}

func (l llmRetrievalService) MatchCategories(ctx context.Context, animationType types.AnimationType, query string) ([]*models.TemplateCategory, error) {
	categories, err := l.db.GetTemplateCategoriesByAnimationType(ctx, animationType)
	if err != nil {
		return nil, err
	}

	if len(categories) == 0 {
		return nil, nil
	}

	categoryMap := make(map[string]*models.TemplateCategory)
	matchCat := make([]types.Category, 0, len(categories))
	for _, category := range categories {
		matchCat = append(matchCat, types.Category{
			Name:        category.Name,
			Description: category.Description,
		})
		categoryMap[category.Name] = category
	}

	matchCategoryReq := types.MatchCategoriesRequest{
		Categories: matchCat,
		Query:      query,
	}

	matchCategoriesResponse, err := baml_client.MatchCategories(ctx, matchCategoryReq)
	if err != nil {
		return nil, err
	}

	filteredCategories := make([]*models.TemplateCategory, 0)
	for _, category := range matchCategoriesResponse.Categories {
		value, ok := categoryMap[category.Name]
		if !ok {
			filteredCategories = append(filteredCategories, value)
		}
	}

	return filteredCategories, nil
}

func (l llmRetrievalService) FetchTemplates(ctx context.Context, animationType types.AnimationType, category string, usedIds []string) ([]*models.Template, error) {
	return l.db.GetTemplatesByCategory(ctx, category, animationType, usedIds)
}
