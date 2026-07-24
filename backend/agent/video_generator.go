package agent

import (
	"context"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/common"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/services/templates"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"strings"
	"time"
)

// errUserSoftCancelled is returned by the applyPlan slide loop when a Redis-based
// soft-cancel is detected (written by StopAgent). It is distinct from ctx.Err() so
// the deferred error handler can tell the difference between a context cancel and a
// user-initiated stop that arrived through the Redis state channel.
var errUserSoftCancelled = errors.New("agent stopped via soft-cancel signal")

type VideoAgent interface {
	Start(ctx context.Context, options StartSessionOptions) (*common.RunResult, error)
	Continue(ctx context.Context, options ContinueSessionOptions) (*common.RunResult, error)

	// StopAgent is the single stop entry-point used by HTTP handlers.
	// It writes stateStatusCancelled to Redis (so applyPlan exits) and marks
	// video status as USER_CANCELLED.
	StopAgent(ctx context.Context) error
}

type StartSessionOptions struct {
	OrgID string
	Input *pbportal.CreateVideoRequest
}

type ContinueSessionOptions struct {
	UserResponse        string
	SelectedMediaAssets []*pbcore.SelectedMediaAsset
	Script              *pbcore.Script
}

const (
	sessionKeyPrefix = "video_generation:session"
	defaultFPS       = 30
	defaultLanguage  = "English"
)

type agentV2 struct {
	orgID                string
	db                   datastore.Repository
	brandIdentityService brand_identity.BrandIdentity
	assetRegistry        *services.MediaAssetRegistry
	templateRegistry     *TemplateRegistry
	llmService           llm.Service
	videoService         services.VideoGeneration
	logger               *zap.Logger
	fps                  int64
	session              common.AgentSession
	state                common.AgentStatusPublisher
	codeGenerator        CodeGeneratorAgent
	toolRegistry         *common.ToolRegistry
	templateService      templates.Service
}

func NewAgentV2(
	sessionID string,
	orgID string,
	logger *zap.Logger,
	cache cache.Cache,
	db datastore.Repository,
	llmService llm.Service,
	templateService templates.Service,
	videoService services.VideoGeneration,
	brandIdentityService brand_identity.BrandIdentity,
	state common.AgentStatusPublisher,
) VideoAgent {
	session := common.NewAgentSession(sessionID, sessionKeyPrefix, cache, db, logger)
	return &agentV2{
		fps:                  defaultFPS,
		orgID:                orgID,
		logger:               logger,
		db:                   db,
		videoService:         videoService,
		brandIdentityService: brandIdentityService,
		llmService:           llmService,
		templateService:      templateService,
		state:                state,
		session:              session,
		codeGenerator:        &codeGenerator{logger: logger},
		toolRegistry:         common.NewToolRegistry(state, session, brandIdentityService.GetScrapingClient(), logger),
	}
}

const SCRIPT_CONFORMATION_RESPONSE = "SCRIPT_APPROVED"

