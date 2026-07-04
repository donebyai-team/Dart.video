package templates

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/errorx"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	llmprovider "github.com/shank318/coasterai/services/llm"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"
	"net/url"
	"strings"
)

type Service interface {
	CreateTemplate(ctx context.Context) (*models.Template, error)
	GetTemplateByID(ctx context.Context, id string) (*models.Template, error)
	UpdateTemplateConfig(ctx context.Context, video *models.Video) (*models.Video, error)
	UpdateTemplate(ctx context.Context, req *pbportal.UpdateTemplateRequest) error
	GetTemplates(ctx context.Context, categories []string) ([]*models.Template, error)
	GetSimilarTemplates(ctx context.Context, usageDescription string, categories []string, excludedTemplateIDs []string, limit int) ([]*models.Template, error)
	DeleteTemplateByID(ctx context.Context, id string) error
	FetchTemplatesByCategories(ctx context.Context, categories []types.Category) ([]*models.Template, error)
}

type templateService struct {
	db  datastore.Repository
	llm llmprovider.Service
}

func NewService(db datastore.Repository, llm llmprovider.Service) Service {
	return &templateService{db: db, llm: llm}
}

func (t templateService) DeleteTemplateByID(ctx context.Context, id string) error {
	return t.db.DeleteTemplateByID(ctx, id)
}

func (t templateService) CreateTemplate(ctx context.Context) (*models.Template, error) {
	durationInFrames := int32(5 * services.DefaultVideoFPS)
	videoMetadata := &pbcore.VideoMetadata{
		Fps:              services.DefaultVideoFPS,
		DurationInFrames: durationInFrames,
		Language:         pbcore.VideoLanguage_VIDE_LANGUAGE_EN,
		Resolution: &pbcore.Resolution{
			Id:     "16:9",
			Name:   "Landscape",
			Aspect: "16/9",
			Width:  1920,
			Height: 1080,
		},
	}
	brand_identity.AddVideoBranding(videoMetadata)

	template, err := t.db.CreateTemplate(ctx, &models.Template{
		Name:       services.GenerateRandomName(5, 5),
		Status:     models.TemplateStatusCREATED,
		Categories: []string{},
		Schema:     json.RawMessage(`[]`),
		Config: &pbcore.VideoConfig{Sections: []*pbcore.Section{
			{
				Id:    "section-" + uuid.New().String(),
				Title: "Service",
				Color: "#FF6B6B",
				Slides: []*pbcore.Slide{{
					Id:               "slide-" + uuid.NewString(),
					DurationInFrames: durationInFrames,
					SettledFrame:     durationInFrames,
					Content: &pbcore.AnimationSlideContent{
						CodeRegistry: &pbcore.CodeRegistry{
							Code: `export default function RemoteComponent() {
  									return (
    									<SafeArea>
      										<AbsoluteCenter axis="both">
      										</AbsoluteCenter>
										</SafeArea>
									);
							}`,
						},
						Edits: &structpb.Struct{},
					},
					SlideStatus: pbcore.SlideStatus_SLIDE_STATUS_GENERATED,
					Index:       0,
				}},
				Index: 0,
			},
		}},
		Metadata: videoMetadata,
	})

	if err != nil {
		return nil, err
	}

	return template, nil
}

func (t templateService) UpdateTemplateConfig(ctx context.Context, video *models.Video) (*models.Video, error) {
	existingTemplate, err := t.db.GetTemplateByID(ctx, video.ID)
	if err != nil {
		return nil, err
	}

	if video.Version != existingTemplate.Version {
		return nil, errorx.ErrVersionMismatch
	}

	configChanged := !proto.Equal(existingTemplate.Config, video.Config)
	nameChanged := video.Name != existingTemplate.Name

	if !configChanged && !nameChanged {
		return video, nil
	}

	// Apply updates and reset the status for approval
	if configChanged {
		//existingTemplate.Status = models.TemplateStatusWAITING
		existingTemplate.Config = video.Config
	}

	if nameChanged {
		existingTemplate.Name = video.Name
	}

	// Flatten all slides across sections — transitions can cross section boundaries,
	// so we must treat slides as one continuous sequence (mirrors frontend updateTotalDuration).
	var allSlides []*pbcore.Slide
	for _, section := range existingTemplate.Config.Sections {
		allSlides = append(allSlides, section.Slides...)
	}

	if len(existingTemplate.Config.Sections) > 1 || len(allSlides) > 2 {
		return nil, fmt.Errorf("not allowed")
	}

	totalDurationInFrames := int32(0)
	for i, slide := range allSlides {
		totalDurationInFrames += slide.DurationInFrames

		// For code templates, we don't support manual edits'
		if slide.Content.CodeRegistry.MUrl != "" && len(slide.Content.Edits.Fields) > 0 {
			return nil, fmt.Errorf("manual edits are not supported for templates, use prompt to modify")
		}
		// subtract transition for every slide except the last one globally
		if i < len(allSlides)-1 &&
			slide.TransitionDurationInFrames != nil &&
			slide.Transition != pbcore.TransitionType_TRANSITION_NONE {

			totalDurationInFrames -= *slide.TransitionDurationInFrames
		}
	}
	existingTemplate.Metadata.DurationInFrames = totalDurationInFrames

	if configChanged || nameChanged {
		existingTemplate.Version++
	}

	err = t.db.UpdateTemplate(ctx, existingTemplate)
	if err != nil {
		return nil, err
	}

	return existingTemplate.ToModelVideo(), nil
}

