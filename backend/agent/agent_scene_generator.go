package agent

import (
	"context"
	"encoding/json"
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
	"go.uber.org/zap"
	"strings"
)

const (
	generateOrEditAnimationSessionKeyPrefix = "generateOrEditAnimationSessionKeyPrefix:session"
)

type SceneGeneratorAgent interface {
	GenerateScene(
		ctx context.Context,
		slide *pbcore.Slide,
		input *pbportal.CreateVideoRequest,
	) (*common.RunResult, error)
	ContinueAgent(
		ctx context.Context,
		options ContinueSessionOptions,
	) (*common.RunResult, error)
}

type sceneGenerator struct {
	videoID              string
	slideID              string
	orgID                string
	db                   datastore.Repository
	llmService           llm.LLMService
	codeGenerator        CodeGeneratorAgent
	generationOptions    AnimationGenerationOptions
	logger               *zap.Logger
	fps                  int64
	brandIdentityService brand_identity.BrandIdentity
	assetRegistry        *services.MediaAssetRegistry
	session              common.AgentSession
	state                common.AgentStatusPublisher
	toolRegistry         *common.ToolRegistry
}

func NewSceneGeneratorAgent(
	videoID string,
	slideID string,
	orgID string,
	logger *zap.Logger,
	cache cache.Cache,
	db datastore.Repository,
	llmService llm.LLMService,
	brandIdentityService brand_identity.BrandIdentity,
	state common.AgentStatusPublisher,
) SceneGeneratorAgent {
	sessionID := fmt.Sprintf("%s:%s", videoID, slideID)
	session := common.NewAgentSession(sessionID, generateOrEditAnimationSessionKeyPrefix, cache, db, logger)
	return &sceneGenerator{
		fps:                  defaultFPS,
		videoID:              videoID,
		orgID:                orgID,
		slideID:              slideID,
		logger:               logger,
		db:                   db,
		llmService:           llmService,
		brandIdentityService: brandIdentityService,
		state:                state,
		session:              session,
		codeGenerator:        &codeGenerator{logger: logger},
		toolRegistry:         common.NewToolRegistry(state, session, logger),
	}
}

func (a *sceneGenerator) ContinueAgent(
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

	generatePlanRequest := types.AddSceneRequest{}

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

	session.ConversationHistory = append(session.ConversationHistory, newMessage)

	a.state.Publish(common.AgentState{
		State: common.StateStatusProcessing,
	})

	a.logger.Info("continuing agent session with user response", zap.String("response", userResponse))

	return a.runPlanning(ctx, generatePlanRequest, session)
}

func (a *sceneGenerator) injectMediaAssets(ctx context.Context, input *pbportal.CreateVideoRequest) error {
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

	assetIDs := make([]string, 0, len(input.Assets))
	userNoteMap := make(map[string]string)
	for _, asset := range input.Assets {
		assetIDs = append(assetIDs, asset.AssetID)
		if asset.Note != nil {
			userNoteMap[asset.AssetID] = *asset.Note
		}
	}

	//if len(assetIDs) > 0 {
	//	a.state.Publish(common.AgentState{
	//		Thinking: "Analysing attachments..",
	//		State:    common.StateStatusProcessing,
	//	})
	//	mediaAssets, err := a.db.GetMediaAssetsByID(ctx, assetIDs)
	//	if err != nil {
	//		return err
	//	}
	//	// Analyze image
	//	for _, mediaAsset := range mediaAssets {
	//		imageAnalysis, err := a.llmService.AnalyzeImage(ctx, mediaAsset)
	//		if err != nil {
	//			return err
	//		}
	//		mediaAsset.Description = imageAnalysis.Description
	//		mediaAsset.Tags = strings.Join(imageAnalysis.Tags, ",")
	//		note, ok := userNoteMap[mediaAsset.ID]
	//		if ok {
	//			mediaAsset.UserNote = note
	//		}
	//	}
	//
	//	registryBuilder.AddAssets(mediaAssets)
	//}

	a.assetRegistry = registryBuilder.Build()
	return nil
}

