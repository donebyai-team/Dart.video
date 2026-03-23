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
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"go.uber.org/zap"
	"math"
	"strings"
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

type AnimationGenerator interface {
	ExtractConfig(
		ctx context.Context,
		beatDescription string,
		template *models.Template) (*types.TemplateConfigExtractorOutput, error)
	GenerateCode(ctx context.Context,
		prompt string,
		animation *types.AnimationSlide,
		callback TemplateGenerationCallback,
	) (*models.Template, error)
	EditAnimationCode(
		ctx context.Context,
		animationSlide *pbcore.Slide,
		prompt string,
		callback TemplateGenerationCallback,
	) (*models.Template, error)
	GenerateCodeV2(ctx context.Context,
		scene *types.Scene,
		callback TemplateGenerationCallback,
	) (*models.Template, error)
	ApplyGenerationOptions(options AnimationGenerationOptions)
}

type animationGenerator struct {
	sessionID         string
	orgID             string
	slideID           string
	mediaStore        services.MediaStore
	codeBuilder       services.TemplateCodeBuilder
	generationOptions AnimationGenerationOptions
	llmService        llm.LLMService
	logger            *zap.Logger
}

func (l *animationGenerator) GenerateCodeV2(ctx context.Context, scene *types.Scene, callback TemplateGenerationCallback) (*models.Template, error) {
	inptCodeGeneration := types.GenerateAnimationCodeRequestV2{
		Scene: *scene,
	}

	conversationHistory := make([]types.Message, 0)
	for attempt := 0; attempt < maxAttempts; attempt++ {

		// 🎨 Designing
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageDesigning, attempt),
		})

		l.logger.Info("generating code")
		generatedAnimation, err := l.llmService.GenerateAnimationCodeV2(ctx, inptCodeGeneration, conversationHistory, func(thinking string) {

		})
		if err != nil {
			return nil, agenterrors.AnimationGenerationFailed("failed to generate animation", err)
		}

		// resolve the asset handles
		if l.generationOptions.assetRegistry != nil {
			l.logger.Info("using brand-identity mapping for resolving media handles")
			generatedAnimation.Code = l.generationOptions.assetRegistry.ResolveMediaHandles(generatedAnimation.Code)
		}

		// Default
		indentedCode := indentCode(generatedAnimation.Code)

		// 💾 Saving draft
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageSaving, attempt),
		})

		// ⚙️ Bringing to life (BUILD STAGE)
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageBuilding, attempt),
		})

		l.logger.Info("building code")
		codeFilePath := fmt.Sprintf(
			"templates/generated/%s/%s",
			l.orgID,
			l.slideID,
		)

		template, err := l.uploadAndBuild(ctx, indentedCode, codeFilePath, attempt, callback)
		if err == nil {
			diff := math.Abs(float64(generatedAnimation.SettledFrame) - float64(template.Config.VisibleDuration))
			if diff > 30 {
				l.logger.Info("difference between llm and computed settledFrame is more than 30",
					zap.Int("llm_settled_frame", int(generatedAnimation.SettledFrame)),
					zap.Int("computed", int(template.Config.VisibleDuration)),
				)
			} else if diff > 0 {
				l.logger.Info("found difference between llm and computed settledFrame",
					zap.Int("llm_settled_frame", int(generatedAnimation.SettledFrame)),
					zap.Int("computed", int(template.Config.VisibleDuration)),
				)
			}

			if generatedAnimation.ThinkingSummary != nil {
				template.Description = *generatedAnimation.ThinkingSummary
			}
			template.Config.VisibleDuration = generatedAnimation.SettledFrame
			template.Config.TotalDuration = generatedAnimation.SettledFrame
			return template, nil
		}

		// Retry only on build errors
		var buildErr *services.BuildError
		if errors.As(err, &buildErr) {
			// append thinking summary
			if generatedAnimation.ThinkingSummary != nil {
				conversationHistory = append(conversationHistory, types.Message{
					Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
					Content: *generatedAnimation.ThinkingSummary,
				})
			}

			conversationHistory = appendRetryConversation(
				conversationHistory,
				indentedCode,
				buildFailureMessage(buildErr),
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

func NewAnimationGenerator(sessionID string,
	orgID string,
	slideID string,
	mediaStore services.MediaStore,
	codeBuilder services.TemplateCodeBuilder,
	logger *zap.Logger,
	llmService llm.LLMService) AnimationGenerator {
	return &animationGenerator{
		sessionID:   sessionID,
		orgID:       orgID,
		slideID:     slideID,
		mediaStore:  mediaStore,
		codeBuilder: codeBuilder,
		logger:      logger,
		llmService:  llmService,
	}
}

const maxAttempts = 5

type TemplateGenerationCallback func(TemplateGenerationProgress)

type TemplateGenerationProgress struct {
	Message string
}

func buildFailureMessage(buildErr *services.BuildError) string {
	switch buildErr.ErrorType {
	case "compile_error":
		return "Compile failed with error:\n" + buildErr.Error()
	case "rule_not_enforced":
		return "Generated code violated required animation rules:\n" + buildErr.Error() + "\nReview the generation rules and rewrite the component to follow them exactly."
	case "render_error":
		return "Render failed with error:\n" + buildErr.Error()
	case "framerules_not_enforced":
		return "Generated code violated required frame duration rules:\n" + buildErr.Error() + "\nReview the FRAME DURATION RULES rules and rewrite the component to follow them exactly."
	default:
		return "Build failed with error:\n" + buildErr.Error()
	}
}

func (l *animationGenerator) ApplyGenerationOptions(options AnimationGenerationOptions) {
	l.generationOptions = options
}

func (l *animationGenerator) GenerateCode(ctx context.Context,
	prompt string,
	animation *types.AnimationSlide,
	callback TemplateGenerationCallback,
) (*models.Template, error) {
	inptCodeGeneration := types.GenerateAnimationCodeRequest{
		AnimationPrompt:  prompt,
		DurationInFrames: animation.Duration, // was converted to frames while sanitization
		Voiceover:        animation.Voiceover,
		AnimationType:    animation.AnimationType,
	}

	if l.generationOptions.VideoBranding != nil {
		inptCodeGeneration.Branding = *l.generationOptions.VideoBranding
	}

	if l.generationOptions.assetRegistry != nil {
		inptCodeGeneration.Branding.BrandGuideLines = l.generationOptions.assetRegistry.FormatAssets()
		l.logger.Info("using injected brand-identity mapper", zap.String("guidelines", *inptCodeGeneration.Branding.BrandGuideLines))
	}

	conversationHistory := make([]types.Message, 0)
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

		// resolve the asset handles
		if l.generationOptions.assetRegistry != nil {
			l.logger.Info("using brand-identity mapping for resolving media handles")
			generatedAnimation.Code = l.generationOptions.assetRegistry.ResolveMediaHandles(generatedAnimation.Code)
		}

		// Default
		indentedCode := indentCode(generatedAnimation.Code)

		// 💾 Saving draft
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageSaving, attempt),
		})

		// ⚙️ Bringing to life (BUILD STAGE)
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageBuilding, attempt),
		})

		l.logger.Info("building code")

		buildOutput, err := l.codeBuilder.ValidateAndBuild(ctx, &services.ValidateAndBuildInput{
			Code:       indentedCode,
			OutputPath: fmt.Sprintf("templates/generated/%s/%s", l.orgID, l.sessionID),
		})

		if err == nil {
			callback(TemplateGenerationProgress{
				Message: CreativeStageMessage(StageReady, 0),
			})

			l.logger.Info("uploaded generated code",
				zap.String("transformed_url", buildOutput.TransformedCodePath),
				zap.String("assigned_ids_url", buildOutput.CodeWithAssignedIdsPath))

			return &models.Template{
				ID:            uuid.New().String(),
				Name:          buildOutput.ComponentName,
				AnimationType: types.AnimationTypeTEXT,
				Repeatable:    false,
				Description:   prompt,
				Config: &models.TemplateConfig{
					CodeRegistry: &pbcore.CodeRegistry{
						MUrl: buildOutput.CodeWithAssignedIdsPath,
						TUrl: buildOutput.TransformedCodePath,
					},
					VisibleDuration: int64(buildOutput.CodeDuration.SettledFrame),
					TotalDuration:   int64(buildOutput.CodeDuration.DurationInFrames),
					Repeatable:      false,
					Categories:      nil,
				},
				GeneratedPatches: buildOutput.Registry,
			}, nil
		}

		// Retry only on build errors
		var buildErr *services.BuildError
		if errors.As(err, &buildErr) {
			conversationHistory = appendRetryConversation(
				conversationHistory,
				indentedCode,
				buildFailureMessage(buildErr),
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

func (l *animationGenerator) EditAnimationCode(
	ctx context.Context,
	animationSlide *pbcore.Slide,
	prompt string,
	callback TemplateGenerationCallback,
) (*models.Template, error) {

	slideContent := animationSlide.GetAnimation()
	if slideContent.Plan == nil {
		return nil, agenterrors.EditAnimationCodeFailed(
			"failed to edit animation",
			errors.New("animation has no plan"),
		)
	}

	code, err := l.loadExistingCode(ctx, slideContent)
	if err != nil {
		return nil, fmt.Errorf("failed to load existing code: %w", err)
	}

	callback(TemplateGenerationProgress{
		Message: CreativeStageMessage(StageUnderstanding, 0),
	})
	//// 1️⃣ Attempt targeted edits first
	//template, err := l.tryTargetedEdits(
	//	ctx,
	//	code,
	//	prompt,
	//	callback,
	//)
	//
	//if err == nil {
	//	return template, nil
	//}
	//
	//l.logger.Error("targeted edits failed", zap.Error(err))

	// 2️⃣ fallback to regeneration
	return l.tryRegenerateAnimation(
		ctx,
		code,
		animationSlide,
		prompt,
		callback,
	)
}

func (l *animationGenerator) loadExistingCode(
	ctx context.Context,
	slideContent *pbcore.AnimationSlideContent,
) (string, error) {

	code, err := l.mediaStore.DownloadCode(ctx, slideContent.CodeRegistry.MUrl)
	if err != nil {
		return "", fmt.Errorf("failed to download code: %w", err)
	}

	return indentCode(code), nil
}

func (l *animationGenerator) tryTargetedEdits(
	ctx context.Context,
	code string,
	prompt string,
	callback TemplateGenerationCallback,
) (*models.Template, error) {

	input := types.EditAnimationCodeRequest{
		Code:   code,
		Prompt: prompt,
	}

	conversationHistory := []types.Message{}

	for attempt := 0; attempt < maxAttempts; attempt++ {

		l.logger.Info("trying targeted edits", zap.Int("attempt", attempt))
		response, err := baml_client.EditAnimationCode(ctx, input, conversationHistory)
		if err != nil {
			return nil, agenterrors.EditAnimationCodeFailed("failed to edit animation", err)
		}

		if response.Type != types.AnimationCodeEditTypeTARGETED_EDITS {
			return nil, fmt.Errorf("model switched to regeneration")
		}

		if len(response.Edits) == 0 {
			return nil, agenterrors.NoEditsApplied("no reasonable edits applied", nil)
		}

		newCode, retryReason := applyEdits(code, response.Edits)

		if retryReason != "" {
			l.logger.Error("failed to apply edits, trying again",
				zap.String("error", retryReason),
				zap.Int("attempt_left", maxAttempts-attempt))

			conversationHistory = appendRetryConversation(
				conversationHistory,
				stringify(response),
				retryReason,
			)
			continue
		}

		code = newCode
		codeFilePath := fmt.Sprintf(
			"templates/generated/%s/%s/%s",
			l.orgID,
			l.sessionID,
			l.slideID,
		)

		template, buildErr := l.uploadAndBuild(
			ctx,
			code,
			codeFilePath,
			attempt,
			callback,
		)

		if buildErr == nil {
			return template, nil
		}

		var buildError *services.BuildError
		if errors.As(buildErr, &buildError) {
			conversationHistory = appendRetryConversation(
				conversationHistory,
				stringify(response),
				buildFailureMessage(buildError),
			)

			l.logger.Error("failed to build animation",
				zap.Int("attempt_left", maxAttempts-attempt),
				zap.Error(buildErr))

			callback(TemplateGenerationProgress{
				Message: CreativeStageMessage(StageRefining, attempt),
			})

			continue
		}

		return nil, buildErr
	}

	return nil, fmt.Errorf("targeted edit attempts exhausted")
}

func applyEdits(code string, edits []types.EditString) (string, string) {
	for _, edit := range edits {

		oldStr := strings.TrimSpace(edit.OldString)
		newStr := strings.TrimSpace(edit.NewString)

		if oldStr == "" || newStr == "" {
			return code, "one of the suggested edit string is empty"
		}

		if !strings.Contains(code, oldStr) {
			return code, fmt.Sprintf(
				"oldString not found in code: %s",
				oldStr,
			)
		}

		code = strings.ReplaceAll(code, oldStr, newStr)
	}

	return code, ""
}

func stringify(v any) string {
	b, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return fmt.Sprintf("%v", v)
	}
	return string(b)
}

func (l *animationGenerator) uploadAndBuild(
	ctx context.Context,
	code string,
	codeFilePath string,
	attempt int,
	callback TemplateGenerationCallback,
) (*models.Template, error) {

	callback(TemplateGenerationProgress{
		Message: CreativeStageMessage(StageSaving, attempt),
	})

	callback(TemplateGenerationProgress{
		Message: CreativeStageMessage(StageBuilding, attempt),
	})
	buildOutput, err := l.codeBuilder.ValidateAndBuild(ctx, &services.ValidateAndBuildInput{
		Code:       code,
		OutputPath: codeFilePath,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to build animation: %w", err)
	}

	l.logger.Info("uploaded generated code",
		zap.String("transformed_url", buildOutput.TransformedCodePath),
		zap.String("assigned_ids_url", buildOutput.CodeWithAssignedIdsPath))

	callback(TemplateGenerationProgress{
		Message: CreativeStageMessage(StageReady, attempt),
	})

	return &models.Template{
		ID:   uuid.New().String(),
		Name: buildOutput.ComponentName,
		Config: &models.TemplateConfig{
			CodeRegistry: &pbcore.CodeRegistry{
				MUrl: buildOutput.CodeWithAssignedIdsPath,
				TUrl: buildOutput.TransformedCodePath,
			},
			VisibleDuration: int64(buildOutput.CodeDuration.SettledFrame),
			TotalDuration:   int64(buildOutput.CodeDuration.DurationInFrames),
			Repeatable:      false,
			Categories:      nil,
		},
		Repeatable:       false,
		GeneratedPatches: buildOutput.Registry,
	}, nil
}

func (l *animationGenerator) tryRegenerateAnimation(
	ctx context.Context,
	code string,
	animationSlide *pbcore.Slide,
	prompt string,
	callback TemplateGenerationCallback,
) (*models.Template, error) {
	conversationHistory := []types.Message{}
	for attempt := 0; attempt < maxAttempts; attempt++ {
		input := l.buildRegenInput(
			code,
			animationSlide,
			prompt,
		)

		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageDesigning, attempt),
		})

		// TODO: Feed LLM the existing patches to keep existing user edits
		// We may want to compare the original with the latest patch to know the user edits
		l.logger.Info("fallback to regeneration animation", zap.Int("attempt", attempt))
		response, err := baml_client.ReGenerateAnimation(ctx, input, conversationHistory)
		if err != nil {
			return nil, agenterrors.EditAnimationCodeFailed("failed to re-generate animation", err)
		}

		if l.generationOptions.assetRegistry != nil {
			l.logger.Info("using brand-identity mapping for resolving media handles")
			response.Code = l.generationOptions.assetRegistry.ResolveMediaHandles(response.Code)
		}

		indentedCode := indentCode(response.Code)

		codeFilePath := fmt.Sprintf(
			"templates/generated/%s/%s/%s",
			l.orgID,
			l.sessionID,
			l.slideID,
		)

		template, err := l.uploadAndBuild(
			ctx,
			indentedCode,
			codeFilePath,
			attempt,
			callback,
		)

		if err == nil {
			return template, nil
		}

		var buildErr *services.BuildError
		if errors.As(err, &buildErr) {
			conversationHistory = appendRetryConversation(
				conversationHistory,
				indentedCode,
				buildFailureMessage(buildErr),
			)

			l.logger.Error("failed to build animation",
				zap.Int("attempt_left", maxAttempts-attempt),
				zap.Error(buildErr))

			callback(TemplateGenerationProgress{
				Message: CreativeStageMessage(StageRefining, attempt),
			})

			continue
		}

		return nil, err
	}

	return nil, agenterrors.EditAnimationCodeFailed(
		"edit animation generation failed after max retries",
		fmt.Errorf("max build attempts reached"),
	)
}

