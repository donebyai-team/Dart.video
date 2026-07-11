package portal

import (
	"fmt"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"net/url"
)

func registerID(idRegistry map[string]string, id, entityType string) error {
	if id == "" {
		return fmt.Errorf("%s id is empty", entityType)
	}

	if existingType, exists := idRegistry[id]; exists {
		return fmt.Errorf("duplicate id '%s' found between %s and %s",
			id, existingType, entityType)
	}

	idRegistry[id] = entityType
	return nil
}

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

	if err := validateMetadata(video.Metadata); err != nil {
		return err
	}

	// Global ID registry
	idRegistry := make(map[string]string)

	for _, section := range video.Config.Sections {

		if err := validateSection(section, idRegistry); err != nil {
			return err
		}

		for _, slide := range section.Slides {
			if err := validateSlide(slide, idRegistry); err != nil {
				return errors.Wrapf(err, "slide id: %s", slide.GetId())
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

	if metadata.BackgroundStyle != nil && !IsValidBackgroundStyle(metadata.BackgroundStyle) {
		return fmt.Errorf("metadata.BackgroundStyle is invalid")
	}

	if metadata.Resolution == nil {
		return fmt.Errorf("metadata.Resolution is nil")
	}

	if metadata.Resolution.Width < 0 || metadata.Resolution.Height < 0 {
		return fmt.Errorf("metadata.Resolution.Width or metadata.Resolution.Height is invalid")
	}

	if metadata.BackgroundAudioUrl != nil {
		_, err := validateURL(*metadata.BackgroundAudioUrl)
		if err != nil {
			return fmt.Errorf("background audio url is invalid")
		}
	}

	return nil
}

func validateSection(section *pbcore.Section, idRegistry map[string]string) error {
	if err := registerID(idRegistry, section.Id, "section"); err != nil {
		return err
	}

	if utils.IsEmpty(&section.Title) {
		return fmt.Errorf("section title is empty")
	}

	if utils.IsEmpty(&section.Color) {
		return fmt.Errorf("section color is empty")
	}

	return nil
}

func validateSlide(slide *pbcore.Slide, idRegistry map[string]string) error {
	if err := registerID(idRegistry, slide.Id, "slide"); err != nil {
		return err
	}

	if slide.BackgroundStyle != nil && !IsValidBackgroundStyle(slide.BackgroundStyle) {
		return fmt.Errorf("invalid background style")
	}

	if slide.DurationInFrames <= 0 {
		return fmt.Errorf("invalid duration")
	}

	if slide.TransitionDurationInFrames != nil && *slide.TransitionDurationInFrames < 0 {
		return fmt.Errorf("invalid transition duration")
	}

	if slide.GetContent() != nil {
		if err := validateSlideAnimation(slide.GetContent()); err != nil {
			return err
		}
	}

	// Effects
	for _, s := range slide.Spotlights {
		if err := validateEffect(slide.DurationInFrames, s.Id, s.X, s.Y, s.StartFrame, s.EndFrame, "spotlight", idRegistry); err != nil {
			return err
		}
	}

	for _, c := range slide.Callouts {
		if err := validateEffect(slide.DurationInFrames, c.Id, c.X, c.Y, c.StartFrame, c.EndFrame, "callout", idRegistry); err != nil {
			return err
		}
	}

	for _, z := range slide.Zooms {
		if err := validateEffect(slide.DurationInFrames, z.Id, z.X, z.Y, z.StartFrame, z.EndFrame, "zoom", idRegistry); err != nil {
			return err
		}
	}

	return nil
}

func validateEffect(
	slideDuration int32,
	id string,
	x, y float32,
	StartFrame, EndFrame float32,
	entityType string,
	idRegistry map[string]string,
) error {

	if err := registerID(idRegistry, id, entityType); err != nil {
		return err
	}

	if x < 0 || y < 0 {
		return fmt.Errorf("%s coordinates are invalid", entityType)
	}

	if StartFrame < 0 {
		return fmt.Errorf("%s start time is invalid", entityType)
	}

	//	return fmt.Errorf("%s end time exceeds slide duration", entityType)
	//}

	if StartFrame >= EndFrame {
		return fmt.Errorf("%s start time must be less than end time", entityType)
	}

	return nil
}

func validateSlideAnimation(content *pbcore.AnimationSlideContent) error {
	if content == nil {
		return fmt.Errorf("content is nil")
	}

	if content.CodeRegistry == nil || (content.CodeRegistry.MUrl == "" && content.CodeRegistry.Code == "") {
		return fmt.Errorf("code registry can't be empty")
	}

	if content.CodeRegistry.MUrl != "" && content.CodeRegistry.Code != "" {
		return fmt.Errorf("can't have both code registry and code")
	}

	//if content.Edits == nil || len(content.Edits.Fields) == 0 {
	//	return fmt.Errorf("edits can't be empty")
	//}

	return nil
}

func IsValidBackgroundStyle(bg *pbcore.BackgroundStyle) bool {
	if bg == nil {
		return false
	}

	switch style := bg.Style.(type) {

	case *pbcore.BackgroundStyle_Solid:
		return utils.IsValidHexColor(style.Solid.Hex)

	case *pbcore.BackgroundStyle_Gradient:
		return isValidGradient(style.Gradient)

	//case *pbcore.BackgroundStyle_Image:
	//	return isValidImage(style.Image.Url)

	default:
		return false
	}
}

func isValidGradient(g *pbcore.Gradient) bool {
	if g == nil {
		return false
	}

	// Validate type
	if g.Type != pbcore.GradientType_GRADIENT_TYPE_LINEAR &&
		g.Type != pbcore.GradientType_GRADIENT_TYPE_RADIAL {
		return false
	}

	// Validate angle
	if g.Angle < 0 || g.Angle > 360 {
		return false
	}

	// Must have at least 2 stops
	if len(g.Stops) < 2 {
		return false
	}

	var prevPos int32 = -1

	for _, stop := range g.Stops {
		if stop == nil {
			return false
		}

		if !utils.IsValidHexColor(stop.Color) {
			return false
		}

		if stop.Position < 0 || stop.Position > 100 {
			return false
		}

		// Ensure sorted ascending
		if stop.Position < prevPos {
			return false
		}

		prevPos = stop.Position
	}

	return true
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
