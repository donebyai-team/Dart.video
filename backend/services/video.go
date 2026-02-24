package services

import (
	"context"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"go.uber.org/zap"
	"google.golang.org/protobuf/proto"
	"math/rand"
	"time"
)

type VideoGeneration interface {
	CreateVideo(ctx context.Context, organizationID string, params *pbportal.CreateVideoRequest) (*models.Video, error)
	GetVideo(ctx context.Context, id, organizationID string) (*models.Video, error)
	GetVideos(ctx context.Context, organizationID string) ([]*models.Video, error)
	UpdateVideoConfig(ctx context.Context, video *models.Video) error
}

type videoGeneration struct {
	db     datastore.Repository
	logger *zap.Logger
}

func NewVideoGeneration(db datastore.Repository, logger *zap.Logger) VideoGeneration {
	return &videoGeneration{db: db, logger: logger}
}

const defaultVideoFPS = 30

func isMetadataChanged(existing *pbcore.VideoMetadata, new *pbcore.VideoMetadata) bool {
	backgroundChanged := proto.Equal(existing.BackgroundStyle, new.BackgroundStyle)
	return !backgroundChanged
}

func (v videoGeneration) UpdateVideoConfig(ctx context.Context, video *models.Video) error {
	existingVideo, err := v.db.GetVideoById(ctx, video.ID, video.OrganizationID)
	if err != nil {
		return err
	}

	existingVideo.AIGeneratedConfig = video.AIGeneratedConfig
	configChanged := !proto.Equal(existingVideo.Config, video.Config)
	nameChanged := video.Name != existingVideo.Name
	metadataChanged := false

	if video.Metadata != nil {
		// Optional: compare metadata if needed
		// only background can be changes
		metadataChanged = isMetadataChanged(existingVideo.Metadata, video.Metadata)
	}

	// Apply updates
	if configChanged {
		existingVideo.Config = video.Config
	}
	if video.Metadata != nil {
		existingVideo.Metadata.BackgroundStyle = video.Metadata.BackgroundStyle
	}

	if nameChanged {
		existingVideo.Name = video.Name
	}

	// Increment version only if something actually changed
	if configChanged || metadataChanged {
		existingVideo.Version++
	}

	totalDuration := float32(0.0)

	for _, section := range existingVideo.Config.Sections {
		slides := section.Slides
		if len(slides) == 0 {
			continue
		}

		for i, slide := range slides {
			totalDuration += slide.Duration

			// subtract transition if NOT last slide
			if i < len(slides)-1 &&
				slide.TransitionDuration != nil &&
				slide.Transition != pbcore.TransitionType_TRANSITION_NONE {

				totalDuration -= *slide.TransitionDuration
			}
		}
	}

	existingVideo.Metadata.Duration = totalDuration

	existingVideo.Metadata.Duration = totalDuration

	if video.Status != "" {
		existingVideo.Status = video.Status
	}

	return v.db.UpdateVideo(ctx, existingVideo)
}

const letters = "abcdefghijklmnopqrstuvwxyz"

// GenerateRandomName generates a random name with first letter capitalized
func GenerateRandomName(minLen, maxLen int) string {
	rand.Seed(time.Now().UnixNano())

	length := rand.Intn(maxLen-minLen+1) + minLen

	name := make([]byte, length)

	for i := 0; i < length; i++ {
		name[i] = letters[rand.Intn(len(letters))]
	}

	// Capitalize first letter
	name[0] = byte(name[0] - 32) // convert a-z → A-Z

	return string(name)
}

func (v videoGeneration) CreateVideo(ctx context.Context, organizationID string, params *pbportal.CreateVideoRequest) (*models.Video, error) {
	video, err := v.db.CreateVideo(ctx, &models.Video{
		Name:           GenerateRandomName(5, 10),
		Script:         params.Script,
		OrganizationID: organizationID,
		Status:         models.VideoStatusPROCESSING,
		Metadata: &pbcore.VideoMetadata{
			Fps:            defaultVideoFPS,
			Prompt:         params.Prompt,
			Duration:       params.Duration,
			BrandLibraryId: params.BrandLibraryId,
			Language:       params.Language,
		},
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
