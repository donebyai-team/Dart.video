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
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/utils"
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
	SessionID       string
	OrgID           string
	SlideID         string
	VideoBranding   *types.VideoBranding
	VideoBackground *types.VideoBackground
	Sections        []types.Section
}

type AnimationGenerator interface {
	ExtractConfig(
		ctx context.Context,
		beatDescription string,
		template *models.Template,
		params GenerationParams) (*types.TemplateConfigExtractorOutput, error)
	Generate(
		ctx context.Context,
		animation *types.AnimationSlide,
		callback TemplateGenerationCallback,
		params GenerationParams,
	) (*models.Template, error)
	GenerateCode(ctx context.Context,
		prompt string,
		animation *types.AnimationSlide,
		callback TemplateGenerationCallback,
		brandIdentityRegistry *brand_identity.BrandIdentityRegistry,
		params GenerationParams) (*models.Template, error)
	EditAnimationCode(
		ctx context.Context,
		animationSlide *pbcore.Slide,
		prompt string,
		callback TemplateGenerationCallback,
		params GenerationParams,
	) (*models.Template, error)
}

type animationGenerator struct {
	mediaStore           services.MediaStore
	llmService           llm.LLMService
	codeBuilder          services.TemplateCodeBuilder
	brandIdentityService brand_identity.BrandIdentity
	logger               *zap.Logger
}

func NewAnimationGenerator(mediaStore services.MediaStore,
	brandIdentityService brand_identity.BrandIdentity,
	llmService llm.LLMService, codeBuilder services.TemplateCodeBuilder, logger *zap.Logger) AnimationGenerator {
	return &animationGenerator{mediaStore: mediaStore,
		brandIdentityService: brandIdentityService,
		llmService:           llmService, codeBuilder: codeBuilder, logger: logger}
}

const maxAttempts = 5

type TemplateGenerationCallback func(TemplateGenerationProgress)

type TemplateGenerationProgress struct {
	Message string
}

func (l animationGenerator) Generate(
	ctx context.Context,
	animation *types.AnimationSlide,
	callback TemplateGenerationCallback,
	params GenerationParams,
) (*models.Template, error) {

	callback(TemplateGenerationProgress{
		Message: CreativeStageMessage(StageUnderstanding, 0),
	})

	var brandIdentityRegistry *brand_identity.BrandIdentityRegistry
	if params.VideoBranding != nil && params.VideoBranding.BrandLibraryID != nil {
		_brandIdentityRegistry, err := l.brandIdentityService.GetBrandIdentity(ctx, *params.VideoBranding.BrandLibraryID)
		if err != nil {
			if errors.Is(err, datastore.NotFound) {
				return nil, agenterrors.InvalidInput("brand_identity not found", nil)
			}
			return nil, err
		}

		if _brandIdentityRegistry != nil {
			brandIdentityRegistry = _brandIdentityRegistry
			params.VideoBranding.BrandGuideLines = utils.Ptr(_brandIdentityRegistry.FormatBrandAndAssetDetails())
		}
	}

	input := types.GenerateAnimationPromptRequest{
		CurrentBeat:   animation.BeatDescription,
		AnimationType: animation.AnimationType,
		Voiceover:     animation.Voiceover,
	}

	if params.VideoBranding != nil {
		input.Branding = *params.VideoBranding
	}

	if params.VideoBackground != nil {
		input.SlideBackground = gradientToCSS(params.VideoBackground.Gradient)
	}

	if len(params.Sections) > 0 {
		input.PlanSoFar = params.Sections
	}

	output, err := baml_client.GenerateAnimationPrompt(ctx, input)
	if err != nil {
		return nil, agenterrors.AnimationGenerationFailed("failed to generate prompt", err)
	}

	return l.GenerateCode(ctx, output.Prompt, animation, callback, brandIdentityRegistry, params)
}

