package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/common"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"go.uber.org/zap"
	"strings"
)

const (
	GenerateCodeSessionKeyPrefix = "generateCodeSessionKeyPrefix:session"
)

type CodeGeneratorAgent interface {
	GenerateCodeFromScene(ctx context.Context, scene *scenes.SceneConfig) (*models.Template, error)
	GenerateCode(
		ctx context.Context,
		slide *pbcore.Slide,
		input *pbportal.CreateVideoRequest,
	) (*common.RunResult, error)
	ContinueAgent(
		ctx context.Context,
		options ContinueSessionOptions,
	) (*common.RunResult, error)
}

type codeGenerator struct {
	videoID              string
	slideID              string
	orgID                string
	llmService           llm.LLMService
	logger               *zap.Logger
	fps                  int64
	brandIdentityService brand_identity.BrandIdentity
	assetRegistry        *services.MediaAssetRegistry
	mediaStore           services.MediaStore
	state                common.AgentStatusPublisher
	session              common.AgentSession
	toolRegistry         *common.ToolRegistry
}

func NewCodeGeneratorAgent(
	videoID string,
	slideID string,
	orgID string,
	llmService llm.LLMService,
	cache cache.Cache,
	db datastore.Repository,
	mediaStore services.MediaStore,
	logger *zap.Logger,
	brandIdentityService brand_identity.BrandIdentity,
	state common.AgentStatusPublisher,
) CodeGeneratorAgent {
	sessionID := fmt.Sprintf("%s:%s", videoID, slideID)
	session := common.NewAgentSession(sessionID, GenerateCodeSessionKeyPrefix, cache, db, logger)
	return &codeGenerator{
		videoID:              videoID,
		orgID:                orgID,
		slideID:              slideID,
		logger:               logger,
		llmService:           llmService,
		mediaStore:           mediaStore,
		brandIdentityService: brandIdentityService,
		state:                state,
		session:              session,
		toolRegistry:         common.NewToolRegistry(state, session, logger),
	}
}

func (a *codeGenerator) ContinueAgent(
	ctx context.Context,
	options ContinueSessionOptions,
) (*common.RunResult, error) {
	userResponse := strings.TrimSpace(options.UserResponse)
	if userResponse == "" {
		return nil, agenterrors.InvalidInput("user response is required", nil)
	}

	session, err := a.session.Get(ctx)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, agenterrors.InvalidInput("session is nil", nil)
	}

	generatePlanRequest := types.GenerateAnimationCodeRequest{}

	err = a.injectMediaAssets(ctx, session.Request)
	if err != nil {
		return nil, err
	}

	// use brand guidelines only when specified
	if a.assetRegistry != nil {
		generatePlanRequest.VideoBranding = types.VideoBranding{
			BrandGuideLines: a.assetRegistry.FormatBrandDetails(),
			Attachments:     a.assetRegistry.FormatAssets(),
			BrandColors:     a.assetRegistry.FormatBrandTokens(),
		}
	}

	newMessage := &pbcore.ConversationMessage{
		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_USER,
		Message: userResponse,
	}

	for _, asset := range options.SelectedMediaAssets {
		newMessage.AssetIds = append(newMessage.AssetIds, asset.AssetID)
	}

	// Prompt always goes in the conversation
	session.ConversationHistory = append(session.ConversationHistory, newMessage)

	a.state.Publish(common.AgentState{
		State: common.StateStatusProcessing,
	})

	a.logger.Info("continuing agent session with user response", zap.String("response", userResponse))

	return a.runPlanning(ctx, generatePlanRequest, session)
}

func (a *codeGenerator) injectMediaAssets(ctx context.Context, input *pbportal.CreateVideoRequest) error {
	input.Assets = deduplicateAssets(input.Assets)

	registryBuilder := services.NewMediaAssetRegistryBuilder()

	if input.BrandLibraryId != nil {
		brandIdentity, err := a.brandIdentityService.GetBrandIdentity(ctx, *input.BrandLibraryId)
		if err != nil {
			if errors.Is(err, datastore.NotFound) {
				return agenterrors.InvalidInput("brand_identity not found", nil)
			}
			return err
		}
		registryBuilder.
			WithBrandIdentity(brandIdentity.BrandIdentity).
			WithBrandAssets() // only while editing
	}

	a.assetRegistry = registryBuilder.Build()
	return nil
}

func (l *codeGenerator) GenerateCodeFromScene(ctx context.Context, scene *scenes.SceneConfig) (*models.Template, error) {
	generatedAnimation, err := scenes.RenderJSXCodeFromSceneConfig(scene)
	if err != nil {
		return nil, agenterrors.AnimationGenerationFailed("failed to generate animation", err)
	}

	template := &models.Template{
		ID: uuid.New().String(),
		Config: &models.TemplateConfig{
			CodeRegistry: &pbcore.CodeRegistry{
				Code: generatedAnimation,
			},
		},
		GeneratedPatches: scene.ToEditsPatch(),
		Repeatable:       false,
	}

	template.Config.VisibleDurationInFrames = scene.ComputeDurationFrames()
	template.Config.TotalDurationInFrames = template.Config.VisibleDurationInFrames

	return template, nil
}

