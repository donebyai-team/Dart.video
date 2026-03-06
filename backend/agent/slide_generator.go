package agent

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/baml_client/types"
	"math/rand"
	"time"

	"github.com/pkg/errors"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

// Default transition time for all slides, same in frontend
const transitionDuration = 0.5

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
	g.video.Metadata.BackgroundAudioUrl = utils.Ptr("https://ik.imagekit.io/coasterai/freepik-deep-calm_A4WXzk4Mk.mp3")
}

func (g *videoConfigGenerator) Done(ctx context.Context) error {
	return g.update(ctx, models.VideoStatusCOMPLETED)
}

func (g *videoConfigGenerator) Fail(ctx context.Context, cause error, status models.VideoStatus) error {
	g.logger.Error("video generation failed", zap.Error(cause), zap.String("status", status.String()))
	return g.update(ctx, status)
}

// CreatePendingSlides created slides with pending status
// and each slide plan is stored so that it can be resumed
func (g *videoConfigGenerator) CreatePendingSlides(ctx context.Context,
	plan *types.VideoGenerationPlan,
) (*pbcore.Video, error) {
	// save background
	g.AddVideoBackground(toBackgroundStyle(plan.BackgroundStyle))

	// save slides
	sections := make([]*pbcore.Section, 0, len(plan.Sections))
	totalAnimationSlides := 0
	totalMediaSlides := 0
	for index, pendingSection := range plan.Sections {
		section := &pbcore.Section{
			Id:     fmt.Sprintf("section-%d", time.Now().UnixNano()),
			Title:  pendingSection.Name,
			Color:  pickRandomColor(),
			Slides: []*pbcore.Slide{},
			Index:  int32(index),
		}
		for slideIndex, pendingSlide := range pendingSection.Slides {
			slide := &pbcore.Slide{
				Id:          fmt.Sprintf("slide-%d", time.Now().UnixNano()),
				SlideStatus: pbcore.SlideStatus_SLIDE_STATUS_PENDING,
				Index:       int32(slideIndex),
			}

			if pendingSlide.IsMediaSlide() {
				totalMediaSlides++
				mediaPlan := pendingSlide.AsMediaSlide()
				slide.Type = pbcore.SlideType_SLIDE_TYPE_MEDIA
				slide.Duration = float32(mediaPlan.Duration)
				assignRandomTransitionAndDirection(slide)
				slide.Content = &pbcore.Slide_Media{
					Media: &pbcore.MediaSlideContent{
						Meta:      defaultMeta(),
						Src:       "https://placehold.co/600x400?text=Upload+a+screenshot+or+short+clip+of+your+product&font=roboto",
						Style:     &pbcore.MediaSlideStyle{},
						MediaType: pbcore.MediaType_MEDIA_TYPE_IMAGE,
						Plan: &pbcore.MediaSlidePlan{
							Index:                       mediaPlan.Index,
							BeatDescription:             mediaPlan.BeatDescription,
							Duration:                    mediaPlan.Duration,
							SelectedTemplateDescription: mediaPlan.SelectedTemplateDescription,
						},
					},
				}
			}

			if pendingSlide.IsAnimationSlide() {
				totalAnimationSlides++
				animationPlan := pendingSlide.AsAnimationSlide()
				slide.Type = pbcore.SlideType_SLIDE_TYPE_ANIMATION
				slide.Duration = float32(animationPlan.Duration)
				assignRandomTransitionAndDirection(slide)
				if animationPlan.Voiceover != nil {
					slide.Transcript = *animationPlan.Voiceover
				}
				slide.Content = &pbcore.Slide_Animation{
					Animation: &pbcore.AnimationSlideContent{
						Meta: defaultMeta(),
						Plan: &pbcore.AnimationSlidePlan{
							Index:                       animationPlan.Index,
							BeatDescription:             animationPlan.BeatDescription,
							AnimationType:               string(animationPlan.AnimationType),
							CategorySearcQquery:         animationPlan.CategorySearchQuery,
							Duration:                    animationPlan.Duration,
							Voiceover:                   animationPlan.Voiceover,
							SelectedTemplateDescription: animationPlan.SelectedTemplateDescription,
						},
					},
				}
			}

			section.Slides = append(section.Slides, slide)
		}
		sections = append(sections, section)
	}

	g.logger.Info("pending slides summary",
		zap.Int("total_sections", len(sections)),
		zap.Int("total_animation_slides", totalAnimationSlides),
		zap.Int("total_media_slides", totalMediaSlides))

	g.video.Config.Sections = sections

	err := g.update(ctx, models.VideoStatusPROCESSING)
	if err != nil {
		return nil, err
	}

	return g.video, nil
}

func (g *videoConfigGenerator) UpdateAnimationSlide(
	ctx context.Context,
	slideID string,
	selectedTemplate *models.Template,
) error {
	toStructRegistry, err := utils.RawMessageToStruct(selectedTemplate.ElementRegistry)
	if err != nil {
		g.logger.Error("failed to convert template registry",
			zap.Error(err),
			zap.Any("registry", selectedTemplate.ElementRegistry),
		)
		return errors.Wrapf(err, "invalid template config: %s", selectedTemplate.Name)
	}

	toStructConfig, err := utils.RawMessageToStruct(selectedTemplate.GeneratedConfig)
	if err != nil {
		g.logger.Error("failed to convert template config",
			zap.Error(err),
			zap.Any("template_config", selectedTemplate.GeneratedConfig),
		)
		return errors.Wrapf(err, "invalid template config: %s", selectedTemplate.Name)
	}

	for _, section := range g.video.Config.Sections {
		for _, slide := range section.Slides {
			if slide.Id == slideID {
				animation := slide.GetAnimation()
				slide.SlideStatus = pbcore.SlideStatus_SLIDE_STATUS_GENERATED
				animation.TemplateUrl = selectedTemplate.CDNUrl
				animation.Registry = toStructRegistry
				animation.Edits = toStructConfig

				// update the selected template description
				// for future slides to know what's being selected so far
				animation.Plan.SelectedTemplateDescription = utils.Ptr(selectedTemplate.Description)
			}
		}
	}

	return g.update(ctx, models.VideoStatusPROCESSING)
}

func (g *videoConfigGenerator) UpdateMediaSlide(
	ctx context.Context,
	slideID string,
) error {
	for _, section := range g.video.Config.Sections {
		for _, slide := range section.Slides {
			if slide.Id == slideID {
				mediaPlan := slide.GetMedia().Plan
				if mediaPlan.BeatDescription != "" {
					mediaPlan.BeatDescription = "This is the media slide, user will be asked to upload their product screenshot or clip"
				}

				// update the selected template description
				// for future slides to know what's being selected so far
				mediaPlan.SelectedTemplateDescription = utils.Ptr(mediaPlan.BeatDescription)
				slide.SlideStatus = pbcore.SlideStatus_SLIDE_STATUS_GENERATED
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

func defaultMeta() *pbcore.MetaData {
	return &pbcore.MetaData{
		X:      192,
		Y:      108,
		Width:  1536,
		Height: 864,
		Scale:  utils.Ptr(float32(1)),
	}
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
	slide.TransitionDuration = utils.Ptr(float32(transitionDuration))
	slide.Direction = pendingSlideDirectionOptions[rand.Intn(len(pendingSlideDirectionOptions))].Enum()

	// TODO: Generate transition and direction via LLM instead of random defaults.
}
