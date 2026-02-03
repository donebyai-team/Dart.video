package portal

import (
	"connectrpc.com/connect"
	"context"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/emptypb"
	"time"
)

func (p *Portal) CreateVideo(ctx context.Context, c *connect.Request[pbportal.CreateVideoRequest]) (*connect.Response[pbportal.CreateVideoResponse], error) {
	logger := logging.Logger(ctx, p.logger)

	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	video, err := p.videoGenerationService.CreateVideo(ctx, c.Msg.Script, c.Msg.Name, actor.OrganizationID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	logger.Info("created video successfully", zap.Any("video", video))

	return connect.NewResponse(&pbportal.CreateVideoResponse{
		Id: video.ID,
	}), nil
}

func (p *Portal) GetVideo(ctx context.Context,
	c *connect.Request[pbportal.GetVideoRequest],
	stream *connect.ServerStream[pbcore.Video]) error {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return err
	}

	videoID := c.Msg.Id

	for {
		video, err := p.videoGenerationService.GetVideo(ctx, videoID, actor.OrganizationID)
		if err != nil {
			return connect.NewError(connect.CodeInternal, err)
		}

		// 2. Stream snapshot to client
		err = stream.Send(video.ToProto())
		if err != nil {
			// client disconnected
			return connect.NewError(connect.CodeInternal, err)
		}

		// 3. Exit condition
		if video.Status == models.VideoStatusFAILED ||
			video.Status == models.VideoStatusCOMPLETED {
			return nil
		}

		// 4. Backoff / polling interval
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-time.After(500 * time.Millisecond):
		}
	}

	return nil
}

func (p *Portal) GetVideos(ctx context.Context, c *connect.Request[emptypb.Empty]) (*connect.Response[pbportal.GetVideosResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videos, err := p.videoGenerationService.GetVideos(ctx, actor.OrganizationID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	videoProtos := make([]*pbcore.Video, 0, len(videos))
	for _, video := range videos {
		videoProtos = append(videoProtos, video.ToProto())
	}

	return connect.NewResponse(&pbportal.GetVideosResponse{Videos: videoProtos}), nil
}
