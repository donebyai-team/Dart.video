package portal

import (
	"connectrpc.com/connect"
	"context"
	"errors"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services/providers"
	"go.uber.org/zap"
	"strings"
)

func (p *Portal) GenerateVoiceover(ctx context.Context, c *connect.Request[pbportal.GenerateVoiceoverRequest]) (*connect.Response[pbcore.Voiceover], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videoID := strings.TrimSpace(c.Msg.VideoId)
	if videoID == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("video id is required"))
	}

	p.logger.Info("Generating voiceover",
		zap.String("videoID", videoID),
		zap.String("slideId", c.Msg.SlideId),
	)

	ctx = p.setContext(ctx, actor.OrganizationID, videoID, c.Msg.SlideId)

	voiceover, err := p.audioGenerationProvider.GenerateVoiceover(ctx, providers.VoiceOverParams{
		Text:    c.Msg.Text,
		VoiceID: c.Msg.VoiceId,
		OrgID:   actor.OrganizationID,
	})
	if err != nil {
		return nil, err
	}

	return connect.NewResponse(voiceover), nil
}

func (p *Portal) GenerateMusic(ctx context.Context, c *connect.Request[pbportal.VideoRequestWithID]) (*connect.Response[pbportal.GetMediaAssetsResponse], error) {
	return nil, nil
}
