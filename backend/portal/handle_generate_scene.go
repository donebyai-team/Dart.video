package portal

import (
	"connectrpc.com/connect"
	"context"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/agent/common"
	"github.com/shank318/coasterai/services"
	"strings"

	"github.com/shank318/coasterai/agent"
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

	video, _, err := p.getVideo(ctx, videoID, actor.OrganizationID, services.VideoOptions{IncludePending: false})
	if err != nil {
		return err
	}

	animationAgent, statePublisher := p.newAnimationGeneratorAgent(logger, videoID, slideToEdit.Id, actor.OrganizationID)

	return p.streamAnimationGenerationRun(
		ctx,
		stream,
		statePublisher,
		slideToEdit,
		func(runCtx context.Context) (*common.RunResult, error) {
			switch input := c.Msg.GetInput().(type) {
			case *pbportal.GenerateOrEditSceneRequest_Request:

				if len(input.Request.Assets) > 4 {
					return nil, agenterrors.InvalidInput("too many assets, max 4 allowed", nil)
				}

				if len(input.Request.References) > 4 {
					return nil, agenterrors.InvalidInput("too many references, max 4 allowed", nil)
				}

				if video.Metadata.GeneratedBranding.BrandIdentity != nil {
					input.Request.BrandLibraryId = utils.Ptr(video.Metadata.GeneratedBranding.BrandIdentity.Id)
				}

				return animationAgent.GenerateCode(runCtx, c.Msg.SlideToEdit, input.Request)

			case *pbportal.GenerateOrEditSceneRequest_AskUserInput:
				return animationAgent.ContinueAgent(runCtx, agent.ContinueSessionOptions{
					UserResponse:        c.Msg.GetAskUserInput().Response,
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
	statePublisher common.AgentStatusPublisher,
	targetSlide *pbcore.Slide,
	run func(context.Context) (*common.RunResult, error),
) error {
	type runOutput struct {
		result *common.RunResult
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

	stateUpdates := statePublisher.StateUpdates()
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
				return connect.NewError(connect.CodeInvalidArgument, out.err)
			}
			return sendAnimationResult(stream, targetSlide, out.result)
		}
	}
}

func sendAnimationResult(
	stream *connect.ServerStream[pbportal.GenerateOrEditSceneResponse],
	slide *pbcore.Slide,
	runResult *common.RunResult,
) error {
	if runResult == nil {
		return errors.New("animation agent returned empty result")
	}

	if runResult.Status == common.RunStatusWaitingForUserInput {
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
		applyTemplateToSlide(slide, runResult.GeneratedAnimation)
	}

	if err := stream.Send(&pbportal.GenerateOrEditSceneResponse{
		Slide:     slide,
		Completed: true,
	}); err != nil {
		return nil
	}

	return nil
}

func applyTemplateToSlide(slide *pbcore.Slide, template *pbcore.Slide) {
	slide.DurationInFrames = template.DurationInFrames
	slide.SettledFrame = template.SettledFrame
	animationContent := slide.GetContent()
	animationContent.CodeRegistry = template.Content.CodeRegistry
	animationContent.Edits = template.Content.Edits
	if template.BackgroundStyle != nil {
		slide.BackgroundStyle = template.BackgroundStyle
	}
}

//func (p *Portal) newAnimationGeneratorAgent(logger *zap.Logger, sessionID, slideID, orgID string) (agent.SceneGeneratorAgent, common.AgentStatusPublisher) {
//	statePublisher := common.CreateAgentStatusPublisher(fmt.Sprintf("%s-%s", sessionID, slideID), logger)
//	return agent.NewSceneGeneratorAgent(
//		sessionID,
//		slideID,
//		orgID,
//		logger,
//		p.authStateStore,
//		p.db,
//		p.llmService,
//		p.brandIdentityService,
//		statePublisher,
//	), statePublisher
//}

func (p *Portal) newAnimationGeneratorAgent(logger *zap.Logger, sessionID, slideID, orgID string) (agent.CodeGeneratorAgent, common.AgentStatusPublisher) {
	statePublisher := common.CreateAgentStatusPublisher(fmt.Sprintf("%s-%s", sessionID, slideID), logger)
	return agent.NewCodeGeneratorAgent(
		sessionID,
		slideID,
		orgID,
		p.llmService,
		p.authStateStore,
		p.db,
		p.mediaService,
		logger,
		p.brandIdentityService,
		statePublisher,
	), statePublisher
}

func (p *Portal) GetConversationHistory(ctx context.Context, c *connect.Request[pbportal.GetConversationHistoryRequest]) (*connect.Response[pbportal.GetConversationHistoryResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videoID := strings.TrimSpace(c.Msg.VideoId)
	if videoID == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("video id is required"))
	}

	slideID := strings.TrimSpace(c.Msg.SlideId)
	if slideID == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("slide id is required"))
	}

	logger := logging.Logger(ctx, p.logger).With(
		zap.String("video_id", videoID),
		zap.String("organization_id", actor.OrganizationID),
		zap.String("slide_id", slideID),
	)

	sessionID := fmt.Sprintf("%s:%s", videoID, slideID)
	session := common.NewAgentSession(sessionID, agent.GenerateCodeSessionKeyPrefix, p.authStateStore, p.db, logger)
	sessionContext, err := session.Get(ctx)
	if err != nil {
		return nil, err
	}

	if sessionContext == nil {
		return connect.NewResponse(&pbportal.GetConversationHistoryResponse{Messages: make([]*pbcore.ConversationMessage, 0)}), nil
	}

	conversation := make([]*pbcore.ConversationMessage, 0, len(sessionContext.ConversationHistory))

	// Include USER/TOOL messages that are not MANUAL_EDITS, and if the message is THINKING then only include it for admins.
	for _, message := range sessionContext.ConversationHistory {
		isUserOrTool :=
			message.Role == pbcore.ConversationRole_CONVERSATION_ROLE_USER ||
				message.Role == pbcore.ConversationRole_CONVERSATION_ROLE_TOOL

		isAdminThinking :=
			actor.IsPlatformAdmin() &&
				message.Role == pbcore.ConversationRole_CONVERSATION_ROLE_ASSISTANT &&
				(message.Type == pbcore.ConversationMessageType_CONVERSATION_MESSAGE_THINKING ||
					message.Type == pbcore.ConversationMessageType_CONVERSATION_MESSAGE_FINAL_THINKING)

		if (isUserOrTool &&
			message.Type != pbcore.ConversationMessageType_CONVERSATION_MESSAGE_MANUAL_EDITS) ||
			isAdminThinking {

			conversation = append(conversation, message)
		}
	}

	return connect.NewResponse(&pbportal.GetConversationHistoryResponse{Messages: conversation}), nil
}
