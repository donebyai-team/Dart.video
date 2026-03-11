package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"strings"
	"time"
)

type AnimationGenerationAgentRunResult struct {
	Status             RunStatus
	AskUserQuestion    *types.AskUserQuestion
	Suggestions        []*models.Template
	GeneratedAnimation *models.Template
}

const (
	generateOrEditAnimationSessionKeyPrefix = "generateOrEditAnimationSessionKeyPrefix:session"
	maxSuggestions                          = 3
)

type AnimationGeneratorAgentState struct {
	VideoID          string                 `json:"video_id"`
	Thinking         string                 `json:"thinking"`
	State            string                 `json:"state"`
	AskUserQuestion  *types.AskUserQuestion `json:"ask_user_question,omitempty"`
	LastUserResponse string                 `json:"last_user_response,omitempty"`
}

type AnimationGeneratorAgent interface {
	EditAnimation(
		ctx context.Context,
		animationSlide *pbcore.Slide,
		prompt string,
		params GenerationParams) (*models.Template, error)
	CreateAnimation(
		ctx context.Context,
		prompt string,
		suggestions bool,
		params GenerationParams,
	) (*AnimationGenerationAgentRunResult, error)
	ContinueAnimation(
		ctx context.Context,
		options ContinueSessionOptions,
		params GenerationParams,
	) (*AnimationGenerationAgentRunResult, error)
	StateUpdates() <-chan AnimationGeneratorAgentState
}

type agentAnimationEditor struct {
	sessionID            string
	slideID              string
	orgID                string
	db                   datastore.Repository
	brandIdentityService brand_identity.BrandIdentity
	retrievalService     RetrievalService
	llmService           llm.LLMService
	cache                cache.Cache
	videoService         services.VideoGeneration
	animationGenerator   AnimationGenerator
	logger               *zap.Logger
	stateUpdates         chan AnimationGeneratorAgentState
}

func (a *agentAnimationEditor) StateUpdates() <-chan AnimationGeneratorAgentState {
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
	videoService services.VideoGeneration,
	brandIdentityService brand_identity.BrandIdentity,
) AnimationGeneratorAgent {
	llmService := llm.NewLlmService(logger)
	return &agentAnimationEditor{
		sessionID:            sessionID,
		orgID:                orgID,
		slideID:              slideID,
		logger:               logger,
		cache:                cache,
		db:                   db,
		videoService:         videoService,
		brandIdentityService: brandIdentityService,
		retrievalService:     NewLlmRetrievalService(db, llmService),
		llmService:           llmService,
		stateUpdates:         make(chan AnimationGeneratorAgentState, 64),
		animationGenerator: NewAnimationGenerator(
			mediaStore,
			brandIdentityService,
			llmService,
			codeBuilder,
			logger,
		),
	}
}

type generateOrEditAnimationSession struct {
	Prompt              string          `json:"prompt"`
	Suggestions         bool            `json:"suggestions"`
	AwaitingUserInput   bool            `json:"awaiting_user_input"`
	ConversationHistory []types.Message `json:"conversation_history"`
}

func (a *agentAnimationEditor) saveGenerateOrEditAnimationSession(ctx context.Context, session *generateOrEditAnimationSession) error {
	payload, err := json.Marshal(session)
	if err != nil {
		return agenterrors.SessionUnavailable("failed to encode planning session", err)
	}

	if err := a.cache.SetKey(ctx, fmt.Sprintf("%s:%s:%s", generateOrEditAnimationSessionKeyPrefix, a.sessionID, a.slideID), string(payload), stateTTL); err != nil {
		return agenterrors.SessionUnavailable("failed to persist planning session", err)
	}
	return nil
}

func (a *agentAnimationEditor) getGenerateOrEditAnimationSession(ctx context.Context) (*generateOrEditAnimationSession, error) {
	value, err := a.cache.GetKey(ctx, fmt.Sprintf("%s:%s:%s", generateOrEditAnimationSessionKeyPrefix, a.sessionID, a.slideID))
	if err != nil {
		return nil, agenterrors.SessionUnavailable("failed to read planning session", err)
	}

	var session generateOrEditAnimationSession
	if err := json.Unmarshal([]byte(value), &session); err != nil {
		return nil, agenterrors.SessionUnavailable("invalid planning session payload", err)
	}
	return &session, nil
}

