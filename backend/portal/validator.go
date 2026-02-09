package portal

import (
	"fmt"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"net/url"
	"path"
	"regexp"
	"strings"
)

func validateVideoConfig(video *models.Video) error {
	if video == nil || video.Config == nil {
		return fmt.Errorf("video is nil")
	}

	if utils.IsEmpty(&video.ID) {
		return fmt.Errorf("video id is empty")
	}

	if utils.IsEmpty(&video.Name) {
		return fmt.Errorf("video name is empty")
	}

	err := validateMetadata(video.Metadata)
	if err != nil {
		return err
	}

	for _, section := range video.Config.Sections {
		err := validateSection(section)
		if err != nil {
			return errors.WithMessage(err, fmt.Sprintf("section %s is invalid", section))
		}

		for _, slide := range section.Slides {
			err = validateSlide(slide)
			if err != nil {
				return errors.Wrap(err, fmt.Sprintf("slide id: %s, type: %s: ", slide.GetId(), slide.Type.String()))
			}
		}
	}

	return nil
}

func validateMetadata(metadata *pbcore.VideoMetadata) error {
	if metadata == nil {
		return fmt.Errorf("metadata is nil")
	}

	if metadata.Fps <= 0 {
		return fmt.Errorf("metadata.Fps is invalid")
	}

	if metadata.BackgroundColor != nil && !isValidHexColor(*metadata.BackgroundColor) {
		return fmt.Errorf("metadata.BackgroundColor is invalid")
	}

	if metadata.Resolution == nil {
		return fmt.Errorf("metadata.Resolution is nil")
	}

	if metadata.Resolution.Width < 0 || metadata.Resolution.Height < 0 {
		return fmt.Errorf("metadata.Resolution.Width or metadata.Resolution.Height is invalid")
	}

	return nil
}

func validateSection(section *pbcore.Section) error {
	if utils.IsEmpty(&section.Id) {
		return fmt.Errorf("section id is empty")
	}

	if utils.IsEmpty(&section.Title) {
		return fmt.Errorf("section title is empty")
	}

	if utils.IsEmpty(&section.Color) {
		return fmt.Errorf("section color is empty")
	}

	return nil
}

func validateSlide(slide *pbcore.Slide) error {
	if utils.IsEmpty(&slide.Id) {
		return fmt.Errorf("id is empty")
	}

	if slide.BackgroundColor != nil && !isValidHexColor(*slide.BackgroundColor) {
		return fmt.Errorf("background color is invalid")
	}

	if slide.Duration <= 0 {
		return fmt.Errorf("duration is invalid")
	}

	if slide.TransitionDuration != nil && *slide.TransitionDuration <= 0 {
		return fmt.Errorf("transition duration is invalid")
	}

	if slide.GetImage() != nil {
		err := validateSlideImage(slide.GetImage())
		if err != nil {
			return err
		}
	}

	if slide.GetAnimation() != nil {
		err := validateSlideAnimation(slide.GetAnimation())
		if err != nil {
			return err
		}
	}

	return nil
}

func validateSlideAnimation(content *pbcore.AnimationSlideContent) error {
	if content == nil {
		return fmt.Errorf("content is nil")
	}

	if utils.IsEmpty(&content.TemplateId) {
		return fmt.Errorf("template id is empty")
	}

	if content.TemplateConfig == nil {
		return fmt.Errorf("template config is nil")
	}

	// ---- Meta Validation ----
	err := validateContentMeta(content.GetMeta())
	if err != nil {
		return err
	}

	return nil
}

func validateSlideImage(content *pbcore.ImageSlideContent) error {
	if content == nil {
		return fmt.Errorf("content is nil")
	}

	// ---- Meta Validation ----
	err := validateContentMeta(content.GetMeta())
	if err != nil {
		return err
	}

	// ---- Src Validation ----
	src := strings.TrimSpace(content.Src)
	if src == "" {
		return fmt.Errorf("src is required")
	}

	if err := validateImageURL(src); err != nil {
		return fmt.Errorf("invalid src: %w", err)
	}

	return nil
}

func validateContentMeta(meta *pbcore.MetaData) error {
	if meta == nil {
		return fmt.Errorf("content meta is nil")
	}

	if meta.X == nil {
		return fmt.Errorf("content meta.x is required")
	}
	if meta.Y == nil {
		return fmt.Errorf("content meta.y is required")
	}
	if meta.Width == nil {
		return fmt.Errorf("content meta.width is required")
	}
	if meta.Height == nil {
		return fmt.Errorf("content meta.height is required")
	}

	// Optional sanity checks (recommended)
	if *meta.Width <= 0 {
		return fmt.Errorf("meta.width must be > 0")
	}
	if *meta.Height <= 0 {
		return fmt.Errorf("meta.height must be > 0")
	}

	return nil
}

var hexColorRegex = regexp.MustCompile(`^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$`)

func isValidHexColor(s string) bool {
	return hexColorRegex.MatchString(s)
}

func validateImageURL(raw string) error {
	u, err := url.ParseRequestURI(raw)
	if err != nil {
		return fmt.Errorf("invalid url format")
	}

	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("url must be http or https")
	}

	ext := strings.ToLower(path.Ext(u.Path))
	switch ext {
	case ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg":
		return nil
	default:
		return fmt.Errorf("unsupported image extension")
	}
}
