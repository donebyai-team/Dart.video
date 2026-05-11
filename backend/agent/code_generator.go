package agent

import (
	"context"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"go.uber.org/zap"
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
		return "Done. Need anything else?"

	default:
		return "Working on it..."
	}
}

type CodeGenerator interface {
	GenerateCodeFromScene(ctx context.Context,
		scene *scenes.SceneConfig,
		callback TemplateGenerationCallback,
	) (*models.Template, error)
	ApplyGenerationOptions(options AnimationGenerationOptions)
}

type codeGenerator struct {
	sessionID         string
	orgID             string
	slideID           string
	mediaStore        services.MediaStore
	codeBuilder       services.TemplateCodeBuilder
	generationOptions AnimationGenerationOptions
	logger            *zap.Logger
}

func (l *codeGenerator) GenerateCodeFromScene(ctx context.Context, scene *scenes.SceneConfig, callback TemplateGenerationCallback) (*models.Template, error) {
	//inptCodeGeneration := types.GenerateAnimationCodeRequestV2{
	//	Scene: *scene,
	//}
	//
	//conversationHistory := make([]types.Message, 0)
	for attempt := 0; attempt < maxAttempts; attempt++ {

		// 🎨 Designing
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageDesigning, attempt),
		})

		l.logger.Info("generating code")
		generatedAnimation, err := scenes.RenderJSXCodeFromSceneConfig(scene)
		if err != nil {
			return nil, agenterrors.AnimationGenerationFailed("failed to generate animation", err)
		}

		// Default
		indentedCode := indentCode(generatedAnimation)

		// 💾 Saving draft
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageSaving, attempt),
		})

		// ⚙️ Bringing to life (BUILD STAGE)
		callback(TemplateGenerationProgress{
			Message: CreativeStageMessage(StageBuilding, attempt),
		})

		l.logger.Info("building code")
		codeFilePath := fmt.Sprintf("templates/generated/%s", l.orgID)
		if l.slideID != "" {
			codeFilePath = fmt.Sprintf("%s/%s", codeFilePath, l.slideID)
		}

		template, err := l.uploadAndBuild(ctx, indentedCode, codeFilePath, attempt, callback)
		if err == nil {
			// Override the patch, we later remove it from validator
			template.GeneratedPatches = scene.ToEditsPatch()
			template.Config.VisibleDurationInFrames = scene.ComputeDurationFrames()
			template.Config.TotalDurationInFrames = template.Config.VisibleDurationInFrames
			return template, nil
		}

		l.logger.Error("failed to build animation", zap.Error(err))
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
) CodeGenerator {
	return &codeGenerator{
		sessionID:   sessionID,
		orgID:       orgID,
		slideID:     slideID,
		mediaStore:  mediaStore,
		codeBuilder: codeBuilder,
		logger:      logger,
	}
}

const maxAttempts = 1

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
		return "GenerateEditsFromProps failed with error:\n" + buildErr.Error()
	case "framerules_not_enforced":
		return "Generated code violated required frame duration rules:\n" + buildErr.Error() + "\nReview the FRAME DURATION RULES rules and rewrite the component to follow them exactly."
	default:
		return "Build failed with error:\n" + buildErr.Error()
	}
}

func (l *codeGenerator) ApplyGenerationOptions(options AnimationGenerationOptions) {
	l.generationOptions = options
}

func (l *codeGenerator) loadExistingCode(
	ctx context.Context,
	slideContent *pbcore.AnimationSlideContent,
) (string, error) {

	code, err := l.mediaStore.DownloadCode(ctx, slideContent.CodeRegistry.MUrl)
	if err != nil {
		return "", fmt.Errorf("failed to download code: %w", err)
	}

	return indentCode(code), nil
}

func (l *codeGenerator) uploadAndBuild(
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
	//buildOutput, err := l.codeBuilder.ValidateAndBuild(ctx, &services.ValidateAndBuildInput{
	//	Code:       code,
	//	OutputPath: codeFilePath,
	//})
	//
	//if err != nil {
	//	return nil, fmt.Errorf("failed to build animation: %w", err)
	//}
	assetID := uuid.New().String()
	//codeFilePath = fmt.Sprintf("%s/%s", codeFilePath, assetID)

	//uploadCodeAsset, err := l.mediaStore.UploadCode(ctx, code, codeFilePath)
	//if err != nil {
	//	return nil, err
	//}
	//
	//l.logger.Info("uploaded generated code",
	//	zap.String("assigned_ids_url", uploadCodeAsset.Url))
	//
	//callback(TemplateGenerationProgress{
	//	Message: CreativeStageMessage(StageReady, attempt),
	//})

	return &models.Template{
		ID: assetID,
		Config: &models.TemplateConfig{
			CodeRegistry: &pbcore.CodeRegistry{
				//MUrl: uploadCodeAsset.Url,
				Code: code,
			},
		},
		Repeatable: false,
	}, nil
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
