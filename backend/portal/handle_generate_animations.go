package portal

import (
	"connectrpc.com/connect"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/services"
	"strings"

	"github.com/shank318/coasterai/agent"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/utils"
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
)

func (p *Portal) GenerateOrEditAnimationSlide(ctx context.Context, c *connect.Request[pbportal.GenerateOrEditAnimationRequest], stream *connect.ServerStream[pbportal.GenerateOrEditAnimationResponse]) error {
	videoID := strings.TrimSpace(c.Msg.VideoId)
	if videoID == "" {
		return connect.NewError(connect.CodeInvalidArgument, errors.New("video id is required"))
	}
	requestKind := ""
	rawSlideID := ""
	prompt := ""
	suggestions := false
	isAskUserInput := false

	switch input := c.Msg.GetInput().(type) {
	case *pbportal.GenerateOrEditAnimationRequest_EditAnimationUserInput:
		requestKind = "edit"
		if input.EditAnimationUserInput == nil {
			return connect.NewError(connect.CodeInvalidArgument, errors.New("edit_animation_user_input is required"))
		}
		rawSlideID = strings.TrimSpace(input.EditAnimationUserInput.GetSlideId())
		prompt = strings.TrimSpace(input.EditAnimationUserInput.GetPrompt())
		if rawSlideID == "" {
			return connect.NewError(connect.CodeInvalidArgument, errors.New("slide_id is required for edit"))
		}
	case *pbportal.GenerateOrEditAnimationRequest_CreateNewAnimationInput:
		requestKind = "create"
		if input.CreateNewAnimationInput == nil {
			return connect.NewError(connect.CodeInvalidArgument, errors.New("create_new_animation_input is required"))
		}
		prompt = strings.TrimSpace(input.CreateNewAnimationInput.GetPrompt())
		suggestions = input.CreateNewAnimationInput.GetSuggestions()
		rawSlideID = uuid.New().String()
	case *pbportal.GenerateOrEditAnimationRequest_AskUserInput:
		requestKind = "ask"
		isAskUserInput = true
		if input.AskUserInput == nil {
			return connect.NewError(connect.CodeInvalidArgument, errors.New("ask_user_input is required"))
		}
		rawSlideID = strings.TrimSpace(input.AskUserInput.GetSlideId())
		if rawSlideID == "" {
			return connect.NewError(connect.CodeInvalidArgument, errors.New("slide_id is required for edit"))
		}
		prompt = strings.TrimSpace(input.AskUserInput.GetResponse())
	default:
		return connect.NewError(connect.CodeInvalidArgument, errors.New("input is required"))
	}

	if prompt == "" {
		return connect.NewError(connect.CodeInvalidArgument, errors.New("prompt/response is required"))
	}

	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return err
	}

	video, _, err := p.videoGenerationService.GetVideo(ctx, videoID, actor.OrganizationID, services.VideoOptions{IncludePending: false})
	if err != nil {
		return err
	}

	existingSlide := findSlideByID(video, rawSlideID)
	if requestKind == "edit" && existingSlide == nil {
		return connect.NewError(connect.CodeNotFound, errors.New("slide not found"))
	}

	targetSlide := existingSlide
	if targetSlide == nil {
		targetSlide = newPendingAnimationSlide(rawSlideID)
	}

	logger := logging.Logger(ctx, p.logger).With(
		zap.String("session_id", videoID),
		zap.String("organization_id", actor.OrganizationID),
		zap.String("slide_id", targetSlide.Id),
	)

	params := buildAnimationGenerationParams(videoID, actor.OrganizationID, targetSlide.Id, targetSlide, video)
	animationAgent := p.newAnimationGeneratorAgent(logger, videoID, targetSlide.Id, actor.OrganizationID)

	preserveExistingEdits := existingSlide != nil
	return p.streamAnimationGenerationRun(
		ctx,
		stream,
		animationAgent,
		targetSlide,
		preserveExistingEdits,
		func(runCtx context.Context) (*agent.AnimationGenerationAgentRunResult, error) {
			if existingSlide != nil {
				template, runErr := animationAgent.EditAnimation(runCtx, existingSlide, prompt, params)
				if runErr != nil {
					return nil, runErr
				}
				return &agent.AnimationGenerationAgentRunResult{
					Status:             agent.RunStatusCompleted,
					GeneratedAnimation: template,
				}, nil
			}

			if isAskUserInput {
				return animationAgent.ContinueAnimation(runCtx, agent.ContinueSessionOptions{UserResponse: prompt}, params)
			}

			return animationAgent.CreateAnimation(runCtx, prompt, suggestions, params)
		},
	)
}

func (p *Portal) streamAnimationGenerationRun(
	ctx context.Context,
	stream *connect.ServerStream[pbportal.GenerateOrEditAnimationResponse],
	animationAgent agent.AnimationGeneratorAgent,
	targetSlide *pbcore.Slide,
	preserveExistingEdits bool,
	run func(context.Context) (*agent.AnimationGenerationAgentRunResult, error),
) error {
	type runOutput struct {
		result *agent.AnimationGenerationAgentRunResult
		err    error
	}

	runCtx, cancelRun := context.WithCancel(context.Background())
	defer cancelRun()

	done := make(chan runOutput, 1)
	go func() {
		result, err := run(runCtx)
		done <- runOutput{result: result, err: err}
	}()

	stateUpdates := animationAgent.StateUpdates()
	lastThinking := ""

	for {
		select {
		case <-ctx.Done():
			return nil

		case state := <-stateUpdates:
			thinking := strings.TrimSpace(state.Thinking)
			if thinking == "" || thinking == lastThinking {
				continue
			}
			lastThinking = thinking
			if err := stream.Send(&pbportal.GenerateOrEditAnimationResponse{
				ThinkingSummary: thinking,
			}); err != nil {
				return nil
			}

		case out := <-done:
			if out.err != nil {
				return out.err
			}
			return sendAnimationResult(stream, targetSlide, preserveExistingEdits, out.result)
		}
	}
}

