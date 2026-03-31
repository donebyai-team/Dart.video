package scenes

import (
	"encoding/json"
	"reflect"
	"testing"
)

func TestParseSceneConfigFromEditsPatch_BasicRoot(t *testing.T) {
	input := []byte(`{
		"animatedvideo-0": {
			"src": "video.mp4"
		}
	}`)

	nodes, err := ParseSceneConfigFromEditsPatch(input)
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

	nodes, err := ParseSceneConfigFromEditsPatch(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	node := nodes[0]

	child := node.Children[0]
	if child.Name != "text" {
		t.Fatalf("expected child 'text'")
	}

	child2 := node.Children[1]
	if child2.Name != "logoasset" {
		t.Fatalf("expected child 'logoasset'")
	}

	style := child.Props["style"].(map[string]interface{})
	if style["color"] != "#641414" {
		t.Errorf("expected color #641414, got %v", style["color"])
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

	nodes, err := ParseSceneConfigFromEditsPatch(input)
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
