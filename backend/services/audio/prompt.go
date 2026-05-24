package audio

import (
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/agent/scenes/types"
	"github.com/shank318/coasterai/models"
	"strings"
)

type VideoDescription struct {
	FPS                   int
	TotalDurationInFrames int
	Scenes                []SceneDescription
	Prompt                string
}

type SceneDescription struct {
	Description                string `json:"description"`
	DurationInFrames           int    `json:"duration_in_frames"`
	Section                    string `json:"section"`
	Text                       string `json:"text"`
	TransitionDurationInFrames int    `json:"transition_duration_in_frames"`
}

func GenerateVideoDescription(video *models.Video) VideoDescription {
	scenesDescription := make([]SceneDescription, 0)
	videoDescription := VideoDescription{
		TotalDurationInFrames: int(video.Metadata.DurationInFrames),
		Scenes:                scenesDescription,
		FPS:                   int(video.Metadata.Fps),
	}

	for _, section := range video.Config.Sections {
		sceneDescription := SceneDescription{
			Section: section.Title,
		}

		for _, scene := range section.Slides {
			componentField := scene.Content.Edits.Fields["name"]
			if componentField == nil {
				continue
			}
			componentName := componentField.GetStringValue()
			component, err := scenes.FindComponent(componentName)
			if err != nil {
				continue
			}

			for _, schema := range component.Schema {
				if schema.Type != "component" {
					continue
				}
				for _, field := range schema.Fields {
					elementObject := scene.Content.Edits.Fields[schema.Name]
					if elementObject == nil {
						continue
					}

					if field.Type == types.FieldTypeString && field.DataType == types.DataTypeText {
						structValue := elementObject.GetStructValue()
						if structValue == nil {
							continue
						}

						textField := structValue.Fields["text"]
						if textField == nil {
							continue
						}

						sceneDescription.Text = textField.GetStringValue()
					}
				}
			}

			sceneDescription.Description = component.Description
			sceneDescription.DurationInFrames = int(scene.DurationInFrames)
			if scene.TransitionDurationInFrames != nil && *scene.TransitionDurationInFrames > 0 {
				sceneDescription.TransitionDurationInFrames = int(scene.DurationInFrames)
			}

			videoDescription.Scenes = append(videoDescription.Scenes, sceneDescription)
		}
	}

	return videoDescription
}

func GeneratePrompt(video *models.Video) (*VideoDescription, error) {
	description := GenerateVideoDescription(video)

	if description.TotalDurationInFrames == 0 {
		return nil, errors.New("total duration must be greater than zero")
	}

	if len(description.Scenes) == 0 {
		return nil, errors.New("no scenes found")
	}

	fps := float64(description.FPS)

	var builder strings.Builder

	builder.WriteString("VIDEO MUSIC PLAN\n")
	builder.WriteString("================\n\n")

	for idx, scene := range description.Scenes {
		durationMs := int((float64(scene.DurationInFrames) / fps) * 1000)
		transitionMs := int((float64(scene.TransitionDurationInFrames) / fps) * 1000)

		builder.WriteString(fmt.Sprintf("Section %d\n", idx+1))
		builder.WriteString(fmt.Sprintf("  Name        : %s\n", scene.Section))
		builder.WriteString(fmt.Sprintf("  Duration    : %dms\n", durationMs))
		if transitionMs > 0 {
			builder.WriteString(fmt.Sprintf("  Transition  : %dms\n", transitionMs))
		}
		builder.WriteString(fmt.Sprintf("  Text        : %s\n", scene.Text))
		builder.WriteString(fmt.Sprintf("  Description : %s\n", scene.Description))

		if idx != len(description.Scenes)-1 {
			builder.WriteString("\n")
		}
	}

	description.Prompt = builder.String()

	return &description, nil
}
