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
	MatchCategories(ctx context.Context, animationType types.AnimationType, query string) ([]*models.TemplateCategory, error)

	// MatchTemplates returns templates for a given category, applying filters.
	// usedTemplateIDs: non-repeatable templates with these IDs are excluded
	// returns top k.
	MatchTemplates(ctx context.Context,
		animationType types.AnimationType,
		beatDescription string,
		category string,
		options MatchTemplatesOptions) ([]*models.Template, error)

	GetFallbackTemplate(ctx context.Context) (*models.Template, error)
}

type llmRetrievalService struct {
	db         datastore.Repository
	llmService llm.LLMService
}

func NewLlmRetrievalService(db datastore.Repository, llmService llm.LLMService) RetrievalService {
	return &llmRetrievalService{db: db, llmService: llmService}
}

const fallBackTemplateName = "text-cascade"

func (l llmRetrievalService) GetFallbackTemplate(ctx context.Context) (*models.Template, error) {
	template, err := l.db.GetTemplateByName(ctx, types.AnimationTypeTEXT, fallBackTemplateName)
	if err != nil {
		return nil, err
	}

	return template, nil
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

func (l llmRetrievalService) MatchTemplates(ctx context.Context,
	animationType types.AnimationType,
	beatDescription string,
	category string,
	options MatchTemplatesOptions) ([]*models.Template, error) {
	templates, err := l.db.GetTemplatesByCategory(ctx, category, animationType, options.usedIds)
	if err != nil {
		return nil, err
	}

	templateMap := make(map[string]*models.Template)
	matchTem := make([]types.TemplateItem, 0, len(templates))
	for _, temp := range templates {
		matchTem = append(matchTem, types.TemplateItem{
			Name:        temp.Name,
			Description: temp.Description,
		})
		templateMap[temp.Name] = temp
	}

	templateMaterInput := types.MatchTemplateRequest{
		Templates:   matchTem,
		CurrentBeat: beatDescription,
	}

	if options.plan != nil {
		templateMaterInput.PlanSoFar = options.plan.Sections
	}

	// TODO: Replace it with semantic search
	matchedTemplates, err := l.llmService.MatchTemplates(ctx, &templateMaterInput)
	if err != nil {
		return nil, err
	}

	filteredTemplates := make([]*models.Template, 0)
	for _, temp := range matchedTemplates {
		value, ok := templateMap[temp.Name]
		if !ok {
			filteredTemplates = append(filteredTemplates, value)
		}
	}
	return filteredTemplates, nil
}
