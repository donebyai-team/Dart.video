package agent

import (
	"github.com/shank318/coasterai/baml_client/types"
	"strings"
)

func isContentSlide(scene *types.Scene) bool {
	if scene == nil || len(scene.Elements) == 0 {
		return false
	}

	component := scene.Elements[0].Component
	return strings.EqualFold(component, "TextWithImageScene") ||
		//strings.EqualFold(component, "TextWithVideoScene") ||
		strings.EqualFold(component, "MultiImageStack")
}

func getNextScene(
	sections []types.SceneSection,
	sectionIndex int,
	slideIndex int,
) *types.Scene {
	if sectionIndex < 0 || sectionIndex >= len(sections) {
		return nil
	}

	currentSection := sections[sectionIndex]

	// Next slide in same section
	if slideIndex+1 < len(currentSection.Slides) {
		return &currentSection.Slides[slideIndex+1]
	}

	// First slide of next section
	if sectionIndex+1 < len(sections) {
		nextSection := sections[sectionIndex+1]
		if len(nextSection.Slides) > 0 {
			return &nextSection.Slides[0]
		}
	}

	return nil
}
