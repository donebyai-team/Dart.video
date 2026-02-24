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
	}
}

const (
	stateKeyPrefix        = "video_generation:state"
	sessionKeyPrefix      = "video_generation:session"
	stateStatusProcessing = "PROCESSING"
	stateStatusWaiting    = "WAITING_FOR_USER_INPUT"
	stateStatusReady      = "READY_FOR_EDITOR"
	stateStatusCompleted  = "COMPLETED"
	stateTTL              = 30 * time.Minute
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

	defer func() {
		if err != nil {
			if failErr := builder.Fail(ctx, err); failErr != nil {
				a.logger.Error("failed to mark video as failed",
					zap.Error(failErr),
					zap.String("video_id", sessionID),
				)
			}
		}
	}()

	firstSlidePersisted := false
	markReadyOnce := func() {
		if firstSlidePersisted {
			return
		}
		firstSlidePersisted = true

		if stateErr := a.updateState(ctx, VideoAgentState{
			VideoID: sessionID,
			State:   stateStatusReady,
		}); stateErr != nil {
			a.logger.Warn("failed to set ready-for-editor state",
				zap.Error(stateErr),
			)
		}
	}
	setGeneratingThinking := func() {
		if stateErr := a.updateState(ctx, VideoAgentState{
			VideoID:  sessionID,
			Thinking: "Generating...",
			State:    stateStatusProcessing,
		}); stateErr != nil {
			a.logger.Debug("failed to set generating thinking state", zap.Error(stateErr))
		}
	}

	selectedTemplateIDs := make([]string, 0)

	for _, section := range plan.Sections {
		sectionID := builder.AddSection(section.Name)

		for _, slide := range section.Slides {
			// ---------------- MEDIA SLIDE ----------------
			if slide.IsMediaSlide() {
				media := slide.AsMediaSlide()
				if media.Description != "" {
					media.Description = "This is the media slide, user will be asked to upload their product screenshot or clip"
				}
				media.SelectedTemplateDescription = utils.Ptr(media.Description)
				if err = builder.AddMediaSlide(
					ctx,
					sectionID,
					float32(media.Duration),
				); err != nil {
					return agenterrors.VideoPersistFailed(
						"failed to persist media slide",
						err,
					)
				}

				markReadyOnce()
				continue
			}

			// ---------------- ANIMATION SLIDE ----------------
			anim := slide.AsAnimationSlide()

			// category matching
			setGeneratingThinking()
			categories, err := a.retrievalService.MatchCategories(
				ctx,
				anim.AnimationType,
				anim.CategorySearchQuery,
			)
			if err != nil {
				return agenterrors.RetrievalFailed(
					"failed to match categories",
					err,
				)
			}

			var selected *models.Template

			// Handle fallback
			if len(categories) == 0 {
				template, err := a.retrievalService.GetFallbackTemplate(ctx)
				if err != nil {
					return agenterrors.NoTemplateFound("no fallback template found", err)
				}

				selected = template
			}

			// Template matching
			for _, category := range categories {
				setGeneratingThinking()
				templates, fetchErr := a.retrievalService.FetchTemplates(
					ctx,
					anim.AnimationType,
					category.Name,
					selectedTemplateIDs,
				)
				if fetchErr != nil {
					return agenterrors.RetrievalFailed(
						"failed to fetch templates",
						fetchErr,
					)
				}

				if len(templates) == 0 {
					continue
				}

				setGeneratingThinking()
				filtered, selectErr := a.templateExtractor.SelectTemplates(
					ctx,
					templates,
					plan,
					func(chunk string) {
						if err := a.updateState(ctx, VideoAgentState{
							VideoID:  sessionID,
							Thinking: chunk,
							State:    stateStatusProcessing,
						}); err != nil {
							a.logger.Warn("failed to update thinking state", zap.Error(err))
						}
					},
				)
				if selectErr != nil {
					return agenterrors.TemplateSelectFailed(
						"failed to select templates",
						selectErr,
					)
				}

				if len(filtered) == 0 {
					continue
				}

				selected = filtered[0]
				break
			}

			// Handle fallback
			if selected == nil {
				template, err := a.retrievalService.GetFallbackTemplate(ctx)
				if err != nil {
					return agenterrors.NoTemplateFound("no fallback template found from any category", err)
				}

				selected = template
			}

			anim.SelectedTemplateDescription = utils.Ptr(selected.Description)

			templateConfig, err := a.templateExtractor.ExtractConfig(
				ctx,
				*anim,
				selected,
			)
			if err != nil {
				return agenterrors.TemplateExtractFailed(
					"failed to extract template config",
					err,
				)
			}

			if err = builder.AddAnimationSlide(
				ctx,
				sectionID,
				float32(anim.Duration),
				selected,
				templateConfig.Config,
			); err != nil {
				return agenterrors.VideoPersistFailed(
					"failed to persist animation slide",
					err,
				)
			}

			selectedTemplateIDs = append(selectedTemplateIDs, selected.ID)

			markReadyOnce()
		}
	}

	return builder.Done(ctx)
}

func (a *agentV1) updateState(ctx context.Context, state VideoAgentState) error {
	jsonBytes, err := json.Marshal(state)
	if err != nil {
		return agenterrors.StateUnavailable("failed to encode state payload", err)
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s", stateKeyPrefix, state.VideoID), string(jsonBytes), stateTTL); err != nil {
		return agenterrors.StateUnavailable("failed to persist agent state", err)
	}
	return nil
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