func (a *agentV2) Continue(ctx context.Context, options ContinueSessionOptions) (*common.RunResult, error) {
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

	err = a.injectMediaAssets(ctx, session.Request)
	if err != nil {
		return nil, err
	}

	// if script if approved, generate scenes
	if options.Script != nil && userResponse == SCRIPT_CONFORMATION_RESPONSE {
		return a.generateScenes(
			ctx,
			a.buildVideoGenerationPlanRequest(session.Request),
			session.GetConsolidatedThinkingSummary(),
			options.Script)
	}

	// else continue with changes
	generatePlanRequest := a.buildScriptPlannerRequest(session.Request)

	a.appendContinueMessages(session, options.Script, userResponse, options.SelectedMediaAssets)

	if err := a.session.Save(ctx, session); err != nil {
		return nil, err
	}

	a.publishProcessingState("")

	a.logger.Info("continuing agent session with user response", zap.String("response", userResponse))

	return a.runPlanningScript(ctx, generatePlanRequest, session)
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

func (a *agentV2) StopAgent(ctx context.Context) error {
	return a.state.Save(ctx, common.AgentState{
		State: common.StateStatusCancelled,
	})
}

func (a *agentV2) Start(ctx context.Context, options StartSessionOptions) (*common.RunResult, error) {
	if err := a.validateStartOptions(options); err != nil {
		return nil, err
	}

	// Analyse image
	err := a.injectMediaAssets(ctx, options.Input)
	if err != nil {
		return nil, err
	}

	generatePlanRequest := a.buildScriptPlannerRequest(options.Input)

	session := &common.SessionContext{
		Request:             options.Input,
		ConversationHistory: make([]*pbcore.ConversationMessage, 0),
	}

	if err := a.session.Save(ctx, session); err != nil {
		return nil, err
	}

	a.logger.Info("started agent session")
	return a.runPlanningScript(ctx, generatePlanRequest, session)
}

func (a *agentV2) validateStartOptions(options StartSessionOptions) error {
	if options.Input == nil {
		return agenterrors.InvalidInput("input is required", nil)
	}

	if a.session.GetID() == "" {
		return agenterrors.InvalidInput("sessionID is required", nil)
	}

	if a.logger == nil {
		return agenterrors.InvalidInput("logger is not configured", nil)
	}

	if options.Input.Resolution == nil || strings.TrimSpace(options.Input.Resolution.Id) == "" {
		return agenterrors.InvalidInput("resolution is required", nil)
	}

	return ValidatePrompt(options.Input.Prompt)
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
		a.publishProcessingState("Analysing attachments..")
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

			if imageAnalysis != nil {
				mediaAsset.Description = imageAnalysis.Response.Description
				mediaAsset.Tags = strings.Join(imageAnalysis.Response.Tags, ",")
				note, ok := userNoteMap[mediaAsset.ID]
				if ok {
					mediaAsset.UserNote = note
				}
			}
		}

		registryBuilder.AddAssets(mediaAssets)
	}

	a.assetRegistry = registryBuilder.Build()
	return nil
}

const maxPlanningIterations = 5

func (a *agentV2) runPlanningScript(
	ctx context.Context,
	req types.ScriptPlannerRequest,
	session *common.SessionContext,
) (*common.RunResult, error) {
	a.publishProcessingState("Generating script...")

	for iteration := 0; iteration < maxPlanningIterations; iteration++ {
		history, _, err := a.session.ConvertToContextMessages(
			ctx,
			session.ConversationHistory,
			a.assetRegistry,
		)
		if err != nil {
			return nil, err
		}

		llmResponse, err := a.llmService.GenerateScript(
			ctx,
			req,
			history,
			func(chunk string) {
				a.publishProcessingState(chunk)
			},
		)
		if err != nil {
			return nil, agenterrors.LLMPlanningFailed("failed to generate video plan", err)
		}

		if llmResponse == nil {
			return nil, agenterrors.Internal("llm response did not include a plan", nil)
		}

		result, err := a.toolRegistry.HandleScriptPlanner(
			ctx,
			session,
			*llmResponse,
			a.assetRegistry,
		)
		if err != nil {
			return nil, agenterrors.LLMPlanningFailed("failed to handle script planner", err)
		}

		switch result.Status {
		case common.RunStatusWaitingForUserInput:
			return result, nil

		case common.RunStatusContinue:
			// HandleScriptPlanner should have already updated the
			// conversation history in the session. Rebuild history
			// and invoke the LLM again.
			a.publishProcessingState("Collected details, generating script...")
			continue

		default:
			return result, nil
		}
	}

	return nil, agenterrors.LLMPlanningFailed(
		"maximum planning iterations reached",
		nil,
	)
}

