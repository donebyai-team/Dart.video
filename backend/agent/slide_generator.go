package agent

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/audio"
	"github.com/shank318/coasterai/services/brand_identity"
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
	g.video.Metadata.BgAudio = &pbcore.BackgroundAudio{
		Url:    audio.GenerateBackgroundMusic().Url,
		Volume: 0.8,
	}
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
	templateRegistry *TemplateRegistry,
	plan *types.GeneratedVideoPlan,
) (*pbcore.Video, error) {
	g.AddBranding(templateRegistry.GetAssetRegistry())

	sections := make([]*pbcore.Section, 0, len(plan.Sections))
	sceneMapper := make(map[string]*scenes.SceneConfig)

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
			slides, err := templateRegistry.GenerateScene(ctx, &pendingSlide)
			if err != nil {
				return nil, err
			}

			for index, slideT := range slides {
				slide := &pbcore.Slide{
					Id:               fmt.Sprintf("slide-%s", uuid.NewString()),
					SlideStatus:      pbcore.SlideStatus_SLIDE_STATUS_GENERATED,
					Index:            int32(slideIndex),
					Content:          slideT.Content,
					DurationInFrames: slideT.DurationInFrames,
					SettledFrame:     slideT.SettledFrame,
				}

				// if voiceover is provided, add it only for the first slide if a scene itself has multi slides
				if pendingSlide.Voiceover != nil && index == 0 {
					slide.Voiceover = &pbcore.Voiceover{
						Provider: audio.DEFAULT_VOICE_PROVIDER,
						VoiceId:  audio.DEFAULT_VOICE_ID,
						FullText: *pendingSlide.Voiceover,
					}
				}

				slide.Content.History = nil

				nextSlide := getNextScene(plan.Sections, sectionIndex, slideIndex)
				if isContentSlide(nextSlide) {
					slide.Transition = pbcore.TransitionType_TRANSITION_SLIDE_LEFT
					slide.TransitionDurationInFrames = utils.Ptr(transitionDurationInFrames)
					slide.Direction = pbcore.TransitionDirection_TRANSITION_DIRECTION_FROM_LEFT.Enum()
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
		return nil, err
	}

	return g.video, nil
}

func (g *videoConfigGenerator) UpdateAnimationSlide(
	ctx context.Context,
	slideID string,
	selectedTemplate *pbcore.Slide,
) error {
	for _, section := range g.video.Config.Sections {
		for _, slide := range section.Slides {
			if slide.Id == slideID {
				// update durations, here we receive in frames, no need to convert
				slide.DurationInFrames = selectedTemplate.DurationInFrames
				slide.SettledFrame = selectedTemplate.SettledFrame

				animation := slide.Content
				slide.SlideStatus = pbcore.SlideStatus_SLIDE_STATUS_GENERATED
				animation.CodeRegistry = selectedTemplate.Content.CodeRegistry
				animation.Edits = utils.MergeStructs(animation.Edits, selectedTemplate.Content.Edits)
				slide.BackgroundStyle = selectedTemplate.BackgroundStyle
				// update the selected template description
				// for future slides to know what's being selected so far
				//animation.Plan.ThinkingSummary = utils.Ptr(selectedTemplate.VisualDescription)
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

	_, err := g.videoGeneratorService.UpdateVideoConfig(ctx, video)
	if err != nil {
		return err
	}

	return nil
}

func (g *videoConfigGenerator) findSection(sectionID string) (*pbcore.Section, error) {
	for _, section := range g.video.Config.Sections {
		if section.Id == sectionID {
			return section, nil
		}
	}
	return nil, fmt.Errorf("section not found: %s", sectionID)
}
