package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
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
	) (*RunResult, error)
	ContinueAgent(
		ctx context.Context,
		options ContinueSessionOptions,
	) (*RunResult, error)
	ApplyGenerationOptions(options AnimationGenerationOptions)
	StateUpdates() <-chan VideoAgentState
}

type sceneGenerator struct {
	sessionID            string
	slideID              string
	orgID                string
	db                   datastore.Repository
	llmService           llm.LLMService
	cache                cache.Cache
	animationGenerator   CodeGenerator
	generationOptions    AnimationGenerationOptions
	logger               *zap.Logger
	stateUpdates         chan VideoAgentState
	fps                  int64
	brandIdentityService brand_identity.BrandIdentity
	assetRegistry        *services.MediaAssetRegistry
}

func (a *sceneGenerator) StateUpdates() <-chan VideoAgentState {
	return a.stateUpdates
}

func NewAgentAnimationEditor(
	sessionID string,
	slideID string,
	orgID string,
	logger *zap.Logger,
	cache cache.Cache,
	db datastore.Repository,
	mediaStore services.MediaStore,
	codeBuilder services.TemplateCodeBuilder,
) SceneGeneratorAgent {
	llmService := llm.NewLlmService(logger, cache)
	return &sceneGenerator{
		fps:          defaultFPS,
		sessionID:    sessionID,
		orgID:        orgID,
		slideID:      slideID,
		logger:       logger,
		cache:        cache,
		db:           db,
		llmService:   llmService,
		stateUpdates: make(chan VideoAgentState, 64),
		animationGenerator: NewAnimationGenerator(
			sessionID,
			orgID,
			slideID,
			mediaStore,
			codeBuilder,
			logger,
			llmService,
		),
	}
}

func (a *sceneGenerator) ApplyGenerationOptions(options AnimationGenerationOptions) {
	a.generationOptions = options
	a.animationGenerator.ApplyGenerationOptions(options)
}

func (a *sceneGenerator) savePlanningSession(ctx context.Context, session *planningSession) error {
	payload, err := json.Marshal(session)
	if err != nil {
		return agenterrors.SessionUnavailable("failed to encode planning session", err)
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s:%s", generateOrEditAnimationSessionKeyPrefix, a.sessionID, a.slideID), string(payload), stateTTL); err != nil {
		return agenterrors.SessionUnavailable("failed to persist planning session", err)
	}
	return nil
}

func (a *sceneGenerator) getGenerateOrEditAnimationSession(ctx context.Context) (*planningSession, error) {
	value, err := a.cache.GetKey(ctx, fmt.Sprintf("%s:%s:%s", generateOrEditAnimationSessionKeyPrefix, a.sessionID, a.slideID))
	if err != nil {
		return nil, agenterrors.SessionUnavailable("failed to read planning session", err)
	}

	var session planningSession
	if err := json.Unmarshal([]byte(value), &session); err != nil {
		return nil, agenterrors.SessionUnavailable("invalid planning session payload", err)
	}

	// keep only the last 5 messages
	if len(session.ConversationHistory) > 5 {
		session.ConversationHistory = session.ConversationHistory[len(session.ConversationHistory)-5:]
	}

	return &session, nil
}

func (a *sceneGenerator) ContinueAgent(
	ctx context.Context,
	options ContinueSessionOptions,
) (*RunResult, error) {
	userResponse := strings.TrimSpace(options.UserResponse)
	if userResponse == "" {
		return nil, agenterrors.InvalidInput("user response is required", nil)
	}

	session, err := a.getGenerateOrEditAnimationSession(ctx)
	if err != nil {
		return nil, err
	}
	if session == nil {
		return nil, agenterrors.InvalidInput("session is nil", nil)
	}

	generatePlanRequest := types.AddSceneRequest{}

	// If the user has provided more assets or clarification, update the attachments
	if options.SelectedMediaAssets != nil && len(options.SelectedMediaAssets) > 0 {
		session.Request.Assets = append(session.Request.Assets, options.SelectedMediaAssets...)
		userResponse += "\n\noriginal attachment list updated, please check"
	}

	err = a.injectMediaAssets(ctx, session.Request)
	if err != nil {
		return nil, err
	}

	// use brand guidelines only when specified
	if a.assetRegistry != nil {
		generatePlanRequest.VideoBranding = types.VideoBranding{
			BrandGuideLines: a.assetRegistry.FormatBrandDetails(),
			Attachments:     a.assetRegistry.FormatAssets(),
		}
	}

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKuser(),
		Content: userResponse,
	})

	if err := a.savePlanningSession(ctx, session); err != nil {
		return nil, err
	}

	a.publishTransientState(VideoAgentState{
		State:            stateStatusProcessing,
		LastUserResponse: userResponse,
	})

	a.logger.Info("continuing agent session with user response", zap.String("response", userResponse))

	return a.runPlanning(ctx, generatePlanRequest, session, options.SlideToEdit)
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
		registryBuilder.WithBrandIdentity(brandIdentity.BrandIdentity)
	}

	assetIDs := make([]string, 0, len(input.Assets))
	userNoteMap := make(map[string]string)
	for _, asset := range input.Assets {
		assetIDs = append(assetIDs, asset.AssetID)
		if asset.Note != nil {
			userNoteMap[asset.AssetID] = *asset.Note
		}
	}

	if len(assetIDs) > 0 {
		a.publishTransientState(VideoAgentState{
			Thinking: "Analysing images..",
			State:    stateStatusProcessing,
		})
		mediaAssets, err := a.db.GetMediaAssetsByID(ctx, assetIDs)
		if err != nil {
			return err
		}
		// Analyze image
		for _, mediaAsset := range mediaAssets {
			imageAnalysis, err := a.llmService.AnalyzeImage(ctx, mediaAsset)
			if err != nil {
				return err
			}
			mediaAsset.Description = imageAnalysis.Description
			mediaAsset.Tags = strings.Join(imageAnalysis.Tags, ",")
			note, ok := userNoteMap[mediaAsset.ID]
			if ok {
				mediaAsset.UserNote = note
			}
		}

		registryBuilder.AddAssets(mediaAssets)
	}

	a.assetRegistry = registryBuilder.Build()
	return nil
}