func (l *animationGenerator) buildRegenInput(
	code string,
	animationSlide *pbcore.Slide,
	prompt string,
) types.ReGenerateAnimationCodeRequest {

	input := types.ReGenerateAnimationCodeRequest{
		Code:             code,
		Prompt:           prompt,
		DurationInFrames: int64(animationSlide.DurationInFrames),
	}

	if l.generationOptions.VideoBranding != nil {
		input.Branding = *l.generationOptions.VideoBranding
	}

	if l.generationOptions.assetRegistry != nil {
		input.Branding.BrandGuideLines = l.generationOptions.assetRegistry.FormatBrandDetails()
		l.logger.Info("using injected brand-identity mapper")
	}

	// TODO: the injact attachments here as well

	return input
}

func (l *animationGenerator) ExtractConfig(
	ctx context.Context,
	beatDescription string,
	template *models.Template,
) (*types.TemplateConfigExtractorOutput, error) {
	l.logger.Info("extracting template config")
	marshal, err := json.Marshal(template.Schema)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to marshal template schema of template : %s", template.ID)
	}

	input := types.TemplateConfigExtractorInput{
		Schema:              string(marshal),
		BeatDescription:     beatDescription,
		TemplateDescription: template.Description,
	}

	if l.generationOptions.VideoBranding != nil {
		input.Branding = *l.generationOptions.VideoBranding
	}

	if l.generationOptions.assetRegistry != nil {
		input.Branding.BrandGuideLines = l.generationOptions.assetRegistry.FormatBrandDetails()
		l.logger.Info("using injected brand-identity mapper",
			zap.String("guidelines", *input.Branding.BrandGuideLines),
		)
	}

	output, err := baml_client.ExtractTemplateConfig(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to extract template config from BAML : %s", err)
	}

	valid := json.Valid([]byte(output.Config))
	if !valid {
		return nil, errors.New(fmt.Sprintf("template config validation failed for template : %s", template.ID))
	}

	if l.generationOptions.assetRegistry != nil {
		l.logger.Info("using brand-identity mapping for resolving media handles")
		output.Config = l.generationOptions.assetRegistry.ResolveMediaHandles(output.Config)
	}

	return &output, nil
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
