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

	// Step 1: get colors (already processed)
	if assetRegistry == nil {
		generatedBranding.Colors = brand_identity.ExtractOrGenerateColors(nil)
	} else {
		brandIdentity := assetRegistry.GetIdentity()
		if brandIdentity == nil {
			generatedBranding.Colors = brand_identity.ExtractOrGenerateColors(nil)
		} else {
			generatedBranding.BrandIdentity = brandIdentity
			if len(brandIdentity.Colors) == 0 {
				generatedBranding.Colors = brand_identity.ExtractOrGenerateColors(nil)
			} else {
				generatedBranding.Colors = brandIdentity.Colors
			}
		}
	}

	// Step 2: ALWAYS generate gradient
	solidColor := brand_identity.BrandColorTokens(generatedBranding.Colors)[brand_identity.COLOR_BACKGROUND]
	if solidColor == "" {
		solidColor = scenes.DefaultBackgroundColor
	}
	// Step 3: compute safe text color
	updatedTextColor := brand_identity.GetReadableTextColorForSolid(solidColor, generatedBranding.Colors, brand_identity.TextNormal)

	// Step 4: update text color
	for _, brandColor := range generatedBranding.Colors {
		if brandColor.Priority == pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY {
			brandColor.ColorHexCode = updatedTextColor
		}
	}

	// Step 5: assign branding
	g.video.Metadata.GeneratedBranding = generatedBranding

	g.AddVideoBackground(&pbcore.BackgroundStyle{
		Style: &pbcore.BackgroundStyle_Solid{
			Solid: &pbcore.SolidColor{
				Hex: solidColor,
			},
		},
		Pattern:        pbcore.BackgroundPattern_BACKGROUND_PATTERN_DOTS,
		PatternOpacity: utils.Ptr(scenes.DefaultBackgroundPatternOpacity),
	})
}

func (g *videoConfigGenerator) CreatePendingSlidesV2(
	ctx context.Context,
	assetRegistry *services.MediaAssetRegistry,
	plan *types.GeneratedVideoPlan,
) (*pbcore.Video, map[string]*types.Scene, error) {
	// save background
	g.AddBranding(assetRegistry)

	// save slides
	sections := make([]*pbcore.Section, 0, len(plan.Sections))
	sceneMapper := make(map[string]*types.Scene)
	for index, pendingSection := range plan.Sections {
		section := &pbcore.Section{
			Id:     fmt.Sprintf("section-%s", uuid.NewString()),
			Title:  pendingSection.Name,
			Color:  pickRandomColor(),
			Slides: []*pbcore.Slide{},
			Index:  int32(index),
		}
		for slideIndex, pendingSlide := range pendingSection.Slides {
			slide := &pbcore.Slide{
				Id:          fmt.Sprintf("slide-%s", uuid.NewString()),
				SlideStatus: pbcore.SlideStatus_SLIDE_STATUS_PENDING,
				Index:       int32(slideIndex),
			}

			sceneMapper[slide.Id] = &pendingSlide

			slide.Content = &pbcore.AnimationSlideContent{
				Plan: &pbcore.AnimationSlidePlan{
					Index: pendingSlide.Index,
				},
			}

			// TODO: Do it as a pre/post processing stages or specify in the config itself
			nextSlide := getNextScene(plan.Sections, index, slideIndex)
			if isContentSlide(nextSlide) {
				slide.Transition = pbcore.TransitionType_TRANSITION_STRIPPED_SLAM
				slide.TransitionDurationInFrames = utils.Ptr(transitionDurationInFrames)
				slide.Direction = pbcore.TransitionDirection_TRANSITION_DIRECTION_UNSPECIFIED.Enum()
			}

			section.Slides = append(section.Slides, slide)
		}
		sections = append(sections, section)
	}

	g.logger.Info("pending slides summary",
		zap.Int("total_sections", len(sections)),
		zap.Int("total_slides", len(sceneMapper)))

	g.video.Config.Sections = sections
	g.video.Metadata.ThinkingSummary = plan.ThinkingSummary

	err := g.update(ctx, models.VideoStatusPROCESSING)
	if err != nil {
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