func (l *codeGenerator) GenerateCode(
	ctx context.Context,
	slide *pbcore.Slide,
	input *pbportal.CreateVideoRequest,
) (*common.RunResult, error) {

	if err := ValidatePrompt(input.Prompt); err != nil {
		return nil, err
	}

	// Analyse image
	err := l.injectMediaAssets(ctx, input)
	if err != nil {
		return nil, err
	}

	generatePlanRequest := types.GenerateAnimationCodeRequest{}

	if l.assetRegistry != nil {
		generatePlanRequest.VideoBranding = types.VideoBranding{
			BrandGuideLines: l.assetRegistry.FormatBrandDetails(),
			Attachments:     l.assetRegistry.FormatAssets(),
		}
	}

	session, err := l.session.Get(ctx)
	if err != nil {
		return nil, err
	}

	if session == nil {
		session = &common.SessionContext{
			Request:             input,
			ConversationHistory: make([]*pbcore.ConversationMessage, 0),
		}
	}

	// Check if its a edit call and add previously scene
	if slide.Content != nil && slide.Content.Edits != nil && len(slide.Content.Edits.Fields) > 0 {
		return nil, agenterrors.InvalidInput("edit via prompt not allows, click the scene to edit", nil)
	}

	if slide.Content != nil &&
		slide.Content.CodeRegistry != nil &&
		slide.Content.CodeRegistry.MUrl != "" {
		session.ConversationHistory = append(session.ConversationHistory, &pbcore.ConversationMessage{
			Role:         pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
			CodeSnapshot: slide.Content.CodeRegistry.MUrl,
		})
	}

	newMessage := &pbcore.ConversationMessage{
		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_USER,
		Message: input.Prompt,
	}

	for _, asset := range input.References {
		newMessage.ReferenceIds = append(newMessage.ReferenceIds, asset.AssetID)
	}

	for _, asset := range input.Assets {
		newMessage.AssetIds = append(newMessage.AssetIds, asset.AssetID)
	}

	// Prompt always goes in the conversation
	session.ConversationHistory = append(session.ConversationHistory, newMessage)

	return l.runPlanning(ctx, generatePlanRequest, session)
}

func (l *codeGenerator) runPlanning(ctx context.Context, generatePlanRequest types.GenerateAnimationCodeRequest, session *common.SessionContext) (result *common.RunResult, retErr error) {
	defer func() {
		if retErr != nil {
			// Treat both a hard context cancel (runCtx cancelled by the handler) and a
			// soft Redis cancel (written by StopAgent) as user-initiated cancellations.
			isUserCancel := ctx.Err() != nil || errors.Is(retErr, errUserSoftCancelled)
			l.logger.Info("runPlanning: received termination",
				zap.Bool("user_cancel", isUserCancel),
				zap.Error(retErr),
			)
		}
	}()

	history, err := l.session.ConvertToContextMessages(ctx, session.ConversationHistory, l.assetRegistry)
	if err != nil {
		return nil, err
	}

	// Generate and validate upto max attempts
	for attempt := 0; attempt < maxAttempts; attempt++ {

		llmResponse, err := l.llmService.GenerateAnimation(ctx, generatePlanRequest, history, func(chunk string) {
			l.state.Publish(common.AgentState{
				Thinking: chunk,
				State:    common.StateStatusProcessing,
			})
		})
		if err != nil {
			return nil, agenterrors.LLMPlanningFailed("failed to generate scene", err)
		}

		handled, result, err := l.toolRegistry.HandleAskQuestion(ctx, session, llmResponse.AsAskUserQuestion(), "", l.assetRegistry)
		if handled {
			return result, err
		}

		codeResponse := llmResponse.AsGenerateAnimationCodeResponse()
		if codeResponse == nil {
			return nil, agenterrors.Internal("codeResponse is missing", nil)
		}

		asset, err := l.uploadAndBuild(ctx, codeResponse.Code)
		if err != nil {
			return nil, err
		}

		// Save the code in history
		if codeResponse.ThinkingSummary != nil && *codeResponse.ThinkingSummary != "" {
			session.ConversationHistory = append(session.ConversationHistory, &pbcore.ConversationMessage{
				Role:    pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
				Message: *codeResponse.ThinkingSummary,
			})
		}
		//session.ConversationHistory = append(session.ConversationHistory, &pbcore.ConversationMessage{
		//	Role:         pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
		//	CodeSnapshot: asset.Url,
		//})

		// TODO: Handle build errors and retry before saving

		err = l.session.Save(ctx, session)
		if err != nil {
			return nil, err
		}

		return &common.RunResult{
			Status: common.RunStatusCompleted,
			GeneratedAnimation: &models.Template{
				Config: &models.TemplateConfig{
					CodeRegistry: &pbcore.CodeRegistry{
						MUrl: asset.Url,
					},
					VisibleDurationInFrames: int32(codeResponse.Total_frames),
					TotalDurationInFrames:   int32(codeResponse.Total_frames),
				},
				GeneratedPatches: json.RawMessage(`{}`),
			},
		}, nil

	}

	return nil, agenterrors.AnimationGenerationFailed("unable to generate, all retries exhausted", nil)

}

func (l *codeGenerator) uploadAndBuild(ctx context.Context, code string) (*pbcore.MediaAsset, error) {
	codeFilePath := fmt.Sprintf("templates/generated/%s", l.orgID)
	if l.slideID != "" {
		codeFilePath = fmt.Sprintf("%s/%s", codeFilePath, l.slideID)
	}

	//buildOutput, err := l.codeBuilder.ValidateAndBuild(ctx, &services.ValidateAndBuildInput{
	//	Code:       code,
	//	OutputPath: codeFilePath,
	//})
	//
	//if err != nil {
	//	return nil, fmt.Errorf("failed to build animation: %w", err)
	//}
	assetID := uuid.New().String()
	codeFilePath = fmt.Sprintf("%s/%s", codeFilePath, assetID)

	uploadCodeAsset, err := l.mediaStore.UploadCode(ctx, code, codeFilePath)
	if err != nil {
		return nil, err
	}

	l.logger.Info("uploaded generated code",
		zap.String("assigned_ids_url", uploadCodeAsset.Url))

	return uploadCodeAsset, nil
}

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
