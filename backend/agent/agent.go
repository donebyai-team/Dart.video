package agent

import (
	"context"
	"encoding/json"
	"errors"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
)

type VideoAgent interface {
	Start(ctx context.Context, options StartSessionOptions)
}

type StartSessionOptions struct {
	SessionID string
	OrgID     string
	input     *pbportal.CreateVideoRequest
}

type agentV1 struct {
	db               *datastore.Repository
	retreivalService RetrievalService
	llmService       LLMService
}

func NewAgentV1(db *datastore.Repository, retreivalService RetrievalService, llmService LLMService) *agentV1 {
	return &agentV1{db: db, retreivalService: retreivalService, llmService: llmService}
}

type slide struct {
	AnimationType models.AnimationType
	TemplateID    *string
	TemplateProps *json.RawMessage
	Duration      float32
}

func (a agentV1) Start(ctx context.Context, options StartSessionOptions) {
	script := make([]types.ScriptItem, len(options.input.Script.Items))

	for i, item := range options.input.Script.Items {
		script[i] = types.ScriptItem{
			Name:      item.Name,
			Voiceover: item.Voiceover,
			Reference: item.Reference,
		}
	}

	generatePlanRequest := types.VideoGenerationPlanRequest{
		Duration:   int64(options.input.Duration),
		Prompt:     options.input.Prompt,
		Language:   "English",
		Resolution: options.input.Resolution.Id,
		Script:     script,
	}

	plan, err := baml_client.GeneratePlan(ctx, generatePlanRequest)
	if err != nil {
		return
	}

	selectedTemplateIDs := make([]string, 0)

	for _, section := range plan.Sections {

		for _, slide := range section.Slides {
			animationType, err := toAnimationType(slide.AnimationType)
			categories, err := a.retreivalService.MatchCategories(ctx, slide.Animation_type, slide.CategorySearchQuery)
			if err != nil {
				return
			}
		}

		if len(categories) == 0 {
			// fallback to animation generator
		}

		for _, category := range categories {
			templates, err := a.retreivalService.FetchTemplates(ctx, slide.AnimationType, category.Name, selectedTemplateIDs)
			if err != nil {
				return
			}

		}
	}
}

func toAnimationType(animationType types.AnimationType) (models.AnimationType, error) {
	switch animationType {
	case types.AnimationTypeVISUAL:
		return models.AnimationTypeVISUAL, nil
	case types.AnimationTypeTEXT:
		return models.AnimationTypeTEXT, nil
	case types.AnimationTypeSTATS:
		return models.AnimationTypeSTATS, nil
	case types.AnimationTypeCHART:
		return models.AnimationTypeCHART, nil
	}

	return "", errors.New("invalid animation type from llm")
}
