package portal

import (
	"connectrpc.com/connect"
	"context"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
)

func (p *Portal) GetMediaAssets(ctx context.Context, c *connect.Request[pbportal.GetMediaAssetsRequest]) (*connect.Response[pbportal.GetMediaAssetsResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}
	assets, err := p.db.GetMediaAssetsByOrgID(ctx, actor.OrganizationID, c.Msg.MediaType)
	if err != nil {
		return nil, err
	}

	protoAssets := make([]*pbcore.MediaAsset, 0, len(assets))
	for _, asset := range assets {
		protoAssets = append(protoAssets, asset.ToProto())
	}

	return connect.NewResponse(&pbportal.GetMediaAssetsResponse{Assets: protoAssets}), nil
}

func (p *Portal) GetMediaAssetsByID(ctx context.Context, c *connect.Request[pbportal.GetMediaAssetsByIDs]) (*connect.Response[pbportal.GetMediaAssetsResponse], error) {
	_, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}
	assets, err := p.db.GetMediaAssetsByID(ctx, c.Msg.AssetsIDs)
	if err != nil {
		return nil, err
	}

	protoAssets := make([]*pbcore.MediaAsset, 0, len(assets))
	for _, asset := range assets {
		protoAssets = append(protoAssets, asset.ToProto())
	}

	return connect.NewResponse(&pbportal.GetMediaAssetsResponse{Assets: protoAssets}), nil
}
