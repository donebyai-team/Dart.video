package agent

import (
	"context"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/common"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/datastore"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/services/code_builder"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"strings"
)

const (
	GenerateCodeSessionKeyPrefix = "generateCodeSessionKeyPrefix:session"
)

type CodeGeneratorAgent interface {
	GenerateCodeFromScene(ctx context.Context, scene *scenes.SceneConfig) (*pbcore.Slide, error)
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
	llmService           llm.Service
	logger               *zap.Logger
	fps                  int64
	brandIdentityService brand_identity.BrandIdentity
	codeBuilder          code_builder.CodeBuilder
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
	llmService llm.Service,
	cache cache.Cache,
	db datastore.Repository,
	mediaStore services.MediaStore,
	codeBuilder code_builder.CodeBuilder,
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
		toolRegistry:         common.NewToolRegistry(state, session, nil, logger),
		codeBuilder:          codeBuilder,
	}
}

func (l *codeGenerator) ContinueAgent(
	ctx context.Context,
	options ContinueSessionOptions,
) (*common.RunResult, error) {
	userResponse := strings.TrimSpace(options.UserResponse)
	if userResponse == "" {
		return nil, agenterrors.InvalidInput("user response is required", nil)
	}

	session, err := l.session.Get(ctx)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, agenterrors.InvalidInput("session is nil", nil)
	}

	generatePlanRequest := types.GenerateAnimationCodeRequest{}

	err = l.injectMediaAssets(ctx, session.Request)
	if err != nil {
		return nil, err
	}

	// use brand guidelines only when specified
	if l.assetRegistry != nil {
		generatePlanRequest.VideoBranding = types.VideoBranding{
			BrandGuideLines: l.assetRegistry.FormatBrandDetails(),
			Attachments:     l.assetRegistry.FormatAssets(),
			BrandColors:     l.assetRegistry.FormatBrandTokens(),
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
	session.AddMessage(newMessage)

	l.state.Publish(common.AgentState{
		State: common.StateStatusProcessing,
	})

	l.logger.Info("continuing agent session with user response", zap.String("response", userResponse))

	return l.runPlanning(ctx, generatePlanRequest, session)
}

func (l *codeGenerator) injectMediaAssets(ctx context.Context, input *pbportal.CreateVideoRequest) error {
	input.Assets = deduplicateAssets(input.Assets)

	registryBuilder := services.NewMediaAssetRegistryBuilder()

	if input.BrandLibraryId != nil {
		brandIdentity, err := l.brandIdentityService.GetBrandIdentity(ctx, *input.BrandLibraryId)
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

	l.assetRegistry = registryBuilder.Build()
	return nil
}

func (l *codeGenerator) GenerateCodeFromScene(ctx context.Context, scene *scenes.SceneConfig) (*pbcore.Slide, error) {
	generatedAnimation, err := scenes.RenderJSXCodeFromSceneConfig(scene)
	if err != nil {
		return nil, agenterrors.AnimationGenerationFailed("failed to generate animation", err)
	}

	durationInFrames := scene.ComputeDurationFrames()

	toPatches, err := utils.RawMessageToStruct(scene.ToEditsPatch())
	if err != nil {
		return nil, fmt.Errorf("invalid edits patch: %s", scene.Name)
	}

	slide := &pbcore.Slide{
		DurationInFrames: durationInFrames,
		SettledFrame:     durationInFrames,
		Content: &pbcore.AnimationSlideContent{
			CodeRegistry: &pbcore.CodeRegistry{
				Code: generatedAnimation,
			},
			Edits: toPatches,
		},
	}
	return slide, nil
}

func IsSlideHasTemplateComponent(slide *pbcore.Slide) bool {
	if slide.Content == nil && slide.Content.Edits == nil {
		return false
	}

	if len(slide.Content.Edits.Fields) == 0 {
		return false
	}

	componentField := slide.Content.Edits.Fields["name"]
	if componentField == nil {
		return false
	}

	component, err := scenes.FindComponent(componentField.GetStringValue())
	if err != nil {
		return false
	}

	return component != nil
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
			BrandColors:     l.assetRegistry.FormatBrandTokens(),
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
	if IsSlideHasTemplateComponent(slide) {
		return nil, agenterrors.InvalidInput("This scene can't be edited via prompts. Use the canvas for edits, or click Add Scene to generate a new scene.", nil)
	}

	if slide.Content != nil &&
		slide.Content.CodeRegistry != nil &&
		slide.Content.CodeRegistry.MUrl != "" {
		slide.Content.CodeRegistry.Edits = slide.Content.Edits
		session.AddCodeCheckpoint(slide.Content.CodeRegistry, slide.DurationInFrames)

		// If manual edits are available
		if len(slide.Content.CodeRegistry.Edits.Fields) > 0 {
			edits, err := slide.Content.Edits.MarshalJSON()
			if err != nil {
				return nil, agenterrors.Internal("failed to marshal edits", err)
			}
			session.AddMessage(&pbcore.ConversationMessage{
				Role:    pbcore.ConversationRole_CONVERSATION_ROLE_USER,
				Type:    pbcore.ConversationMessageType_CONVERSATION_MESSAGE_MANUAL_EDITS,
				Message: "User made some manualEdits. Preserve and update them in follow-up responses.\n\nmanualEdits:\n" + string(edits) + "\n\n",
			})
		}
	}

	newMessage := &pbcore.ConversationMessage{
		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_USER,
		Message: input.Prompt,
		AiModel: llm.SelectModelToUseForCodeGeneration(input.AiModel),
	}

	for _, asset := range input.References {
		newMessage.ReferenceIds = append(newMessage.ReferenceIds, asset.AssetID)
	}

	for _, asset := range input.Assets {
		newMessage.AssetIds = append(newMessage.AssetIds, asset.AssetID)
	}

	// Prompt always goes in the conversation
	session.AddMessage(newMessage)

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

	history, aiModel, err := l.session.ConvertToContextMessages(ctx, session.ConversationHistory, l.assetRegistry)
	if err != nil {
		return nil, err
	}

	// Generate and validate upto max attempts
	for attempt := 0; attempt < maxAttempts; attempt++ {

		llmResponse, llmThinking, err := l.llmService.GenerateAnimation(ctx, generatePlanRequest, history, func(chunk string) {
			l.state.Publish(common.AgentState{
				Thinking: chunk,
				State:    common.StateStatusProcessing,
			})
		}, &llm.LLMOptions{Model: aiModel})
		if err != nil {
			l.logger.Info("runPlanning: LLM failed", zap.Error(err))
			return nil, agenterrors.LLMPlanningFailed("failed to generate scene", err)
		}

		result, err = l.toolRegistry.HandleAnimationGeneration(ctx, session, llmResponse, llmThinking, l.assetRegistry)
		if err != nil {
			return nil, agenterrors.LLMPlanningFailed("failed to generate scene", err)
		}

		if result.Status == common.RunStatusWaitingForUserInput {
			return result, nil
		}

		codeResponse := llmResponse.AsGenerateAnimationCodeResponse()

		buildOutput, err := l.codeBuilder.ValidateAndBuild(ctx, code_builder.ValidateAndBuildInput{
			Animation:          codeResponse,
			OutputPath:         services.GenerateCodeStoragePath(l.slideID, l.orgID),
			MediaAssetRegistry: l.assetRegistry,
		})
		if err != nil {
			var buildErr *code_builder.BuildError
			// Handle build errors and retry before saving
			if errors.As(err, &buildErr) {
				l.logger.Info("runPlanning: build failed, retrying",
					zap.Int("attempt", attempt),
					zap.Error(err))

				l.state.Publish(common.AgentState{
					Thinking: "Build failed, retrying...",
					State:    common.StateStatusProcessing,
				})

				appendRetryConversation(history, codeResponse.Code, buildErr.Error())
				continue
			}

			return nil, err
		}

		// Save the code in history, we may avoid saving the thinking summary if the animation is generated
		if llmThinking != nil && *llmThinking != "" {
			session.AddMessage(&pbcore.ConversationMessage{
				Role:    pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
				Message: *llmThinking,
				Type:    pbcore.ConversationMessageType_CONVERSATION_MESSAGE_FINAL_THINKING,
				AiModel: &aiModel,
			})
		}

		err = l.session.Save(ctx, session)
		if err != nil {
			return nil, err
		}

		slide := &pbcore.Slide{
			DurationInFrames: int32(codeResponse.Total_frames),
			SettledFrame:     int32(codeResponse.Total_frames),
			Content: &pbcore.AnimationSlideContent{
				CodeRegistry: buildOutput.CodeRegistry,
			},
		}

		slide.Content.Edits = buildOutput.CodeRegistry.Edits

		return &common.RunResult{
			Status:             common.RunStatusCompleted,
			GeneratedAnimation: slide,
		}, nil

	}

	return nil, agenterrors.AnimationGenerationFailed("unable to generate, all retries exhausted", nil)

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

const maxAttempts = 3

type TemplateGenerationCallback func(TemplateGenerationProgress)

type TemplateGenerationProgress struct {
	Message string
}

func buildFailureMessage(buildErr *code_builder.BuildError) string {
	switch buildErr.ErrorType {
	case "compile_error":
		return "Compile failed with error:\n" + buildErr.Error()
	case "render_error":
		return "GenerateEditsFromProps failed with error:\n" + buildErr.Error()
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

//
//var disallowedEditKeys = []string{
//	"dragX",
//	"dragY",
//	"_duration",
//	"width",
//	"height",
//	"dragStyle",
//}
//
//func StructToFilteredJSONString(
//	s *structpb.Struct,
//	disallowedKeys []string,
//) (string, error) {
//	if s == nil {
//		return "{}", nil
//	}
//
//	disallowed := make(map[string]struct{}, len(disallowedKeys))
//	for _, k := range disallowedKeys {
//		disallowed[k] = struct{}{}
//	}
//
//	data := s.AsMap()
//	removeKeysDeep(data, disallowed)
//
//	b, err := json.Marshal(data)
//	if err != nil {
//		return "", err
//	}
//
//	return string(b), nil
//}
//
//func removeKeysDeep(v any, disallowed map[string]struct{}) {
//	switch t := v.(type) {
//	case map[string]any:
//		for k := range disallowed {
//			delete(t, k)
//		}
//
//		for _, child := range t {
//			removeKeysDeep(child, disallowed)
//		}
//
//	case []any:
//		for _, child := range t {
//			removeKeysDeep(child, disallowed)
//		}
//	}
//}
