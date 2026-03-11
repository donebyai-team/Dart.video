package portal

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"github.com/shank318/coasterai/models"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
)

func (p *Portal) ListFigmaFrames(ctx context.Context, c *connect.Request[pbportal.ListFigmaFramesRequest]) (*connect.Response[pbportal.ListFigmaFramesResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	integration, err := p.getActiveFigmaIntegration(ctx, actor.OrganizationID)
	if err != nil {
		return nil, connect.NewError(connect.CodeFailedPrecondition, err)
	}

	resp, err := p.figmaService.ListFrames(ctx, integration.AccessToken, c.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *Portal) ImportFigmaFrame(ctx context.Context, c *connect.Request[pbportal.ImportFigmaFrameRequest]) (*connect.Response[pbportal.ImportFigmaFrameResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	integration, err := p.getActiveFigmaIntegration(ctx, actor.OrganizationID)
	if err != nil {
		return nil, connect.NewError(connect.CodeFailedPrecondition, err)
	}

	resp, err := p.figmaService.ImportFrame(ctx, integration.AccessToken, c.Msg.FileKey, c.Msg.NodeId, actor.OrganizationID)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *Portal) getActiveFigmaIntegration(ctx context.Context, organizationID string) (*models.FigmaConfig, error) {
	if p.figmaService == nil {
		return nil, fmt.Errorf("figma service is not configured")
	}

	integrations, err := p.db.GetIntegrationByOrgAndType(ctx, organizationID, models.IntegrationTypeFIGMA)
	if err != nil {
		return nil, err
	}
	for _, integration := range integrations {
		if integration.State == models.IntegrationStateACTIVE {
			return integration.GetFigmaConfig(), nil
		}
	}
	return nil, fmt.Errorf("figma integration is not connected")
}
