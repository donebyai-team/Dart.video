package portal

import (
	"connectrpc.com/connect"
	"context"
	"errors"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"go.uber.org/zap"
	"strings"
)

func (p *Portal) GenerateMusic(ctx context.Context, c *connect.Request[pbportal.VideoRequestWithID]) (*connect.Response[pbportal.GetMediaAssetsResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videoID := strings.TrimSpace(c.Msg.VideoId)
	if videoID == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("video id is required"))
	}

	p.logger.Info("Generating music", zap.String("videoID", videoID))

	video, _, err := p.videoGenerationService.GetVideo(ctx, videoID, actor.OrganizationID, services.VideoOptions{IncludePending: false})
	if err != nil {
		return nil, err
	}

	assets, err := p.audioGenerationProvider.GenerateMusic(ctx, video)
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(&pbportal.GetMediaAssetsResponse{Assets: assets}), nil
}
