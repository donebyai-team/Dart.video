package agent

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
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
	"strings"
)

type SceneSuggester struct {
	brandIdentityService brand_identity.BrandIdentity
	llmService           llm.Service
	db                   datastore.Repository
	codeGenerator        CodeGeneratorAgent
	logger               *zap.Logger
}

func NewSceneSuggester(brandIdentityService brand_identity.BrandIdentity, db datastore.Repository, logger *zap.Logger) *SceneSuggester {
	return &SceneSuggester{
		llmService:           llm.NewLlmService(logger, nil),
		codeGenerator:        &codeGenerator{logger: logger},
		brandIdentityService: brandIdentityService,
		db:                   db,
		logger:               logger,
	}
}

func (s SceneSuggester) extractSceneContent(slide *pbcore.Slide) string {
	var currentSlideContent string

	if slide.Content != nil &&
		slide.Content.CodeRegistry.Defaults != nil &&
		len(slide.Content.CodeRegistry.Defaults.Fields) > 0 {
		payload, err := templates.BuildLLMDataPayload(slide.Content.CodeRegistry.Defaults)
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
		payload, err := templates.BuildLLMDataPayload(slide.Content.Edits)
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
	templateID string,
	contentSlide *pbcore.Slide,
	video *models.Video) ([]*pbcore.Section, error) {
	ctx = context.WithValue(ctx, llm.TemplateIDKey, templateID)
	ctx = context.WithValue(ctx, llm.SceneIDKey, contentSlide.GetId())

	registry, err := s.createMediaAssetRegistry(ctx, video.Metadata.GeneratedBranding.BrandIdentity)
	if err != nil {
		return nil, err
	}

	currentSlideContent := s.extractSceneContent(contentSlide)

	template, err := s.db.GetTemplateByID(ctx, templateID)
	if err != nil {
		return nil, err
	}

	schemas := make([]string, 0)

	templateName := template.Name
	component, _ := scenes.FindComponent(templateName)
	if component != nil {
		var b strings.Builder
		scenes.WriteProps(&b, component.LLMSchema, nil)
		schemas = append(schemas, b.String())
	} else {
		for _, section := range template.Config.Sections {
			for _, slide := range section.Slides {
				if slide.Content.CodeRegistry.Defaults != nil {
					templateSchema, err := templates.BuildLLMDataPayload(slide.Content.CodeRegistry.Defaults)
					if err != nil {
						s.logger.Error("failed to build llm data payload", zap.Error(err))
						return nil, err
					}

					schemas = append(schemas, templateSchema)
				}
			}
		}
	}

	extractReq := types.ExtractTemplateConfigRequest{
		Content: currentSlideContent,
		Schema:  schemas,
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

	if component != nil {
		props := response.Props[0]
		suggestedSlide, err := s.buildSuggestedSlide(ctx, &types.Scene{
			Element: types.SceneElement{
				Component: component.Name,
				Props:     props,
			},
		}, contentSlide.BackgroundStyle, registry)
		if err != nil {
			return nil, err
		}

		return []*pbcore.Section{{Slides: suggestedSlide}}, nil
	} else {
		for _, section := range template.Config.Sections {
			for index, slide := range section.Slides {
				if response.Props == nil || len(response.Props) <= index {
					continue
				}
				props := response.Props[index]
				output, err := templates.MergeLLMOutput(slide.Content.CodeRegistry.Defaults, props)
				if err != nil {
					s.logger.Error("failed to merge llm output", zap.Error(err))
				}

				slide.Content.CodeRegistry.Defaults = output
				slide.BackgroundStyle = contentSlide.BackgroundStyle
			}
		}
	}

	return template.Config.Sections, nil
}

func (s SceneSuggester) GenerateSuggestionsV2(ctx context.Context, req *pbportal.GenerateSuggestionsInput) (*pbportal.GenerateSuggestionsResponse, error) {
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
				Categories: scenes.TemplateCategories,
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

func (s SceneSuggester) GenerateSuggestions(
	ctx context.Context,
	sceneID string,
	category pbcore.AnimationCategory,
	video *models.Video,
) ([]*pbcore.Section, error) {
	ctx = context.WithValue(ctx, llm.VideoIDKey, video.ID)
	ctx = context.WithValue(ctx, llm.SceneIDKey, sceneID)

	prevSlide, currSlide, nextSlide, fallbackSlide := findSlides(video, sceneID)

	registry, err := s.createMediaAssetRegistry(ctx, video.Metadata.GeneratedBranding.BrandIdentity)
	if err != nil {
		return nil, err
	}

	suggestInput := types.SuggestScenesRequest{
		ComponentList: scenes.BuildScenesList(scenes.BuildSceneListOptions{
			Groups:       true,
			Enums:        false,
			FieldsToSkip: scenes.SkipLLMFields,
		}),
	}

	if registry != nil {
		suggestInput.VideoBranding = types.VideoBranding{
			BrandGuideLines: registry.FormatBrandDetails(),
		}
	}

	if suggestInput.Current, err = slideToSceneJSON(currSlide, "current", registry); err != nil {
		return nil, err
	}

	if suggestInput.Before, err = slideToSceneJSON(prevSlide, "prev", registry); err != nil {
		return nil, err
	}

	if suggestInput.After, err = slideToSceneJSON(nextSlide, "next", registry); err != nil {
		return nil, err
	}

	if category != pbcore.AnimationCategory_ANIMATION_CATEGORY_UNSPECIFIED {
		suggestInput.Category = category.String()
	}

	suggestScenesFromLLM, err := s.llmService.SuggestScenes(ctx, suggestInput)
	if err != nil {
		return nil, agenterrors.LLMPlanningFailed(
			"failed to generate scene suggestions",
			err,
		)
	}

	// the current slide background is used as the default background for the suggested slides
	bgStyle := video.Metadata.BackgroundStyle
	if currSlide != nil && currSlide.BackgroundStyle != nil {
		bgStyle = currSlide.BackgroundStyle
	}

	// try the last slide
	if bgStyle == nil && fallbackSlide != nil && fallbackSlide.BackgroundStyle != nil {
		bgStyle = fallbackSlide.BackgroundStyle
	}

	if bgStyle == nil {
		bgStyle = brand_identity.GenerateDefaultBackground(
			video.Metadata.GeneratedBranding.Colors,
		)
	}

	suggestedScenes := make([]*pbcore.Section, 0, len(suggestScenesFromLLM.Scenes))

	for _, scene := range suggestScenesFromLLM.Scenes {
		slide, err := s.buildSuggestedSlide(ctx, &scene, bgStyle, registry)
		if err != nil {
			return nil, err
		}

		suggestedScenes = append(suggestedScenes, &pbcore.Section{
			Slides: slide,
		})
	}

	return suggestedScenes, nil
}

func findSlides(
	video *models.Video,
	sceneID string,
) (prev, curr, next, fallback *pbcore.Slide) {

	var allSlides []*pbcore.Slide

	for _, section := range video.Config.Sections {
		allSlides = append(allSlides, section.Slides...)
	}

	// Set fallback to the last slide (if any)
	if len(allSlides) > 0 {
		fallback = allSlides[len(allSlides)-1]
	}

	for i, slide := range allSlides {
		if slide.GetId() != sceneID {
			continue
		}

		curr = slide

		if i > 0 {
			prev = allSlides[i-1]
		}

		if i < len(allSlides)-1 {
			next = allSlides[i+1]
		}

		return prev, curr, next, fallback
	}

	return nil, nil, nil, fallback
}

func slideToSceneJSON(
	slide *pbcore.Slide,
	label string,
	mediaRegistry *services.MediaAssetRegistry,
) (string, error) {

	if slide == nil ||
		slide.Content == nil ||
		slide.Content.Edits == nil ||
		len(slide.Content.Edits.Fields) == 0 {
		return "", nil
	}

	// TODO: Optimize this to extract only component name and text fields.
	if !IsSlideHasTemplateComponent(slide) {
		edits, err := slide.Content.Edits.MarshalJSON()
		return string(edits), err
	}

	sceneToEdit, err := scenes.EditsToScene(
		slide.Content.Edits,
		mediaRegistry,
	)
	if err != nil {
		return "", agenterrors.InvalidInput(
			fmt.Sprintf("invalid %s scene patch", label),
			err,
		)
	}

	marshaled, err := json.Marshal(sceneToEdit)
	if err != nil {
		return "", agenterrors.InvalidInput(
			fmt.Sprintf("invalid %s scene patch", label),
			err,
		)
	}

	return string(marshaled), nil
}

func (s SceneSuggester) buildSuggestedSlide(
	ctx context.Context,
	scene *types.Scene,
	bgStyle *pbcore.BackgroundStyle,
	mediaRegistry *services.MediaAssetRegistry,
) ([]*pbcore.Slide, error) {

	slides := make([]*pbcore.Slide, 0)
	sceneConfigs, err := scenes.ConvertToSceneConfigWithBackground(scene, bgStyle, mediaRegistry)
	if err != nil {
		return nil, err
	}

	for _, sceneConfig := range sceneConfigs {
		template, err := s.codeGenerator.GenerateCodeFromScene(
			ctx,
			sceneConfig,
		)
		if err != nil {
			return nil, err
		}
		// TODO:
		// We extract the variant, color, font from the currentSlide
		// and apply it in the suggested slide.

		if sceneConfig.Background != nil {
			template.BackgroundStyle = sceneConfig.Background
		}
		template.SlideStatus = pbcore.SlideStatus_SLIDE_STATUS_GENERATED

		slides = append(slides, template)
	}

	return slides, nil
}

func (s SceneSuggester) createMediaAssetRegistry(ctx context.Context, brandIdentity *pbcore.BrandIdentity) (*services.MediaAssetRegistry, error) {
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