func (t templateService) UpdateTemplate(ctx context.Context, req *pbportal.UpdateTemplateRequest) error {
	existingTemplate, err := t.db.GetTemplateByID(ctx, req.Id)
	if err != nil {
		return err
	}

	var schema []*structpb.Struct

	for _, section := range existingTemplate.Config.Sections {
		for _, slide := range section.Slides {
			if slide.Content.CodeRegistry.MUrl != "" {
				if slide.Content.CodeRegistry.Defaults == nil ||
					slide.Content.CodeRegistry.Defaults.Fields == nil {
					return fmt.Errorf("invalid template: no default values found")
				}
				schema = append(schema, slide.Content.CodeRegistry.Defaults)
				slide.BackgroundStyle = nil // don't store this
			}

		}
	}

	if len(schema) == 0 {
		return fmt.Errorf("invalid template: no slides with code registry found")
	}

	previousUsageDescription := existingTemplate.GetUsageDescription()
	existingTemplate.Description = strings.TrimSpace(req.Description)

	usageDescription := strings.TrimSpace(req.UsageDescription)
	if usageDescription == "" {
		existingTemplate.DescriptionEmbedding = nil
	} else {
		if usageDescription != previousUsageDescription {
			embedding, err := t.llm.CreateEmbedding(ctx, usageDescription)
			if err != nil {
				return fmt.Errorf("create usage description embedding: %w", err)
			}
			existingTemplate.DescriptionEmbedding = models.TemplateEmbedding(embedding)
		}
		existingTemplate.Description += models.UsageSeparator + usageDescription
	}

	existingTemplate.Categories = req.Categories
	existingTemplate.Status = models.TemplateStatusAVAILABLE
	return t.db.UpdateTemplate(ctx, existingTemplate)
}

func (t templateService) GetSimilarTemplates(
	ctx context.Context,
	usageDescription string,
	categories []string,
	excludedTemplateIDs []string,
	limit int,
) ([]*models.Template, error) {
	usageDescription = strings.TrimSpace(usageDescription)
	if usageDescription == "" {
		return nil, fmt.Errorf("usage description is required")
	}

	sanitizedCategories := make([]string, 0, len(categories))
	seenCategories := make(map[string]struct{}, len(categories))
	for _, category := range categories {
		category = strings.ToUpper(strings.TrimSpace(category))
		if category == "" {
			continue
		}
		if _, exists := seenCategories[category]; exists {
			continue
		}

		seenCategories[category] = struct{}{}
		sanitizedCategories = append(sanitizedCategories, category)
	}
	if len(sanitizedCategories) == 0 {
		return nil, fmt.Errorf("at least one category is required")
	}
	if limit <= 0 {
		return nil, fmt.Errorf("limit must be greater than 0")
	}

	embedding, err := t.llm.CreateEmbedding(ctx, usageDescription)
	if err != nil {
		return nil, fmt.Errorf("create usage description embedding: %w", err)
	}

	return t.db.GetSimilarTemplates(ctx, embedding, sanitizedCategories, excludedTemplateIDs, limit)
}

func (t templateService) GetTemplateByID(ctx context.Context, ID string) (*models.Template, error) {
	return t.db.GetTemplateByID(ctx, ID)
}

func (t templateService) GetTemplates(ctx context.Context, categories []string) ([]*models.Template, error) {
	return t.db.GetTemplatesByCategory(ctx, categories)
}

const templatePrefix = "template:"

func ParseResourceID(id string) (resourceID string, isTemplate bool) {
	// Decode URL-encoded values if present.
	if decoded, err := url.PathUnescape(id); err == nil {
		id = decoded
	}

	if strings.HasPrefix(id, templatePrefix) {
		return strings.TrimPrefix(id, templatePrefix), true
	}

	return id, false
}

const maxTemplatesPerCategory = 4

func (t templateService) FetchTemplatesByCategories(ctx context.Context, categories []types.Category) ([]*models.Template, error) {
	templates := make([]*models.Template, 0)

	for _, category := range categories {
		t, err := t.db.GetTemplatesByCategoryRandom(ctx, category.Name, maxTemplatesPerCategory)
		if err != nil {
			return nil, err
		}

		templates = append(templates, t...)
	}

	return templates, nil
}
