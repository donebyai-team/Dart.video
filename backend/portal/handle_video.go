package portal

import (
	"connectrpc.com/connect"
	"context"
	"database/sql"
	"errors"
	"github.com/shank318/coasterai/agent"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/errorx"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/emptypb"
	"io"
	"strings"
	"time"
)

func (p *Portal) CreateVideo(ctx context.Context, c *connect.Request[pbportal.CreateVideoRequest], stream *connect.ServerStream[pbportal.CreateVideoResponse]) (err error) {
	startedAt := time.Now()
	videoID := ""

	defer func() {
		fields := []zap.Field{
			zap.String("video_id", videoID),
			zap.Duration("elapsed", time.Since(startedAt)),
		}
		if err != nil {
			p.logger.Error("CreateVideo stream failed", append(fields, zap.Error(err))...)
			return
		}
		p.logger.Info("CreateVideo planning stream completed", fields...)
	}()

	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return err
	}

	if c.Msg.Resolution == nil || c.Msg.Resolution.Name == "" {
		return errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "VIDEO_RESOLUTION_REQUIRED", "resolution is required", nil))
	}

	if c.Msg.Duration != 60 && c.Msg.Duration != 90 {
		return errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "VIDEO_INVALID_DURATION", "invalid duration specified", nil))
	}

	if c.Msg.Script == nil && len(strings.TrimSpace(c.Msg.Prompt)) < 10 {
		return errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "VIDEO_PROMPT_REQUIRED", "prompt is required", nil))
	}

	if c.Msg.Script != nil && len(c.Msg.Script.Items) < 3 {
		return errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "VIDEO_SCRIPT_TOO_SHORT", "script should have at least 3 items", nil))
	}

	video, err := p.videoGenerationService.CreateVideo(ctx, actor.OrganizationID, c.Msg)
	if err != nil {
		return errorx.ToConnect(errorx.New(errorx.CodeInternal, "VIDEO_CREATE_FAILED", "failed to create video", err))
	}
	videoID = video.ID

	logger := logging.Logger(ctx, p.logger).With(zap.String("session_id", videoID))

	if err := stream.Send(&pbportal.CreateVideoResponse{
		Id:              video.ID,
		ThinkingSummary: "Starting planning...",
	}); err != nil {
		return errorx.ToConnect(errorx.New(errorx.CodeInternal, "STREAM_SEND_FAILED", "failed to send initial planning event", err))
	}

	videoAgent := p.newVideoAgent(logger, videoID, actor.OrganizationID)

	logger.Info("created video successfully; starting interactive planning", zap.String("video_id", video.ID))

	return p.streamAgentRun(ctx,
		stream,
		videoAgent,
		video.ID,
		func(runCtx context.Context) (*agent.RunResult, error) {
			return videoAgent.Start(runCtx, agent.StartSessionOptions{
				OrgID: actor.OrganizationID,
				Input: c.Msg,
			})
		}, logger)
}

func (p *Portal) ContinueVideoPlanning(ctx context.Context, c *connect.Request[pbportal.ContinueVideoPlanningRequest], stream *connect.ServerStream[pbportal.CreateVideoResponse]) (err error) {
	startedAt := time.Now()
	videoID := strings.TrimSpace(c.Msg.Id)
	logger := logging.Logger(ctx, p.logger).With(zap.String("session_id", videoID))

	defer func() {
		fields := []zap.Field{
			zap.String("video_id", videoID),
			zap.Duration("elapsed", time.Since(startedAt)),
		}
		if err != nil {
			logger.Error("ContinueVideoPlanning stream failed", append(fields, zap.Error(err))...)
			return
		}
		logger.Info("ContinueVideoPlanning stream completed", fields...)
	}()

	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return err
	}

	if videoID == "" {
		return errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "VIDEO_ID_REQUIRED", "video id is required", nil))
	}
	if strings.TrimSpace(c.Msg.Response) == "" {
		return errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "USER_RESPONSE_REQUIRED", "response is required", nil))
	}

	videoAgent := p.newVideoAgent(logger, videoID, actor.OrganizationID)

	return p.streamAgentRun(
		ctx,
		stream,
		videoAgent,
		c.Msg.Id,
		func(runCtx context.Context) (*agent.RunResult, error) {
			return videoAgent.Continue(runCtx, agent.ContinueSessionOptions{
				OrgID:        actor.OrganizationID,
				UserResponse: c.Msg.Response,
			})
		},
		logger,
	)
}

