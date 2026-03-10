package agent

import (
	"fmt"
	"github.com/shank318/coasterai/baml_client/types"
)

const (
	maxSlides       = 30
	DefaultDuration = 5
	maxDuration     = 10
	minDuration     = 1
)

func sanitizeAgentPlan(plan *types.VideoGenerationPlan) error {
	totalSlides := 0

	for _, section := range plan.Sections {
		for _, slide := range section.Slides {
			totalSlides++
			sanitizeDuration(&slide)
		}
	}

	if totalSlides >= maxSlides {
		return fmt.Errorf("agent plan seems too optimistic or hallucinated, please try again")
	}

	return nil
}

func sanitizeDuration(slide *types.Union2AnimationSlideOrMediaSlide) {
	if slide.IsMediaSlide() {
		media := slide.AsMediaSlide()
		if !isValidDuration(media.Duration, minDuration, maxDuration) {
			media.Duration = DefaultDuration
		}
		return
	}

	if slide.IsAnimationSlide() {
		anim := slide.AsAnimationSlide()
		if !isValidDuration(anim.Duration, minDuration, maxDuration) {
			anim.Duration = DefaultDuration
		}
		return
	}
}

func isValidDuration(d, min, max int64) bool {
	return d > min && d <= max
}

func IsValidDuration(d int64) bool {
	return d > minDuration && d <= maxDuration
}
