package portal

import (
	"connectrpc.com/connect"
	"context"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/utils"
	"google.golang.org/protobuf/types/known/emptypb"
)

func (p *Portal) CreateBrandIdentity(ctx context.Context, c *connect.Request[pbportal.BrandIdentityRequest]) (*connect.Response[pbcore.BrandIdentity], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	if !utils.IsValidURL(c.Msg.WebsiteUrl) {
		return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("invalid url"))
	}

	identity, err := p.brandIdentityService.CreateBrandIdentity(ctx, actor.OrganizationID, c.Msg.WebsiteUrl)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(identity), nil

}

func (p *Portal) GetBrandIdentities(ctx context.Context, c *connect.Request[emptypb.Empty]) (*connect.Response[pbportal.BrandIdentityResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	identities, err := p.brandIdentityService.GetBrandIdentities(ctx, actor.OrganizationID)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&pbportal.BrandIdentityResponse{
		Identities:     identities,
		SupportedFonts: p.brandIdentityService.GetSupportedFonts(ctx, actor.OrganizationID),
	}), nil
}

func (p *Portal) UpdateBrandIdentity(ctx context.Context, c *connect.Request[pbportal.UpdateBrandIdentityRequest]) (*connect.Response[emptypb.Empty], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	err = p.brandIdentityService.UpdateBrandIdentity(ctx, actor.OrganizationID, c.Msg.Identity)
	if err != nil {
		return nil, connect.NewError(connect.CodeInternal, err)
	}

	return connect.NewResponse(&emptypb.Empty{}), nil
}
