package portal

import (
	"connectrpc.com/connect"
	"context"
	"errors"
	"fmt"
	"github.com/google/uuid"
	"github.com/shank318/coasterai/datastore"
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
		targetSlide = createNewSlide(rawSlideID)
	}

	logger := logging.Logger(ctx, p.logger).With(
		zap.String("session_id", videoID),
		zap.String("organization_id", actor.OrganizationID),
		zap.String("slide_id", targetSlide.Id),
	)

	animationAgent := p.newAnimationGeneratorAgent(logger, videoID, targetSlide.Id, actor.OrganizationID)
	if err := p.injectAnimationGenerationContext(ctx, animationAgent, video); err != nil {
		return err
	}

	isExistingSlide := existingSlide != nil
	return p.streamAnimationGenerationRun(
		ctx,
		stream,
		animationAgent,
		targetSlide,
		isExistingSlide,
		func(runCtx context.Context) (*agent.AnimationGenerationAgentRunResult, error) {
			if existingSlide != nil {
				template, runErr := animationAgent.EditAnimation(runCtx, existingSlide, prompt)
				if runErr != nil {
					return nil, runErr
				}
				return &agent.AnimationGenerationAgentRunResult{
					Status:             agent.RunStatusCompleted,
					GeneratedAnimation: template,
				}, nil
			}

			if isAskUserInput {
				return animationAgent.ContinueAnimation(runCtx, agent.ContinueSessionOptions{UserResponse: prompt})
			}

			return animationAgent.CreateAnimation(runCtx, prompt, suggestions)
		},
	)
}

func (p *Portal) streamAnimationGenerationRun(
	ctx context.Context,
	stream *connect.ServerStream[pbportal.GenerateOrEditAnimationResponse],
	animationAgent agent.AnimationGeneratorAgent,
	targetSlide *pbcore.Slide,
	isExistingSlide bool,
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
		select {
		case done <- runOutput{result: result, err: err}:
		default:
		}
	}()

	stateUpdates := animationAgent.StateUpdates()
	lastThinking := ""

	for {
		select {
		case <-ctx.Done():
			cancelRun()
			return nil

		case state, ok := <-stateUpdates:
			if !ok {
				stateUpdates = nil
				continue
			}
			thinking := strings.TrimSpace(state.Thinking)
			if thinking == "" || thinking == lastThinking {
				continue
			}
			lastThinking = thinking
			if err := stream.Send(&pbportal.GenerateOrEditAnimationResponse{
				ThinkingSummary: thinking,
			}); err != nil {
				cancelRun()
				return nil
			}

		case out := <-done:
			if out.err != nil {
				return out.err
			}
			return sendAnimationResult(stream, targetSlide, isExistingSlide, out.result)
		}
	}
}

func sendAnimationResult(
	stream *connect.ServerStream[pbportal.GenerateOrEditAnimationResponse],
	slide *pbcore.Slide,
	isExistingSlide bool,
	runResult *agent.AnimationGenerationAgentRunResult,
) error {
	if runResult == nil {
		return errors.New("animation agent returned empty result")
	}

	if runResult.Status == agent.RunStatusWaitingForUserInput {
		if err := stream.Send(&pbportal.GenerateOrEditAnimationResponse{
			Slide:               slide,
			WaitingForUserInput: true,
			AskUserQuestion:     runResult.AskUserQuestion,
		}); err != nil {
			return nil
		}
		return nil
	}

	if runResult.GeneratedAnimation != nil {
		if err := applyTemplateToSlide(slide, runResult.GeneratedAnimation, isExistingSlide); err != nil {
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

func (p *Portal) injectAnimationGenerationContext(
	ctx context.Context,
	animationAgent agent.AnimationGeneratorAgent,
	video *models.Video,
) error {
	brandLibraryID := video.Metadata.GeneratedBranding.BrandLibraryID
	if brandLibraryID == nil {
		return nil
	}

	brandIdentity, err := p.brandIdentityService.GetBrandIdentity(ctx, *brandLibraryID)
	if err != nil {
		if errors.Is(err, datastore.NotFound) {
			return connect.NewError(connect.CodeInvalidArgument, errors.New("brand_identity not found"))
		}
		return err
	}

	registryBuilder := services.NewMediaAssetRegistryBuilder().WithBrandIdentity(brandIdentity.BrandIdentity)

	options := agent.NewAnimationGenerationOptionsBuilder().
		WithAssetRegistry(registryBuilder.Build()).
		Build()
	animationAgent.ApplyGenerationOptions(options)

	return nil
}

func createNewSlide(slideID string) *pbcore.Slide {
	return &pbcore.Slide{
		Id:          slideID,
		SlideStatus: pbcore.SlideStatus_SLIDE_STATUS_GENERATED,
		Content:     &pbcore.AnimationSlideContent{},
	}
}

func applyTemplateToSlide(slide *pbcore.Slide, template *models.Template, isExistingSlide bool) error {
	if slide == nil || template == nil {
		return nil
	}

	slide.DurationInFrames = template.Config.TotalDurationInFrames
	slide.SettledFrame = template.Config.VisibleDurationInFrames
	toPatches, err := utils.RawMessageToStruct(template.GeneratedPatches)
	if err != nil {
		return fmt.Errorf("invalid template registry: %s", template.Name)
	}

	animationContent := slide.GetContent()
	animationContent.CodeRegistry = template.Config.CodeRegistry
	animationContent.Edits = toPatches

	// only if creating a new slide
	if !isExistingSlide {
		if template.GeneratedPlan != nil {
			animationContent.Plan = template.GeneratedPlan
		}
	}

	return nil
}

func toProtoSuggestions(templates []*models.Template) ([]*pbcore.AnimationTemplate, error) {
	protoTemplates := make([]*pbcore.AnimationTemplate, 0, len(templates))
	for _, suggestion := range templates {

		toStructConfig, err := utils.RawMessageToStruct(suggestion.GeneratedPatches)
		if err != nil {
			return nil, fmt.Errorf("invalid template config: %s", suggestion.Name)
		}

		protoTemplates = append(protoTemplates, &pbcore.AnimationTemplate{
			Id:           suggestion.ID,
			CodeRegistry: suggestion.Config.CodeRegistry,
			Name:         suggestion.Name,
			PreviewUrl:   suggestion.PreviewUrl,
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
	)
}
