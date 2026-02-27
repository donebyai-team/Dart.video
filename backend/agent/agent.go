package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
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
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
)

type VideoAgent interface {
	Start(ctx context.Context, options StartSessionOptions) (*RunResult, error)
	Continue(ctx context.Context, options ContinueSessionOptions) (*RunResult, error)
	GetState(ctx context.Context) (*VideoAgentState, error)
	StateUpdates() <-chan VideoAgentState

	// StopAgent signals the agent to stop for a given video session.
	// It inspects the current Redis state to decide the right stop strategy:
	//   - If slides are already being generated (TotalSlides published or state == READY_FOR_EDITOR),
	//     it writes stateStatusCancelled to Redis; the applyPlan loop detects this and exits cleanly.
	//   - If we are still in the LLM-planning phase (no slides yet), context cancellation
	//     (via the caller's runCtx) is sufficient — nothing extra needs to happen here.
	// This is the single stop entry-point used by all HTTP handlers on client disconnect.
	StopAgent(ctx context.Context, videoID string) error
}

type StartSessionOptions struct {
	OrgID string
	Input *pbportal.CreateVideoRequest
}

type ContinueSessionOptions struct {
	OrgID        string
	UserResponse string
}

type RunStatus string

const (
	RunStatusCompleted           RunStatus = "COMPLETED"
	RunStatusWaitingForUserInput RunStatus = "WAITING_FOR_USER_INPUT"
)

type RunResult struct {
	Status          RunStatus
	AskUserQuestion *types.AskUserQuestion
}

type agentV1 struct {
	sessionID         string
	db                datastore.Repository
	retrievalService  RetrievalService
	llmService        llm.LLMService
	templateExtractor AnimationGenerator
	videoService      services.VideoGeneration
	cache             cache.Cache
	logger            *zap.Logger

	stateUpdates chan VideoAgentState
}

