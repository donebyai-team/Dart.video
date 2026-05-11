package portal

import (
	"connectrpc.com/connect"
	"context"
	"errors"
	"github.com/shank318/coasterai/agent"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
	"strings"
)

func (p *Portal) SuggestScenes(ctx context.Context, c *connect.Request[pbportal.SuggestScenesRequest]) (*connect.Response[pbportal.SuggestScenesResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videoID := strings.TrimSpace(c.Msg.VideoId)
	if videoID == "" {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("video id is required"))
	}

	logger := logging.Logger(ctx, p.logger).With(
		zap.String("session_id", videoID),
		zap.String("organization_id", actor.OrganizationID),
		zap.String("slide_id", c.Msg.SceneId),
	)

	video, _, err := p.videoGenerationService.GetVideo(ctx, videoID, actor.OrganizationID, services.VideoOptions{IncludePending: false})
	if err != nil {
		return nil, err
	}

	suggester := agent.NewSceneSuggester(p.brandIdentityService, logger)
	suggestions, err := suggester.GenerateSuggestions(ctx, c.Msg.SceneId, video)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&pbportal.SuggestScenesResponse{Scenes: suggestions}), nil
}
