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
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"strings"
	"time"
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
	animationGenerator   CodeGenerator
	cache                cache.Cache
	logger               *zap.Logger
	fps                  int64

	stateUpdates chan VideoAgentState
}

func (a *agentV2) getPlanningSession(ctx context.Context) (*planningSession, error) {
	value, err := a.cache.GetKey(ctx, fmt.Sprintf("%s:%s", sessionKeyPrefix, a.sessionID))
	if err != nil {
		return nil, agenterrors.SessionUnavailable("failed to read planning session", err)
	}

	var session planningSession
	if err := json.Unmarshal([]byte(value), &session); err != nil {
		return nil, agenterrors.SessionUnavailable("invalid planning session payload", err)
	}
	return &session, nil
}

func (a *agentV2) setTags(ctx context.Context) context.Context {
	return context.WithValue(ctx, "session_id", a.sessionID)
}

func (a *agentV2) Continue(ctx context.Context, options ContinueSessionOptions) (*RunResult, error) {
	ctx = a.setTags(ctx)
	userResponse := strings.TrimSpace(options.UserResponse)
	if userResponse == "" {
		return nil, agenterrors.InvalidInput("user response is required", nil)
	}

	session, err := a.getPlanningSession(ctx)
	if err != nil {
		return nil, err
	}

	if session == nil {
		return nil, agenterrors.InvalidInput("session is nil", nil)
	}

	generatePlanRequest := types.VideoGenerationPlanRequest{
		Duration:   int64(session.Request.DurationInSec) * a.fps,
		Prompt:     session.Request.Prompt,
		Language:   "English",
		Resolution: session.Request.Resolution.Id,
	}

	// If the user has provided more assets or clarification, update the attachments
	if options.SelectedMediaAssets != nil && len(options.SelectedMediaAssets) > 0 {
		session.Request.Assets = append(session.Request.Assets, options.SelectedMediaAssets...)
		userResponse += "\n\n" + assetUpdatedMessage
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
		Tool_call_id: utils.Ptr(fmt.Sprintf("call_%d", time.Now().Unix())),
		Role:         types.Union3KassistantOrKtoolOrKuser__NewKtool(),
		Content:      userResponse,
	})

	if err := a.savePlanningSession(ctx, session); err != nil {
		return nil, err
	}

	a.publishTransientState(VideoAgentState{
		State:            stateStatusProcessing,
		LastUserResponse: userResponse,
	})

	a.logger.Info("continuing agent session with user response", zap.String("response", userResponse))

	return a.runPlanning(ctx, generatePlanRequest, session)
}

func deduplicateAssets(
	assets []*pbcore.SelectedMediaAsset,
) []*pbcore.SelectedMediaAsset {

	index := make(map[string]int)
	deduped := make([]*pbcore.SelectedMediaAsset, 0, len(assets))

	// First deduplicate existing assets
	for _, a := range assets {
		if a.AssetID == "" {
			continue
		}

		if i, ok := index[a.AssetID]; ok {
			// keep the latest if it has a note
			if a.Note != nil {
				deduped[i] = a
			}
		} else {
			index[a.AssetID] = len(deduped)
			deduped = append(deduped, a)
		}
	}

	return deduped
}

func (a *agentV2) GetState(ctx context.Context) (*VideoAgentState, error) {
	value, err := a.cache.GetKey(ctx, fmt.Sprintf("%s:%s", stateKeyPrefix, a.sessionID))
	if err != nil {
		if errors.Is(err, cache.ErrCacheMiss) {
			return nil, nil
		}
		return nil, agenterrors.StateUnavailable("failed to read agent state", err)
	}

	var state VideoAgentState
	if err := json.Unmarshal([]byte(value), &state); err != nil {
		return nil, agenterrors.StateUnavailable("invalid agent state payload", err)
	}
	return &state, nil
}

func (a *agentV2) StopAgent(ctx context.Context, videoID string) error {
	return nil
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
	return &agentV2{
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
			llmService,
		),
	}
}

