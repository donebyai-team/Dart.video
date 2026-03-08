package agent

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/docker/docker/daemon/logger"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/baml_client"
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

const (
	generateOrEditAnimationSessionKeyPrefix = "generateOrEditAnimationSessionKeyPrefix:session"
	maxSuggestions                          = 3
)

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
	stateUpdates         chan VideoAgentState
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
) *agentAnimationEditor {
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
		stateUpdates:         make(chan VideoAgentState, 64),
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
	Request             types.EnhanceAnimationPromptRequest `json:"request"`
	ConversationHistory []types.Message                     `json:"conversation_history"`
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

func (a *agentAnimationEditor) ContinueEditAnimationSlide(ctx context.Context, options ContinueSessionOptions) (*RunResult, error) {
	userResponse := strings.TrimSpace(options.UserResponse)
	if userResponse == "" {
		return nil, agenterrors.InvalidInput("user response is required", nil)
	}

	session, err := a.getGenerateOrEditAnimationSession(ctx)
	if err != nil {
		return nil, err
	}

	session.ConversationHistory = append(session.ConversationHistory, types.Message{
		Tool_call_id: utils.Ptr(fmt.Sprintf("call_%d", time.Now().Unix())),
		Role:         types.Union3KassistantOrKtoolOrKuser__NewKtool(),
		Content:      userResponse,
	})

	if err := a.saveGenerateOrEditAnimationSession(ctx, session); err != nil {
		return nil, err
	}

	a.logger.Info("continuing agent animation session with user response", zap.String("response", userResponse))

	return a.runPlanning(ctx, session)
}

func (l *agentAnimationEditor) EditAnimation(
	ctx context.Context,
	animationSlide *pbcore.Slide,
	userRequest *pbportal.GenerateOrEditAnimationRequest,
	params GenerationParams) (*pbportal.GenerateOrEditAnimationResponse, error) {
	// Download exiting code
	//animationSlide.CodeRegistry.MUrl

}

func (l *agentAnimationEditor) GenerateFromUserPrompt(
	ctx context.Context,
	userRequest *pbportal.GenerateOrEditAnimationRequest,
	params GenerationParams,
) (*models.Template, error) {
	input := types.EnhanceAnimationPromptRequest{
		Prompt: userRequest.Prompt,
	}

	if params.VideoBranding != nil {
		input.Branding = *params.VideoBranding
	}

	if params.VideoBackground != nil {
		input.SlideBackground = gradientToCSS(params.VideoBackground.Gradient)
	}

	if params.VideoBranding != nil && params.VideoBranding.BrandLibraryID != nil {
		_brandIdentityRegistry, err := l.brandIdentityService.GetBrandIdentity(ctx, *params.VideoBranding.BrandLibraryID)
		if err != nil {
			if errors.Is(err, datastore.NotFound) {
				return nil, agenterrors.InvalidInput("brand_identity not found", nil)
			}
			return nil, err
		}

		if _brandIdentityRegistry != nil {
			input.Branding.BrandGuideLines = utils.Ptr(_brandIdentityRegistry.FormatBrandDetails())
		}
	}

	session := &generateOrEditAnimationSession{
		Request:             input,
		ConversationHistory: make([]types.Message, 0),
	}

	if err := l.saveGenerateOrEditAnimationSession(ctx, session); err != nil {
		return nil, err
	}

	return template, nil
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
		templateConfig, err := l.animationGenerator.ExtractConfig(ctx, beatDescription, template, params)
		if err != nil {
			return nil, agenterrors.TemplateExtractFailed("failed to extract template config", err)
		}
		template.GeneratedConfig = json.RawMessage(templateConfig.Config)
	}
	return suggestedTemplates, nil
}

func (l *agentV1) runGenerateAnimationFromPrompt(ctx context.Context, session *generateOrEditAnimationSession) (result *RunResult, retErr error) {
	llmResponse, err := baml_client.EnhanceAnimationPrompt(ctx, session.Request, session.ConversationHistory)
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

	if session.Request.Suggestions {
		// Return GetAnimationSuggestions
	}

	// Generate
	// Generate new animation
	template, err := l.animationGenerator.Generate(ctx, animationSlide, func(progress TemplateGenerationProgress) {

	}, params)
	if err != nil {
		return nil, err
	}

}
