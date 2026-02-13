package portal

import (
	"fmt"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"net/url"
	"regexp"
	"strconv"
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

	if metadata.BackgroundColor != nil && !IsValidBackground(*metadata.BackgroundColor) {
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

	if slide.BackgroundColor != nil && !IsValidBackground(*slide.BackgroundColor) {
		return fmt.Errorf("background color is invalid")
	}

	if slide.Duration <= 0 {
		return fmt.Errorf("duration is invalid")
	}

	if slide.TransitionDuration != nil && *slide.TransitionDuration < 0 {
		return fmt.Errorf("transition duration is invalid")
	}

	if slide.GetImage() != nil {
		err := validateSlideImage(slide.GetImage())
		if err != nil {
			return err
		}
	}

	if slide.GetVideo() != nil {
		err := validateSlideVideo(slide.GetVideo())
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

	for _, spotlight := range slide.Spotlights {
		err := validateSpotlightEffect(slide.Duration, spotlight)
		if err != nil {
			return errors.Wrap(err, fmt.Sprintf("spotlight id: %s", spotlight.Id))
		}
	}

	for _, callout := range slide.Callouts {
		err := validateCalloutEffect(slide.Duration, callout)
		if err != nil {
			return errors.Wrap(err, fmt.Sprintf("callout id: %s", callout.Id))
		}
	}

	for _, zoom := range slide.Zooms {
		err := validateZoomEffect(slide.Duration, zoom)
		if err != nil {
			return errors.Wrap(err, fmt.Sprintf("zoom id: %s", zoom.Id))
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

func validateSpotlightEffect(slideDuration float32, effect *pbcore.SpotlightEffect) error {
	if effect == nil {
		return fmt.Errorf("effect is nil")
	}

	if utils.IsEmpty(&effect.Id) {
		return fmt.Errorf("effect id is empty")
	}

	if effect.X < 0 || effect.Y < 0 {
		return fmt.Errorf("effect.X or effect.Y is invalid")
	}

	if effect.StartTime < 0 {
		return fmt.Errorf("effect.StartTime is invalid")
	}

	if effect.EndTime <= 0 || effect.EndTime > slideDuration {
		return fmt.Errorf("effect endtime should be under slide duration")
	}

	return nil
}

func validateCalloutEffect(slideDuration float32, effect *pbcore.CalloutEffect) error {
	if effect == nil {
		return fmt.Errorf("effect is nil")
	}

	if utils.IsEmpty(&effect.Id) {
		return fmt.Errorf("effect id is empty")
	}

	if effect.X < 0 || effect.Y < 0 {
		return fmt.Errorf("effect.X or effect.Y is invalid")
	}

	if effect.StartTime < 0 {
		return fmt.Errorf("effect.StartTime is invalid")
	}

	if effect.EndTime <= 0 || effect.EndTime > slideDuration {
		return fmt.Errorf("effect endtime should be under slide duration")
	}

	return nil
}

func validateZoomEffect(slideDuration float32, effect *pbcore.ZoomEffect) error {
	if effect == nil {
		return fmt.Errorf("effect is nil")
	}

	if utils.IsEmpty(&effect.Id) {
		return fmt.Errorf("effect id is empty")
	}

	if effect.X < 0 || effect.Y < 0 {
		return fmt.Errorf("effect.X or effect.Y is invalid")
	}

	if effect.StartTime < 0 {
		return fmt.Errorf("effect.StartTime is invalid")
	}

	if effect.EndTime <= 0 || effect.EndTime > slideDuration {
		return fmt.Errorf("effect endtime should be under slide duration")
	}

	return nil
}

func validateSlideImage(content *pbcore.MediaSlideContent) error {
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
		return fmt.Errorf("invalid image src: %w", err)
	}

	return nil
}

func validateSlideVideo(content *pbcore.MediaSlideContent) error {
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

	if _, err := validateURL(src); err != nil {
		return fmt.Errorf("invalid video src: %w", err)
	}

	return nil
}

func validateContentMeta(meta *pbcore.MetaData) error {
	if meta == nil {
		return fmt.Errorf("content meta is nil")
	}

	if meta.X < 0 || meta.Y < 0 {
		return fmt.Errorf("content meta x,y coordinates are invalid")
	}

	if meta.Width < 0 || meta.Height < 0 {
		return fmt.Errorf("content meta width or height is invalid")
	}

	return nil
}

var hexColorRegex = regexp.MustCompile(`^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$`)
var linearGradientRegex = regexp.MustCompile(
	`^linear-gradient\(\s*([^)]+)\s*\)$`,
)

func IsValidBackground(s string) bool {

	s = strings.TrimSpace(s)

	if isValidHexColor(s) {
		return true
	}

	if isValidLinearGradient(s) {
		return true
	}

	return false
}

func isValidLinearGradient(s string) bool {

	matches := linearGradientRegex.FindStringSubmatch(s)
	if len(matches) < 2 {
		return false
	}

	inside := matches[1]

	parts := strings.Split(inside, ",")
	if len(parts) < 3 {
		return false // need angle + at least 2 stops
	}

	// Validate angle
	angle := strings.TrimSpace(parts[0])
	if !strings.HasSuffix(angle, "deg") {
		return false
	}

	angleValue := strings.TrimSuffix(angle, "deg")
	if _, err := strconv.Atoi(angleValue); err != nil {
		return false
	}

	// Validate stops
	for _, stop := range parts[1:] {

		stop = strings.TrimSpace(stop)

		tokens := strings.Fields(stop)
		if len(tokens) == 0 {
			return false
		}

		// first token must be hex
		if !isValidHexColor(tokens[0]) {
			return false
		}

		// optional position
		if len(tokens) > 1 {
			pos := strings.TrimSuffix(tokens[1], "%")
			if _, err := strconv.Atoi(pos); err != nil {
				return false
			}
		}
	}

	return true
}

func isValidHexColor(s string) bool {
	return s == "transparent" || hexColorRegex.MatchString(s)
}

func validateImageURL(raw string) error {
	_, err := validateURL(raw)
	if err != nil {
		return err
	}

	return nil
	//ext := strings.ToLower(path.Ext(u.Path))
	//switch ext {
	//case ".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg":
	//	return nil
	//default:
	//	return fmt.Errorf("unsupported image extension")
	//}
}

func validateURL(raw string) (*url.URL, error) {
	_, err := url.ParseRequestURI(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid url format")
	}

	//if u.Scheme != "http" && u.Scheme != "https" {
	//	return nil, fmt.Errorf("url must be http or https")
	//}
	return nil, nil
}
