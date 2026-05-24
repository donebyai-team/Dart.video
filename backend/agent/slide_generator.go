package agent

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/services/voiceover"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"strings"
)

// Default transition time for all slides, same in frontend
const transitionDurationInFrames int32 = 10 // MAKE sure it is synced with frontend

type videoConfigGenerator struct {
	video                 *pbcore.Video
	videoGeneratorService services.VideoGeneration
	logger                *zap.Logger
}

func NewVideoConfigGenerator(
	logger *zap.Logger,
	videoGeneratorService services.VideoGeneration,
) *videoConfigGenerator {
	return &videoConfigGenerator{
		logger:                logger,
		videoGeneratorService: videoGeneratorService,
	}
}

func (g *videoConfigGenerator) Init(videoID, name string) *videoConfigGenerator {
	g.video = &pbcore.Video{
		Id:       videoID,
		Name:     name,
		Config:   &pbcore.VideoConfig{Sections: []*pbcore.Section{}},
		Metadata: &pbcore.VideoMetadata{},
	}
	return g
}

func (g *videoConfigGenerator) AddVideoBackground(style *pbcore.BackgroundStyle) {
	g.video.Metadata.BackgroundStyle = style
	g.video.Metadata.BackgroundAudioUrl = utils.Ptr(voiceover.GenerateBackgroundMusic().URL)
}

func (g *videoConfigGenerator) Done(ctx context.Context) error {
	return g.update(ctx, models.VideoStatusCOMPLETED)
}

func (g *videoConfigGenerator) Fail(ctx context.Context, cause error, status models.VideoStatus) error {
	g.logger.Error("video generation failed", zap.Error(cause), zap.String("status", status.String()))
	return g.update(ctx, status)
}

func (g *videoConfigGenerator) AddBranding(assetRegistry *services.MediaAssetRegistry) {
	generatedBranding := &pbcore.GeneratedVideoBranding{}
	var bgStyle *pbcore.BackgroundStyle

	// Step 1: get colors (already processed)
	if assetRegistry == nil {
		generatedBranding.Colors = brand_identity.ExtractOrGenerateColors(nil)
	} else {
		brandIdentity := assetRegistry.GetIdentity()
		if brandIdentity == nil {
			generatedBranding.Colors = brand_identity.ExtractOrGenerateColors(nil)
		} else {
			generatedBranding.BrandIdentity = brandIdentity
			bgStyle = brandIdentity.BgStyle
			if len(brandIdentity.Colors) == 0 {
				generatedBranding.Colors = brand_identity.ExtractOrGenerateColors(nil)
			} else {
				generatedBranding.Colors = brandIdentity.Colors
			}
		}
	}

	// Generate background and text colors
	if bgStyle == nil {
		bgStyle = brand_identity.GenerateDefaultBackground(generatedBranding.Colors)
	}
	generatedBranding.Colors = brand_identity.ModifyTextColor(generatedBranding.Colors, bgStyle)

	// Step 5: assign branding
	g.video.Metadata.GeneratedBranding = generatedBranding
	g.AddVideoBackground(bgStyle)
}