func (l animationGenerator) GenerateCode(ctx context.Context,
	prompt string,
	animation *types.AnimationSlide,
	callback TemplateGenerationCallback,
	brandIdentityRegistry *brand_identity.BrandIdentityRegistry,
	params GenerationParams) (*models.Template, error) {
	inptCodeGeneration := types.GenerateAnimationCodeRequest{
		AnimationPrompt: prompt,
		Duration:        animation.Duration,
		Voiceover:       animation.Voiceover,
		AnimationType:   animation.AnimationType,
	}

	if params.VideoBranding != nil {
		inptCodeGeneration.Branding = *params.VideoBranding
	}
	if params.VideoBackground != nil {
		inptCodeGeneration.SlideBackground = gradientToCSS(params.VideoBackground.Gradient)
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

		// resolve the asset handles
		if brandIdentityRegistry != nil {
			generatedAnimation.Code = brandIdentityRegistry.ResolveMediaHandles(generatedAnimation.Code)
		}

		// Default
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

		l.logger.Info("building code")

		buildOutput, err := l.codeBuilder.ValidateAndBuild(ctx, &services.ValidateAndBuildInput{
			Code:          indentedCode,
			ComponentName: fmt.Sprintf("Transformed%s%d", componentName, attempt),
			OutputPath:    fmt.Sprintf("templates/generated/%s/%s", params.OrgID, params.SessionID),
		})

		if err == nil {
			callback(TemplateGenerationProgress{
				Message: CreativeStageMessage(StageReady, 0),
			})

			updatedDuration := generatedAnimation.IdealDuration
			if !IsValidDuration(updatedDuration) {
				l.logger.Info("Received invalid duration from generated code, moving to animation from prompt",
					zap.Int("generated_duration", int(generatedAnimation.IdealDuration)),
					zap.Int("default", int(animation.Duration)))
				updatedDuration = animation.Duration
			}

			return &models.Template{
				ID:   uuid.New().String(),
				Name: componentName,
				CodeRegistry: &pbcore.CodeRegistry{
					MUrl: uploadedMedia.Url,
					TUrl: buildOutput.JSPath,
				},
				AnimationType:   types.AnimationTypeTEXT,
				Repeatable:      false,
				ElementRegistry: buildOutput.Registry,
				Description:     prompt,
				Duration:        updatedDuration,
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

func (l animationGenerator) EditAnimationCode(
	ctx context.Context,
	animationSlide *pbcore.Slide,
	prompt string,
	callback TemplateGenerationCallback,
	params GenerationParams,
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
	// 1️⃣ Attempt targeted edits first
	template, err := l.tryTargetedEdits(
		ctx,
		code,
		prompt,
		callback,
		params,
	)

	if err == nil {
		return template, nil
	}

	// 2️⃣ fallback to regeneration
	return l.tryRegenerateAnimation(
		ctx,
		code,
		animationSlide,
		prompt,
		types.AnimationType(slideContent.Plan.AnimationType),
		callback,
		params,
	)
}

func (l animationGenerator) loadExistingCode(
	ctx context.Context,
	slideContent *pbcore.AnimationSlideContent,
) (string, error) {

	code, err := l.mediaStore.DownloadCode(ctx, slideContent.CodeRegistry.MUrl)
	if err != nil {
		return "", fmt.Errorf("failed to download code: %w", err)
	}

	return indentCode(code), nil
}

func (l animationGenerator) tryTargetedEdits(
	ctx context.Context,
	code string,
	prompt string,
	callback TemplateGenerationCallback,
	params GenerationParams,
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
			params.OrgID,
			params.SessionID,
			params.SlideID,
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
				"Build failed with error:\n"+buildError.Error(),
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

func (l animationGenerator) uploadAndBuild(
	ctx context.Context,
	code string,
	codeFilePath string,
	attempt int,
	callback TemplateGenerationCallback,
) (*models.Template, error) {

	componentName := RandomComponentName()
	callback(TemplateGenerationProgress{
		Message: CreativeStageMessage(StageSaving, attempt),
	})
	uploadedMedia, err := l.mediaStore.UploadCode(
		ctx,
		code,
		fmt.Sprintf("%s/%s%d.tsx", codeFilePath, componentName, attempt),
	)
	if err != nil {
		return nil, agenterrors.AnimationGenerationFailed("failed to upload code", err)
	}

	callback(TemplateGenerationProgress{
		Message: CreativeStageMessage(StageBuilding, attempt),
	})
	buildOutput, err := l.codeBuilder.ValidateAndBuild(ctx, &services.ValidateAndBuildInput{
		Code:          code,
		ComponentName: fmt.Sprintf("Transformed%s%d", componentName, attempt),
		OutputPath:    codeFilePath,
	})

	if err != nil {
		return nil, err
	}

	callback(TemplateGenerationProgress{
		Message: CreativeStageMessage(StageReady, attempt),
	})

	return &models.Template{
		ID:   uuid.New().String(),
		Name: componentName,
		CodeRegistry: &pbcore.CodeRegistry{
			MUrl: uploadedMedia.Url,
			TUrl: buildOutput.JSPath,
		},
		Repeatable:      false,
		ElementRegistry: buildOutput.Registry,
	}, nil
}

func (l animationGenerator) tryRegenerateAnimation(
	ctx context.Context,
	code string,
	animationSlide *pbcore.Slide,
	prompt string,
	animationType types.AnimationType,
	callback TemplateGenerationCallback,
	params GenerationParams,
) (*models.Template, error) {

	conversationHistory := []types.Message{}
	for attempt := 0; attempt < maxAttempts; attempt++ {
		input := l.buildRegenInput(
			ctx,
			code,
			animationSlide,
			animationType,
			prompt,
			params,
		)

		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageDesigning, attempt),
		})

		l.logger.Info("fallback to regeneration animation", zap.Int("attempt", attempt))
		response, err := baml_client.ReGenerateAnimation(ctx, input, conversationHistory)
		if err != nil {
			return nil, agenterrors.EditAnimationCodeFailed("failed to re-generate animation", err)
		}

		indentedCode := indentCode(response.Code)

		codeFilePath := fmt.Sprintf(
			"templates/generated/%s/%s/%s",
			params.OrgID,
			params.SessionID,
			params.SlideID,
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
				"Build failed with error:\n"+buildErr.Error(),
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

func (l animationGenerator) buildRegenInput(
	ctx context.Context,
	code string,
	animationSlide *pbcore.Slide,
	animationType types.AnimationType,
	prompt string,
	params GenerationParams,
) types.ReGenerateAnimationCodeRequest {

	input := types.ReGenerateAnimationCodeRequest{
		Code:          code,
		AnimationType: animationType,
		Prompt:        prompt,
		Duration:      int64(animationSlide.Duration),
	}

	if params.VideoBranding != nil {
		input.Branding = *params.VideoBranding
	}

	if params.VideoBackground != nil {
		input.SlideBackground = gradientToCSS(params.VideoBackground.Gradient)
	}

	// Inject brand guidelines
	if params.VideoBranding != nil && params.VideoBranding.BrandLibraryID != nil {

		brandIdentity, err := l.brandIdentityService.GetBrandIdentity(
			ctx,
			*params.VideoBranding.BrandLibraryID,
		)

		if err != nil {

			if errors.Is(err, datastore.NotFound) {
				return input
			}

			l.logger.Error(
				"failed to load brand identity",
				zap.Error(err),
			)

			return input
		}

		if brandIdentity != nil {
			input.Branding.BrandGuideLines = utils.Ptr(
				brandIdentity.FormatBrandDetails(),
			)
		}
	}

	return input
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
	a := adjectives[rand.Intn(len(adjectives))]
	b := nouns[rand.Intn(len(nouns))]

	return fmt.Sprintf("%s%s_%d", a, b, time.Now().UnixNano())
}

func (l animationGenerator) ExtractConfig(
	ctx context.Context,
	beatDescription string,
	template *models.Template,
	params GenerationParams) (*types.TemplateConfigExtractorOutput, error) {
	marshal, err := json.Marshal(template.Schema)
	if err != nil {
		return nil, errors.Wrapf(err, "failed to marshal template schema of template : %s", template.ID)
	}

	input := types.TemplateConfigExtractorInput{
		Schema:              string(marshal),
		BeatDescription:     beatDescription,
		TemplateDescription: template.Description,
	}

	if params.VideoBranding != nil {
		input.Branding = *params.VideoBranding
	}
	if params.VideoBackground != nil {
		input.SlideBackground = gradientToCSS(params.VideoBackground.Gradient)
	}

	var brandIdentityRegistry *brand_identity.BrandIdentityRegistry
	if params.VideoBranding != nil && params.VideoBranding.BrandLibraryID != nil {
		_brandIdentityRegistry, err := l.brandIdentityService.GetBrandIdentity(ctx, *params.VideoBranding.BrandLibraryID)
		if err != nil {
			if errors.Is(err, datastore.NotFound) {
				return nil, agenterrors.InvalidInput("brand_identity not found", nil)
			}
			return nil, err
		}

		if _brandIdentityRegistry != nil {
			brandIdentityRegistry = _brandIdentityRegistry
			input.Branding.BrandGuideLines = utils.Ptr(_brandIdentityRegistry.FormatBrandAndAssetDetails())
		}
	}

	output, err := baml_client.ExtractTemplateConfig(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to extract template config from BAML : %s", err)
	}

	valid := json.Valid([]byte(output.Config))
	if !valid {
		return nil, errors.New(fmt.Sprintf("template config validation failed for template : %s", template.ID))
	}

	if brandIdentityRegistry != nil {
		output.Config = brandIdentityRegistry.ResolveMediaHandles(output.Config)
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
