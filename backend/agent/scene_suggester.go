package agent

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/services/templates"
	"go.uber.org/zap"
)

type SceneSuggester struct {
	brandIdentityService brand_identity.BrandIdentity
	llmService           llm.Service
	db                   datastore.Repository
	templateService      templates.Service
	codeGenerator        CodeGeneratorAgent
	logger               *zap.Logger
}

func NewSceneSuggester(brandIdentityService brand_identity.BrandIdentity, db datastore.Repository, templateService templates.Service, logger *zap.Logger) *SceneSuggester {
	return &SceneSuggester{
		llmService:           llm.NewLlmService(logger, nil),
		codeGenerator:        &codeGenerator{logger: logger},
		brandIdentityService: brandIdentityService,
		db:                   db,
		templateService:      templateService,
		logger:               logger,
	}
}

func (s SceneSuggester) extractSceneContent(slide *pbcore.Slide) string {
	var currentSlideContent string

	if slide.Content != nil &&
		slide.Content.CodeRegistry.Defaults != nil &&
		len(slide.Content.CodeRegistry.Defaults.Fields) > 0 {
		payload, err := templates.BuildAndSanitizeLLMPropsPayload(slide.Content.CodeRegistry.Defaults)
		if err != nil {
			s.logger.Error("failed to build llm data payload", zap.Error(err))
		}

		if payload != "" {
			currentSlideContent = payload
		}
	}

	if slide.Content != nil &&
		slide.Content.Edits != nil &&
		len(slide.Content.Edits.Fields) > 0 {
		payload, err := templates.BuildAndSanitizeLLMPropsPayload(slide.Content.Edits)
		if err != nil {
			s.logger.Error("failed to build llm data payload", zap.Error(err))
		}

		if currentSlideContent == "" {
			currentSlideContent = payload
		} else {
			currentSlideContent += "\n\nEdits: " + payload
		}
	}
	return currentSlideContent
}

type SceneSuggesterOptions struct {
	Categories []string
	Cursor     *string
}

func (s SceneSuggester) RenderSuggestion(ctx context.Context,
	templateIDs []string,
	contentSlide *pbcore.Slide,
	video *models.Video) ([]*pbcore.Section, error) {
	ctx = context.WithValue(ctx, llm.VideoIDKey, video.ID)
	ctx = context.WithValue(ctx, llm.SceneIDKey, contentSlide.GetId())

	sections := make([]*pbcore.Section, 0)
	currentSlideContent := s.extractSceneContent(contentSlide)
	if currentSlideContent == "" || len(templateIDs) == 0 {
		return sections, nil
	}

	registry, err := s.createMediaAssetRegistry(video.Metadata.GeneratedBranding.BrandIdentity)
	if err != nil {
		return nil, err
	}

	templateRegistry := NewTemplateRegistry(s.templateService, registry, s.codeGenerator, s.logger)
	err = templateRegistry.WithTemplateIds(ctx, templateIDs)
	if err != nil {
		return nil, err
	}

	extractReq := types.ExtractTemplateConfigRequest{
		Content: currentSlideContent,
		Scenes:  templateRegistry.ToSceneElements(),
	}

	if registry != nil {
		extractReq.VideoBranding = types.VideoBranding{
			BrandGuideLines: registry.FormatBrandDetails(),
		}
	}

	response, err := s.llmService.ExtractTemplateConfig(ctx, extractReq)
	if err != nil {
		return nil, err
	}

	for _, scene := range response.Scenes {
		slides, err := templateRegistry.GenerateScene(ctx, &types.Scene{
			Element: scene,
		})
		if err != nil {
			s.logger.Error("failed to generate scene", zap.Error(err))
			continue
		}

		// Apply background
		for _, slide := range slides {
			slide.BackgroundStyle = contentSlide.BackgroundStyle
			slide.Content.History = nil
		}

		sections = append(sections, &pbcore.Section{
			Slides: slides,
		})
	}

	return sections, nil
}

func (s SceneSuggester) GenerateSuggestions(ctx context.Context, req *pbportal.GenerateSuggestionsInput) (*pbportal.GenerateSuggestionsResponse, error) {
	ctx = context.WithValue(ctx, llm.VideoIDKey, req.VideoId)
	ctx = context.WithValue(ctx, llm.SceneIDKey, req.Slide.GetId())

	var categories []string
	if len(req.Categories) > 0 {
		categories = req.Categories
	}

	var cursor *models.TemplateCursor
	if req.NextPage != nil {
		cursorDecoded, err := decodeTemplateCursor(*req.NextPage)
		if err != nil {
			return nil, fmt.Errorf("failed to decode cursor: %w", err)
		}

		// use categories from the cursor
		categories = cursorDecoded.Categories
		cursor = cursorDecoded
	}

	if len(categories) == 0 {
		currentSlideContent := s.extractSceneContent(req.Slide)

		if currentSlideContent != "" {
			reqMatchCat := types.MatchCategoriesRequest{
				Categories: scenes.AvailableCategoriesToCategorize,
				Content:    currentSlideContent,
			}

			scene, err := s.llmService.CategorizeScene(ctx, reqMatchCat)
			if err != nil {
				return nil, err
			}

			categories = scene.Categories
		}
	}

	// if no categories found, return empty
	if len(categories) == 0 {
		return &pbportal.GenerateSuggestionsResponse{}, nil
	}

	templatePage, err := s.db.ListTemplatesByCategories(ctx, categories, int(req.PageSize), cursor)
	if err != nil {
		return nil, err
	}

	templateIds := make([]string, len(templatePage.Templates))
	for i, template := range templatePage.Templates {
		templateIds[i] = template.ID
	}

	return &pbportal.GenerateSuggestionsResponse{
		Tid:      templateIds,
		NextPage: templatePage.NextCursor,
	}, nil

}

func (s SceneSuggester) createMediaAssetRegistry(brandIdentity *pbcore.BrandIdentity) (*services.MediaAssetRegistry, error) {
	registryBuilder := services.NewMediaAssetRegistryBuilder()

	if brandIdentity != nil {
		registryBuilder.
			WithBrandIdentity(brandIdentity).
			WithBrandAssets() // only while editing
	}

	return registryBuilder.Build(), nil
}

func decodeTemplateCursor(cursor string) (*models.TemplateCursor, error) {
	if cursor == "" {
		return nil, nil
	}

	data, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, err
	}

	var c models.TemplateCursor
	if err := json.Unmarshal(data, &c); err != nil {
		return nil, err
	}

	return &c, nil
}
