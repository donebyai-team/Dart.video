package psql

import (
	"context"
	"fmt"

	"github.com/shank318/coasterai/models"
)

func init() {
	registerFiles([]string{
		"video/create_video.sql",
		"video/update_video.sql",
		"video/query_video_by_id.sql",
		"video/query_video_by_org.sql",
	})
}

func (r *Database) CreateVideo(ctx context.Context, video *models.Video) (*models.Video, error) {
	stmt := r.mustGetStmt("video/create_video.sql")
	var id string

	err := stmt.GetContext(ctx, &id, map[string]interface{}{
		"name":            video.Name,
		"status":          video.Status,
		"script":          video.Script,
		"organization_id": video.OrganizationID,
		"metadata":        video.Metadata,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create video: %w", err)
	}
	video.ID = id
	return video, nil
}

func (r *Database) UpdateVideo(ctx context.Context, video *models.Video) error {
	stmt := r.mustGetStmt("video/update_video.sql")
	_, err := stmt.ExecContext(ctx, map[string]interface{}{
		"config":              video.Config,
		"status":              video.Status,
		"ai_generated_config": video.AIGeneratedConfig,
		"organization_id":     video.OrganizationID,
		"metadata":            video.Metadata,
		"id":                  video.ID,
	})
	if err != nil {
		return fmt.Errorf("failed to update video %q: %w", video.ID, err)
	}
	return nil
}

func (r *Database) GetVideoById(ctx context.Context, ID, organizationID string) (*models.Video, error) {
	return getOne[models.Video](ctx, r, "video/query_video_by_id.sql", map[string]any{
		"id":              ID,
		"organization_id": organizationID,
	})
}

func (r *Database) GetVideos(ctx context.Context, organizationID string) ([]*models.Video, error) {
	return getMany[models.Video](ctx, r, "video/query_video_by_org.sql", map[string]any{
		"organization_id": organizationID,
	})
}
