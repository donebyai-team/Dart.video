package scenes

import "testing"

func TestSceneConfigComputeDurationFrames(t *testing.T) {
	t.Run("computes duration for single component scene", func(t *testing.T) {
		scene := SceneConfig{
			Name:               "TextStagger",
			DurationExpression: `(segmentCount(props.textstagger.text, props.textstagger.splitBy) - 1) * props.textstagger.staggerDelay + props.textstagger.duration`,
			Props: map[string]any{
				"textstagger": map[string]any{
					"text":              "AI models",
					"variant":           "heading",
					"staggerDelay":      5,
					"entranceAnimation": "scaleIn",
					"duration":          15,
					"splitBy":           "word",
				},
			},
		}

		if got := scene.ComputeDurationFrames(); got != 20 {
			t.Fatalf("expected 20 frames, got %d", got)
		}
	})

	t.Run("computes duration for text leader", func(t *testing.T) {
		scene := SceneConfig{
			Name:               "TextLeadStagger",
			DurationExpression: "(40 + max(0, segmentCount(props.textleadstagger.text, \"word\") - 2) * 5 + max(0, segmentCount(props.textleadstagger.text, \"word\") - 1) * 4) / max(0.25, props.textleadstagger.speedFactor)",
			Props: map[string]any{
				"textleadstagger": map[string]any{
					"entranceAnimation": "slideLeft",
					"speedFactor":       1,
					"text":              "Isn't getting enough clicks",
					"variant":           "displayLg",
				},
			},
		}

		if got := scene.ComputeDurationFrames(); got != 62 {
			t.Fatalf("expected 62 frames, got %d", got)
		}
	})

	t.Run("computes duration for image peel", func(t *testing.T) {
		scene := SceneConfig{
			Name:               "ImagePeel",
			DurationExpression: "30 + size(props.images) * (props.scene.holdDuration + props.scene.peelDuration)",
			Props: map[string]any{
				"imageasset-images-0": map[string]any{},
				"imageasset-images-1": map[string]any{},
				"imageasset-images-3": map[string]any{},
				"scene": map[string]any{
					"direction":    "right",
					"holdDuration": 20,
					"peelDuration": 20,
					"stackOffset":  20,
				},
			},
		}

		if got := scene.ComputeDurationFrames(); got != 150 {
			t.Fatalf("expected 150 frames, got %d", got)
		}
	})

	t.Run("computes duration for repeated scene props", func(t *testing.T) {
		scene := SceneConfig{
			Name:               "IconShowcase",
			DurationExpression: `55 + max(0, size(props.icons) - 1) * 5 + max(0, segmentCount(props.textstagger.text, "word") - 1) * 5`,
			Props: map[string]any{
				"textstagger": map[string]any{
					"text": "AI models",
				},
				"iconasset-icons-0": map[string]any{"icon": "openai"},
				"iconasset-icons-1": map[string]any{"icon": "google"},
			},
		}

		if got := scene.ComputeDurationFrames(); got != 65 {
			t.Fatalf("expected 65 frames, got %d", got)
		}
	})

	t.Run("groups repeated props by second last segment", func(t *testing.T) {
		groups := groupedRepeatProps(map[string]any{
			"iconasset-left-icons-0":  map[string]any{"icon": "openai"},
			"iconasset-left-icons-1":  map[string]any{"icon": "google"},
			"iconasset-right-icons-0": map[string]any{"icon": "meta"},
			"iconasset-left-logos-0":  map[string]any{"icon": "ignored"},
		})

		items := groups["icons"]
		if len(items) != 2 {
			t.Fatalf("expected 2 grouped items, got %d", len(items))
		}
	})

	t.Run("falls back to default frames on invalid expression", func(t *testing.T) {
		scene := SceneConfig{
			Name:               "TextStagger",
			DurationExpression: `ceil(props.missing + )`,
			Props: map[string]any{
				"text":         "AI models",
				"staggerDelay": 5,
				"duration":     15,
				"splitBy":      "word",
			},
		}

		if got := scene.ComputeDurationFrames(); got != defaultDurationFrames {
			t.Fatalf("expected default %d frames, got %d", defaultDurationFrames, got)
		}
	})
}