func (p *Portal) newVideoAgent(logger *zap.Logger, sessionID, orgID string) agent.VideoAgent {
	return agent.NewAgentV1(
		sessionID,
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

func (p *Portal) streamAgentRun(
	ctx context.Context, // THIS is the Connect request context — do not cancel it
	stream *connect.ServerStream[pbportal.CreateVideoResponse],
	videoAgent agent.VideoAgent,
	videoID string,
	run func(ctx context.Context) (*agent.RunResult, error), // run MUST accept ctx
	logger *zap.Logger,
) (err error) {
	runCtx, cancelRun := context.WithCancel(context.Background())
	defer cancelRun()

	type runOutput struct {
		result *agent.RunResult
		err    error
	}

	done := make(chan runOutput, 1)

	go func() {
		res, err := run(runCtx)
		select {
		case done <- runOutput{result: res, err: err}:
		default:
		}
	}()

	stateUpdates := videoAgent.StateUpdates()
	lastThinking := ""

	for {
		select {
		case <-ctx.Done():
			// Client disconnected. This cancels runCtx via defer and therefore stops
			// planning (and applyPlan only if first slide is not ready yet).
			logger.Debug("streamAgentRun cancelled")
			return nil

		case state := <-stateUpdates:
			if state.Thinking != "" && state.Thinking != lastThinking {
				logger.Info("agent thinking", zap.String("thinking", state.Thinking))
				lastThinking = state.Thinking
				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id:              videoID,
					ThinkingSummary: state.Thinking,
				}); err != nil {
					return nil
				}
			}
		case out := <-done:
			if out.err != nil {
				logger.Error("agent stopped, planning failed", zap.Error(out.err))
				_ = stream.Send(&pbportal.CreateVideoResponse{
					Id:           videoID,
					ErrorMessage: out.err.Error(),
				})
				return nil
			}

			if out.result == nil {
				logger.Error("agent stopped, returned empty result")
				_ = stream.Send(&pbportal.CreateVideoResponse{
					Id:           videoID,
					ErrorMessage: "agent returned empty result",
				})
				return nil
			}

			if out.result.Status == agent.RunStatusWaitingForUserInput {
				logger.Info("agent stopped waiting for user input")
				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id:                  videoID,
					WaitingForUserInput: true,
					AskUserQuestion:     toProtoQuestion(out.result.AskUserQuestion),
				}); err != nil {
					return nil
				}
				return nil
			}

			if err := stream.Send(&pbportal.CreateVideoResponse{
				Id:                videoID,
				PlanningCompleted: true,
			}); err != nil {
				return nil
			}
			logger.Info("planning completed, started apply plan async")
			// runPlanning already spawned applyPlan in background.
			return nil
		}
	}
}

func toProtoQuestion(question *types.AskUserQuestion) *pbportal.AskUserQuestion {
	if question == nil {
		return nil
	}
	return &pbportal.AskUserQuestion{
		ToolName:         question.Tool_name,
		QuestionText:     question.Question_text,
		Options:          question.Options,
		AllowCustomEntry: question.Allow_custom_entry,
	}
}

func (p *Portal) DeleteVideo(ctx context.Context, c *connect.Request[pbportal.DeleteVideoRequest]) (*connect.Response[emptypb.Empty], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videoID := c.Msg.VideoId

	err = p.db.DeleteByID(ctx, videoID, actor.OrganizationID)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&emptypb.Empty{}), nil
}

// StopVideo is the explicit user-initiated stop action.
// It is called only when the user clicks "Stop" in the UI — never on disconnect/refresh.
// It delegates to StopAgent which marks cancellation in Redis and updates video status.
func (p *Portal) StopVideo(ctx context.Context, req *connect.Request[pbportal.StopVideoRequest]) (*connect.Response[emptypb.Empty], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videoID := strings.TrimSpace(req.Msg.VideoId)
	if videoID == "" {
		return nil, errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "VIDEO_ID_REQUIRED", "video_id is required", nil))
	}

	logger := logging.Logger(ctx, p.logger).With(zap.String("session_id", videoID))

	logger.Info("StopVideo: user requested agent stop")

	videoAgent := p.newVideoAgent(logger, videoID, actor.OrganizationID)

	if err := videoAgent.StopAgent(ctx, videoID); err != nil {
		logger.Error("StopVideo: StopAgent failed", zap.String("video_id", videoID), zap.Error(err))
		return nil, errorx.ToConnect(errorx.New(errorx.CodeInternal, "STOP_AGENT_FAILED", "failed to stop agent", err))
	}

	logger.Info("StopVideo: agent stop signalled successfully", zap.String("video_id", videoID))
	return connect.NewResponse(&emptypb.Empty{}), nil
}

