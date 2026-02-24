package portal

import (
	"connectrpc.com/connect"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/errorx"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/emptypb"
	"strings"
	"time"
)

const streamHeartbeatInterval = 10 * time.Second

func (p *Portal) CreateVideo(ctx context.Context, c *connect.Request[pbportal.CreateVideoRequest], stream *connect.ServerStream[pbportal.CreateVideoResponse]) (err error) {
	logger := logging.Logger(ctx, p.logger)
	startedAt := time.Now()
	videoID := ""

	defer func() {
		fields := []zap.Field{
			zap.String("video_id", videoID),
			zap.Duration("elapsed", time.Since(startedAt)),
		}
		if err != nil {
			logger.Error("CreateVideo stream failed", append(fields, zap.Error(err))...)
			return
		}
		logger.Info("CreateVideo stream completed", fields...)
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

	if err := stream.Send(&pbportal.CreateVideoResponse{
		Id:              video.ID,
		ThinkingSummary: "Starting planning...",
	}); err != nil {
		return errorx.ToConnect(errorx.New(errorx.CodeInternal, "STREAM_SEND_FAILED", "failed to send initial planning event", err))
	}

	videoAgent, err := p.newVideoAgent()
	if err != nil {
		return errorx.ToConnect(err)
	}

	logger.Info("created video successfully; starting interactive planning", zap.String("video_id", video.ID))

	return p.streamAgentRun(ctx, stream, videoAgent, video.ID, func(runCtx context.Context) (*agent.RunResult, error) {
		return videoAgent.Start(runCtx, agent.StartSessionOptions{
			SessionID: video.ID,
			OrgID:     actor.OrganizationID,
			Input:     c.Msg,
		})
	})
}

func (p *Portal) ContinueVideoPlanning(ctx context.Context, c *connect.Request[pbportal.ContinueVideoPlanningRequest], stream *connect.ServerStream[pbportal.CreateVideoResponse]) (err error) {
	logger := logging.Logger(ctx, p.logger)
	startedAt := time.Now()
	videoID := strings.TrimSpace(c.Msg.Id)

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

	if strings.TrimSpace(c.Msg.Id) == "" {
		return errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "VIDEO_ID_REQUIRED", "video id is required", nil))
	}
	if strings.TrimSpace(c.Msg.Response) == "" {
		return errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "USER_RESPONSE_REQUIRED", "response is required", nil))
	}

	videoAgent, err := p.newVideoAgent()
	if err != nil {
		return errorx.ToConnect(err)
	}
	return p.streamAgentRun(
		ctx,
		stream,
		videoAgent,
		c.Msg.Id,
		func(runCtx context.Context) (*agent.RunResult, error) {
			return videoAgent.Continue(runCtx, agent.ContinueSessionOptions{
				SessionID:    c.Msg.Id,
				OrgID:        actor.OrganizationID,
				UserResponse: c.Msg.Response,
			})
		},
	)
}

func (p *Portal) newVideoAgent() (agent.VideoAgent, error) {
	return agent.NewAgentV1(
		p.logger,
		p.authStateStore,
		p.db,
		p.videoGenerationService,
		agent.NewLlmRetrievalService(p.db),
	), nil
}

