package portal

import (
	"connectrpc.com/connect"
	"context"
	"errors"
	"github.com/shank318/coasterai/baml_client/types"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/audio"
	"go.uber.org/zap"
	"strings"
)

func (p *Portal) GenerateNarration(ctx context.Context, c *connect.Request[pbportal.VideoRequestWithID]) (*connect.Response[pbportal.GenerateNarrationResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videoID := strings.TrimSpace(c.Msg.VideoId)
	if videoID == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("video id is required"))
	}

	p.logger.Info("Generating narattion", zap.String("videoID", videoID))

	video, _, err := p.videoGenerationService.GetVideo(ctx, videoID, actor.OrganizationID, services.VideoOptions{IncludePending: false})
	if err != nil {
		return nil, err
	}

	description := audio.GenerateVideoDescription(ctx, video, p.logger)
	narrationResp, err := p.llmService.GenerateNarration(ctx, types.GenerateVideoNarrationRequest{
		Description: description.GenerateNarrationPrompt(),
	})
	if err != nil {
		return nil, err
	}

	protoResponse := make([]*pbportal.NarrationSegment, 0, len(narrationResp.Segments))

	for _, narration := range narrationResp.Segments {
		protoResponse = append(protoResponse, &pbportal.NarrationSegment{Text: narration.Text})
	}

	return connect.NewResponse(&pbportal.GenerateNarrationResponse{Segments: protoResponse}), nil
}

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
