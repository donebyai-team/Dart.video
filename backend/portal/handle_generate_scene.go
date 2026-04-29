package portal

import (
	"connectrpc.com/connect"
	"context"
	"errors"
	"fmt"
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

func (p *Portal) GenerateOrEditScene(ctx context.Context, c *connect.Request[pbportal.GenerateOrEditSceneRequest], stream *connect.ServerStream[pbportal.GenerateOrEditSceneResponse]) error {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return err
	}

	videoID := strings.TrimSpace(c.Msg.VideoId)
	if videoID == "" {
		return connect.NewError(connect.CodeInvalidArgument, errors.New("video id is required"))
	}

	slideToEdit := c.Msg.SlideToEdit
	if slideToEdit == nil {
		return connect.NewError(connect.CodeInvalidArgument, errors.New("slide_to_edit is required"))
	}

	logger := logging.Logger(ctx, p.logger).With(
		zap.String("session_id", videoID),
		zap.String("organization_id", actor.OrganizationID),
		zap.String("slide_id", slideToEdit.Id),
	)

	video, _, err := p.videoGenerationService.GetVideo(ctx, videoID, actor.OrganizationID, services.VideoOptions{IncludePending: false})
	if err != nil {
		return err
	}

	animationAgent := p.newAnimationGeneratorAgent(logger, videoID, slideToEdit.Id, actor.OrganizationID)

	return p.streamAnimationGenerationRun(
		ctx,
		stream,
		animationAgent,
		slideToEdit,
		func(runCtx context.Context) (*agent.RunResult, error) {
			switch input := c.Msg.GetInput().(type) {
			case *pbportal.GenerateOrEditSceneRequest_Request:
				if video.Metadata.GeneratedBranding.BrandIdentity != nil {
					input.Request.BrandLibraryId = utils.Ptr(video.Metadata.GeneratedBranding.BrandIdentity.Id)
				}

				return animationAgent.GenerateScene(runCtx, c.Msg.SlideToEdit, input.Request)

			case *pbportal.GenerateOrEditSceneRequest_AskUserInput:
				return animationAgent.ContinueAgent(runCtx, agent.ContinueSessionOptions{
					UserResponse:        c.Msg.GetAskUserInput().Response,
					SlideToEdit:         c.Msg.SlideToEdit,
					SelectedMediaAssets: c.Msg.GetAskUserInput().Assets})
			default:
				return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("invalid input type"))
			}
		},
	)
}

func (p *Portal) streamAnimationGenerationRun(
	ctx context.Context,
	stream *connect.ServerStream[pbportal.GenerateOrEditSceneResponse],
	animationAgent agent.SceneGeneratorAgent,
	targetSlide *pbcore.Slide,
	run func(context.Context) (*agent.RunResult, error),
) error {
	type runOutput struct {
		result *agent.RunResult
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
			if err := stream.Send(&pbportal.GenerateOrEditSceneResponse{
				ThinkingSummary: thinking,
			}); err != nil {
				cancelRun()
				return nil
			}

		case out := <-done:
			if out.err != nil {
				return out.err
			}
			return sendAnimationResult(stream, targetSlide, out.result)
		}
	}
}

func sendAnimationResult(
	stream *connect.ServerStream[pbportal.GenerateOrEditSceneResponse],
	slide *pbcore.Slide,
	runResult *agent.RunResult,
) error {
	if runResult == nil {
		return errors.New("animation agent returned empty result")
	}

	if runResult.Status == agent.RunStatusWaitingForUserInput {
		if err := stream.Send(&pbportal.GenerateOrEditSceneResponse{
			Slide:               slide,
			WaitingForUserInput: true,
			AskUserQuestion:     runResult.AskUserQuestion,
		}); err != nil {
			return nil
		}
		return nil
	}

	if runResult.GeneratedAnimation != nil {
		if err := applyTemplateToSlide(slide, runResult.GeneratedAnimation); err != nil {
			return err
		}
	}

	if err := stream.Send(&pbportal.GenerateOrEditSceneResponse{
		Slide:     slide,
		Completed: true,
	}); err != nil {
		return nil
	}

	return nil
}

func applyTemplateToSlide(slide *pbcore.Slide, template *models.Template) error {
	slide.DurationInFrames = template.Config.TotalDurationInFrames
	slide.SettledFrame = template.Config.VisibleDurationInFrames
	toPatches, err := utils.RawMessageToStruct(template.GeneratedPatches)
	if err != nil {
		return fmt.Errorf("invalid template registry: %s", template.Name)
	}

	animationContent := slide.GetContent()
	animationContent.CodeRegistry = template.Config.CodeRegistry
	animationContent.Edits = toPatches
	if template.BackgroundStyle != nil {
		slide.BackgroundStyle = template.BackgroundStyle
	}
	return nil
}

func (p *Portal) newAnimationGeneratorAgent(logger *zap.Logger, sessionID, slideID, orgID string) agent.SceneGeneratorAgent {
	return agent.NewAgentAnimationEditor(
		sessionID,
		slideID,
		orgID,
		logger,
		p.authStateStore,
		p.db,
		p.mediaService,
		p.codeBuilderService,
		p.brandIdentityService,
	)
}