func (p *Portal) streamAgentRun(
	ctx context.Context, // THIS is the Connect request context — do not cancel it
	stream *connect.ServerStream[pbportal.CreateVideoResponse],
	videoAgent agent.VideoAgent,
	videoID string,
	run func(ctx context.Context) (*agent.RunResult, error), // run MUST accept ctx
) (err error) {

	logger := logging.Logger(ctx, p.logger)
	startedAt := time.Now()
	exitReason := "unknown"
	logger.Info("starting agent stream loop", zap.String("video_id", videoID))
	defer func() {
		fields := []zap.Field{
			zap.String("video_id", videoID),
			zap.String("reason", exitReason),
			zap.Duration("elapsed", time.Since(startedAt)),
		}
		if err != nil {
			logger.Error("agent stream loop ended with error", append(fields, zap.Error(err))...)
			return
		}
		logger.Info("agent stream loop ended", fields...)
	}()

	// ---------------------------------------------
	// Create a SEPARATE context for background run
	// ---------------------------------------------
	runCtx, runCancel := context.WithCancel(context.Background())
	defer runCancel()

	type runOutput struct {
		result *agent.RunResult
		err    error
	}

	done := make(chan runOutput, 1)

	// ---------------------------------------------
	// Start agent run in background
	// ---------------------------------------------
	go func() {
		logger.Info("starting agent run goroutine", zap.String("video_id", videoID))

		defer func() {
			if r := recover(); r != nil {
				logger.Error("agent run panicked",
					zap.String("video_id", videoID),
					zap.Any("panic", r),
				)

				select {
				case done <- runOutput{
					err: fmt.Errorf("agent panic: %v", r),
				}:
				default:
				}
			}

			logger.Info("agent run goroutine exited", zap.String("video_id", videoID))
		}()

		res, err := run(runCtx)

		select {
		case done <- runOutput{result: res, err: err}:
		default:
			// If stream exited already, don't block
		}
	}()

	ticker := time.NewTicker(300 * time.Millisecond)
	defer ticker.Stop()

	lastThinking := ""
	lastStreamSendAt := time.Now()

	for {
		select {

		// -------------------------------------------------
		// Client disconnected (DO NOT return ctx.Err())
		// -------------------------------------------------
		case <-ctx.Done():
			logger.Info("client disconnected",
				zap.String("video_id", videoID),
			)

			// Stop background run
			runCancel()

			// Important: return nil, not ctx.Err()
			exitReason = "client_disconnected"
			return nil

		// -------------------------------------------------
		// Poll agent state for thinking updates
		// -------------------------------------------------
		case <-ticker.C:
			if time.Since(lastStreamSendAt) >= streamHeartbeatInterval {
				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id: videoID,
				}); err != nil {
					logger.Warn("failed to stream heartbeat",
						zap.String("video_id", videoID),
						zap.Error(err),
					)

					runCancel()
					exitReason = "heartbeat_send_failed"
					return nil
				}
				lastStreamSendAt = time.Now()
			}

			state, errState := videoAgent.GetState(ctx, videoID)
			if errState != nil || state == nil {
				if errState != nil {
					logger.Error("failed to fetch agent state",
						zap.String("video_id", videoID),
						zap.Error(errState),
					)
				}
				continue
			}

			// Stream thinking updates
			if state.Thinking != "" && state.Thinking != lastThinking {
				lastThinking = state.Thinking

				logger.Info("streaming thinking update",
					zap.String("video_id", videoID),
					zap.String("thinking", lastThinking),
					zap.Int("thinking_chars", len(state.Thinking)),
				)

				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id:              videoID,
					ThinkingSummary: lastThinking,
				}); err != nil {

					logger.Warn("failed to stream thinking update",
						zap.String("video_id", videoID),
						zap.Error(err),
					)

					runCancel()
					exitReason = "thinking_send_failed"
					return nil // graceful close
				}
				lastStreamSendAt = time.Now()
			}

			// Early completion case
			if state.State == agent.StateReadyForEditor {
				logger.Info("state ready for editor",
					zap.String("video_id", videoID),
				)

				runCancel()

				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id:                videoID,
					PlanningCompleted: true,
				}); err != nil {

					logger.Warn("failed to stream ready-for-editor",
						zap.String("video_id", videoID),
						zap.Error(err),
					)

					exitReason = "ready_for_editor_send_failed"
					return nil
				}
				lastStreamSendAt = time.Now()

				exitReason = "ready_for_editor"
				return nil
			}

		// -------------------------------------------------
		// Agent run completed
		// -------------------------------------------------
		case out := <-done:

			runCancel()

			if out.err != nil {
				logger.Error("agent run failed",
					zap.String("video_id", videoID),
					zap.Error(out.err),
				)

				_ = stream.Send(&pbportal.CreateVideoResponse{
					Id:           videoID,
					ErrorMessage: out.err.Error(),
				})
				lastStreamSendAt = time.Now()

				exitReason = "agent_run_failed"
				return nil
			}

			if out.result == nil {
				logger.Error("agent returned nil result",
					zap.String("video_id", videoID),
				)

				_ = stream.Send(&pbportal.CreateVideoResponse{
					Id:           videoID,
					ErrorMessage: "agent returned empty result",
				})
				lastStreamSendAt = time.Now()

				exitReason = "agent_empty_result"
				return nil
			}

			if out.result.Status == agent.RunStatusWaitingForUserInput {

				logger.Info("agent waiting for user input",
					zap.String("video_id", videoID),
				)

				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id:                  videoID,
					WaitingForUserInput: true,
					AskUserQuestion:     toProtoQuestion(out.result.AskUserQuestion),
				}); err != nil {

					logger.Warn("failed to stream ask-user-question",
						zap.String("video_id", videoID),
						zap.Error(err),
					)

					exitReason = "question_send_failed"
					return nil
				}
				lastStreamSendAt = time.Now()

				exitReason = "waiting_for_user_input"
				return nil
			}

			logger.Info("agent planning completed",
				zap.String("video_id", videoID),
			)

			if err := stream.Send(&pbportal.CreateVideoResponse{
				Id:                videoID,
				PlanningCompleted: true,
			}); err != nil {

				logger.Warn("failed to stream planning completed",
					zap.String("video_id", videoID),
					zap.Error(err),
				)

				exitReason = "planning_completed_send_failed"
				return nil
			}
			lastStreamSendAt = time.Now()

			exitReason = "planning_completed"
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

