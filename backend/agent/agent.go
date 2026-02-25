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
	GetState(ctx context.Context, sessionID string) (*VideoAgentState, error)
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
	SessionID string
	OrgID     string
	Input     *pbportal.CreateVideoRequest
}

type ContinueSessionOptions struct {
	SessionID    string
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
	db                datastore.Repository
	retrievalService  RetrievalService
	llmService        llm.LLMService
	templateExtractor TemplateExtractor
	videoService      services.VideoGeneration
	cache             cache.Cache
	logger            *zap.Logger

	stateUpdates chan VideoAgentState
}

func NewAgentV1(
	logger *zap.Logger,
	cache cache.Cache,
	db datastore.Repository,
	videoService services.VideoGeneration,
	retrievalService RetrievalService) *agentV1 {
	llmService := llm.NewLlmService(logger)
	return &agentV1{
		logger:            logger,
		cache:             cache,
		db:                db,
		videoService:      videoService,
		retrievalService:  retrievalService,
		templateExtractor: llmTemplateExtractor{llmService: llmService},
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
)

const StateReadyForEditor = stateStatusReady

type VideoAgentState struct {
	VideoID          string                 `json:"video_id"`
	Thinking         string                 `json:"thinking"`
	State            string                 `json:"state"`
	TotalSlides      int                    `json:"total_slides,omitempty"`
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
	if options.Input.Resolution == nil || strings.TrimSpace(options.Input.Resolution.Id) == "" {
		return nil, agenterrors.InvalidInput("resolution is required", nil)
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

	if err := a.savePlanningSession(ctx, options.SessionID, session); err != nil {
		return nil, err
	}

	a.logger.Info("started agent session", zap.String("session_id", options.SessionID))
	return a.runPlanning(ctx, options.SessionID, session)
}

func (a *agentV1) Continue(ctx context.Context, options ContinueSessionOptions) (*RunResult, error) {
	logger := logging.Logger(ctx, a.logger)

	userResponse := strings.TrimSpace(options.UserResponse)
	if userResponse == "" {
		return nil, agenterrors.InvalidInput("user response is required", nil)
	}

	session, err := a.getPlanningSession(ctx, options.SessionID)
	if err != nil {
		return nil, err
	}

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Tool_call_id: utils.Ptr(fmt.Sprintf("call_%d", time.Now().Unix())),
		Role:         types.Union3KassistantOrKtoolOrKuser__NewKtool(),
		Content:      userResponse,
	})

	if err := a.savePlanningSession(ctx, options.SessionID, session); err != nil {
		return nil, err
	}

	if err := a.updateState(ctx, VideoAgentState{
		VideoID:          options.SessionID,
		State:            stateStatusProcessing,
		LastUserResponse: userResponse,
	}); err != nil {
		logger.Warn("failed to update state after user response", zap.Error(err))
	}

	logger.Info("continuing agent session with user response", zap.String("response", userResponse))

	return a.runPlanning(ctx, options.SessionID, session)
}

