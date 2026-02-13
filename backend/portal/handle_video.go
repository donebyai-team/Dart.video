package portal

import (
	"connectrpc.com/connect"
	"context"
	"database/sql"
	"errors"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/emptypb"
	"strings"
)

func (p *Portal) CreateVideo(ctx context.Context, c *connect.Request[pbportal.CreateVideoRequest]) (*connect.Response[pbportal.CreateVideoResponse], error) {
	logger := logging.Logger(ctx, p.logger)

	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	if c.Msg.Resolution == nil || c.Msg.Resolution.Name == "" {
		return nil, errors.New("resolution is required")
	}

	if c.Msg.Duration != 60 && c.Msg.Duration != 90 {
		return nil, errors.New("invalid duration specified")
	}

	if c.Msg.Script == nil && len(strings.TrimSpace(c.Msg.Prompt)) < 10 {
		return nil, errors.New("prompt is required")
	}

	if c.Msg.Script != nil && len(c.Msg.Script.Items) < 3 {
		return nil, errors.New("script should have at least 3 items")
	}

	video, err := p.videoGenerationService.CreateVideo(ctx, actor.OrganizationID, c.Msg)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	logger.Info("created video successfully", zap.Any("video", video))

	return connect.NewResponse(&pbportal.CreateVideoResponse{
		Id: video.ID,
	}), nil
}

func (p *Portal) GetVideo(ctx context.Context,
	req *connect.Request[pbportal.GetVideoRequest],
	stream *connect.ServerStream[pbportal.GetVideoResponse]) error {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return err
	}

	videoID := req.Msg.Id

	// Mock thinking steps for testing streaming behavior
	thinkingSteps := []string{
		"Fetching video data...",
		"Loading configuration...",
		"Processing sections...",
		"Preparing response...",
		"Finalizing...",
	}

	for stepIndex := range thinkingSteps {
		// Simulate processing time between each step
		//select {
		//case <-ctx.Done():
		//	return ctx.Err()
		//case <-time.After(50 * time.Millisecond):
		//}

		// Fetch video from database
		video, err := p.videoGenerationService.GetVideo(ctx, videoID, actor.OrganizationID)
		if err != nil {
			return connect.NewError(connect.CodeInternal, err)
		}

		// Convert to proto
		videoProto := video.ToProto()

		// Progressively reveal sections to test streaming behavior
		var sectionsToSend []*pbcore.Section
		if videoProto.Config != nil && len(videoProto.Config.Sections) > 0 {
			totalSections := len(videoProto.Config.Sections)
			// Reveal sections progressively based on the step
			numSectionsToReveal := (stepIndex + 1) * totalSections / len(thinkingSteps)
			if numSectionsToReveal > totalSections {
				numSectionsToReveal = totalSections
			}
			sectionsToSend = videoProto.Config.Sections[:numSectionsToReveal]
		}

		// Create response with staggered sections
		response := &pbportal.GetVideoResponse{
			ThinkingSummary: thinkingSteps[stepIndex],
			Video: &pbcore.Video{
				Id:       videoProto.Id,
				Name:     videoProto.Name,
				Config:   &pbcore.VideoConfig{Sections: sectionsToSend},
				Metadata: videoProto.Metadata,
				Status:   videoProto.Status,
			},
		}

		// Send stream response
		err = stream.Send(response)
		if err != nil {
			// client disconnected
			return connect.NewError(connect.CodeInternal, err)
		}

		// Exit condition: video is completed or failed, and we've sent all sections
		if (video.Status == models.VideoStatusFAILED || video.Status == models.VideoStatusCOMPLETED) &&
			stepIndex == len(thinkingSteps)-1 {
			return nil
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
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	err = p.videoGenerationService.UpdateVideoConfig(ctx, updateVideoInput)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, connect.NewError(connect.CodeNotFound, err)
		}
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&emptypb.Empty{}), nil
}
