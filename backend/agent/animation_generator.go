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
	"github.com/shank318/coasterai/services"
	"go.uber.org/zap"
	"math/rand"
	"strings"
	"time"
)

type GenerationStage string

const (
	StageUnderstanding GenerationStage = "understanding"
	StagePrompting     GenerationStage = "prompting"
	StageDesigning     GenerationStage = "designing"
	StageCoding        GenerationStage = "coding"
	StageSaving        GenerationStage = "saving"
	StageBuilding      GenerationStage = "building"
	StageRefining      GenerationStage = "refining"
	StageReady         GenerationStage = "ready"
)

func retryTone(attempt int) string {
	switch attempt {
	case 0:
		return ""
	case 1:
		return "Refining the motion..."
	case 2:
		return "Polishing the animation..."
	case 3:
		return "Adding final touches..."
	default:
		return "Stabilizing the performance..."
	}
}

func CreativeStageMessage(stage GenerationStage, attempt int) string {
	if tone := retryTone(attempt); tone != "" && stage == StageDesigning {
		return tone
	}

	switch stage {

	case StageUnderstanding:
		return "Understanding the scene..."

	case StagePrompting:
		return "Crafting motion direction..."

	case StageDesigning:
		return "Designing the animation..."

	case StageCoding:
		return "Translating motion into code..."

	case StageSaving:
		return "Saving creative draft..."

	case StageBuilding:
		return "Bringing animation to life..."

	case StageRefining:
		return "Smoothing out rough edges..."

	case StageReady:
		return "Animation ready ✨"

	default:
		return "Working on it..."
	}
}

type GenerationParams struct {
	SessionID string
	OrgID     string
}

type AnimationGenerator interface {
	ExtractConfig(ctx context.Context, slide *types.AnimationSlide, template *models.Template) (*types.TemplateConfigExtractorOutput, error)
	Generate(ctx context.Context,
		animation *types.AnimationSlide,
		planSoFar *types.VideoGenerationPlan,
		callback TemplateGenerationCallback,
		params GenerationParams) (*models.Template, error)
}

type animationGenerator struct {
	mediaStore  services.MediaStore
	llmService  llm.LLMService
	codeBuilder services.TemplateCodeBuilder
	logger      *zap.Logger
}

func NewAnimationGenerator(mediaStore services.MediaStore, llmService llm.LLMService, codeBuilder services.TemplateCodeBuilder, logger *zap.Logger) *animationGenerator {
	return &animationGenerator{mediaStore: mediaStore, llmService: llmService, codeBuilder: codeBuilder, logger: logger}
}

const maxAttempts = 5

type TemplateGenerationCallback func(TemplateGenerationProgress)

type TemplateGenerationProgress struct {
	Message string
}

func (l animationGenerator) Generate(
	ctx context.Context,
	animation *types.AnimationSlide,
	planSoFar *types.VideoGenerationPlan,
	callback TemplateGenerationCallback,
	params GenerationParams,
) (*models.Template, error) {

	callback(TemplateGenerationProgress{
		Message: CreativeStageMessage(StageUnderstanding, 0),
	})

	input := types.GenerateAnimationPromptRequest{
		CurrentBeat:     animation.BeatDescription,
		PlanSoFar:       planSoFar.Sections,
		AnimationType:   animation.AnimationType,
		Voiceover:       animation.Voiceover,
		Branding:        planSoFar.Branding,
		SlideBackground: gradientToCSS(planSoFar.BackgroundStyle.Gradient),
	}

	output, err := baml_client.GenerateAnimationPrompt(ctx, input)
	if err != nil {
		return nil, agenterrors.AnimationGenerationFailed("failed to generate prompt", err)
	}

	inptCodeGeneration := types.GenerateAnimationCodeRequest{
		AnimationPrompt: output.Prompt,
		Duration:        animation.Duration,
		Voiceover:       animation.Voiceover,
		Branding:        planSoFar.Branding,
		AnimationType:   animation.AnimationType,
		SlideBackground: gradientToCSS(planSoFar.BackgroundStyle.Gradient),
	}

	conversationHistory := make([]types.Message, 0)
	componentName := RandomComponentName()

	for attempt := 0; attempt < maxAttempts; attempt++ {

		// 🎨 Designing
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageDesigning, attempt),
		})

		l.logger.Info("generating code")
		generatedAnimation, err := baml_client.GenerateAnimation(ctx, inptCodeGeneration, conversationHistory)
		if err != nil {
			return nil, agenterrors.AnimationGenerationFailed("failed to generate animation", err)
		}

		// Default
		generatedConfig := json.RawMessage(`{}`)
		if generatedAnimation.Config != nil {
			config, err := normalizeGeneratedConfig(*generatedAnimation.Config)
			if err != nil {
				conversationHistory = appendRetryConversation(
					conversationHistory,
					generatedAnimation.Code,
					"Config is invalid. It must be a valid JSON object only (no markdown/code fences, no array/string root). "+
						"Return config as plain JSON object.\nValidation error: "+err.Error(),
				)

				l.logger.Error("invalid generated animation config, retrying",
					zap.Int("attempt", attempt),
					zap.Error(err))

				callback(TemplateGenerationProgress{
					Message: CreativeStageMessage(StageRefining, attempt),
				})
				continue
			}
			generatedConfig = config
		}
		indentedCode := indentCode(generatedAnimation.Code)
		codeFilePath := fmt.Sprintf("templates/generated/%s/%s", params.OrgID, params.SessionID)

		// 💾 Saving draft
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageSaving, attempt),
		})

		uploadedMedia, err := l.mediaStore.UploadCode(ctx,
			indentedCode,
			fmt.Sprintf("%s/%s%d.tsx", codeFilePath, componentName, attempt))

		if err != nil {
			return nil, agenterrors.AnimationGenerationFailed("failed to upload code", err)
		}

		l.logger.Info("uploaded generated code", zap.String("url", uploadedMedia.Url))

		// ⚙️ Bringing to life (BUILD STAGE)
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageBuilding, attempt),
		})

		_, err = l.codeBuilder.ValidateAndBuild(ctx, &services.ValidateAndBuildInput{
			Code:   indentedCode,
			Config: generatedConfig,
		})

		if err == nil {
			callback(TemplateGenerationProgress{
				Message: CreativeStageMessage(StageReady, 0),
			})
			return &models.Template{
				ID:              uuid.New().String(),
				Name:            componentName,
				AnimationType:   types.AnimationTypeTEXT,
				Schema:          nil,
				CDNUrl:          uploadedMedia.Url,
				Repeatable:      false,
				GeneratedConfig: generatedConfig,
			}, nil
		}

		// Retry only on build errors
		var buildErr *services.BuildError
		if errors.As(err, &buildErr) {
			conversationHistory = appendRetryConversation(
				conversationHistory,
				indentedCode,
				"Build failed with error:\n"+buildErr.Error(),
			)

			l.logger.Error("failed to build animation",
				zap.Int("attempt_left", maxAttempts-attempt),
				zap.Error(buildErr))

			// 🔧 Refinement loop
			callback(TemplateGenerationProgress{
				Message: CreativeStageMessage(StageRefining, attempt),
			})
			continue
		}

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