func (l *sceneGenerator) GenerateScene(
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

	generatePlanRequest := types.AddSceneRequest{}

	if l.assetRegistry != nil {
		generatePlanRequest.VideoBranding = types.VideoBranding{
			BrandGuideLines: l.assetRegistry.FormatBrandDetails(),
			Attachments:     l.assetRegistry.FormatAssets(),
		}
	}

	session, err := l.session.Get(ctx)
	if err != nil && !errors.Is(err, cache.ErrCacheMiss) {
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
		sceneToEdit, err := scenes.EditsToScene(slide.Content.Edits, l.assetRegistry)
		if err != nil {
			return nil, agenterrors.InvalidInput("invalid scene patch", err)
		}
		marshalScene, err := json.Marshal(sceneToEdit)
		if err != nil {
			return nil, agenterrors.InvalidInput("invalid scene patch", err)
		}

		session.ConversationHistory = append(session.ConversationHistory, &pbcore.ConversationMessage{
			Role:    pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
			Message: string(marshalScene),
		})
	}

	newMessage := &pbcore.ConversationMessage{
		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_USER,
		Message: input.Prompt,
	}

	for _, asset := range input.Assets {
		newMessage.AssetIds = append(newMessage.AssetIds, asset.AssetID)
	}

	// Prompt always goes in the conversation
	session.ConversationHistory = append(session.ConversationHistory, newMessage)

	return l.runPlanning(ctx, generatePlanRequest, session)
}

func (l *sceneGenerator) runPlanning(ctx context.Context, generatePlanRequest types.AddSceneRequest, session *common.SessionContext) (result *common.RunResult, retErr error) {
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

	generatePlanRequest.ComponentList = scenes.BuildScenesList(scenes.BuildSceneListOptions{
		Groups:       false,
		Enums:        true,
		FieldsToSkip: nil,
	})

	history, err := l.session.ConvertToContextMessages(ctx, session.ConversationHistory, l.assetRegistry)
	if err != nil {
		return nil, err
	}

	// Generate and validate upto max attempts
	for attempt := 0; attempt < maxAttempts; attempt++ {
		llmResponse, err := l.llmService.GenerateScene(ctx, generatePlanRequest, history, func(chunk string) {
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

		scene := llmResponse.AsScene()
		if scene == nil {
			return nil, agenterrors.Internal("scene is missing", nil)
		}

		// save session
		err = l.session.Save(ctx, session)
		if err != nil {
			return nil, err
		}

		// replace generated asset handles
		//if l.assetRegistry != nil {
		//	for i := range scene.Elements {
		//		resolved := l.assetRegistry.ResolveMediaHandles(scene.Elements[i].Props)
		//		scene.Elements[i].Props = resolved
		//	}
		//}

		// Validate scene and add default props
		sceneConfigs, err := scenes.ConvertToSceneConfig(scene, l.assetRegistry)
		if err != nil {
			marshalScene, _ := json.Marshal(scene)
			history = appendRetryConversation(
				history,
				string(marshalScene),
				err.Error(),
			)

			l.logger.Error("received invalid scene, retrying..",
				zap.Int("attempts", attempt),
				zap.String("scene_error", err.Error()))

			continue
		}

		sceneConfig := sceneConfigs[0]

		template, err := l.codeGenerator.GenerateCodeFromScene(ctx, sceneConfig)
		if err != nil {
			return nil, err
		}

		// add background if applicable
		template.BackgroundStyle = sceneConfig.Background

		return &common.RunResult{
			Status:             common.RunStatusCompleted,
			GeneratedAnimation: template,
		}, nil

	}

	return nil, agenterrors.AnimationGenerationFailed("unable to generate, all retries exhausted", nil)

}
