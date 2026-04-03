package scenes

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestParseSceneConfigWithIconResolver(t *testing.T) {

	tests := []struct {
		name     string
		input    string
		expected []string
	}{
		{
			name: "empty icons",
			input: `{
				"iconshowcase-0": {
					"icons": []
				}
			}`,
			expected: []string{},
		},
		{
			name: "tabler icon",
			input: `{
				"iconshowcase-0": {
					"icons": [
						"https://cdn.jsdelivr.net/npm/@tabler/icons/icons/outline/arrow-right.svg"
					]
				}
			}`,
			expected: []string{"arrow-right"},
		},
		{
			name: "brand icon",
			input: `{
				"iconshowcase-0": {
					"icons": [
						"https://www.thesvg.org/icons/openai/default.svg"
					]
				}
			}`,
			expected: []string{"openai"},
		},
		{
			name: "mixed icons",
			input: `{
				"iconshowcase-0": {
					"icons": [
						"https://www.thesvg.org/icons/openai/default.svg",
						"https://cdn.jsdelivr.net/npm/@tabler/icons/icons/outline/sparkles.svg"
					]
				}
			}`,
			expected: []string{"openai", "sparkles"},
		},
		{
			name: "invalid icons",
			input: `{
				"iconshowcase-0": {
					"icons": [
						"openai"
					]
				}
			}`,
			expected: []string{},
		},
	}

	for _, tt := range tests {

		t.Run(tt.name, func(t *testing.T) {

			nodes, err := ParseSceneConfigFromEditsPatch([]byte(tt.input), nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if len(nodes) != 1 {
				t.Fatalf("expected 1 node, got %d", len(nodes))
			}

			node := nodes[0]

			raw := node.Props["icons"]

			icons, ok := raw.([]string)
			if !ok {
				t.Fatalf("icons not converted to []string, got %T", raw)
			}

			if len(icons) != len(tt.expected) {
				t.Fatalf("expected %d icons, got %d", len(tt.expected), len(icons))
			}

			for i := range icons {
				if icons[i] != tt.expected[i] {
					t.Fatalf("expected icon %s, got %s", tt.expected[i], icons[i])
				}
			}
		})
	}
}

func TestParseSceneConfigFromEditsPatch_BasicRoot(t *testing.T) {
	input := []byte(`{
		"animatedvideo-0": {
			"src": "video.mp4"
		}
	}`)

	nodes, err := ParseSceneConfigFromEditsPatch(input, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(nodes) != 1 {
		t.Fatalf("expected 1 node, got %d", len(nodes))
	}

	node := nodes[0]

	if node.ID != "animatedvideo-0" {
		t.Errorf("expected ID animatedvideo-0, got %s", node.ID)
	}

	if node.Name != "AnimatedVideo" {
		t.Errorf("expected Type Animatedvideo, got %s", node.Name)
	}

	if node.Props["src"] != "video.mp4" {
		t.Errorf("expected src video.mp4, got %v", node.Props["src"])
	}

	list := BuildScenesList(false, nil)
	if list == "" {
		t.Fatal("expected non-empty list")
	}

}

func TestParseSceneConfigFromEditsPatch_WithChild(t *testing.T) {
	input := []byte(`{
		"animatedvideo-0": {
			"src": "video.mp4"
		},
		"text-right-animatedvideo-0": {
			"style": {
				"color": "#641414"
			}
		},
		"logoasset-left-animatedvideo-0": {
			"style": {
				"color": "#641414"
			}
		}
	}`)

	nodes, err := ParseSceneConfigFromEditsPatch(input, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	node := nodes[0]

	for _, child := range node.Children {
		if child.Name != "text" && child.Name != "logoasset" {
			t.Errorf("expected child to be text or logoasset")
		}

		style := child.Props["style"].(map[string]interface{})
		if style["color"] != "#641414" {
			t.Errorf("expected color #641414, got %v", style["color"])
		}
	}
}

func TestParseSceneConfigFromEditsPatch_MultipleRoots(t *testing.T) {
	input := []byte(`{
		"animatedvideo-0": {
			"src": "video.mp4",
			"data": [1, 2, 3]
		},
		"textstagger-1": {
			"value": "hello"
		}
	}`)

	nodes, err := ParseSceneConfigFromEditsPatch(input, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(nodes) != 2 {
		t.Fatalf("expected 2 nodes, got %d", len(nodes))
	}
}

func TestSceneConfig_ToEditsPatch(t *testing.T) {
	tests := []struct {
		name     string
		scene    SceneConfig
		expected map[string]map[string]interface{}
	}{
		{
			name: "single node",
			scene: SceneConfig{
				ID: "root",
				Props: map[string]interface{}{
					"color": "blue",
				},
			},
			expected: map[string]map[string]interface{}{
				"root": {"color": "blue"},
			},
		},
		{
			name: "with children",
			scene: SceneConfig{
				ID: "root",
				Props: map[string]interface{}{
					"color": "blue",
				},
				Children: []SceneConfig{
					{
						ID: "text-1",
						Props: map[string]interface{}{
							"text": "hello",
						},
					},
				},
			},
			expected: map[string]map[string]interface{}{
				"root":   {"color": "blue"},
				"text-1": {"text": "hello"},
			},
		},
		{
			name: "nested children",
			scene: SceneConfig{
				ID: "root",
				Props: map[string]interface{}{
					"bg": "black",
				},
				Children: []SceneConfig{
					{
						ID: "group-1",
						Props: map[string]interface{}{
							"layout": "row",
						},
						Children: []SceneConfig{
							{
								ID: "text-1",
								Props: map[string]interface{}{
									"text": "hi",
								},
							},
						},
					},
				},
			},
			expected: map[string]map[string]interface{}{
				"root":    {"bg": "black"},
				"group-1": {"layout": "row"},
				"text-1":  {"text": "hi"},
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw := tt.scene.ToEditsPatch()

			var result map[string]map[string]interface{}
			_ = json.Unmarshal(raw, &result)

			if !reflect.DeepEqual(result, tt.expected) {
				t.Fatalf("expected %v, got %v", tt.expected, result)
			}
		})
	}
}
