package templates

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"
	"regexp"
	"strings"
)

type Service interface {
	CreateTemplate(ctx context.Context) (*models.Template, error)
	GetTemplateByID(ctx context.Context, id string) (*models.Template, error)
	UpdateTemplateConfig(ctx context.Context, video *models.Video) error
	UpdateTemplate(ctx context.Context, req *pbportal.UpdateTemplateRequest) error
	GetTemplates(ctx context.Context, categories []string) ([]*models.Template, error)
	DeleteTemplateByID(ctx context.Context, id string) error
}

type templateService struct {
	db datastore.Repository
}

func NewService(db datastore.Repository) Service {
	return &templateService{db: db}
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
		Name:       fmt.Sprintf("Template %s", services.GenerateRandomName(2, 5)),
		Status:     models.TemplateStatusCREATED,
		Categories: []string{},
		Schema:     json.RawMessage(`{}`),
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

func (t templateService) UpdateTemplateConfig(ctx context.Context, video *models.Video) error {
	existingTemplate, err := t.db.GetTemplateByID(ctx, video.ID)
	if err != nil {
		return err
	}

	configChanged := !proto.Equal(existingTemplate.Config, video.Config)
	nameChanged := video.Name != existingTemplate.Name

	// Apply updates
	if configChanged {
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

	totalDurationInFrames := int32(0)
	for i, slide := range allSlides {
		totalDurationInFrames += slide.DurationInFrames

		// subtract transition for every slide except the last one globally
		if i < len(allSlides)-1 &&
			slide.TransitionDurationInFrames != nil &&
			slide.Transition != pbcore.TransitionType_TRANSITION_NONE {

			totalDurationInFrames -= *slide.TransitionDurationInFrames
		}
	}
	existingTemplate.Status = models.TemplateStatusWAITING
	existingTemplate.Metadata.DurationInFrames = totalDurationInFrames

	return t.db.UpdateTemplate(ctx, existingTemplate)
}

func (t templateService) UpdateTemplate(ctx context.Context, req *pbportal.UpdateTemplateRequest) error {
	existingTemplate, err := t.db.GetTemplateByID(ctx, req.Id)
	if err != nil {
		return err
	}

	existingTemplate.Description = req.Description + "\n\n" + req.UsageDescription
	existingTemplate.Status = models.TemplateStatusWAITING
	existingTemplate.Categories = req.Categories
	existingTemplate.Name = req.Name

	return t.db.UpdateTemplate(ctx, existingTemplate)
}

func (t templateService) GetTemplateByID(ctx context.Context, ID string) (*models.Template, error) {
	return t.db.GetTemplateByID(ctx, ID)
}

func (t templateService) GetTemplates(ctx context.Context, categories []string) ([]*models.Template, error) {
	return t.db.GetTemplatesByCategory(ctx, categories)
}

func ExtractDefaultData(code string) (json.RawMessage, error) {
	const marker = "const DEFAULT_DATA ="

	idx := strings.Index(code, marker)
	if idx == -1 {
		return nil, fmt.Errorf("DEFAULT_DATA not found")
	}

	// Find opening brace
	start := strings.Index(code[idx:], "{")
	if start == -1 {
		return nil, fmt.Errorf("opening brace for DEFAULT_DATA not found")
	}
	start += idx

	// Extract object using brace counting
	depth := 0
	end := -1

	for i := start; i < len(code); i++ {
		switch code[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				end = i
				break
			}
		}
	}

	if end == -1 {
		return nil, fmt.Errorf("closing brace for DEFAULT_DATA not found")
	}

	obj := code[start : end+1]

	// ------------------------------------------------------------------
	// Convert PascalCase identifiers into strings
	//
	// Example:
	// icon: Heart,
	// icon: BarChart3,
	//
	// becomes:
	// icon: "Heart",
	// icon: "BarChart3",
	// ------------------------------------------------------------------
	pascalCaseValue := regexp.MustCompile(`:\s*([A-Z][A-Za-z0-9_]*)\s*([,\}\]])`)
	obj = pascalCaseValue.ReplaceAllString(obj, `: "$1"$2`)

	// ------------------------------------------------------------------
	// Quote keys
	//
	// title: "Hello"
	// ->
	// "title": "Hello"
	// ------------------------------------------------------------------
	keyRegex := regexp.MustCompile(`([A-Za-z_][A-Za-z0-9_]*)\s*:`)
	obj = keyRegex.ReplaceAllString(obj, `"$1":`)

	// ------------------------------------------------------------------
	// Remove trailing commas
	// ------------------------------------------------------------------
	trailingObjectComma := regexp.MustCompile(`,\s*}`)
	obj = trailingObjectComma.ReplaceAllString(obj, `}`)

	trailingArrayComma := regexp.MustCompile(`,\s*]`)
	obj = trailingArrayComma.ReplaceAllString(obj, `]`)

	// ------------------------------------------------------------------
	// Validate JSON
	// ------------------------------------------------------------------
	var tmp any
	if err := json.Unmarshal([]byte(obj), &tmp); err != nil {
		return nil, fmt.Errorf("DEFAULT_DATA is not valid JSON after normalization: %w", err)
	}

	return json.RawMessage(obj), nil
}
