package scenes

import "testing"

func TestSceneConfigComputeDurationFrames(t *testing.T) {
	t.Run("computes duration for single component scene", func(t *testing.T) {
		scene := SceneConfig{
			Name:               "TextStagger",
			DurationExpression: `ceil((size(props.splitBy == "char" ? props.text.split("") : props.splitBy == "line" ? props.text.split("\n") : props.text.split(" ")) - 1) * props.staggerDelay + props.duration)`,
			Props: map[string]any{
				"text":         "AI models",
				"staggerDelay": 5,
				"duration":     15,
				"splitBy":      "word",
			},
		}

		if got := scene.ComputeDurationFrames(); got != 20 {
			t.Fatalf("expected 20 frames, got %d", got)
		}
	})

	t.Run("computes duration for repeated scene props", func(t *testing.T) {
		scene := SceneConfig{
			Name:               "IconShowcase",
			DurationExpression: `ceil(10 + (size(props.icons) - 1) * 5 + 10 + 5 + 15 + (size(props.textstagger.text.trim().split(" ")) - 1) * 5 + 15)`,
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
