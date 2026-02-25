package portal

import (
	"connectrpc.com/connect"
	"context"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"google.golang.org/protobuf/types/known/emptypb"
)

func (p *Portal) CreateBrandIdentity(ctx context.Context, c *connect.Request[pbportal.BrandIdentityRequest]) (*connect.Response[pbcore.BrandIdentity], error) {
	//TODO implement me
	panic("implement me")
}

func (p *Portal) GetBrandIdentities(ctx context.Context, c *connect.Request[emptypb.Empty]) (*connect.Response[pbportal.BrandIdentityResponse], error) {
	//TODO implement me
	panic("implement me")
}

func (p *Portal) UpdateBrandIdentity(ctx context.Context, c *connect.Request[pbportal.UpdateBrandIdentityRequest]) (*connect.Response[emptypb.Empty], error) {
	//TODO implement me
	panic("implement me")
}
