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
	"strings"
	"time"
)

const streamHeartbeatInterval = 10 * time.Second

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
		p.logger.Info("CreateVideo stream completed", fields...)
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

	logger := logging.Logger(ctx, p.logger).With(zap.String("video_id", videoID))

	if err := stream.Send(&pbportal.CreateVideoResponse{
		Id:              video.ID,
		ThinkingSummary: "Starting planning...",
	}); err != nil {
		return errorx.ToConnect(errorx.New(errorx.CodeInternal, "STREAM_SEND_FAILED", "failed to send initial planning event", err))
	}

	videoAgent, err := p.newVideoAgent(logger)
	if err != nil {
		return errorx.ToConnect(err)
	}

	logger.Info("created video successfully; starting interactive planning", zap.String("video_id", video.ID))

	return p.streamAgentRun(ctx,
		stream,
		videoAgent,
		video.ID,
		func(runCtx context.Context) (*agent.RunResult, error) {
			return videoAgent.Start(runCtx, agent.StartSessionOptions{
				SessionID: video.ID,
				OrgID:     actor.OrganizationID,
				Input:     c.Msg,
			})
		}, logger)
}

func (p *Portal) ContinueVideoPlanning(ctx context.Context, c *connect.Request[pbportal.ContinueVideoPlanningRequest], stream *connect.ServerStream[pbportal.CreateVideoResponse]) (err error) {
	startedAt := time.Now()
	videoID := strings.TrimSpace(c.Msg.Id)
	logger := logging.Logger(ctx, p.logger).With(zap.String("video_id", videoID))

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

	videoAgent, err := p.newVideoAgent(logger)
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
		logger,
	)
}

