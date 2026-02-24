package agent

import (
	"context"
	"fmt"
	"google.golang.org/protobuf/types/known/structpb"
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

func (g *videoConfigGenerator) Fail(ctx context.Context, cause error) error {
	g.logger.Error("video generation failed", zap.Error(cause))
	return g.update(ctx, models.VideoStatusFAILED)
}

func (g *videoConfigGenerator) AddAnimationSlide(
	ctx context.Context,
	sectionID string,
	duration float32,
	selectedTemplate *models.Template,
	templateConfig string,
	voiceover *string,
) error {

	toStruct, err := utils.StringToStruct(templateConfig)
	if err != nil {
		g.logger.Error("failed to convert template config",
			zap.Error(err),
			zap.String("template_config", templateConfig),
		)
		return errors.Wrapf(err, "invalid template config: %s", selectedTemplate.Name)
	}

	section, err := g.findSection(sectionID)
	if err != nil {
		return err
	}

	section.Slides = append(section.Slides, newAnimationSlide(duration, selectedTemplate, toStruct, voiceover))

	return g.update(ctx, models.VideoStatusPROCESSING)
}

func (g *videoConfigGenerator) AddMediaSlide(
	ctx context.Context,
	sectionID string,
	duration float32,
) error {

	section, err := g.findSection(sectionID)
	if err != nil {
		return err
	}

	section.Slides = append(section.Slides, newMediaSlide(duration))

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

func newAnimationSlide(
	duration float32,
	template *models.Template,
	templateConfig *structpb.Struct,
	voiceover *string,
) *pbcore.Slide {
	transcript := ""
	if voiceover != nil {
		transcript = *voiceover
	}
	return &pbcore.Slide{
		Id:         fmt.Sprintf("slide-%d", time.Now().UnixNano()),
		Type:       pbcore.SlideType_SLIDE_TYPE_TEXT_ANIMATION,
		Duration:   duration,
		Transcript: transcript,
		Content: &pbcore.Slide_Animation{
			Animation: &pbcore.AnimationSlideContent{
				TemplateId:     template.Name,
				TemplateUrl:    template.CDNUrl,
				TemplateConfig: templateConfig,
				Meta:           defaultMeta(),
			},
		},
	}
}

func newMediaSlide(duration float32) *pbcore.Slide {
	return &pbcore.Slide{
		Id:       fmt.Sprintf("slide-%d", time.Now().UnixNano()),
		Type:     pbcore.SlideType_SLIDE_TYPE_MEDIA,
		Duration: duration,
		Content: &pbcore.Slide_Media{
			Media: &pbcore.MediaSlideContent{
				Meta:      defaultMeta(),
				Src:       "https://placehold.co/600x400?text=Upload+a+screenshot+or+short+clip+of+your+product&font=roboto",
				Style:     &pbcore.MediaSlideStyle{},
				MediaType: pbcore.MediaType_MEDIA_TYPE_IMAGE,
			},
		},
	}
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
