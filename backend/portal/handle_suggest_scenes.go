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

func (p *Portal) GenerateSuggestions(ctx context.Context, c *connect.Request[pbportal.GenerateSuggestionsInput]) (*connect.Response[pbportal.GenerateSuggestionsResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	videoID := strings.TrimSpace(c.Msg.VideoId)
	if videoID == "" || c.Msg.Slide == nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("video and slide is required"))
	}

	logger := logging.Logger(ctx, p.logger).With(
		zap.String("session_id", videoID),
		zap.String("organization_id", actor.OrganizationID),
		zap.String("slide_id", c.Msg.Slide.Id),
	)

	// TODO: Remove it later
	c.Msg.PageSize = 4

	suggester := agent.NewSceneSuggester(p.brandIdentityService, p.db, logger)
	suggestions, err := suggester.GenerateSuggestions(ctx, c.Msg)
	if err != nil {
		logger.Error("failed to generate suggestions", zap.Error(err))
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(suggestions), nil

}

func (p *Portal) RenderSuggestion(ctx context.Context, c *connect.Request[pbportal.RenderSuggestionsInput]) (*connect.Response[pbportal.SuggestScenesResponse], error) {
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
	)

	video, _, err := p.getVideo(ctx, videoID, actor.OrganizationID, services.VideoOptions{IncludePending: false})
	if err != nil {
		return nil, err
	}

	if video.IsTemplate {
		return connect.NewResponse(&pbportal.SuggestScenesResponse{}), nil
	}

	suggester := agent.NewSceneSuggester(p.brandIdentityService, p.db, logger)
	suggestions, err := suggester.RenderSuggestion(ctx, c.Msg.Tid, c.Msg.Slide, video)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(&pbportal.SuggestScenesResponse{Groups: suggestions}), nil
}
