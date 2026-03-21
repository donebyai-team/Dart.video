package psql

import (
	"context"
	"fmt"
	"github.com/lib/pq"
	"github.com/shank318/coasterai/models"
)

func init() {
	registerFiles([]string{
		"media_asset/create_media_asset.sql",
		"media_asset/query_media_asset_by_ids.sql",
		"media_asset/query_media_asset_by_org_id.sql",
	})
}

const baseGCPBucketURL = "https://storage.googleapis.com"

func (r *Database) GetMediaAssetsByID(ctx context.Context, IDs []string) ([]*models.MediaAsset, error) {
	mediaAssets, err := getMany[models.MediaAsset](ctx, r, "media_asset/query_media_asset_by_ids.sql", map[string]any{
		"ids": pq.Array(IDs),
	})
	if err != nil {
		return nil, err
	}

	for _, mediaAsset := range mediaAssets {
		mediaAsset.Path = toFullUrl(mediaAsset.Path)
	}

	return mediaAssets, nil
}

func toFullUrl(path string) string {
	return fmt.Sprintf("%s/%s", baseGCPBucketURL, path)
}

func (r *Database) GetMediaAssetsByOrgID(ctx context.Context, orgID string) ([]*models.MediaAsset, error) {
	mediaAssets, err := getMany[models.MediaAsset](ctx, r, "media_asset/query_media_asset_by_org_id.sql", map[string]any{
		"organization_id": orgID,
	})
	if err != nil {
		return nil, err
	}

	for _, mediaAsset := range mediaAssets {
		mediaAsset.Path = toFullUrl(mediaAsset.Path)
	}
	return mediaAssets, nil
}

func (r *Database) CreateMediaAsset(ctx context.Context, asset *models.MediaAsset) (*models.MediaAsset, error) {
	stmt := r.mustGetStmt("media_asset/create_media_asset.sql")
	var id string

	err := stmt.GetContext(ctx, &id, map[string]interface{}{
		"path":            asset.Path,
		"media_type":      asset.MediaType,
		"mime_type":       asset.MimeType,
		"organization_id": asset.OrganizationID,
		"provider":        models.MediaAssetProviderGCP,
		"metadata":        asset.Metadata,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create media asset: %w", err)
	}
	asset.ID = id
	return asset, nil
}