func NewAgentV1(
	sessionID string,
	logger *zap.Logger,
	cache cache.Cache,
	db datastore.Repository,
	videoService services.VideoGeneration,
) *agentV1 {
	llmService := llm.NewLlmService(logger)
	return &agentV1{
		sessionID:         sessionID,
		logger:            logger,
		cache:             cache,
		db:                db,
		videoService:      videoService,
		retrievalService:  NewLlmRetrievalService(db, llmService),
		templateExtractor: animationGenerator{llmService: llmService},
		llmService:        llmService,
		stateUpdates:      make(chan VideoAgentState, 64),
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
		EnableThinking: utils.Ptr(true),
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
	logger := logging.Logger(ctx, a.logger)

	userResponse := strings.TrimSpace(options.UserResponse)
	if userResponse == "" {
		return nil, agenterrors.InvalidInput("user response is required", nil)
	}

	session, err := a.getPlanningSession(ctx)
	if err != nil {
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

	if err := a.updateState(ctx, VideoAgentState{
		State:            stateStatusProcessing,
		LastUserResponse: userResponse,
	}); err != nil {
		logger.Warn("failed to update state after user response", zap.Error(err))
	}

	logger.Info("continuing agent session with user response", zap.String("response", userResponse))

	return a.runPlanning(ctx, session)
}

func (a *agentV1) runPlanning(ctx context.Context, session *planningSession) (*RunResult, error) {
	logger := logging.Logger(ctx, a.logger)
	llmResponse, err := a.llmService.PlanSlidesWithStreaming(ctx, session.Request, session.ConversationHistory, func(chunk string) {
		if err := a.updateState(ctx, VideoAgentState{
			Thinking: chunk,
			State:    stateStatusProcessing,
		}); err != nil {
			logger.Error("failed to update thinking state", zap.Error(err))
		}
	})
	if err != nil {
		status := models.VideoStatusFAILED
		if ctx.Err() != nil {
			status = models.VideoStatusUSERCANCELLED
		}
		failErr := a.videoService.UpdateVideoStatus(context.Background(), a.sessionID, status)
		if failErr != nil {
			a.logger.Error("failed to mark video as failed/cancelled",
				zap.Error(failErr),
			)
		}

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

	err = sanitizeAgentPlan(plan)
	if err != nil {
		return nil, agenterrors.Internal(err.Error(), nil)
	}

	if err := a.applyPlan(ctx, plan); err != nil {
		return nil, err
	}

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
		Content: fmt.Sprintf("Generated plan: %s", plan.VideoName),
	})
	if err := a.savePlanningSession(ctx, session); err != nil {
		return nil, err
	}

	if err := a.updateState(ctx, VideoAgentState{
		Thinking: "",
		State:    stateStatusCompleted,
	}); err != nil {
		logger.Warn("failed to update completed state", zap.Error(err))
	}

	return &RunResult{Status: RunStatusCompleted}, nil
}

func (a *agentV1) applyPlan(
	ctx context.Context,
	aiPlan *types.VideoGenerationPlan,
) (err error) {
	// save config with pending items
	builder := NewVideoConfigGenerator(a.logger, a.videoService).
		Init(a.sessionID, aiPlan.VideoName)
	pendingVideo, err := builder.CreatePendingSlides(ctx, aiPlan)
	if err != nil {
		return fmt.Errorf("creating pending slides: %w", err)
	}

	plan := pendingVideo.Config
	if stateErr := a.updateState(ctx, VideoAgentState{
		Thinking: generating,
		State:    stateStatusProcessing,
	}); stateErr != nil {
		a.logger.Warn("failed to publish total slides count", zap.Error(stateErr))
	}

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
		if stateErr := a.updateState(ctx, VideoAgentState{
			State: stateStatusReady,
		}); stateErr != nil {
			a.logger.Warn("failed to set ready-for-editor state", zap.Error(stateErr))
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
				media := slide.GetMedia().Plan
				if media.BeatDescription != "" {
					media.BeatDescription = "This is the media slide, user will be asked to upload their product screenshot or clip"
				}
				media.SelectedTemplateDescription = utils.Ptr(media.BeatDescription)

				if err = builder.UpdateMediaSlide(ctx, slide); err != nil {
					return agenterrors.VideoPersistFailed("failed to persist media slide", err)
				}

				// ✅ append AFTER success
				planExecutedSoFar.Sections[si].Slides = append(planExecutedSoFar.Sections[si].Slides,
					types.Union2AnimationSlideOrMediaSlide__NewMediaSlide(*media.ToModel()),
				)

				markReadyOnce()
				continue
			}

			// ---------------- ANIMATION SLIDE ----------------
			currentSlide := slide.GetAnimation()

			// Always include TotalSlides so every Redis write preserves the denominator
			// that the UI progress bar relies on.
			if stateErr := a.updateState(ctx, VideoAgentState{
				Thinking: matching,
				State:    stateStatusProcessing,
			}); stateErr != nil {
				a.logger.Debug("failed to set generating thinking state", zap.Error(stateErr))
			}

			selected, err := a.selectTemplate(ctx, currentSlide.Plan.ToModel(), planExecutedSoFar, selectedTemplateIDs)
			if err != nil {
				return err
			}

			// update the selected template description
			// for future slides to know what's being selected so far
			currentSlide.Plan.SelectedTemplateDescription = utils.Ptr(selected.Description)

			if stateErr := a.updateState(ctx, VideoAgentState{
				Thinking: extracting,
				State:    stateStatusProcessing,
			}); stateErr != nil {
				a.logger.Debug("failed to set generating thinking state", zap.Error(stateErr))
			}
			templateConfig, err := a.templateExtractor.ExtractConfig(ctx, currentSlide.Plan.ToModel(), selected)
			if err != nil {
				return agenterrors.TemplateExtractFailed("failed to extract template config", err)
			}

			if err = builder.UpdateAnimationSlide(ctx, slide, selected, templateConfig.Config); err != nil {
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
		filtered, selectErr := a.retrievalService.MatchTemplates(ctx, anim, category.Name, usedTemplateIDs, planExecutedSoFar)
		if selectErr != nil {
			return nil, agenterrors.TemplateSelectFailed("failed to select templates", selectErr)
		}
		if len(filtered) == 0 {
			continue
		}

		selected = filtered[0]
		break
	}

	// No category matched — use the fallback template.
	if selected == nil {
		fallback, err := a.retrievalService.GetFallbackTemplate(ctx)
		if err != nil {
			return nil, agenterrors.NoTemplateFound("no fallback template found", err)
		}
		selected = fallback
	}

	return selected, nil
}

// errUserSoftCancelled is returned by the applyPlan slide loop when a Redis-based
// soft-cancel is detected (written by StopAgent). It is distinct from ctx.Err() so
// the deferred error handler can tell the difference between a context cancel and a
// user-initiated stop that arrived through the Redis state channel.
var errUserSoftCancelled = errors.New("agent stopped via soft-cancel signal")

// StopAgent decides the right stop strategy based on the current Redis state:
//   - applyPlan phase  (TotalSlides > 0 or state == READY_FOR_EDITOR): writes
//     stateStatusCancelled to Redis; the applyPlan slide loop checks for this flag
//     on every iteration and exits cleanly without needing a context cancel.
//   - LLM-planning phase (no slides yet): context cancellation (via the caller's
//     runCtx) is enough — the LLM call respects ctx and will abort on its own.
func (a *agentV1) StopAgent(ctx context.Context, videoID string) error {
	state, err := a.GetState(ctx)
	if err != nil {
		a.logger.Error("StopAgent: failed to read agent state; cannot determine stop strategy",
			zap.Error(err),
		)
		return err
	}
	if state == nil {
		a.logger.Info("StopAgent: no Redis state found — agent is likely not running, nothing to do")
		return nil
	}

	a.logger.Info("StopAgent: current agent state",
		zap.String("state", state.State),
	)

	// If slides are already being generated, use a Redis soft-cancel so the applyPlan
	// loop can finish any in-flight persistence work before stopping.
	if state.State == stateStatusReady || state.State == stateStatusProcessing {
		a.logger.Info("StopAgent: in applyPlan phase — writing soft-cancel to Redis")
		return a.updateState(ctx, VideoAgentState{
			VideoID: videoID,
			State:   stateStatusCancelled,
		})
	}

	// We are still in the LLM-planning phase (TotalSlides not yet published).
	// The caller is responsible for cancelling runCtx which will abort the LLM call.
	a.logger.Info("StopAgent: in LLM-planning phase — context cancellation by caller is sufficient")
	return nil
}

func (a *agentV1) updateState(ctx context.Context, state VideoAgentState) error {
	state.VideoID = a.sessionID
	a.publishState(state)

	jsonBytes, err := json.Marshal(state)
	if err != nil {
		return agenterrors.StateUnavailable("failed to encode state payload", err)
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s", stateKeyPrefix, state.VideoID), string(jsonBytes), stateTTL); err != nil {
		return agenterrors.StateUnavailable("failed to persist agent state", err)
	}
	return nil
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

func toBackgroundStyle(bc types.VideoBackground) *pbcore.BackgroundStyle {
	gradientStops := make([]*pbcore.GradientStop, 0)
	for _, item := range bc.Gradient.Stops {
		gradientStops = append(gradientStops, &pbcore.GradientStop{
			Color:    item.Color,
			Position: int32(item.Position),
		})
	}

	return &pbcore.BackgroundStyle{
		Style: &pbcore.BackgroundStyle_Gradient{
			Gradient: &pbcore.Gradient{
				Type:  pbcore.GradientType_GRADIENT_TYPE_LINEAR,
				Angle: int32(bc.Gradient.Angle),
				Stops: gradientStops,
			},
		},
		ApplyAll: true,
	}
}
