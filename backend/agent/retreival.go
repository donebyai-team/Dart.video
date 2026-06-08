package agent

import (
	"context"
	"github.com/shank318/coasterai/agent/llm"
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
	MatchCategories(ctx context.Context, animationType string, query string) ([]*models.TemplateCategory, error)
}

type llmRetrievalService struct {
	db         datastore.Repository
	llmService llm.Service
}

func NewLlmRetrievalService(db datastore.Repository, llmService llm.Service) RetrievalService {
	return &llmRetrievalService{db: db, llmService: llmService}
}

const fallBackTemplateName = "text-cascade"

func (l llmRetrievalService) MatchCategories(ctx context.Context, animationType string, query string) ([]*models.TemplateCategory, error) {
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

	// TODO: Replace it with semantic search
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

type MatchTemplatesOptions struct {
	plan    *types.VideoGenerationPlan
	usedIds []string
}