func (p *Portal) newVideoAgent(logger *zap.Logger) (agent.VideoAgent, error) {
	return agent.NewAgentV1(
		logger,
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
	logger *zap.Logger,
) (err error) {

	startedAt := time.Now()
	exitReason := "unknown"
	logger.Info("starting agent stream loop")
	defer func() {
		fields := []zap.Field{
			zap.String("reason", exitReason),
			zap.Duration("elapsed", time.Since(startedAt)),
		}
		if err != nil {
			logger.Error("agent stream loop ended with error", append(fields, zap.Error(err))...)
			return
		}
		logger.Info("agent stream loop ended", fields...)
	}()

	// runCtx drives the agent goroutine. It is independent of the HTTP request context
	// so the agent can outlive the planning stream (e.g. after the editor opens).
	//
	// cancelRunOnReturn controls whether the deferred cancelRun fires when this
	// function returns. We set it to false for the "ready_for_editor" exit path
	// because the agent goroutine must keep running to generate the remaining slides.
	// For all other exits (client disconnected, error, completed) we cancel immediately.
	runCtx, cancelRun := context.WithCancel(context.Background())
	cancelRunOnReturn := true
	defer func() {
		if cancelRunOnReturn {
			logger.Info("streamAgentRun: cancelling runCtx on return",
				zap.String("reason", exitReason),
			)
			cancelRun()
		}
	}()

	type runOutput struct {
		result *agent.RunResult
		err    error
	}

	done := make(chan runOutput, 1)

	// ---------------------------------------------
	// Start agent run in background
	// ---------------------------------------------
	go func() {
		logger.Info("starting agent run goroutine")
		res, err := run(runCtx)
		logger.Info("agent run goroutine exited")
		select {
		case done <- runOutput{result: res, err: err}:
		default:
			// If stream exited already, don't block
		}
	}()

	heartbeatTicker := time.NewTicker(streamHeartbeatInterval)
	defer heartbeatTicker.Stop()

	stateUpdates := videoAgent.StateUpdates()

	lastThinking := ""
	lastStreamSendAt := time.Now()
	handleState := func(state *agent.VideoAgentState) (done bool) {
		if state == nil {
			return false
		}

		if state.Thinking != "" && state.Thinking != lastThinking {
			lastThinking = state.Thinking
			logger.Info("streaming thinking update",
				zap.String("thinking", lastThinking),
				zap.Int("thinking_chars", len(state.Thinking)),
			)

			if err := stream.Send(&pbportal.CreateVideoResponse{
				Id:              videoID,
				ThinkingSummary: lastThinking,
			}); err != nil {
				logger.Warn("failed to stream thinking update",
					zap.Error(err),
				)
				exitReason = "thinking_send_failed"
				return true
			}
			lastStreamSendAt = time.Now()
		}

		if state.State == agent.StateReadyForEditor {
			logger.Info("first slide ready — redirecting client to editor; agent keeps running")
			if err := stream.Send(&pbportal.CreateVideoResponse{
				Id:                videoID,
				PlanningCompleted: true,
			}); err != nil {
				logger.Warn("failed to stream ready-for-editor", zap.Error(err))

				exitReason = "ready_for_editor_send_failed"
				return true
			}
			lastStreamSendAt = time.Now()
			// The agent goroutine must keep running to generate the remaining slides.
			// Do NOT cancel runCtx here — the editor will poll via GetVideo and
			// StopAgent will be called if the user explicitly closes the editor.
			cancelRunOnReturn = false
			exitReason = "ready_for_editor"
			return true
		}
		return false
	}

	for {
		select {
		// -------------------------------------------------
		// Client disconnected during planning stream.
		// -------------------------------------------------
		case <-ctx.Done():
			logger.Info("client disconnected during planning stream — stopping agent")

			// Use StopAgent to pick the right stop strategy:
			//   • applyPlan phase → writes stateStatusCancelled to Redis (soft stop)
			//   • planning phase  → no-op here; runCtx cancel below handles it
			stopCtx, stopCancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer stopCancel()
			if stopErr := videoAgent.StopAgent(stopCtx, videoID); stopErr != nil {
				logger.Warn("StopAgent failed on planning-stream disconnect", zap.Error(stopErr))
			}

			// Always cancel runCtx so that any in-flight LLM call is aborted.
			// For the applyPlan phase the soft-cancel above does the real work,
			// and the loop will return errUserSoftCancelled before ctx.Err() matters.
			cancelRun()
			cancelRunOnReturn = false // already cancelled above; skip the defer
			exitReason = "client_disconnected"
			return nil

		// -------------------------------------------------
		// Heartbeat
		// -------------------------------------------------
		case <-heartbeatTicker.C:
			if time.Since(lastStreamSendAt) >= streamHeartbeatInterval {
				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id: videoID,
				}); err != nil {
					logger.Warn("failed to stream heartbeat", zap.Error(err))

					exitReason = "heartbeat_send_failed"
					return nil
				}
				lastStreamSendAt = time.Now()
			}

		case state := <-stateUpdates:
			if handleState(&state) {
				return nil
			}

		// -------------------------------------------------
		// Agent run completed
		// -------------------------------------------------
		case out := <-done:
			if out.err != nil {
				logger.Error("agent run failed", zap.Error(out.err))

				_ = stream.Send(&pbportal.CreateVideoResponse{
					Id:           videoID,
					ErrorMessage: out.err.Error(),
				})
				lastStreamSendAt = time.Now()
				exitReason = "agent_run_failed"
				return nil
			}

			if out.result == nil {
				logger.Error("agent returned nil result")

				_ = stream.Send(&pbportal.CreateVideoResponse{
					Id:           videoID,
					ErrorMessage: "agent returned empty result",
				})
				lastStreamSendAt = time.Now()
				exitReason = "agent_empty_result"
				return nil
			}

			if out.result.Status == agent.RunStatusWaitingForUserInput {
				logger.Info("agent waiting for user input")

				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id:                  videoID,
					WaitingForUserInput: true,
					AskUserQuestion:     toProtoQuestion(out.result.AskUserQuestion),
				}); err != nil {
					logger.Error("failed to stream ask-user-question", zap.Error(err))
					exitReason = "question_send_failed"
					return nil
				}
				lastStreamSendAt = time.Now()

				exitReason = "waiting_for_user_input"
				return nil
			}

			logger.Info("agent planning completed")
			if err := stream.Send(&pbportal.CreateVideoResponse{
				Id:                videoID,
				PlanningCompleted: true,
			}); err != nil {
				logger.Error("failed to stream planning completed", zap.Error(err))
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

// StopVideo is the explicit user-initiated stop action.
// It is called only when the user clicks "Stop" in the UI — never on disconnect/refresh.
// It delegates to StopAgent which picks the right stop strategy based on the current
// Redis state (soft Redis cancel for applyPlan phase, no-op for planning phase since
// the planning stream's context cancel already handles that case).
func (p *Portal) StopVideo(ctx context.Context, req *connect.Request[pbportal.StopVideoRequest]) (*connect.Response[emptypb.Empty], error) {
	logger := logging.Logger(ctx, p.logger)

	if _, err := p.gethAuthContext(ctx); err != nil {
		return nil, err
	}

	videoID := strings.TrimSpace(req.Msg.VideoId)
	if videoID == "" {
		return nil, errorx.ToConnect(errorx.New(errorx.CodeInvalidArgument, "VIDEO_ID_REQUIRED", "video_id is required", nil))
	}

	logger.Info("StopVideo: user requested agent stop", zap.String("video_id", videoID))

	videoAgent, err := p.newVideoAgent(logger)
	if err != nil {
		return nil, errorx.ToConnect(err)
	}

	if err := videoAgent.StopAgent(ctx, videoID); err != nil {
		logger.Error("StopVideo: StopAgent failed", zap.String("video_id", videoID), zap.Error(err))
		return nil, errorx.ToConnect(errorx.New(errorx.CodeInternal, "STOP_AGENT_FAILED", "failed to stop agent", err))
	}

	logger.Info("StopVideo: agent stop signalled successfully", zap.String("video_id", videoID))
	return connect.NewResponse(&emptypb.Empty{}), nil
}

func (p *Portal) GetVideo(ctx context.Context, req *connect.Request[pbportal.GetVideoRequest], stream *connect.ServerStream[pbportal.GetVideoResponse]) error {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return err
	}

	videoID := req.Msg.Id
	logger := logging.Logger(ctx, p.logger).With(zap.String("video_id", videoID))
	videoAgent, err := p.newVideoAgent(logger)
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
		var totalSlides int32
		if video.Status != models.VideoStatusCOMPLETED && state != nil {
			thinking = state.Thinking
			totalSlides = int32(state.TotalSlides)
		}

		if err := stream.Send(&pbportal.GetVideoResponse{
			ThinkingSummary: thinking,
			TotalSlides:     totalSlides,
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
			// Client disconnected (page refresh, tab close, network blip, etc.).
			// We do NOT stop the agent here — the agent should keep running so that
			// a page refresh can reconnect and see the continuing progress.
			// The agent is only stopped when the user explicitly calls StopVideo.
			logger.Info("GetVideo: client disconnected, stopping poll loop (agent keeps running)",
				zap.String("video_id", videoID),
			)
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
