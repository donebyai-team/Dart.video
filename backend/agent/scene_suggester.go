package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

type SceneSuggester struct {
	brandIdentityService brand_identity.BrandIdentity
	llmService           llm.LLMService
	animationGenerator   CodeGenerator
	logger               *zap.Logger
}

func NewSceneSuggester(brandIdentityService brand_identity.BrandIdentity, logger *zap.Logger) *SceneSuggester {
	return &SceneSuggester{
		llmService:           llm.NewLlmService(logger, nil),
		animationGenerator:   &codeGenerator{logger: logger},
		brandIdentityService: brandIdentityService,
		logger:               logger,
	}
}

func (s SceneSuggester) GenerateSuggestions(
	ctx context.Context,
	sceneID string,
	video *models.Video,
) ([]*pbcore.Section, error) {
	ctx = context.WithValue(ctx, "session_id", sceneID)
	prevSlide, currSlide, nextSlide, err := findSlides(video, sceneID)
	if err != nil {
		return nil, err
	}

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

	suggestScenesFromLLM, err := s.llmService.SuggestScenes(ctx, suggestInput)
	if err != nil {
		return nil, agenterrors.LLMPlanningFailed(
			"failed to generate scene suggestions",
			err,
		)
	}

	// the current slide background is used as the default background for the suggested slides
	bgStyle := currSlide.BackgroundStyle
	if bgStyle == nil {
		bgStyle = video.Metadata.BackgroundStyle
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
) (prev, curr, next *pbcore.Slide, err error) {

	var allSlides []*pbcore.Slide

	for _, section := range video.Config.Sections {
		allSlides = append(allSlides, section.Slides...)
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

		return prev, curr, next, nil
	}

	return nil, nil, nil, fmt.Errorf(
		"slide with sceneID %s not found",
		sceneID,
	)
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
		template, err := s.animationGenerator.GenerateCodeFromScene(
			ctx,
			sceneConfig,
			func(progress TemplateGenerationProgress) {},
		)
		if err != nil {
			return nil, err
		}
		// TODO:
		// We extract the variant, color, font from the currentSlide
		// and apply it in the suggested slide.

		toStructConfig, err := utils.RawMessageToStruct(
			template.GeneratedPatches,
		)
		if err != nil {
			s.logger.Error(
				"failed to convert template config",
				zap.Error(err),
				zap.Any("template_config", template.GeneratedPatches),
			)

			return nil, errors.Wrapf(
				err,
				"invalid template config: %s",
				template.Name,
			)
		}

		if sceneConfig.Background != nil {
			bgStyle = sceneConfig.Background
		}

		slides = append(slides, &pbcore.Slide{
			BackgroundStyle:  bgStyle,
			DurationInFrames: template.Config.VisibleDurationInFrames,
			SettledFrame:     template.Config.VisibleDurationInFrames,
			Content: &pbcore.AnimationSlideContent{
				CodeRegistry: template.Config.CodeRegistry,
				Plan:         &pbcore.AnimationSlidePlan{},
				Edits:        toStructConfig,
			},
			SlideStatus: pbcore.SlideStatus_SLIDE_STATUS_GENERATED,
		})
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