func sendAnimationResult(
	stream *connect.ServerStream[pbportal.GenerateOrEditAnimationResponse],
	slide *pbcore.Slide,
	preserveExistingEdits bool,
	runResult *agent.AnimationGenerationAgentRunResult,
) error {
	if runResult == nil {
		return errors.New("animation agent returned empty result")
	}

	if runResult.Status == agent.RunStatusWaitingForUserInput {
		if err := stream.Send(&pbportal.GenerateOrEditAnimationResponse{
			Slide:               slide,
			WaitingForUserInput: true,
			AskUserQuestion:     toProtoQuestion(runResult.AskUserQuestion),
		}); err != nil {
			return nil
		}
		return nil
	}

	if runResult.GeneratedAnimation != nil {
		if err := applyTemplateToSlide(slide, runResult.GeneratedAnimation, preserveExistingEdits); err != nil {
			return err
		}
	}

	protoSuggestions, err := toProtoSuggestions(runResult.Suggestions)
	if err != nil {
		return err
	}

	if err := stream.Send(&pbportal.GenerateOrEditAnimationResponse{
		Slide:       slide,
		Suggestions: protoSuggestions,
		Completed:   true,
	}); err != nil {
		return nil
	}

	return nil
}

func findSlideByID(video *models.Video, slideID string) *pbcore.Slide {
	if video == nil || video.Config == nil || slideID == "" {
		return nil
	}

	for _, section := range video.Config.Sections {
		for _, slide := range section.Slides {
			if slide.Id == slideID {
				return slide
			}
		}
	}
	return nil
}

func buildAnimationGenerationParams(videoID, orgID, slideID string, slide *pbcore.Slide, video *models.Video) agent.GenerationParams {
	params := agent.GenerationParams{
		SessionID: videoID,
		OrgID:     orgID,
		SlideID:   slideID,
	}

	if video != nil && video.Metadata != nil {
		if video.Metadata.GeneratedBranding != nil {
			params.VideoBranding = video.Metadata.GeneratedBranding.ToModel()
		}
		if video.Metadata.BackgroundStyle != nil {
			params.VideoBackground = video.Metadata.BackgroundStyle.ToModel()
		}
	}

	if params.VideoBackground == nil && slide != nil && slide.BackgroundStyle != nil {
		params.VideoBackground = slide.BackgroundStyle.ToModel()
	}

	if params.VideoBackground == nil && video != nil && video.Config != nil {
		for _, section := range video.Config.Sections {
			for _, candidate := range section.Slides {
				if candidate.BackgroundStyle != nil {
					params.VideoBackground = candidate.BackgroundStyle.ToModel()
					return params
				}
			}
		}
	}

	return params
}

func newPendingAnimationSlide(slideID string) *pbcore.Slide {
	return &pbcore.Slide{
		Id:          slideID,
		Type:        pbcore.SlideType_SLIDE_TYPE_ANIMATION,
		SlideStatus: pbcore.SlideStatus_SLIDE_STATUS_GENERATED,
		Content: &pbcore.Slide_Animation{
			Animation: &pbcore.AnimationSlideContent{},
		},
	}
}

func applyTemplateToSlide(slide *pbcore.Slide, template *models.Template, preserveExistingEdits bool) error {
	if slide == nil || template == nil {
		return nil
	}

	slide.Duration = float32(template.Duration)
	toStructRegistry, err := utils.RawMessageToStruct(template.ElementRegistry)
	if err != nil {
		return fmt.Errorf("invalid template registry: %s", template.Name)
	}

	animationContent := slide.GetAnimation()
	animationContent.Plan = template.GeneratedPlan
	animationContent.CodeRegistry = template.CodeRegistry
	animationContent.Registry = toStructRegistry

	if !preserveExistingEdits {
		emptyEdits, structErr := utils.RawMessageToStruct(json.RawMessage(`{}`))
		if structErr != nil {
			return fmt.Errorf("failed to initialize animation edits: %w", structErr)
		}
		animationContent.Edits = emptyEdits
	}

	return nil
}

func toProtoSuggestions(templates []*models.Template) ([]*pbcore.AnimationTemplate, error) {
	protoTemplates := make([]*pbcore.AnimationTemplate, 0, len(templates))
	for _, suggestion := range templates {
		toStructRegistry, err := utils.RawMessageToStruct(suggestion.ElementRegistry)
		if err != nil {
			return nil, fmt.Errorf("invalid template registry: %s", suggestion.Name)
		}

		toStructConfig, err := utils.RawMessageToStruct(suggestion.GeneratedConfig)
		if err != nil {
			return nil, fmt.Errorf("invalid template config: %s", suggestion.Name)
		}

		protoTemplates = append(protoTemplates, &pbcore.AnimationTemplate{
			Id:           suggestion.ID,
			CodeRegistry: suggestion.CodeRegistry,
			Name:         suggestion.Name,
			PreviewUrl:   suggestion.PreviewUrl,
			Registry:     toStructRegistry,
			Edits:        toStructConfig,
			Plan:         suggestion.GeneratedPlan,
		})
	}
	return protoTemplates, nil
}

func (p *Portal) newAnimationGeneratorAgent(logger *zap.Logger, sessionID, slideID, orgID string) agent.AnimationGeneratorAgent {
	return agent.NewAgentAnimationEditor(
		sessionID,
		slideID,
		orgID,
		logger,
		p.authStateStore,
		p.db,
		p.mediaService,
		p.codeBuilderService,
		p.videoGenerationService,
		p.brandIdentityService,
	)
}