func (a *agentV2) generateScenes(
	ctx context.Context,
	req types.VideoGenerationPlanRequest,
	thinkingSofar string,
	script *pbcore.Script) (result *common.RunResult, retErr error) {
	if script == nil {
		return nil, agenterrors.InvalidInput("script is required", nil)
	}

	defer func() {
		if retErr == nil {
			return
		}

		if ctx.Err() != nil || errors.Is(retErr, context.Canceled) || errors.Is(retErr, context.DeadlineExceeded) {
			return
		}

		if failErr := a.videoService.UpdateVideoStatus(context.Background(), a.session.GetID(), models.VideoStatusFAILED); failErr != nil {
			a.logger.Error("failed to mark video as failed/cancelled", zap.Error(failErr))
		}
	}()

	a.publishProcessingState("Preparing storyboard...")
	registry := NewTemplateRegistry(a.templateService, a.assetRegistry, a.codeGenerator, a.logger)
	err := registry.WithRelevantTemplates(ctx, script)
	if err != nil {
		return nil, err
	}

	a.templateRegistry = registry

	// Set the available templates
	req.ComponentList = a.templateRegistry.BuildPrompt()
	// Set the script
	req.Prompt = ToScript(script)

	// Generate and validate upto max attempts
	for attempt := 0; attempt < maxAttempts; attempt++ {
		a.publishProcessingState("Generating scenes...")
		llmResponse, err := a.llmService.GenerateVideoScenes(ctx, req, nil, func(chunk string) {
			a.publishProcessingState(chunk)
		})
		if err != nil {
			return nil, agenterrors.LLMPlanningFailed("failed to generate video plan", err)
		}

		if llmResponse == nil {
			return nil, agenterrors.Internal("llm response did not include a plan", nil)
		}

		// Validate Scenes
		//sceneErrors := make([]string, 0)
		//for _, section := range plan.Sections {
		//	for _, scene := range section.Slides {
		//		_, err := scenes.ConvertToSceneConfig(&scene, nil)
		//		if err != nil {
		//			sceneErrors = append(sceneErrors, err.Error())
		//		}
		//	}
		//}
		//
		//// Retry
		//if len(sceneErrors) > 0 {
		//	marshal, _ := json.Marshal(plan)
		//	session.ConversationHistory = append(session.ConversationHistory, &pbcore.ConversationMessage{
		//		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
		//		Message: string(marshal),
		//	})
		//
		//	session.ConversationHistory = append(session.ConversationHistory, &pbcore.ConversationMessage{
		//		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_USER,
		//		Message: fmt.Sprintf("Here are some of the invalid scenes you generated, please return the full plan again \n %s", strings.Join(sceneErrors, "\n")),
		//	})
		//
		//	a.logger.Error("received invalid scenes, retrying..",
		//		zap.Int("attempts", attempt),
		//		zap.Strings("scene_errors", sceneErrors))
		//
		//	continue
		//}

		// Planning is complete; execute applyPlan asynchronously so Create/Continue
		// can return after the first slide is persisted while generation continues.
		if ctx.Err() != nil {
			return nil, ctx.Err()
		}

		// append the thinking
		summary := fmt.Sprintf("SCRIPT SUMMARY\n%s", thinkingSofar)
		if llmResponse.Summary != nil && *llmResponse.Summary != "" {
			summary += fmt.Sprintf("\n\nSCENE SUMMARY\n%s", *llmResponse.Summary)
		}
		llmResponse.Summary = utils.Ptr(summary)

		return a.runApplyPlanAsync(ctx, llmResponse)
	}

	return nil, agenterrors.LLMPlanningFailed("failed to run planning", nil)
}

func (a *agentV2) buildScriptPlannerRequest(input *pbportal.CreateVideoRequest) types.ScriptPlannerRequest {
	req := types.ScriptPlannerRequest{
		Duration:   int64(input.DurationInSec) * a.fps,
		Prompt:     input.Prompt,
		Language:   defaultLanguage,
		Resolution: input.Resolution.Id,
	}
	req.VideoBranding = a.buildVideoBranding()
	return req
}

func (a *agentV2) buildVideoGenerationPlanRequest(input *pbportal.CreateVideoRequest) types.VideoGenerationPlanRequest {
	return types.VideoGenerationPlanRequest{
		Duration:      int64(input.DurationInSec) * a.fps,
		Language:      defaultLanguage,
		Resolution:    input.Resolution.Id,
		VideoBranding: a.buildVideoBranding(),
	}
}