func (p *Portal) GetVideo(
	ctx context.Context,
	req *connect.Request[pbportal.GetVideoRequest],
	stream *connect.ServerStream[pbportal.GetVideoResponse],
) error {

	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return err
	}

	videoID := req.Msg.Id
	logger := logging.Logger(ctx, p.logger).With(zap.String("session_id", videoID))

	var videoAgent agent.VideoAgent // lazy init

	sendCurrent := func() (*models.Video, error) {
		video, totalSlides, err := p.videoGenerationService.GetVideo(ctx, videoID, actor.OrganizationID, false)
		if err != nil {
			return nil, err
		}

		thinking := ""
		if video.Status == models.VideoStatusPROCESSING {
			if videoAgent == nil {
				videoAgent = p.newVideoAgent(logger, videoID, actor.OrganizationID)
			}
			state, err := videoAgent.GetState(ctx)
			if err != nil {
				logger.Debug("failed to load agent state in GetVideo",
					zap.String("video_id", videoID),
					zap.Error(err))
			} else if state != nil {
				thinking = state.Thinking
			}
		}

		if err := stream.Send(&pbportal.GetVideoResponse{
			ThinkingSummary: thinking,
			TotalSlides:     int32(totalSlides),
			Video:           video.ToProto(),
		}); err != nil {
			return nil, err
		}

		return video, nil
	}

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()

	for {
		video, err := sendCurrent()
		if err != nil {
			return errorx.ToConnect(
				errorx.New(errorx.CodeInternal, "VIDEO_FETCH_FAILED", "failed to fetch video stream snapshot", err),
			)
		}

		if termErr := handleVideoTerminalState(video); termErr != nil {
			if errors.Is(termErr, io.EOF) {
				return nil
			}
			return termErr
		}

		select {
		case <-ctx.Done():
			logger.Info("GetVideo: client disconnected, stopping poll loop (agent keeps running)")
			return ctx.Err()

		case <-ticker.C:
			continue
		}
	}
}

func handleVideoTerminalState(video *models.Video) error {
	switch video.Status {
	case models.VideoStatusFAILED:
		return errorx.ToConnect(
			errorx.New(errorx.CodeInternal, "VIDEO_FAILED", "video generation failed", nil),
		)

	case models.VideoStatusCOMPLETED,
		models.VideoStatusUSERCANCELLED:
		return io.EOF // signal: stop streaming cleanly
	}

	return nil
}
func (p *Portal) GetVideos(ctx context.Context, c *connect.Request[emptypb.Empty]) (*connect.Response[pbportal.GetVideosResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videos, err := p.videoGenerationService.GetVideos(ctx, actor.OrganizationID, false)
	if err != nil {
		return nil, errorx.ToConnect(errorx.New(errorx.CodeInternal, "VIDEO_LIST_FAILED", "failed to list videos", err))
	}

	videoProtos := make([]*pbcore.Video, 0, len(videos))
	for _, video := range videos {
		videoProtos = append(videoProtos, video.ToProto())
	}

	return connect.NewResponse(&pbportal.GetVideosResponse{Videos: videoProtos}), nil
}

func (p *Portal) UpdateVideoConfig(ctx context.Context, c *connect.Request[pbportal.UpdateVideoConfigRequest]) (*connect.Response[emptypb.Empty], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	updateVideoInput := &models.Video{
		ID:             c.Msg.Id,
		OrganizationID: actor.OrganizationID,
		Config:         c.Msg.Config,
		Metadata:       c.Msg.Metadata,
		Name:           c.Msg.Name,
	}

	err = validateVideoConfig(updateVideoInput)
	if err != nil {
		return nil, errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "VIDEO_CONFIG_INVALID", err.Error(), err))
	}

	err = p.videoGenerationService.UpdateVideoConfig(ctx, updateVideoInput)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, errorx.ToConnect(errorx.New(errorx.CodeNotFound, "VIDEO_NOT_FOUND", "video not found", err))
		}
		return nil, errorx.ToConnect(errorx.New(errorx.CodeInternal, "VIDEO_UPDATE_FAILED", "failed to update video config", err))
	}

	return connect.NewResponse(&emptypb.Empty{}), nil
}