func (a *agentAnimationEditor) ContinueAnimation(
	ctx context.Context,
	options ContinueSessionOptions,
	params GenerationParams,
) (*AnimationGenerationAgentRunResult, error) {
	userResponse := strings.TrimSpace(options.UserResponse)
	if userResponse == "" {
		return nil, agenterrors.InvalidInput("user response is required", nil)
	}

	session, err := a.getGenerateOrEditAnimationSession(ctx)
	if err != nil {
		return nil, err
	}
	if !session.AwaitingUserInput {
		return nil, cache.ErrCacheMiss
	}

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Tool_call_id: utils.Ptr(fmt.Sprintf("call_%d", time.Now().Unix())),
		Role:         types.Union3KassistantOrKtoolOrKuser__NewKtool(),
		Content:      userResponse,
	})
	session.AwaitingUserInput = false

	if err := a.saveGenerateOrEditAnimationSession(ctx, session); err != nil {
		return nil, err
	}

	a.publishTransientState(AnimationGeneratorAgentState{
		State:            stateStatusProcessing,
		LastUserResponse: userResponse,
	})

	a.logger.Info("continuing agent animation session with user response", zap.String("response", userResponse))

	return a.runGenerateAnimationFromPrompt(ctx, session, params)
}

func (l *agentAnimationEditor) EditAnimation(
	ctx context.Context,
	animationSlide *pbcore.Slide,
	prompt string,
	params GenerationParams) (*models.Template, error) {
	if err := ValidatePrompt(prompt); err != nil {
		return nil, err
	}

	template, err := l.animationGenerator.EditAnimationCode(ctx, animationSlide, prompt, func(progress TemplateGenerationProgress) {
		l.publishTransientState(AnimationGeneratorAgentState{
			State:    stateStatusProcessing,
			Thinking: progress.Message,
		})
	}, params)
	if err != nil {
		return nil, err
	}
	return template, nil
}

func (l *agentAnimationEditor) CreateAnimation(
	ctx context.Context,
	prompt string,
	suggestions bool,
	params GenerationParams,
) (*AnimationGenerationAgentRunResult, error) {

	if err := ValidatePrompt(prompt); err != nil {
		return nil, err
	}

	session := &generateOrEditAnimationSession{
		Prompt:              prompt,
		Suggestions:         suggestions,
		AwaitingUserInput:   false,
		ConversationHistory: make([]types.Message, 0),
	}

	if err := l.saveGenerateOrEditAnimationSession(ctx, session); err != nil {
		return nil, err
	}

	l.publishTransientState(AnimationGeneratorAgentState{
		State:    stateStatusProcessing,
		Thinking: generating,
	})

	return l.runGenerateAnimationFromPrompt(ctx, session, params)
}

func (l *agentAnimationEditor) GetAnimationSuggestions(
	ctx context.Context,
	animationType types.AnimationType,
	categorySearchQuery string,
	beatDescription string,
	params GenerationParams) ([]*models.Template, error) {
	categories, err := l.retrievalService.MatchCategories(ctx, animationType, categorySearchQuery)
	if err != nil {
		return nil, agenterrors.RetrievalFailed("failed to match categories", err)
	}

	suggestedTemplates := make([]*models.Template, 0)
	for _, category := range categories {
		// semantically match if we have a template available in our library
		filtered, selectErr := l.retrievalService.MatchTemplates(ctx, animationType, beatDescription, category.Name, MatchTemplatesOptions{})
		if selectErr != nil {
			return nil, agenterrors.TemplateSelectFailed("failed to select templates", selectErr)
		}
		if len(filtered) == 0 {
			continue
		}

		l.logger.Info("found a matching template",
			zap.String("category_name", category.Name),
			zap.Int("templates", len(filtered)),
		)

		suggestedTemplates = append(suggestedTemplates, filtered...)

		if len(suggestedTemplates) >= maxSuggestions {
			break
		}
	}

	// Extract Config
	for _, template := range suggestedTemplates {
		l.publishTransientState(AnimationGeneratorAgentState{
			State:    stateStatusProcessing,
			Thinking: extracting,
		})
		templateConfig, err := l.animationGenerator.ExtractConfig(ctx, beatDescription, template, params)
		if err != nil {
			return nil, agenterrors.TemplateExtractFailed("failed to extract template config", err)
		}

		// To be used as edits
		template.GeneratedConfig = json.RawMessage(templateConfig.Config)
		// Save plan for debugging
		template.GeneratedPlan = &pbcore.AnimationSlidePlan{
			BeatDescription:             beatDescription,
			AnimationType:               string(animationType),
			CategorySearcQquery:         categorySearchQuery,
			Duration:                    template.Duration,
			SelectedTemplateDescription: utils.Ptr(template.Description),
		}
	}
	return suggestedTemplates, nil
}

