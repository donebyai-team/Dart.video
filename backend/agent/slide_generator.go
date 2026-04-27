package agent

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/services/voiceover"
	"math/rand"
	"strings"

	"github.com/pkg/errors"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

// Default transition time for all slides, same in frontend
const transitionDurationInFrames int32 = 15
const defaultPatternOpacity float32 = 0.1

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
	solidColor := brand_identity.GenerateSolidFromBackground(generatedBranding.Colors)

	// Step 3: compute safe text color for gradient
	updatedTextColor := brand_identity.GetTextColorForSolid(solidColor)

	// Step 4: update text color
	for _, brandColor := range generatedBranding.Colors {
		if brandColor.Priority == pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY {
			brandColor.ColorHexCode = updatedTextColor
		}
	}

	// Step 5: assign branding
	g.video.Metadata.GeneratedBranding = generatedBranding

	// Step 6: apply gradient background
	g.AddVideoBackground(&pbcore.BackgroundStyle{
		Style: &pbcore.BackgroundStyle_Solid{
			Solid: solidColor,
		},
		Pattern:        pbcore.BackgroundPattern_BACKGROUND_PATTERN_DOTS,
		PatternOpacity: utils.Ptr(defaultPatternOpacity),
	})
}

func toSceneBackground(bg *types.BackgroundGradient) *pbcore.BackgroundStyle {
	if bg == nil || !utils.IsValidHexColor(bg.Color1) || !utils.IsValidHexColor(bg.Color2) {
		return nil
	}

	stops := make([]*pbcore.GradientStop, 0, 2)
	stops = append(stops, &pbcore.GradientStop{
		Color:    bg.Color1,
		Position: int32(bg.Position1),
	})
	stops = append(stops, &pbcore.GradientStop{
		Color:    bg.Color2,
		Position: int32(bg.Position2),
	})

	return &pbcore.BackgroundStyle{
		Style: &pbcore.BackgroundStyle_Gradient{
			Gradient: &pbcore.Gradient{
				Type:  pbcore.GradientType_GRADIENT_TYPE_LINEAR,
				Angle: int32(bg.Angle),
				Stops: stops,
			},
		},
		Pattern:        pbcore.BackgroundPattern_BACKGROUND_PATTERN_DOTS,
		PatternOpacity: utils.Ptr(defaultPatternOpacity),
	}
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

			//assignRandomTransitionAndDirection(slide)
			// TODO: Do it as a pre/post processing stages or specify in the config itself
			if len(pendingSlide.Elements) > 0 &&
				(strings.EqualFold(pendingSlide.Elements[0].Component, "TextWithImageScene") ||
					strings.EqualFold(pendingSlide.Elements[0].Component, "TextWithVideoScene")) {
				slide.Transition = pbcore.TransitionType_TRANSITION_SLIDE_UP
				slide.TransitionDurationInFrames = utils.Ptr(transitionDurationInFrames)
				slide.Direction = pbcore.TransitionDirection_TRANSITION_DIRECTION_FROM_BOTTOM.Enum()
			}

			if len(pendingSlide.Elements) > 0 && strings.EqualFold(pendingSlide.Elements[0].Component, "WordCycle") {
				slide.BackgroundStyle = &pbcore.BackgroundStyle{
					Pattern: pbcore.BackgroundPattern_BACKGROUND_PATTERN_DOTS,
					Effect: &pbcore.BackgroundEffect{
						Type: pbcore.BackgroundEffectType_BACKGROUND_EFFECT_TYPE_AURORA,
					},
					PatternOpacity: utils.Ptr(defaultPatternOpacity),
					Style:          &pbcore.BackgroundStyle_Solid{Solid: &pbcore.SolidColor{Hex: "#1207e5"}},
				}
				slide.Content.Edits = utils.CreateStructFromMap(map[string]interface{}{
					"wordcycle": map[string]interface{}{
						"style": map[string]interface{}{
							"color": "#FFFFFF",
						},
					},
				})

			}

			if slide.BackgroundStyle == nil {
				slide.BackgroundStyle = toSceneBackground(pendingSlide.Background)
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

var pendingSlideTransitionOptions = []pbcore.TransitionType{
	pbcore.TransitionType_TRANSITION_FADE,
	pbcore.TransitionType_TRANSITION_SLIDE_LEFT,
	pbcore.TransitionType_TRANSITION_WIPE_LEFT,
	pbcore.TransitionType_TRANSITION_FLIP_LEFT,
	pbcore.TransitionType_TRANSITION_CLOCK_WIPE,
	pbcore.TransitionType_TRANSITION_IRIS,
}

var pendingSlideDirectionOptions = []pbcore.TransitionDirection{
	pbcore.TransitionDirection_TRANSITION_DIRECTION_FROM_LEFT,
	pbcore.TransitionDirection_TRANSITION_DIRECTION_FROM_RIGHT,
	pbcore.TransitionDirection_TRANSITION_DIRECTION_FROM_TOP,
	pbcore.TransitionDirection_TRANSITION_DIRECTION_FROM_BOTTOM,
}

func assignRandomTransitionAndDirection(slide *pbcore.Slide) {
	if slide == nil {
		return
	}

	slide.Transition = pendingSlideTransitionOptions[rand.Intn(len(pendingSlideTransitionOptions))]
	slide.TransitionDurationInFrames = utils.Ptr(transitionDurationInFrames)
	slide.Direction = pendingSlideDirectionOptions[rand.Intn(len(pendingSlideDirectionOptions))].Enum()

	// TODO: Generate transition and direction via LLM instead of random defaults.
}
