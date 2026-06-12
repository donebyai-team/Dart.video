package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/services/templates"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

type SceneSuggester struct {
	brandIdentityService brand_identity.BrandIdentity
	llmService           llm.Service
	codeGenerator        CodeGeneratorAgent
	logger               *zap.Logger
}

func NewSceneSuggester(brandIdentityService brand_identity.BrandIdentity, logger *zap.Logger) *SceneSuggester {
	return &SceneSuggester{
		llmService:           llm.NewLlmService(logger, nil),
		codeGenerator:        &codeGenerator{logger: logger},
		brandIdentityService: brandIdentityService,
		logger:               logger,
	}
}

func (s SceneSuggester) CategorizeScene(
	ctx context.Context,
	slide *pbcore.Slide,
) (*types.MatchCategoriesResponse, error) {
	var original, edits string

	if slide.Content != nil &&
		slide.Content.CodeRegistry.Defaults != nil &&
		len(slide.Content.CodeRegistry.Defaults.Fields) > 0 {
		payload, err := templates.BuildLLMDataPayload(slide.Content.CodeRegistry.Defaults)
		if err != nil {
			s.logger.Error("failed to build llm data payload", zap.Error(err))
		}

		if payload != "" {
			original = payload
		}
	}

	if slide.Content != nil &&
		slide.Content.Edits != nil &&
		len(slide.Content.Edits.Fields) > 0 {
		payload, err := templates.BuildLLMDataPayload(slide.Content.Edits)
		if err != nil {
			s.logger.Error("failed to build llm data payload", zap.Error(err))
		}

		if payload != "" {
			edits = payload
		}
	}

	// If there is no default payload, use the edits payload as original
	if original == "" && edits != "" {
		original = edits
	}

	// TODO: Handle the case where edits and defaults both are empty
	req := types.MatchCategoriesRequest{
		Categories: scenes.TemplateCategories,
		Original:   original,
	}

	if edits != "" {
		req.Edits = utils.Ptr(edits)
	}

	return s.llmService.CategorizeScene(ctx, req)
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
