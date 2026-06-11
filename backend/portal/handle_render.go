package portal

import (
	"connectrpc.com/connect"
	"context"
	"errors"
	"github.com/shank318/coasterai/models"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
)

func (p *Portal) RenderVideo(ctx context.Context, c *connect.Request[pbportal.VideoRequestWithID]) (*connect.Response[pbportal.RenderVideoResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	existingVideo, _, err := p.getVideo(ctx, c.Msg.VideoId, actor.OrganizationID, services.VideoOptions{
		IncludePending: false,
		Render:         true,
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInvalidArgument, err)
	}

	if existingVideo.Status != models.VideoStatusCOMPLETED {
		return nil, connect.NewError(connect.CodeInvalidArgument, errors.New("video generation is still processing"))
	}

	jobID, err := p.renderVideoService.SubmitJob(ctx, &services.SubmitRenderJobInput{
		Props: existingVideo.ToProto(),
	})
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&pbportal.RenderVideoResponse{
		JobId:   jobID,
		VideoId: existingVideo.ID,
		Version: int64(existingVideo.Version),
	}), nil
}
