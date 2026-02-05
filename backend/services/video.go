package services

import (
	"context"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"go.uber.org/zap"
)

type VideoGeneration interface {
	CreateVideo(ctx context.Context, script *pbcore.Script, name, organizationID string) (*models.Video, error)
	GetVideo(ctx context.Context, id, organizationID string) (*models.Video, error)
	GetVideos(ctx context.Context, organizationID string) ([]*models.Video, error)
}

type videoGeneration struct {
	db     datastore.Repository
	logger *zap.Logger
}

func NewVideoGeneration(db datastore.Repository, logger *zap.Logger) VideoGeneration {
	return &videoGeneration{db: db, logger: logger}
}

const defaultVideoFPS = 30

func (v videoGeneration) CreateVideo(ctx context.Context, script *pbcore.Script, name, organizationID string) (*models.Video, error) {
	video, err := v.db.CreateVideo(ctx, &models.Video{
		Name:           name,
		Script:         script,
		OrganizationID: organizationID,
		Status:         models.VideoStatusPROCESSING,
		Metadata:       &pbcore.VideoMetadata{Fps: defaultVideoFPS},
	})

	if err != nil {
		return nil, err
	}

	// start the agent here

	return video, nil
}

func (v videoGeneration) GetVideo(ctx context.Context, id, organizationID string) (*models.Video, error) {
	return v.db.GetVideoById(ctx, id, organizationID)
}

func (v videoGeneration) GetVideos(ctx context.Context, organizationID string) ([]*models.Video, error) {
	return v.db.GetVideos(ctx, organizationID)
}