func (p *Portal) GetVideo(ctx context.Context, req *connect.Request[pbportal.GetVideoRequest], stream *connect.ServerStream[pbportal.GetVideoResponse]) error {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return err
	}
	logger := logging.Logger(ctx, p.logger)

	videoID := req.Msg.Id
	videoAgent, err := p.newVideoAgent()
	if err != nil {
		return errorx.ToConnect(err)
	}

	sendCurrent := func() (*models.Video, error) {
		video, err := p.videoGenerationService.GetVideo(ctx, videoID, actor.OrganizationID)
		if err != nil {
			return nil, err
		}

		state, err := videoAgent.GetState(ctx, videoID)
		if err != nil {
			logger.Debug("failed to load agent state in GetVideo", zap.String("video_id", videoID), zap.Error(err))
		}

		thinking := ""
		if video.Status != models.VideoStatusCOMPLETED && state != nil {
			thinking = state.Thinking
		}

		if err := stream.Send(&pbportal.GetVideoResponse{
			ThinkingSummary: thinking,
			Video:           video.ToProto(),
		}); err != nil {
			return nil, err
		}

		return video, nil
	}

	initialVideo, err := sendCurrent()
	if err != nil {
		return errorx.ToConnect(errorx.New(errorx.CodeInternal, "VIDEO_FETCH_FAILED", "failed to fetch video stream snapshot", err))
	}
	if initialVideo.Status == models.VideoStatusCOMPLETED {
		return nil
	}

	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			video, err := sendCurrent()
			if err != nil {
				return errorx.ToConnect(errorx.New(errorx.CodeInternal, "VIDEO_FETCH_FAILED", "failed to fetch video stream snapshot", err))
			}
			if video.Status == models.VideoStatusCOMPLETED || video.Status == models.VideoStatusFAILED {
				// once terminal, stop streaming
				return nil
			}
		}
	}
}

func (p *Portal) GetVideos(ctx context.Context, c *connect.Request[emptypb.Empty]) (*connect.Response[pbportal.GetVideosResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videos, err := p.videoGenerationService.GetVideos(ctx, actor.OrganizationID)
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