func (g *videoConfigGenerator) CreatePendingSlidesV2(
	ctx context.Context,
	assetRegistry *services.MediaAssetRegistry,
	plan *types.GeneratedVideoPlan,
) (*pbcore.Video, map[string]*scenes.SceneConfig, error) {
	g.AddBranding(assetRegistry)

	sections := make([]*pbcore.Section, 0, len(plan.Sections))
	sceneMapper := make(map[string]*scenes.SceneConfig)

	isTextHighlightSeen := false

	for sectionIndex, pendingSection := range plan.Sections {
		section := &pbcore.Section{
			Id:     fmt.Sprintf("section-%s", uuid.NewString()),
			Title:  pendingSection.Name,
			Color:  pickRandomColor(),
			Slides: []*pbcore.Slide{},
			Index:  int32(sectionIndex),
		}

		slideIndex := 0

		for _, pendingSlide := range pendingSection.Slides {
			sceneConfigs, err := scenes.ConvertToSceneConfig(&pendingSlide, assetRegistry)
			if err != nil {
				return nil, nil, err
			}

			for _, sceneConfig := range sceneConfigs {
				slide := &pbcore.Slide{
					Id:          fmt.Sprintf("slide-%s", uuid.NewString()),
					SlideStatus: pbcore.SlideStatus_SLIDE_STATUS_PENDING,
					Index:       int32(slideIndex),
					Content: &pbcore.AnimationSlideContent{
						Plan: &pbcore.AnimationSlidePlan{},
					},
				}

				// TODO: Move to a better place
				// By default, TextHighlight exit is animated with zoom on the whole slide,
				// But we want to change to highledited text only, so we need to change the exit animation to none
				// But we do it only once, in case there are multiple TextHighlights in the same slide
				if strings.EqualFold(sceneConfig.Name, "TextHighlight") && !isTextHighlightSeen {
					isTextHighlightSeen = true
					if textHighlightProps, ok := sceneConfig.Props["texthighlight"].(map[string]any); ok {
						textHighlightProps["highlightedTextAnimation"] = "zoom"
						textHighlightProps["exitAnimation"] = "none"
					}
				}

				sceneMapper[slide.Id] = sceneConfig

				nextSlide := getNextScene(plan.Sections, sectionIndex, slideIndex)
				if isContentSlide(nextSlide) {
					slide.Transition = pbcore.TransitionType_TRANSITION_STRIPPED_SLAM
					slide.TransitionDurationInFrames = utils.Ptr(transitionDurationInFrames)
					slide.Direction = pbcore.TransitionDirection_TRANSITION_DIRECTION_UNSPECIFIED.Enum()
				}

				section.Slides = append(section.Slides, slide)
				slideIndex++
			}
		}

		sections = append(sections, section)
	}

	g.logger.Info("pending slides summary",
		zap.Int("total_sections", len(sections)),
		zap.Int("total_slides", len(sceneMapper)))

	g.video.Config.Sections = sections
	g.video.Metadata.ThinkingSummary = plan.ThinkingSummary

	if err := g.update(ctx, models.VideoStatusPROCESSING); err != nil {
		return nil, nil, err
	}

	return g.video, sceneMapper, nil
}

func (g *videoConfigGenerator) UpdateAnimationSlide(
	ctx context.Context,
	slideID string,
	selectedTemplate *models.Template,
) error {
	toStructConfig, err := utils.RawMessageToStruct(selectedTemplate.GeneratedPatches)
	if err != nil {
		g.logger.Error("failed to convert template config",
			zap.Error(err),
			zap.Any("template_config", selectedTemplate.GeneratedPatches),
		)
		return errors.Wrapf(err, "invalid template config: %s", selectedTemplate.Name)
	}

	for _, section := range g.video.Config.Sections {
		for _, slide := range section.Slides {
			if slide.Id == slideID {
				// update durations, here we receive in frames, no need to convert
				slide.DurationInFrames = selectedTemplate.Config.VisibleDurationInFrames
				slide.SettledFrame = selectedTemplate.Config.VisibleDurationInFrames

				animation := slide.Content
				slide.SlideStatus = pbcore.SlideStatus_SLIDE_STATUS_GENERATED
				animation.CodeRegistry = selectedTemplate.Config.CodeRegistry
				animation.Edits = utils.MergeStructs(animation.Edits, toStructConfig)
				slide.BackgroundStyle = selectedTemplate.BackgroundStyle
				// update the selected template description
				// for future slides to know what's being selected so far
				//animation.Plan.ThinkingSummary = utils.Ptr(selectedTemplate.Description)
			}
		}
	}

	return g.update(ctx, models.VideoStatusPROCESSING)
}

/* -------------------- Private Helpers -------------------- */

func (g *videoConfigGenerator) update(ctx context.Context, status models.VideoStatus) error {
	video := &models.Video{
		ID:                g.video.Id,
		Name:              g.video.Name,
		AIGeneratedConfig: g.video.Config,
		Metadata:          g.video.Metadata,
	}

	if status != "" {
		video.Status = status
	}

	return g.videoGeneratorService.UpdateVideoConfig(ctx, video)
}

func (g *videoConfigGenerator) findSection(sectionID string) (*pbcore.Section, error) {
	for _, section := range g.video.Config.Sections {
		if section.Id == sectionID {
			return section, nil
		}
	}
	return nil, fmt.Errorf("section not found: %s", sectionID)
}
