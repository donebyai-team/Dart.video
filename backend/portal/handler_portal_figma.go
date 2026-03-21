package portal

import (
	"connectrpc.com/connect"
	"context"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
)

func (p *Portal) ListFigmaFrames(ctx context.Context, c *connect.Request[pbportal.ListFigmaFramesRequest]) (*connect.Response[pbportal.ListFigmaFramesResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	resp, err := p.figmaService.ListFrames(ctx, actor.OrganizationID, c.Msg)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(resp), nil
}

func (p *Portal) ImportFigmaFrame(ctx context.Context, c *connect.Request[pbportal.ImportFigmaFrameRequest]) (*connect.Response[pbportal.ImportFigmaFrameResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	resp, err := p.figmaService.ImportFrame(ctx, c.Msg.FileKey, c.Msg.NodeId, actor.OrganizationID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}
	return connect.NewResponse(resp), nil
}