func (a *agentV1) runPlanning(ctx context.Context, sessionID string, session *planningSession) (*RunResult, error) {
	logger := logging.Logger(ctx, a.logger)
	llmResponse, err := a.llmService.PlanSlidesWithStreaming(ctx, session.Request, session.ConversationHistory, func(chunk string) {
		if err := a.updateState(ctx, VideoAgentState{
			VideoID:  sessionID,
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
		failErr := a.videoService.UpdateVideoStatus(context.Background(), sessionID, status)
		if failErr != nil {
			a.logger.Error("failed to mark video as failed/cancelled",
				zap.Error(failErr),
			)
		}

		return nil, agenterrors.LLMPlanningFailed("failed to generate video plan", err)
	}

	handled, result, err := a.handleToolCalls(ctx, sessionID, session, llmResponse, "")
	if handled {
		return result, err
	}

	plan := llmResponse.AsVideoGenerationPlan()
	if plan == nil {
		return nil, agenterrors.Internal("llm response did not include a plan", nil)
	}

	if err := a.applyPlan(ctx, sessionID, plan); err != nil {
		return nil, err
	}

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Role:    types.Union3KassistantOrKtoolOrKuser__NewKassistant(),
		Content: fmt.Sprintf("Generated plan: %s", plan.VideoName),
	})
	if err := a.savePlanningSession(ctx, sessionID, session); err != nil {
		return nil, err
	}

	if err := a.updateState(ctx, VideoAgentState{
		VideoID:  sessionID,
		Thinking: "",
		State:    stateStatusCompleted,
	}); err != nil {
		logger.Warn("failed to update completed state", zap.Error(err))
	}

	return &RunResult{Status: RunStatusCompleted}, nil
}

func (a *agentV1) applyPlan(
	ctx context.Context,
	sessionID string,
	plan *types.VideoGenerationPlan,
) (err error) {
	builder := NewVideoConfigGenerator(a.logger, a.videoService).
		Init(sessionID, plan.VideoName)
	builder.AddVideoBackground(toBackgroundStyle(plan.BackgroundStyle))

	// Compute total slides upfront so the UI can show progress.
	totalSlides := 0
	for _, section := range plan.Sections {
		totalSlides += len(section.Slides)
	}
	if stateErr := a.updateState(ctx, VideoAgentState{
		VideoID:     sessionID,
		State:       stateStatusProcessing,
		TotalSlides: totalSlides,
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
			VideoID:     sessionID,
			State:       stateStatusReady,
			TotalSlides: totalSlides, // preserve so GetVideo keeps streaming the count
		}); stateErr != nil {
			a.logger.Warn("failed to set ready-for-editor state", zap.Error(stateErr))
		}
	}

	selectedTemplateIDs := make([]string, 0)

	for _, section := range plan.Sections {
		sectionID := builder.AddSection(section.Name)

		for _, slide := range section.Slides {
			// ---- Cancellation check (runs before every slide) ----
			//
			// Hard cancel: runCtx was cancelled (e.g. client disconnected during planning).
			if ctx.Err() != nil {
				a.logger.Info("applyPlan: context cancelled, stopping slide generation",
					zap.String("video_id", sessionID),
				)
				return ctx.Err()
			}
			// Soft cancel: StopAgent wrote stateStatusCancelled to Redis.
			// This is the path taken when the client disconnects from the editor
			// (GetVideo stream ends) — we do not cancel runCtx in that case so
			// we rely on this Redis-based signal instead.
			if currentState, stateErr := a.GetState(ctx, sessionID); stateErr == nil &&
				currentState != nil && currentState.State == stateStatusCancelled {
				a.logger.Info("applyPlan: soft-cancel signal detected in Redis, stopping slide generation",
					zap.String("video_id", sessionID),
				)
				return errUserSoftCancelled
			}

			// ---------------- MEDIA SLIDE ----------------
			if slide.IsMediaSlide() {
				media := slide.AsMediaSlide()
				if media.Description != "" {
					media.Description = "This is the media slide, user will be asked to upload their product screenshot or clip"
				}
				media.SelectedTemplateDescription = utils.Ptr(media.Description)
				if err = builder.AddMediaSlide(ctx, sectionID, float32(media.Duration)); err != nil {
					return agenterrors.VideoPersistFailed("failed to persist media slide", err)
				}
				markReadyOnce()
				continue
			}

			// ---------------- ANIMATION SLIDE ----------------
			anim := slide.AsAnimationSlide()

			// Always include TotalSlides so every Redis write preserves the denominator
			// that the UI progress bar relies on.
			if stateErr := a.updateState(ctx, VideoAgentState{
				VideoID:     sessionID,
				Thinking:    "Generating...",
				State:       stateStatusProcessing,
				TotalSlides: totalSlides,
			}); stateErr != nil {
				a.logger.Debug("failed to set generating thinking state", zap.Error(stateErr))
			}

			selected, err := a.selectTemplate(ctx, sessionID, anim, plan, selectedTemplateIDs, totalSlides)
			if err != nil {
				return err
			}

			anim.SelectedTemplateDescription = utils.Ptr(selected.Description)

			templateConfig, err := a.templateExtractor.ExtractConfig(ctx, *anim, selected)
			if err != nil {
				return agenterrors.TemplateExtractFailed("failed to extract template config", err)
			}

			if err = builder.AddAnimationSlide(ctx, sectionID, float32(anim.Duration), selected, templateConfig.Config, anim.Voiceover); err != nil {
				return agenterrors.VideoPersistFailed("failed to persist animation slide", err)
			}

			selectedTemplateIDs = append(selectedTemplateIDs, selected.ID)
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
	sessionID string,
	anim *types.AnimationSlide,
	plan *types.VideoGenerationPlan,
	usedTemplateIDs []string,
	totalSlides int,
) (*models.Template, error) {
	categories, err := a.retrievalService.MatchCategories(ctx, anim.AnimationType, anim.CategorySearchQuery)
	if err != nil {
		return nil, agenterrors.RetrievalFailed("failed to match categories", err)
	}

	var selected *models.Template
	for _, category := range categories {
		templates, fetchErr := a.retrievalService.FetchTemplates(ctx, anim.AnimationType, category.Name, usedTemplateIDs)
		if fetchErr != nil {
			return nil, agenterrors.RetrievalFailed("failed to fetch templates", fetchErr)
		}
		if len(templates) == 0 {
			continue
		}

		filtered, selectErr := a.templateExtractor.SelectTemplates(ctx, templates, plan, func(chunk string) {
			if stateErr := a.updateState(ctx, VideoAgentState{
				VideoID:     sessionID,
				Thinking:    chunk,
				State:       stateStatusProcessing,
				TotalSlides: totalSlides, // preserve denominator on every thinking update
			}); stateErr != nil {
				a.logger.Warn("failed to update thinking state", zap.Error(stateErr))
			}
		})
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
	state, err := a.GetState(ctx, videoID)
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
		zap.Int("total_slides", state.TotalSlides),
	)

	// If slides are already being generated, use a Redis soft-cancel so the applyPlan
	// loop can finish any in-flight persistence work before stopping.
	if state.TotalSlides > 0 || state.State == stateStatusReady || state.State == stateStatusProcessing {
		a.logger.Info("StopAgent: in applyPlan phase — writing soft-cancel to Redis")
		return a.updateState(ctx, VideoAgentState{
			VideoID:     videoID,
			State:       stateStatusCancelled,
			TotalSlides: state.TotalSlides,
		})
	}

	// We are still in the LLM-planning phase (TotalSlides not yet published).
	// The caller is responsible for cancelling runCtx which will abort the LLM call.
	a.logger.Info("StopAgent: in LLM-planning phase — context cancellation by caller is sufficient")
	return nil
}

func (a *agentV1) updateState(ctx context.Context, state VideoAgentState) error {
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

func (a *agentV1) getPlanningSession(ctx context.Context, sessionID string) (*planningSession, error) {
	value, err := a.cache.GetKey(ctx, fmt.Sprintf("%s:%s", sessionKeyPrefix, sessionID))
	if err != nil {
		return nil, agenterrors.SessionUnavailable("failed to read planning session", err)
	}

	var session planningSession
	if err := json.Unmarshal([]byte(value), &session); err != nil {
		return nil, agenterrors.SessionUnavailable("invalid planning session payload", err)
	}
	return &session, nil
}

func (a *agentV1) savePlanningSession(ctx context.Context, sessionID string, session *planningSession) error {
	payload, err := json.Marshal(session)
	if err != nil {
		return agenterrors.SessionUnavailable("failed to encode planning session", err)
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s", sessionKeyPrefix, sessionID), string(payload), stateTTL); err != nil {
		return agenterrors.SessionUnavailable("failed to persist planning session", err)
	}
	return nil
}

func (a *agentV1) GetState(ctx context.Context, sessionID string) (*VideoAgentState, error) {
	value, err := a.cache.GetKey(ctx, fmt.Sprintf("%s:%s", stateKeyPrefix, sessionID))
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
