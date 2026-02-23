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

func (p *Portal) CreateVideo(ctx context.Context, c *connect.Request[pbportal.CreateVideoRequest], stream *connect.ServerStream[pbportal.CreateVideoResponse]) error {
	logger := logging.Logger(ctx, p.logger)

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
	runCtx := context.WithoutCancel(ctx)

	return p.streamAgentRun(ctx, stream, videoAgent, video.ID, func() (*agent.RunResult, error) {
		return videoAgent.Start(runCtx, agent.StartSessionOptions{
			SessionID: video.ID,
			OrgID:     actor.OrganizationID,
			Input:     c.Msg,
		})
	})
}

func (p *Portal) ContinueVideoPlanning(ctx context.Context, c *connect.Request[pbportal.ContinueVideoPlanningRequest], stream *connect.ServerStream[pbportal.CreateVideoResponse]) error {
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
	runCtx := context.WithoutCancel(ctx)

	return p.streamAgentRun(ctx, stream, videoAgent, c.Msg.Id, func() (*agent.RunResult, error) {
		return videoAgent.Continue(runCtx, agent.ContinueSessionOptions{
			SessionID:    c.Msg.Id,
			OrgID:        actor.OrganizationID,
			UserResponse: c.Msg.Response,
		})
	})
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
	ctx context.Context,
	stream *connect.ServerStream[pbportal.CreateVideoResponse],
	videoAgent agent.VideoAgent,
	videoID string,
	run func() (*agent.RunResult, error),
) error {
	logger := logging.Logger(ctx, p.logger)
	done := make(chan struct {
		result *agent.RunResult
		err    error
	}, 1)

	logger.Info("starting agent stream loop", zap.String("video_id", videoID))

	go func() {
		logger.Info("starting agent run goroutine", zap.String("video_id", videoID))
		res, err := run()
		if err != nil {
			logger.Warn("agent run finished with error", zap.String("video_id", videoID), zap.Error(err))
		} else if res != nil {
			logger.Info("agent run finished", zap.String("video_id", videoID), zap.String("status", string(res.Status)))
		} else {
			logger.Info("agent run finished with nil result", zap.String("video_id", videoID))
		}
		done <- struct {
			result *agent.RunResult
			err    error
		}{result: res, err: err}
	}()

	ticker := time.NewTicker(300 * time.Millisecond)
	defer ticker.Stop()

	lastThinking := ""
	for {
		select {
		case <-ctx.Done():
			logger.Info("agent stream cancelled by context", zap.String("video_id", videoID), zap.Error(ctx.Err()))
			return ctx.Err()

		case <-ticker.C:
			state, err := videoAgent.GetState(ctx, videoID)
			if err != nil || state == nil {
				if err != nil {
					logger.Debug("failed to fetch agent state", zap.String("video_id", videoID), zap.Error(err))
				}
				continue
			}

			if state.Thinking != "" && state.Thinking != lastThinking {
				lastThinking = state.Thinking
				logger.Debug("streaming thinking update", zap.String("video_id", videoID), zap.Int("thinking_chars", len(state.Thinking)))
				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id:              videoID,
					ThinkingSummary: state.Thinking,
				}); err != nil {
					logger.Warn("failed to stream thinking update", zap.String("video_id", videoID), zap.Error(err))
					return errorx.ToConnect(errorx.New(errorx.CodeInternal, "STREAM_SEND_FAILED", "failed to stream thinking update", err))
				}
			}

			if state.State == agent.StateReadyForEditor {
				logger.Info("first slide persisted; stream can hand off to editor", zap.String("video_id", videoID))
				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id:                videoID,
					PlanningCompleted: true,
				}); err != nil {
					logger.Warn("failed to stream ready-for-editor event", zap.String("video_id", videoID), zap.Error(err))
					return errorx.ToConnect(errorx.New(errorx.CodeInternal, "STREAM_SEND_FAILED", "failed to stream ready-for-editor event", err))
				}
				return nil
			}

		case out := <-done:
			if out.err != nil {
				logger.Error("agent run failed", zap.String("video_id", videoID), zap.Error(out.err))
				_ = stream.Send(&pbportal.CreateVideoResponse{
					Id:           videoID,
					ErrorMessage: out.err.Error(),
				})
				return errorx.ToConnect(out.err)
			}

			if out.result == nil {
				logger.Error("agent returned nil result", zap.String("video_id", videoID))
				return errorx.ToConnect(errorx.New(errorx.CodeInternal, "AGENT_EMPTY_RESULT", "agent returned empty result", nil))
			}

			if out.result.Status == agent.RunStatusWaitingForUserInput {
				logger.Info("agent waiting for user input", zap.String("video_id", videoID))
				if err := stream.Send(&pbportal.CreateVideoResponse{
					Id:                  videoID,
					WaitingForUserInput: true,
					AskUserQuestion:     toProtoQuestion(out.result.AskUserQuestion),
				}); err != nil {
					logger.Warn("failed to stream ask-user-question event", zap.String("video_id", videoID), zap.Error(err))
					return errorx.ToConnect(errorx.New(errorx.CodeInternal, "STREAM_SEND_FAILED", "failed to stream ask-user-question event", err))
				}
				return nil
			}

			logger.Info("agent planning completed", zap.String("video_id", videoID))
			if err := stream.Send(&pbportal.CreateVideoResponse{
				Id:                videoID,
				PlanningCompleted: true,
			}); err != nil {
				logger.Warn("failed to stream planning completed event", zap.String("video_id", videoID), zap.Error(err))
				return errorx.ToConnect(errorx.New(errorx.CodeInternal, "STREAM_SEND_FAILED", "failed to stream planning completed event", err))
			}
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
