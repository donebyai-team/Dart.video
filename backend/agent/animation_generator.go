package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
	"math/rand"
	"time"
)

type AnimationGenerator interface {
	ExtractConfig(ctx context.Context, slide types.AnimationSlide, template *models.Template) (*types.TemplateConfigExtractorOutput, error)
	Generate(ctx context.Context,
		animation *types.AnimationSlide,
		plan *types.VideoGenerationPlan) (*models.Template, error)
}

type animationGenerator struct {
	llmService  llm.LLMService
	codeBuilder TemplateCodeBuilder
}

const maxAttempts = 5

func (l animationGenerator) Generate(
	ctx context.Context,
	animation *types.AnimationSlide,
	plan *types.VideoGenerationPlan,
) (*models.Template, error) {

	input := types.GenerateAnimationPromptRequest{
		CurrentBeat: animation.BeatDescription,
		PlanSoFar:   plan.Sections,
	}

	output, err := baml_client.GenerateAnimationPrompt(ctx, input)
	if err != nil {
		return nil, agenterrors.AnimationGenerationFailed("failed to generate prompt", err)
	}

	inptCodeGeneration := types.GenerateAnimationCodeRequest{
		AnimationPrompt: output.Prompt,
		Duration:        animation.Duration,
		Voiceover:       animation.Voiceover,
		Branding:        plan.Branding,
	}

	conversationHistory := make([]types.Message, 0)

	for attempt := 0; attempt < maxAttempts; attempt++ {

		generatedAnimation, err := baml_client.GenerateAnimation(ctx, inptCodeGeneration, conversationHistory)
		if err != nil {
			return nil, agenterrors.AnimationGenerationFailed("failed to generate animation", err)
		}

		config, err := json.Marshal(generatedAnimation.Config)
		if err != nil {
			return nil, agenterrors.AnimationGenerationFailed("failed to marshal animation config", err)
		}

		componentName := RandomComponentName()

		validateCodeResponse, err := l.codeBuilder.ValidateAndBuild(ctx, &ValidateAndBuildInput{
			Code:          generatedAnimation.Code,
			ComponentName: componentName,
			OutputPath:    fmt.Sprintf("templates/generated/%s/%s", "org_id", "video_id"),
			Config:        config,
		})

		if err == nil {
			return &models.Template{
				ID:            uuid.New().String(),
				Name:          componentName,
				AnimationType: types.AnimationTypeTEXT,
				Schema:        nil,
				CDNUrl:        validateCodeResponse.JSPath,
				Repeatable:    false,
			}, nil
		}

		// Retry only on build errors
		var buildErr *BuildError
		if errors.As(err, &buildErr) {

			// Feed error back into conversation
			conversationHistory = append(conversationHistory,
				types.Message{
					Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
					Content: "Build failed with error:\n" + buildErr.Error(),
				},
			)

			continue
		}

		// Any other error → fail immediately
		return nil, agenterrors.AnimationGenerationFailed("failed to build animation", err)
	}

	return nil, agenterrors.AnimationGenerationFailed(
		"animation generation failed after max retries",
		fmt.Errorf("max build attempts reached"),
	)
}

var adjectives = []string{
	"Text", "Motion", "Flip", "Reveal", "Pulse",
	"Cascade", "Flow", "Wave", "Glow", "Shift",
	"Zoom", "Slide", "Stack", "Fade", "Orbit",
}

var nouns = []string{
	"Block", "Stack", "Cascade", "Sequence",
	"Frame", "Flow", "Layer", "Reveal",
	"Highlight", "Motion", "Cluster",
}

func RandomComponentName() string {
	rand.Seed(time.Now().UnixNano())

	a := adjectives[rand.Intn(len(adjectives))]
	b := nouns[rand.Intn(len(nouns))]

	return a + b
}

func (l animationGenerator) ExtractConfig(ctx context.Context, slide types.AnimationSlide, template *models.Template) (*types.TemplateConfigExtractorOutput, error) {
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
		return nil, fmt.Errorf("failed to extract template config from BAML : %s", err)
	}

	valid := json.Valid([]byte(output.Config))
	if !valid {
		return nil, errors.New(fmt.Sprintf("template config validation failed for template : %s", template.ID))
	}

	return &output, nil
}
