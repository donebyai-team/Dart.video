package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
)

type TemplateExtractor interface {
	SelectTemplates(ctx context.Context, selectedTemplates []*models.Template, plan *types.VideoGenerationPlan) ([]*models.Template, error)
	ExtractConfig(ctx context.Context, slide types.AnimationSlide, template *models.Template) (*types.TemplateConfigExtractorOutput, error)
}

type llmTemplateExtractor struct{}

func (l llmTemplateExtractor) ExtractConfig(ctx context.Context, slide types.AnimationSlide, template *models.Template) (*types.TemplateConfigExtractorOutput, error) {
	marshal, err := json.Marshal(template.Schema)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to marshal template schema of template : %s", template.ID)
	}

	input := types.TemplateConfigExtractorInput{
		Schema:              string(marshal),
		BeatDescription:     slide.BeatDescription,
		TemplateDescription: template.Description,
	}
	output, err := baml_client.ExtractTemplateConfig(ctx, input)
	if err != nil {
		return nil, err
	}

	valid := json.Valid([]byte(output.Config))
	if !valid {
		return nil, errors.New(fmt.Sprintf("template config validation failed for template : %s", template.ID))
	}

	return &output, nil
}

func (l llmTemplateExtractor) SelectTemplates(ctx context.Context, selectedTemplates []*models.Template, plan *types.VideoGenerationPlan) ([]*models.Template, error) {
	templateMap := make(map[string]*models.Template)
	matchTem := make([]types.TemplateItem, 0, len(selectedTemplates))
	for _, temp := range selectedTemplates {
		matchTem = append(matchTem, types.TemplateItem{
			Name:        temp.Name,
			Description: temp.Description,
		})
		templateMap[temp.Name] = temp
	}

	templateMaterInput := types.MatchTemplateRequest{
		Sections:  plan.Sections,
		Templates: matchTem,
	}

	matchedTemplates, err := baml_client.MatchTemplate(ctx, templateMaterInput)
	if err != nil {
		return nil, err
	}

	filteredTemplates := make([]*models.Template, 0)
	for _, temp := range matchedTemplates.Templates {
		value, ok := templateMap[temp.Name]
		if !ok {
			filteredTemplates = append(filteredTemplates, value)
		}
	}
	return filteredTemplates, nil
}
