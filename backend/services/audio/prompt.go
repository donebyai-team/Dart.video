package audio

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/models"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/code_builder"
	"github.com/shank318/coasterai/services/templates"
	"go.uber.org/zap"
	"strings"
)

type VideoDescription struct {
	FPS                   int
	TotalDurationInFrames int
	Scenes                []SceneDescription
}

type SceneDescription struct {
	VisualDescription          string `json:"visual_description"`
	DurationInFrames           int    `json:"duration_in_frames"`
	Section                    string `json:"section"`
	Text                       string `json:"text"`
	TransitionDurationInFrames int    `json:"transition_duration_in_frames"`
}

func GenerateVideoDescription(ctx context.Context, video *models.Video, logger *zap.Logger) VideoDescription {
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
			// Extract visual description
			// If it's a template component
			componentField := scene.Content.Edits.Fields["name"]
			if componentField != nil {
				componentName := componentField.GetStringValue()
				component, _ := scenes.FindComponent(componentName)
				if component != nil {
					sceneDescription.VisualDescription = component.Description
				}
			} else if scene.Content.CodeRegistry.MUrl != "" {
				// Extract from codeSnapshot
				code, _ := services.DownloadCode(ctx, scene.Content.CodeRegistry.MUrl)
				if code != "" {
					sceneDescription.VisualDescription = code_builder.ExtractDescriptionCommentsFromGeneratedCode(code)
				}
			}

			sceneDescription.Text = templates.ExtractSceneContent(scene, logger)

			sceneDescription.DurationInFrames = int(scene.DurationInFrames)
			if scene.TransitionDurationInFrames != nil && *scene.TransitionDurationInFrames > 0 {
				sceneDescription.TransitionDurationInFrames = int(scene.DurationInFrames)
			}

			videoDescription.Scenes = append(videoDescription.Scenes, sceneDescription)
		}
	}

	return videoDescription
}

func (description VideoDescription) GenerateNarrationPrompt() string {
	if description.TotalDurationInFrames == 0 {
		return ""
	}

	if len(description.Scenes) == 0 {
		return ""
	}

	fps := float64(description.FPS)
	totalDurationSec := float64(description.TotalDurationInFrames) / fps

	var b strings.Builder

	b.WriteString("Video Description\n")
	b.WriteString("=================\n\n")
	b.WriteString(fmt.Sprintf("Total Duration: %.1fs\n", totalDurationSec))

	currentFrame := 0

	for i, scene := range description.Scenes {
		startSec := float64(currentFrame) / fps
		endSec := float64(currentFrame+scene.DurationInFrames) / fps
		durationSec := float64(scene.DurationInFrames) / fps

		b.WriteString(fmt.Sprintf("Scene %d\n", i+1))
		b.WriteString(fmt.Sprintf("- Time: %.1fs - %.1fs\n", startSec, endSec))
		b.WriteString(fmt.Sprintf("- Duration: %.1fs\n", durationSec))

		if scene.Section != "" {
			b.WriteString(fmt.Sprintf("- Section: %s\n", scene.Section))
		}

		if scene.VisualDescription != "" {
			b.WriteString(fmt.Sprintf("- Visual: %s\n", scene.VisualDescription))
		}

		if scene.Text != "" {
			b.WriteString("- On-screen Text:\n")
			b.WriteString(scene.Text)
			b.WriteString("\n")
		}

		if i != len(description.Scenes)-1 {
			b.WriteString("\n")
		}

		currentFrame += scene.DurationInFrames
	}

	return b.String()
}