func (a *agentV2) Start(ctx context.Context, options StartSessionOptions) (*RunResult, error) {
	ctx = a.setTags(ctx)
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
		Duration:   int64(options.Input.DurationInSec) * a.fps,
		Prompt:     options.Input.Prompt,
		Language:   "English",
		Resolution: options.Input.Resolution.Id,
		Script:     script,
	}

	// use brand guidelines only when specified
	if a.assetRegistry != nil {
		generatePlanRequest.VideoBranding = types.VideoBranding{
			BrandGuideLines: a.assetRegistry.FormatBrandDetails(),
			Attachments:     a.assetRegistry.FormatAssets(),
		}
	}

	session := &planningSession{
		Request:             options.Input,
		ConversationHistory: make([]types.Message, 0),
	}

	if err := a.savePlanningSession(ctx, session); err != nil {
		return nil, err
	}

	a.logger.Info("started agent session")
	return a.runPlanning(ctx, generatePlanRequest, session)
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
			Thinking: "Analysing attachments..",
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
func (a *agentV2) runPlanning(ctx context.Context, req types.VideoGenerationPlanRequest, session *planningSession) (result *RunResult, retErr error) {
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

	req.ComponentList = scenes.BuildScenesList(false)

	// Generate and validate upto max attempts
	for attempt := 0; attempt < maxAttempts; attempt++ {
		llmResponse, err := a.llmService.GeneratePlanV2(ctx, req, session.ConversationHistory, func(chunk string) {
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

		plan := llmResponse.AsGeneratedVideoPlan()
		if plan == nil {
			return nil, agenterrors.Internal("llm response did not include a plan", nil)
		}

		// Validate Scenes
		sceneErrors := make([]string, 0)
		for _, section := range plan.Sections {
			for _, scene := range section.Slides {
				_, err := scenes.ConvertToSceneConfig(&scene, nil)
				if err != nil {
					sceneErrors = append(sceneErrors, err.Error())
				}

				// replace generated asset handles
				//if a.assetRegistry != nil {
				//	for i := range scene.Elements {
				//		resolved := a.assetRegistry.ResolveMediaHandles(scene.Elements[i].Props)
				//		scene.Elements[i].Props = resolved
				//	}
				//}
			}
		}

		// Retry
		if len(sceneErrors) > 0 {
			marshal, _ := json.Marshal(plan)
			session.ConversationHistory = append(session.ConversationHistory, types.Message{
				Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
				Content: string(marshal),
			})

			session.ConversationHistory = append(session.ConversationHistory, types.Message{
				Role:    types.Union3KassistantOrKtoolOrKuser__NewKuser(),
				Content: fmt.Sprintf("Here are some of the invalid scenes you generated, please return the full plan again \n %s", strings.Join(sceneErrors, "\n")),
			})

			a.logger.Error("received invalid scenes, retrying..",
				zap.Int("attempts", attempt),
				zap.Strings("scene_errors", sceneErrors))

			continue
		}

		// Planning is complete; execute applyPlan asynchronously so Create/Continue
		// can return after the first slide is persisted while generation continues.
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}

		// We wait for the first slide to be generated as its a part of the planning phase
		// once first slide is generated, we let the applyPlan run async which can be cancelled via StopAgent
		firstSlideReady := make(chan struct{}, 1)
		applyPlanDone := make(chan error, 1)
		applyPlanCtx, cancelBeforeFirstSlide := context.WithCancel(context.Background())

		go func() {
			defer cancelBeforeFirstSlide()
			if err := a.applyPlan(applyPlanCtx, plan, firstSlideReady); err != nil {
				a.logger.Error("applyPlan async run failed", zap.Error(err))
				applyPlanDone <- err
				return
			}
			applyPlanDone <- nil
		}()

		select {
		case <-firstSlideReady:
			return &RunResult{Status: RunStatusCompleted}, nil
		case err := <-applyPlanDone:
			if err != nil {
				return nil, err
			}
			return &RunResult{Status: RunStatusCompleted}, nil
		case <-ctx.Done():
			// If first slide is not ready yet, treat this as planning cancellation and
			// stop applyPlan. If first slide is already ready, allow applyPlan to continue.
			select {
			case <-firstSlideReady:
				return &RunResult{Status: RunStatusCompleted}, nil
			default:
				cancelBeforeFirstSlide()
			}
			return nil, ctx.Err()
		}
	}

	return nil, agenterrors.LLMPlanningFailed("failed to run planning", nil)
}

// aiPlan is sanitized to duration in frames
// apply should always work on frames
func (a *agentV2) applyPlan(
	ctx context.Context,
	aiPlan *types.GeneratedVideoPlan,
	firstSlideReady chan<- struct{},
) (err error) {

	// inject dependencies for generator
	optionsBuilder := NewAnimationGenerationOptionsBuilder()
	if a.assetRegistry != nil {
		optionsBuilder.WithAssetRegistry(a.assetRegistry)
	}
	a.animationGenerator.ApplyGenerationOptions(optionsBuilder.Build())

	// save config with pending items
	builder := NewVideoConfigGenerator(a.logger, a.videoService).
		Init(a.sessionID, aiPlan.VideoName)
	pendingVideo, sceneMapper, err := builder.CreatePendingSlidesV2(ctx, a.assetRegistry, aiPlan)
	if err != nil {
		return fmt.Errorf("creating pending slides: %w", err)
	}

	plan := pendingVideo.Config
	a.updateState(ctx, VideoAgentState{
		Thinking: generating,
		State:    stateStatusProcessing,
	})

	defer func() {
		if err != nil {
			failStatus := models.VideoStatusFAILED
			failCtx := ctx

			// Treat both a hard context cancel (runCtx cancelled by the handler) and a
			// soft Redis cancel (written by StopAgent) as user-initiated cancellations.
			isUserCancel := ctx.Err() != nil || errors.Is(err, errUserSoftCancelled)
			if isUserCancel {
				failStatus = models.VideoStatusUSERCANCELLED
				// The original ctx may already be done; use a fresh one for the DB write.
				var cancelFn context.CancelFunc
				failCtx, cancelFn = context.WithTimeout(context.Background(), 5*time.Second)
				defer cancelFn()
			}

			a.logger.Info("applyPlan: marking video terminal",
				zap.String("fail_status", string(failStatus)),
				zap.Bool("user_cancel", isUserCancel),
				zap.Error(err),
			)

			if failErr := builder.Fail(failCtx, err, failStatus); failErr != nil {
				a.logger.Error("failed to mark video as failed/cancelled",
					zap.Error(failErr),
				)
			}
		}
	}()

	firstSlidePersisted := false
	// markReadyOnce transitions the state to READY_FOR_EDITOR on the first persisted slide.
	// totalSlides is carried forward so the UI progress bar keeps its denominator.
	markReadyOnce := func() {
		if firstSlidePersisted {
			return
		}
		firstSlidePersisted = true
		if firstSlideReady != nil {
			select {
			case firstSlideReady <- struct{}{}:
			default:
			}
		}
	}

	for _, section := range plan.Sections {

		for _, slide := range section.Slides {
			// ---- Cancellation check (runs before every slide) ----
			//
			// Hard cancel: runCtx was cancelled (e.g. client disconnected during planning).
			if ctx.Err() != nil {
				a.logger.Info("applyPlan: context cancelled, stopping slide generation")
				return ctx.Err()
			}
			// Soft cancel: StopAgent wrote stateStatusCancelled to Redis.
			// This is the path taken when the client disconnects from the editor
			// (GetVideo stream ends) — we do not cancel runCtx in that case so
			// we rely on this Redis-based signal instead.
			if currentState, stateErr := a.GetState(ctx); stateErr == nil &&
				currentState != nil && currentState.State == stateStatusCancelled {
				a.logger.Info("applyPlan: soft-cancel signal detected in Redis, stopping slide generation")
				return errUserSoftCancelled
			}

			scene := sceneMapper[slide.Id]

			//Convert to config
			sceneConfig, err := scenes.ConvertToSceneConfig(scene, a.assetRegistry)
			if err != nil {
				return fmt.Errorf("converting scene to config: %w", err)
			}

			template, err := a.animationGenerator.GenerateCodeFromScene(ctx, sceneConfig, func(progress TemplateGenerationProgress) {
				a.updateState(ctx, VideoAgentState{
					Thinking: progress.Message,
					State:    stateStatusProcessing,
				})
			})
			if err != nil {
				return err
			}

			if err = builder.UpdateAnimationSlide(ctx, slide.Id, template); err != nil {
				return agenterrors.VideoPersistFailed("failed to persist animation slide", err)
			}

			markReadyOnce()
		}
	}

	return builder.Done(ctx)
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