func (l *agentAnimationEditor) runGenerateAnimationFromPrompt(ctx context.Context, session *generateOrEditAnimationSession, params GenerationParams) (result *AnimationGenerationAgentRunResult, retErr error) {
	l.publishTransientState(AnimationGeneratorAgentState{
		State:    stateStatusProcessing,
		Thinking: "Understanding your animation prompt...",
	})

	input := types.EnhanceAnimationPromptRequest{
		Prompt: session.Prompt,
	}

	if params.VideoBranding != nil {
		input.Branding = *params.VideoBranding
	}

	if params.VideoBackground != nil {
		input.SlideBackground = gradientToCSS(params.VideoBackground.Gradient)
	}

	var brandIdentityRegistry *brand_identity.BrandIdentityRegistry
	if params.VideoBranding != nil && params.VideoBranding.BrandLibraryID != nil {
		_brandIdentityRegistry, err := l.brandIdentityService.GetBrandIdentity(ctx, *params.VideoBranding.BrandLibraryID)
		if err != nil {
			if errors.Is(err, datastore.NotFound) {
				return nil, agenterrors.InvalidInput("brand_identity not found", nil)
			}
			return nil, err
		}

		if _brandIdentityRegistry != nil {
			brandIdentityRegistry = _brandIdentityRegistry
			params.VideoBranding.BrandGuideLines = utils.Ptr(_brandIdentityRegistry.FormatBrandAndAssetDetails())
			input.Branding.BrandGuideLines = params.VideoBranding.BrandGuideLines
			l.logger.Info("using brand-identity",
				zap.String("brand-identity-id", *params.VideoBranding.BrandLibraryID),
			)
		}
	}

	llmResponse, err := baml_client.EnhanceAnimationPrompt(ctx, input, session.ConversationHistory)
	if err != nil {
		return nil, agenterrors.LLMPlanningFailed("failed to enhance animation prompt", err)
	}

	handled, result, err := l.handleAnimationGenerationToolCalls(ctx, session, &llmResponse.Plan, "")
	if handled {
		return result, err
	}

	enhancedPrompt := llmResponse.Plan.AsEnhancedAnimationPrompt()
	if enhancedPrompt == nil {
		return nil, agenterrors.Internal("llm response did not include a enhancedPrompt", nil)
	}

	// create a new slide
	animationSlide := &types.AnimationSlide{
		BeatDescription:     enhancedPrompt.AnimationIntent,
		AnimationType:       enhancedPrompt.AnimationType,
		CategorySearchQuery: enhancedPrompt.CategorySearchQuery,
		Duration:            enhancedPrompt.Duration,
	}

	if !IsValidDuration(animationSlide.Duration) {
		l.logger.Info("Received invalid duration from anhanced prompt, defaulting to 5",
			zap.Int("generated_duration", int(animationSlide.Duration)),
			zap.Int("default", DefaultDuration),
		)
		animationSlide.Duration = DefaultDuration
	}

	if session.Suggestions {
		l.publishTransientState(AnimationGeneratorAgentState{
			State:    stateStatusProcessing,
			Thinking: matching,
		})

		// Return GetAnimationSuggestions
		suggestions, err := l.GetAnimationSuggestions(ctx,
			animationSlide.AnimationType,
			animationSlide.CategorySearchQuery,
			animationSlide.BeatDescription,
			params)
		if err != nil {
			return nil, err
		}

		if len(suggestions) > 0 {
			return &AnimationGenerationAgentRunResult{
				Status:      RunStatusCompleted,
				Suggestions: suggestions,
			}, nil
		}
	}

	// fallback to Generate new animation
	template, err := l.animationGenerator.GenerateCode(ctx, enhancedPrompt.Prompt, animationSlide, func(progress TemplateGenerationProgress) {
		l.publishTransientState(AnimationGeneratorAgentState{
			State:    stateStatusProcessing,
			Thinking: progress.Message,
		})
	}, brandIdentityRegistry, params)
	if err != nil {
		return nil, err
	}

	// Save plan for debugging
	template.GeneratedPlan = &pbcore.AnimationSlidePlan{
		BeatDescription:             animationSlide.BeatDescription,
		AnimationType:               string(animationSlide.AnimationType),
		CategorySearcQquery:         animationSlide.CategorySearchQuery,
		Duration:                    animationSlide.Duration,
		SelectedTemplateDescription: utils.Ptr(template.Description),
	}

	return &AnimationGenerationAgentRunResult{
		Status:             RunStatusCompleted,
		GeneratedAnimation: template,
	}, nil
}

func (a *agentAnimationEditor) publishTransientState(state AnimationGeneratorAgentState) {
	select {
	case a.stateUpdates <- state:
	default:
	}
}
