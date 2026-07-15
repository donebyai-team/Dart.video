package services

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/errorx"
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
	GetVideo(ctx context.Context, id, organizationID string, options VideoOptions) (*models.Video, int, error)
	GetVideos(ctx context.Context, organizationID string, options VideoOptions) ([]*models.Video, error)
	UpdateVideoConfig(ctx context.Context, video *models.Video) (*models.Video, error)
	UpdateVideoStatus(ctx context.Context, ID string, status models.VideoStatus) error
	DuplicateVideo(ctx context.Context, organizationID, videoID string) (*models.Video, error)
}

type VideoOptions struct {
	IncludePending bool
	Render         bool
}

type videoGeneration struct {
	db     datastore.Repository
	logger *zap.Logger
}

func NewVideoGeneration(db datastore.Repository, logger *zap.Logger) VideoGeneration {
	return &videoGeneration{db: db, logger: logger}
}

func (v videoGeneration) UpdateVideoStatus(ctx context.Context, ID string, status models.VideoStatus) error {
	return v.db.UpdateVideoStatus(ctx, &models.Video{Status: status, ID: ID})
}

const DefaultVideoFPS = 30

func isMetadataChanged(existing *pbcore.VideoMetadata, new *pbcore.VideoMetadata) bool {
	backgroundChanged := proto.Equal(existing.BackgroundStyle, new.BackgroundStyle)
	audioChanged := proto.Equal(existing.BgAudio, new.BgAudio)
	videoBranding := proto.Equal(existing.GeneratedBranding, new.GeneratedBranding)
	return !backgroundChanged || !audioChanged || !videoBranding
}

func (v videoGeneration) UpdateVideoConfig(ctx context.Context, video *models.Video) (*models.Video, error) {
	existingVideo, err := v.db.GetVideoById(ctx, video.ID, video.OrganizationID)
	if err != nil {
		return nil, err
	}

	if video.AIGeneratedConfig != nil {
		existingVideo.AIGeneratedConfig = video.AIGeneratedConfig
		existingVideo.Config = video.AIGeneratedConfig
		video.Config = video.AIGeneratedConfig
	} else {
		if video.Version != existingVideo.Version {
			return nil, errorx.ErrVersionMismatch
		}
	}

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
		existingVideo.Metadata.BackgroundAudioUrl = video.Metadata.BackgroundAudioUrl
		existingVideo.Metadata.BgAudio = video.Metadata.BgAudio

		// Coming from slide generator
		if video.Metadata.GeneratedBranding != nil {
			existingVideo.Metadata.GeneratedBranding = video.Metadata.GeneratedBranding
		}
		if video.Metadata.ThinkingSummary != nil {
			existingVideo.Metadata.ThinkingSummary = video.Metadata.ThinkingSummary
		}
	}

	if nameChanged {
		existingVideo.Name = video.Name
	}

	// Increment version only if something actually changed
	if configChanged || metadataChanged {
		existingVideo.Version++
	}

	// Flatten all slides across sections — transitions can cross section boundaries,
	// so we must treat slides as one continuous sequence (mirrors frontend updateTotalDuration).
	var allSlides []*pbcore.Slide
	for _, section := range existingVideo.Config.Sections {
		allSlides = append(allSlides, section.Slides...)
	}

	totalDurationInFrames := int32(0)
	for i, slide := range allSlides {
		totalDurationInFrames += slide.DurationInFrames

		// subtract transition for every slide except the last one globally
		if i < len(allSlides)-1 &&
			slide.TransitionDurationInFrames != nil &&
			slide.Transition != pbcore.TransitionType_TRANSITION_NONE {

			totalDurationInFrames -= *slide.TransitionDurationInFrames
		}
	}

	existingVideo.Metadata.DurationInFrames = totalDurationInFrames

	if video.Status != "" {
		existingVideo.Status = video.Status
	}

	err = v.db.UpdateVideo(ctx, existingVideo)
	if err != nil {
		return nil, err
	}

	return existingVideo, nil
}

