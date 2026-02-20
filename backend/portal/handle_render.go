package portal

import (
	"connectrpc.com/connect"
	"context"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
)

func (p *Portal) RenderVideo(ctx context.Context, c *connect.Request[pbportal.RenderVideoRequest]) (*connect.Response[pbportal.RenderVideoResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	existingVideo, err := p.db.GetVideoById(ctx, c.Msg.VideoId, actor.OrganizationID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	jobID, err := p.renderVideoService.SubmitJob(ctx, &services.SubmitRenderJobInput{
		Props: existingVideo.ToProto(),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&pbportal.RenderVideoResponse{JobId: jobID}), nil
}
