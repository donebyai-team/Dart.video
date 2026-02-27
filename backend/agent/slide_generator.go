package agent

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/baml_client/types"
	"time"

	"github.com/pkg/errors"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

const transitionDuration = 0.3

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
}

func (g *videoConfigGenerator) AddSection(name string) string {
	section := &pbcore.Section{
		Id:     fmt.Sprintf("section-%d", time.Now().UnixNano()),
		Title:  name,
		Color:  pickRandomColor(),
		Slides: []*pbcore.Slide{},
	}

	g.video.Config.Sections = append(g.video.Config.Sections, section)
	return section.Id
}

func (g *videoConfigGenerator) Done(ctx context.Context) error {
	return g.update(ctx, models.VideoStatusCOMPLETED)
}

func (g *videoConfigGenerator) Fail(ctx context.Context, cause error, status models.VideoStatus) error {
	g.logger.Error("video generation failed", zap.Error(cause))
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
	for _, pendingSection := range plan.Sections {
		section := &pbcore.Section{
			Id:     fmt.Sprintf("section-%d", time.Now().UnixNano()),
			Title:  pendingSection.Name,
			Color:  pickRandomColor(),
			Slides: []*pbcore.Slide{},
		}
		for _, pendingSlide := range pendingSection.Slides {
			slide := &pbcore.Slide{
				Id:          fmt.Sprintf("slide-%d", time.Now().UnixNano()),
				SlideStatus: pbcore.SlideStatus_SLIDE_STATUS_PENDING,
			}

			if pendingSlide.IsMediaSlide() {
				mediaPlan := pendingSlide.AsMediaSlide()
				slide.Type = pbcore.SlideType_SLIDE_TYPE_MEDIA
				slide.Duration = float32(mediaPlan.Duration)
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
				animationPlan := pendingSlide.AsAnimationSlide()
				slide.Type = pbcore.SlideType_SLIDE_TYPE_TEXT_ANIMATION
				slide.Duration = float32(animationPlan.Duration)
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

	toStruct, err := utils.RawMessageToStruct(selectedTemplate.GeneratedConfig)
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
				animation.TemplateId = selectedTemplate.Name
				animation.TemplateUrl = selectedTemplate.CDNUrl
				animation.TemplateConfig = toStruct

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