func (a *agentV2) buildVideoBranding() types.VideoBranding {
	if a.assetRegistry == nil {
		return types.VideoBranding{}
	}

	return types.VideoBranding{
		BrandGuideLines: a.assetRegistry.FormatBrandDetails(),
		Attachments:     a.assetRegistry.FormatAssets(),
	}
}

func (a *agentV2) appendContinueMessages(
	session *common.SessionContext,
	script *pbcore.Script,
	userResponse string,
	selectedAssets []*pbcore.SelectedMediaAsset,
) {
	if script != nil {
		session.AddMessage(&pbcore.ConversationMessage{
			Role:    pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT,
			Message: ToScript(script),
		})
	}

	userMessage := &pbcore.ConversationMessage{
		Role:    pbcore.ConversationRole_CONVERSATION_ROLE_USER,
		Message: userResponse,
	}

	for _, asset := range selectedAssets {
		userMessage.AssetIds = append(userMessage.AssetIds, asset.AssetID)
	}

	session.AddMessage(userMessage)
}

func (a *agentV2) publishProcessingState(thinking string) {
	a.state.Publish(common.AgentState{
		Thinking: thinking,
		State:    common.StateStatusProcessing,
	})
}

func (a *agentV2) runApplyPlanAsync(ctx context.Context, plan *common.LLMResponse[types.GeneratedVideoPlan]) (*common.RunResult, error) {
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
		return &common.RunResult{Status: common.RunStatusCompleted}, nil
	case err := <-applyPlanDone:
		if err != nil {
			return nil, err
		}
		return &common.RunResult{Status: common.RunStatusCompleted}, nil
	case <-ctx.Done():
		// If first slide is not ready yet, treat this as planning cancellation and
		// stop applyPlan. If first slide is already ready, allow applyPlan to continue.
		select {
		case <-firstSlideReady:
			return &common.RunResult{Status: common.RunStatusCompleted}, nil
		default:
			cancelBeforeFirstSlide()
		}
		return nil, ctx.Err()
	}
}

// aiPlan is sanitized to duration in frames
// apply should always work on frames
func (a *agentV2) applyPlan(
	ctx context.Context,
	aiPlan *common.LLMResponse[types.GeneratedVideoPlan],
	firstSlideReady chan<- struct{},
) (err error) {
	builder := NewVideoConfigGenerator(a.logger, a.videoService).
		Init(a.session.GetID(), aiPlan.Response.VideoName)
	_, err = builder.CreatePendingSlidesV2(ctx, a.templateRegistry, aiPlan)
	if err != nil {
		return fmt.Errorf("creating pending slides: %w", err)
	}

	//plan := pendingVideo.Config
	//a.state.Save(ctx, common.AgentState{
	//	Thinking: generating,
	//	State:    common.StateStatusProcessing,
	//})

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

	markReadyOnce()

	//for _, section := range plan.Sections {
	//
	//	for _, slide := range section.Slides {
	//		// ---- Cancellation check (runs before every slide) ----
	//		//
	//		// Hard cancel: runCtx was cancelled (e.g. client disconnected during planning).
	//		if ctx.Err() != nil {
	//			a.logger.Info("applyPlan: context cancelled, stopping slide generation")
	//			return ctx.Err()
	//		}
	//		// Soft cancel: StopAgent wrote stateStatusCancelled to Redis.
	//		// This is the path taken when the client disconnects from the editor
	//		// (GetVideo stream ends) — we do not cancel runCtx in that case so
	//		// we rely on this Redis-based signal instead.
	//		if currentState, stateErr := a.state.Get(ctx); stateErr == nil &&
	//			currentState != nil && currentState.State == common.StateStatusCancelled {
	//			a.logger.Info("applyPlan: soft-cancel signal detected in Redis, stopping slide generation")
	//			return errUserSoftCancelled
	//		}
	//
	//		//if err = builder.UpdateAnimationSlide(ctx, slide.Id, template); err != nil {
	//		//	return agenterrors.VideoPersistFailed("failed to persist animation slide", err)
	//		//}
	//
	//		markReadyOnce()
	//	}
	//}

	return builder.Done(ctx)
}
