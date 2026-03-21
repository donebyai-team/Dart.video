package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/services/brand_identity"
	"strings"
	"time"

	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

type VideoAgent interface {
	Start(ctx context.Context, options StartSessionOptions) (*RunResult, error)
	Continue(ctx context.Context, options ContinueSessionOptions) (*RunResult, error)
	GetState(ctx context.Context) (*VideoAgentState, error)
	StateUpdates() <-chan VideoAgentState

	// StopAgent is the single stop entry-point used by HTTP handlers.
	// It writes stateStatusCancelled to Redis (so applyPlan exits) and marks
	// video status as USER_CANCELLED.
	StopAgent(ctx context.Context, videoID string) error
}

type StartSessionOptions struct {
	OrgID string
	Input *pbportal.CreateVideoRequest
}

type ContinueSessionOptions struct {
	UserResponse string
}

type RunStatus string

const (
	RunStatusCompleted           RunStatus = "COMPLETED"
	RunStatusWaitingForUserInput RunStatus = "WAITING_FOR_USER_INPUT"
	defaultFPS                             = 30
)

type RunResult struct {
	Status          RunStatus
	AskUserQuestion *types.AskUserQuestion
}

type agentV1 struct {
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

func NewAgentV1(
	sessionID string,
	orgID string,
	logger *zap.Logger,
	cache cache.Cache,
	db datastore.Repository,
	mediaStore services.MediaStore,
	codeBuilder services.TemplateCodeBuilder,
	videoService services.VideoGeneration,
	brandIdentityService brand_identity.BrandIdentity,
) *agentV1 {
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

const (
	stateKeyPrefix        = "video_generation:state"
	sessionKeyPrefix      = "video_generation:session"
	stateStatusProcessing = "PROCESSING"
	stateStatusWaiting    = "WAITING_FOR_USER_INPUT"
	stateStatusReady      = "READY_FOR_EDITOR"
	stateStatusCancelled  = "USER_CANCELLED"
	stateStatusCompleted  = "COMPLETED"
	stateTTL              = 30 * time.Minute

	// thinking tests
	generating = "Generating..."
	matching   = "Matching..."
	extracting = "Extracting..."
)

const StateReadyForEditor = stateStatusReady

type VideoAgentState struct {
	VideoID          string                 `json:"video_id"`
	Thinking         string                 `json:"thinking"`
	State            string                 `json:"state"`
	AskUserQuestion  *types.AskUserQuestion `json:"ask_user_question,omitempty"`
	LastUserResponse string                 `json:"last_user_response,omitempty"`
}

type planningSession struct {
	Request             types.VideoGenerationPlanRequest `json:"request"`
	ConversationHistory []types.Message                  `json:"conversation_history"`
}

func (a *agentV1) Start(ctx context.Context, options StartSessionOptions) (*RunResult, error) {
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

func (a *agentV1) Continue(ctx context.Context, options ContinueSessionOptions) (*RunResult, error) {
	userResponse := strings.TrimSpace(options.UserResponse)
	if userResponse == "" {
		return nil, agenterrors.InvalidInput("user response is required", nil)
	}

	session, err := a.getPlanningSession(ctx)
	if err != nil {
		return nil, err
	}

	if err = a.injectMediaAssets(ctx, &pbportal.CreateVideoRequest{BrandLibraryId: session.Request.BrandLibraryID}); err != nil {
		return nil, err
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

	return a.runPlanning(ctx, session)
}

func (a *agentV1) injectMediaAssets(ctx context.Context, input *pbportal.CreateVideoRequest) error {
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

	a.assetRegistry = registryBuilder.Build()
	return nil
}

func (a *agentV1) runPlanning(ctx context.Context, session *planningSession) (result *RunResult, retErr error) {
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

	llmResponse, err := a.llmService.PlanSlidesWithStreaming(ctx, session.Request, session.ConversationHistory, func(chunk string) {
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

	plan := llmResponse.AsVideoGenerationPlan()
	if plan == nil {
		return nil, agenterrors.Internal("llm response did not include a plan", nil)
	}

	err = sanitizeAgentPlanAndDuration(plan, a.fps)
	if err != nil {
		return nil, agenterrors.Internal(err.Error(), nil)
	}

	// update the conversation
	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
		Content: fmt.Sprintf("Generated plan: %s", plan.VideoName),
	})
	if err = a.savePlanningSession(ctx, session); err != nil {
		return nil, err
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

// aiPlan is sanitized to duration in frames
// apply should always work on frames
func (a *agentV1) applyPlan(
	ctx context.Context,
	aiPlan *types.VideoGenerationPlan,
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
	pendingVideo, err := builder.CreatePendingSlides(ctx, a.assetRegistry, aiPlan)
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

	selectedTemplateIDs := make([]string, 0)
	planExecutedSoFar := &types.VideoGenerationPlan{
		Sections: make([]types.Section, 0, len(plan.Sections)),
	}

	for si, section := range plan.Sections {
		// mirror section in planExecutedSoFar
		planExecutedSoFar.Sections = append(planExecutedSoFar.Sections, types.Section{
			Name:   section.Title,
			Slides: make([]types.Union2AnimationSlideOrMediaSlide, 0, len(section.Slides)),
		})

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

			// ---------------- MEDIA SLIDE ----------------
			if slide.Type == pbcore.SlideType_SLIDE_TYPE_MEDIA {
				media := slide.GetMedia()
				if err = builder.UpdateMediaSlide(ctx, slide.Id); err != nil {
					return agenterrors.VideoPersistFailed("failed to persist media slide", err)
				}

				// ✅ append AFTER success
				planExecutedSoFar.Sections[si].Slides = append(planExecutedSoFar.Sections[si].Slides,
					types.Union2AnimationSlideOrMediaSlide__NewMediaSlide(*media.Plan.ToModel()),
				)

				markReadyOnce()
				continue
			}

			// ---------------- ANIMATION SLIDE ----------------
			currentSlide := slide.GetAnimation()

			// Always include TotalSlides so every Redis write preserves the denominator
			// that the UI progress bar relies on.
			a.updateState(ctx, VideoAgentState{
				Thinking: matching,
				State:    stateStatusProcessing,
			})
			selected, err := a.selectTemplate(ctx, currentSlide.Plan.ToModel(), planExecutedSoFar, selectedTemplateIDs)
			if err != nil {
				return err
			}

			if err = builder.UpdateAnimationSlide(ctx, slide.Id, selected); err != nil {
				return agenterrors.VideoPersistFailed("failed to persist animation slide", err)
			}

			selectedTemplateIDs = append(selectedTemplateIDs, selected.ID)

			// ✅ append AFTER success
			planExecutedSoFar.Sections[si].Slides = append(
				planExecutedSoFar.Sections[si].Slides,
				types.Union2AnimationSlideOrMediaSlide__NewAnimationSlide(*currentSlide.Plan.ToModel()),
			)
			markReadyOnce()
		}
	}

	return builder.Done(ctx)
}

// selectTemplate picks the best template for an animation slide by matching
// categories and running LLM selection. Falls back to the default template when
// no category match is found.
// totalSlides is forwarded to every updateState call so the Redis state always
// carries the denominator needed by the UI progress bar.
func (a *agentV1) selectTemplate(
	ctx context.Context,
	anim *types.AnimationSlide,
	planExecutedSoFar *types.VideoGenerationPlan,
	usedTemplateIDs []string,
) (*models.Template, error) {
	categories, err := a.retrievalService.MatchCategories(ctx, anim.AnimationType, anim.CategorySearchQuery)
	if err != nil {
		return nil, agenterrors.RetrievalFailed("failed to match categories", err)
	}

	var selected *models.Template
	for _, category := range categories {
		// semantically match if we have a template available in our library
		filtered, selectErr := a.retrievalService.MatchTemplates(ctx,
			anim.AnimationType,
			anim.BeatDescription,
			category.Name,
			MatchTemplatesOptions{
				plan:    planExecutedSoFar,
				usedIds: usedTemplateIDs,
			})
		if selectErr != nil {
			return nil, agenterrors.TemplateSelectFailed("failed to select templates", selectErr)
		}
		if len(filtered) == 0 {
			continue
		}

		selected = filtered[0]

		a.logger.Info("found a matching template",
			zap.String("category_name", category.Name),
			zap.String("template_name", selected.Name),
			zap.String("template_nid", selected.ID),
		)

		// update duration to frames as templates are always in seconds.
		selected.Config.ConvertDurationToFrames(a.fps)

		// Extract config
		a.updateState(ctx, VideoAgentState{
			Thinking: extracting,
			State:    stateStatusProcessing,
		})
		templateConfig, err := a.animationGenerator.ExtractConfig(ctx, anim.BeatDescription, selected)
		if err != nil {
			return nil, agenterrors.TemplateExtractFailed("failed to extract template config", err)
		}
		selected.GeneratedPatches = json.RawMessage(templateConfig.Config)
		break
	}

	// No category matched — use the fallback template or generate a new animation.
	if selected == nil {
		template, err := a.animationGenerator.Generate(ctx, anim, planExecutedSoFar, func(progress TemplateGenerationProgress) {
			a.updateState(ctx, VideoAgentState{
				Thinking: progress.Message,
				State:    stateStatusProcessing,
			})
		})
		if err != nil {
			return nil, err
		}

		return template, nil
	}

	return selected, nil
}

// errUserSoftCancelled is returned by the applyPlan slide loop when a Redis-based
// soft-cancel is detected (written by StopAgent). It is distinct from ctx.Err() so
// the deferred error handler can tell the difference between a context cancel and a
// user-initiated stop that arrived through the Redis state channel.
var errUserSoftCancelled = errors.New("agent stopped via soft-cancel signal")

// StopAgent writes a Redis soft-cancel signal consumed by applyPlan and marks
// the video as USER_CANCELLED.
func (a *agentV1) StopAgent(ctx context.Context, videoID string) error {
	if err := a.updateState(ctx, VideoAgentState{
		VideoID: videoID,
		State:   stateStatusCancelled,
	}); err != nil {
		return err
	}

	if err := a.videoService.UpdateVideoStatus(ctx, videoID, models.VideoStatusUSERCANCELLED); err != nil {
		return err
	}

	return nil
}

func (a *agentV1) updateState(ctx context.Context, state VideoAgentState) error {
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

func (a *agentV1) publishTransientState(state VideoAgentState) {
	state.VideoID = a.sessionID
	a.publishState(state)
}

func (a *agentV1) StateUpdates() <-chan VideoAgentState {
	return a.stateUpdates
}

func (a *agentV1) publishState(state VideoAgentState) {
	select {
	case a.stateUpdates <- state:
	default:
	}
}

func (a *agentV1) getPlanningSession(ctx context.Context) (*planningSession, error) {
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

func (a *agentV1) savePlanningSession(ctx context.Context, session *planningSession) error {
	payload, err := json.Marshal(session)
	if err != nil {
		return agenterrors.SessionUnavailable("failed to encode planning session", err)
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s", sessionKeyPrefix, a.sessionID), string(payload), stateTTL); err != nil {
		return agenterrors.SessionUnavailable("failed to persist planning session", err)
	}
	return nil
}

func (a *agentV1) GetState(ctx context.Context) (*VideoAgentState, error) {
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

//func toBackgroundStyle(bc types.VideoBackground) *pbcore.BackgroundStyle {
//	gradientStops := make([]*pbcore.GradientStop, 0)
//	for _, item := range bc.Gradient.Stops {
//		gradientStops = append(gradientStops, &pbcore.GradientStop{
//			Color:    item.Color,
//			Position: int32(item.Position),
//		})
//	}
//
//	return &pbcore.BackgroundStyle{
//		Style: &pbcore.BackgroundStyle_Gradient{
//			Gradient: &pbcore.Gradient{
//				Type:  pbcore.GradientType_GRADIENT_TYPE_LINEAR,
//				Angle: int32(bc.Gradient.Angle),
//				Stops: gradientStops,
//			},
//		},
//		ApplyAll: true,
//	}
//}