const letters = "abcdefghijklmnopqrstuvwxyz"

func init() {
	rand.Seed(time.Now().UnixNano())
}

// GenerateRandomName generates a random name with first letter capitalized
func GenerateRandomName(minLen, maxLen int) string {
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
		OrganizationID: organizationID,
		Status:         models.VideoStatusPLANNING,
		Metadata: &pbcore.VideoMetadata{
			Fps:              DefaultVideoFPS,
			Prompt:           params.Prompt,
			DurationInFrames: params.DurationInSec * DefaultVideoFPS,
			Language:         params.Language,
			Resolution:       params.Resolution,
			Assets:           params.Assets,
		},
	})

	if err != nil {
		return nil, err
	}

	return video, nil
}

func (v videoGeneration) DuplicateVideo(ctx context.Context, organizationID, videoID string) (*models.Video, error) {
	existingVideo, err := v.db.GetVideoById(ctx, videoID, organizationID)
	if err != nil {
		return nil, err
	}

	video, err := v.db.CreateVideo(ctx, &models.Video{
		Name:           fmt.Sprintf("%s (copy)", existingVideo.Name),
		Script:         existingVideo.Script,
		OrganizationID: organizationID,
		Status:         existingVideo.Status,
		Metadata:       existingVideo.Metadata,
	})
	if err != nil {
		return nil, err
	}

	video.AIGeneratedConfig = existingVideo.AIGeneratedConfig
	video.Config = existingVideo.Config
	video.Version = 0

	err = v.db.UpdateVideo(ctx, video)
	if err != nil {
		return nil, err
	}

	return video, nil
}

func filterGeneratedSections(video *models.Video, options VideoOptions) int {
	if video == nil || video.Config == nil {
		return 0
	}

	shouldInclude := func(slide *pbcore.Slide) bool {
		if options.IncludePending {
			return true
		}
		return slide.SlideStatus == pbcore.SlideStatus_SLIDE_STATUS_GENERATED ||
			slide.SlideStatus == pbcore.SlideStatus_SLIDE_STATUS_UNDEFINED
	}

	totalSlides := 0
	var filteredSections []*pbcore.Section
	var lastSlide *pbcore.Slide
	for _, section := range video.Config.Sections {
		var filteredSlides []*pbcore.Slide

		for _, slide := range section.Slides {
			lastSlide = slide
			totalSlides++

			if !shouldInclude(slide) {
				continue
			}

			if options.Render {
				stripSlideForRender(slide)
			}

			filteredSlides = append(filteredSlides, slide)
		}

		if len(filteredSlides) > 0 {
			section.Slides = filteredSlides
			filteredSections = append(filteredSections, section)
		}
	}

	if lastSlide != nil {
		lastSlide.Transition = pbcore.TransitionType_TRANSITION_NONE
		lastSlide.TransitionDurationInFrames = nil
		lastSlide.Direction = nil
	}

	video.Config.Sections = filteredSections
	return totalSlides
}

func stripSlideForRender(slide *pbcore.Slide) {
	if slide == nil {
		return
	}

	// remove fields not needed for rendering
	//if slide.GetContent() != nil {
	//	slide.GetContent().Plan = nil
	//	//slide.GetContent().CodeRegistry.MUrl = ""
	//}
}

func (v videoGeneration) GetVideo(ctx context.Context, id, organizationID string, options VideoOptions) (*models.Video, int, error) {
	video, err := v.db.GetVideoById(ctx, id, organizationID)
	if err != nil {
		return nil, 0, err
	}

	totalSlides := filterGeneratedSections(video, options)

	return video, totalSlides, nil
}

func (v videoGeneration) GetVideos(ctx context.Context, organizationID string, options VideoOptions) ([]*models.Video, error) {
	videos, err := v.db.GetVideos(ctx, organizationID)
	if err != nil {
		return nil, err
	}
	for _, video := range videos {
		filterGeneratedSections(video, options)
	}
	return videos, nil
}
