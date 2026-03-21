package portal

import (
	"connectrpc.com/connect"
	"context"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"google.golang.org/protobuf/types/known/emptypb"
)

func (p *Portal) GetMediaAssets(ctx context.Context, c *connect.Request[emptypb.Empty]) (*connect.Response[pbportal.GetMediaAssetsResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}
	assets, err := p.db.GetMediaAssetsByOrgID(ctx, actor.OrganizationID)
	if err != nil {
		return nil, err
	}

	protoAssets := make([]*pbcore.MediaAsset, 0, len(assets))
	for _, asset := range assets {
		protoAssets = append(protoAssets, assetToProto(asset))
	}

	return connect.NewResponse(&pbportal.GetMediaAssetsResponse{Assets: protoAssets}), nil
}

func assetToProto(asset *models.MediaAsset) *pbcore.MediaAsset {
	return &pbcore.MediaAsset{
		Url:       asset.Path,
		Width:     float32(asset.Metadata.Width),
		Height:    float32(asset.Metadata.Height),
		MimeType:  asset.MimeType,
		Size:      float32(asset.Metadata.Size),
		FileId:    asset.Metadata.FileName,
		FileName:  asset.Metadata.FileName,
		Id:        asset.ID,
		MediaType: asset.MediaType,
	}
}