func (l *sceneGenerator) GenerateScene(
	ctx context.Context,
	slide *pbcore.Slide,
	input *pbportal.CreateVideoRequest,
) (*RunResult, error) {

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

	session, err := l.getGenerateOrEditAnimationSession(ctx)
	if err != nil && !errors.Is(err, cache.ErrCacheMiss) {
		return nil, err
	}

	if session == nil {
		session = &planningSession{
			Request:             input,
			ConversationHistory: make([]types.Message, 0),
		}
	}

	// Check if its a edit call and add previously scene
	if slide.Content != nil && slide.Content.Edits != nil {
		sceneToEdit, err := scenes.EditsToScene(slide.Content.Edits)
		if err != nil {
			return nil, agenterrors.InvalidInput("invalid scene patch", err)
		}
		marshalScene, err := json.Marshal(sceneToEdit)
		if err != nil {
			return nil, agenterrors.InvalidInput("invalid scene patch", err)
		}

		session.ConversationHistory = append(session.ConversationHistory, types.Message{
			Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
			Content: string(marshalScene),
		})
	}

	// Prompt always goes in the conversation
	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKuser(),
		Content: input.Prompt,
	})

	if err := l.savePlanningSession(ctx, session); err != nil {
		return nil, err
	}

	return l.runPlanning(ctx, generatePlanRequest, session, slide)
}

func (l *sceneGenerator) runPlanning(ctx context.Context, generatePlanRequest types.AddSceneRequest, session *planningSession, slide *pbcore.Slide) (result *RunResult, retErr error) {
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

	optionsBuilder := NewAnimationGenerationOptionsBuilder()
	if l.assetRegistry != nil {
		optionsBuilder.WithAssetRegistry(l.assetRegistry)
	}
	l.animationGenerator.ApplyGenerationOptions(optionsBuilder.Build())

	generatePlanRequest.ComponentList = scenes.BuildScenesList(false, nil)
	// Generate and validate upto max attempts
	for attempt := 0; attempt < maxAttempts; attempt++ {
		llmResponse, err := l.llmService.GenerateScene(ctx, generatePlanRequest, session.ConversationHistory, func(chunk string) {
			l.publishTransientState(VideoAgentState{
				Thinking: chunk,
				State:    stateStatusProcessing,
			})
		})
		if err != nil {
			return nil, agenterrors.LLMPlanningFailed("failed to generate scene", err)
		}

		handled, result, err := l.handleToolCalls(ctx, session, llmResponse, "")
		if handled {
			return result, err
		}

		scene := llmResponse.AsScene()
		if scene == nil {
			return nil, agenterrors.Internal("scene is missing", nil)
		}

		// replace generated asset handles
		if l.assetRegistry != nil {
			for i := range scene.Elements {
				resolved := l.assetRegistry.ResolveMediaHandles(scene.Elements[i].Props)
				scene.Elements[i].Props = resolved
			}
		}

		// Validate scene and add default props
		sceneConfig, err := scenes.ConvertToSceneConfig(scene)
		if err != nil {
			marshalScene, _ := json.Marshal(scene)
			session.ConversationHistory = appendRetryConversation(
				session.ConversationHistory,
				string(marshalScene),
				err.Error(),
			)

			l.logger.Error("received invalid scene, retrying..",
				zap.Int("attempts", attempt),
				zap.String("scene_error", err.Error()))

			continue
		}

		template, err := l.animationGenerator.GenerateCodeFromScene(ctx, sceneConfig, func(progress TemplateGenerationProgress) {
			l.publishTransientState(VideoAgentState{
				Thinking: progress.Message,
				State:    stateStatusProcessing,
			})
		})
		if err != nil {
			return nil, err
		}

		// Merge with user edits
		// There can be orphans object if the scene is replaced
		if slide.Content != nil && slide.Content.Edits != nil {
			edits, err := scenes.ReconcileEditsPatch(slide.Content.Edits, template.GeneratedPatches)
			if err != nil {
				return nil, agenterrors.InvalidInput("failed to merge edits", err)
			}
			template.GeneratedPatches = edits
		}

		return &RunResult{
			Status:             RunStatusCompleted,
			GeneratedAnimation: template,
		}, nil

	}

	return nil, agenterrors.AnimationGenerationFailed("unable to generate, all retries exhausted", nil)

}

func (a *sceneGenerator) publishTransientState(state VideoAgentState) {
	select {
	case a.stateUpdates <- state:
	default:
	}
}
