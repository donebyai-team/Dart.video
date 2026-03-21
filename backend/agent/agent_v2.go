package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/llm"
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

type agentV2 struct {
	sessionID            string
	orgID                string
	db                   datastore.Repository
	brandIdentityService brand_identity.BrandIdentity
	assetRegistry        *services.MediaAssetRegistry
	retrievalService     RetrievalService
	llmService           llm.LLMService
	videoService         services.VideoGeneration
	animationGenerator   AnimationGenerator
	cache                cache.Cache
	logger               *zap.Logger
	fps                  int64

	stateUpdates chan VideoAgentState
}

func NewAgentV2(
	sessionID string,
	orgID string,
	logger *zap.Logger,
	cache cache.Cache,
	db datastore.Repository,
	mediaStore services.MediaStore,
	codeBuilder services.TemplateCodeBuilder,
	videoService services.VideoGeneration,
	brandIdentityService brand_identity.BrandIdentity,
) VideoAgent {
	llmService := llm.NewLlmService(logger, cache)
	return &agentV1{
		fps:                  defaultFPS,
		sessionID:            sessionID,
		orgID:                orgID,
		logger:               logger,
		cache:                cache,
		db:                   db,
		videoService:         videoService,
		brandIdentityService: brandIdentityService,
		retrievalService:     NewLlmRetrievalService(db, llmService),
		llmService:           llmService,
		stateUpdates:         make(chan VideoAgentState, 64),
		animationGenerator: NewAnimationGenerator(
			sessionID,
			orgID,
			"",
			mediaStore,
			codeBuilder,
			logger,
		),
	}
}

func (a *agentV2) Start(ctx context.Context, options StartSessionOptions) (*RunResult, error) {
	if options.Input == nil {
		return nil, agenterrors.InvalidInput("input is required", nil)
	}

	if a.sessionID == "" {
		return nil, agenterrors.InvalidInput("sessionID is required", nil)
	}

	if a.logger == nil {
		return nil, agenterrors.InvalidInput("logger is not configured", nil)
	}

	if options.Input.Resolution == nil || strings.TrimSpace(options.Input.Resolution.Id) == "" {
		return nil, agenterrors.InvalidInput("resolution is required", nil)
	}

	if err := ValidatePrompt(options.Input.Prompt); err != nil {
		return nil, err
	}

	// Analyse image
	err := a.injectMediaAssets(ctx, options.Input)
	if err != nil {
		return nil, err
	}

	script := make([]types.ScriptItem, 0)
	if options.Input.Script != nil {
		script = make([]types.ScriptItem, len(options.Input.Script.Items))
		for i, item := range options.Input.Script.Items {
			script[i] = types.ScriptItem{
				Name:      item.Name,
				Voiceover: item.Voiceover,
				Reference: item.Reference,
			}
		}
	}

	generatePlanRequest := types.VideoGenerationPlanRequest{
		Duration:       int64(options.Input.Duration),
		Prompt:         options.Input.Prompt,
		Language:       "English",
		Resolution:     options.Input.Resolution.Id,
		Script:         script,
		BrandLibraryID: options.Input.BrandLibraryId,
	}

	if options.Input.StyleType == pbcore.StyleType_STYLE_TYPE_SIMPLE {
		generatePlanRequest.AvailableAnimationTypes = []types.AnimationType{
			types.AnimationTypeSIMPLE_TEXT,
			types.AnimationTypeBRAND,
		}
	}

	// use brand guidelines only when specified
	if a.assetRegistry != nil {
		generatePlanRequest.VideoBranding = types.VideoBranding{
			BrandGuideLines: a.assetRegistry.FormatBrandDetails(),
			Attachments:     a.assetRegistry.FormatAssets(),
		}
	}

	session := &planningSession{
		Request:             generatePlanRequest,
		ConversationHistory: make([]types.Message, 0),
	}

	if err := a.savePlanningSession(ctx, session); err != nil {
		return nil, err
	}

	a.logger.Info("started agent session")
	return a.runPlanning(ctx, session)
}

func (a *agentV2) savePlanningSession(ctx context.Context, session *planningSession) error {
	payload, err := json.Marshal(session)
	if err != nil {
		return agenterrors.SessionUnavailable("failed to encode planning session", err)
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s", sessionKeyPrefix, a.sessionID), string(payload), stateTTL); err != nil {
		return agenterrors.SessionUnavailable("failed to persist planning session", err)
	}
	return nil
}

func (a *agentV2) injectMediaAssets(ctx context.Context, input *pbportal.CreateVideoRequest) error {

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

func (a *agentV2) publishTransientState(state VideoAgentState) {
	state.VideoID = a.sessionID
	a.publishState(state)
}

func (a *agentV2) StateUpdates() <-chan VideoAgentState {
	return a.stateUpdates
}

func (a *agentV2) publishState(state VideoAgentState) {
	select {
	case a.stateUpdates <- state:
	default:
	}
}
func (a *agentV2) runPlanning(ctx context.Context, session *planningSession) (result *RunResult, retErr error) {
	defer func() {
		if retErr == nil {
			return
		}

		if ctx.Err() != nil || errors.Is(retErr, context.Canceled) || errors.Is(retErr, context.DeadlineExceeded) {
			return
		}

		if failErr := a.videoService.UpdateVideoStatus(context.Background(), a.sessionID, models.VideoStatusFAILED); failErr != nil {
			a.logger.Error("failed to mark video as failed/cancelled", zap.Error(failErr))
		}
	}()

	llmResponse, err := a.llmService.GeneratePlanV2(ctx, session.Request, session.ConversationHistory, func(chunk string) {
		a.publishTransientState(VideoAgentState{
			Thinking: chunk,
			State:    stateStatusProcessing,
		})
	})
	if err != nil {
		return nil, agenterrors.LLMPlanningFailed("failed to generate video plan", err)
	}

	handled, result, err := a.handleToolCalls(ctx, session, llmResponse, "")
	if handled {
		return result, err
	}

	plan := llmResponse.AsVideoPlanV2()
	if plan == nil {
		return nil, agenterrors.Internal("llm response did not include a plan", nil)
	}

	// update the conversation
	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
		Content: fmt.Sprintf("Generated plan: %s", plan.VideoName),
	})
	if err = a.savePlanningSession(ctx, session); err != nil {
		return nil, err
	}

	return result, err
}

func (a *agentV2) updateState(ctx context.Context, state VideoAgentState) error {
	state.VideoID = a.sessionID
	a.publishState(state)

	jsonBytes, err := json.Marshal(state)
	if err != nil {
		errUpdated := agenterrors.StateUnavailable("failed to encode state payload", err)
		a.logger.Error("failed to update state", zap.Error(errUpdated))
		return errUpdated
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s", stateKeyPrefix, state.VideoID), string(jsonBytes), stateTTL); err != nil {
		errUpdated := agenterrors.StateUnavailable("failed to persist agent state", err)
		a.logger.Error("failed to update state", zap.Error(errUpdated))
		return errUpdated
	}
	return nil
}