func (l animationGenerator) ExtractConfig(ctx context.Context, slide *types.AnimationSlide, template *models.Template) (*types.TemplateConfigExtractorOutput, error) {
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

func gradientToCSS(g types.Gradient) string {
	if len(g.Stops) == 0 {
		return ""
	}

	var parts []string

	for _, s := range g.Stops {
		parts = append(parts, fmt.Sprintf("%s %d%%", s.Color, s.Position))
	}

	return fmt.Sprintf("linear-gradient(%ddeg, %s)", g.Angle, strings.Join(parts, ", "))
}

func indentCode(code string) string {
	lines := strings.Split(code, "\n")
	var result []string

	indentLevel := 0
	indent := "  " // 2 spaces (change if needed)

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		// Skip empty lines
		if trimmed == "" {
			result = append(result, "")
			continue
		}

		// Decrease indent if line starts with closing brace
		if strings.HasPrefix(trimmed, "}") {
			if indentLevel > 0 {
				indentLevel--
			}
		}

		// Apply indentation
		indentedLine := strings.Repeat(indent, indentLevel) + trimmed
		result = append(result, indentedLine)

		// Increase indent if line ends with opening brace
		if strings.HasSuffix(trimmed, "{") {
			indentLevel++
		}
	}

	return strings.Join(result, "\n")
}

func appendRetryConversation(history []types.Message, assistantCode string, feedback string) []types.Message {
	history = append(history, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
		Content: assistantCode,
	})
	history = append(history, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKuser(),
		Content: feedback,
	})
	return history
}

func normalizeGeneratedConfig(raw string) (json.RawMessage, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" || trimmed == "null" {
		return json.RawMessage(`{}`), nil
	}

	// Remove optional markdown fences: ```json ... ```
	if strings.HasPrefix(trimmed, "```") {
		lines := strings.Split(trimmed, "\n")
		if len(lines) >= 2 {
			if strings.HasPrefix(strings.TrimSpace(lines[0]), "```") {
				lines = lines[1:]
			}
			if len(lines) > 0 && strings.HasPrefix(strings.TrimSpace(lines[len(lines)-1]), "```") {
				lines = lines[:len(lines)-1]
			}
			trimmed = strings.TrimSpace(strings.Join(lines, "\n"))
		}
	}

	if !json.Valid([]byte(trimmed)) {
		return nil, fmt.Errorf("config is not valid JSON")
	}

	// Decode once to verify shape and to support double-encoded JSON strings.
	var decoded any
	if err := json.Unmarshal([]byte(trimmed), &decoded); err != nil {
		return nil, err
	}

	if nested, ok := decoded.(string); ok {
		nested = strings.TrimSpace(nested)
		if nested == "" || !json.Valid([]byte(nested)) {
			return nil, fmt.Errorf("config JSON string does not contain valid JSON")
		}
		if err := json.Unmarshal([]byte(nested), &decoded); err != nil {
			return nil, err
		}
	}

	if _, ok := decoded.(map[string]any); !ok {
		return nil, fmt.Errorf("config root must be a JSON object")
	}

	normalized, err := json.Marshal(decoded)
	if err != nil {
		return nil, err
	}
	return json.RawMessage(normalized), nil
}
