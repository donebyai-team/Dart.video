package agent

import "testing"

func TestParseScenePatch_BasicRoot(t *testing.T) {
	input := []byte(`{
		"animatedvideo-0": {
			"src": "video.mp4"
		}
	}`)

	nodes, err := ParseScenePatch(input)
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

	if node.Type != "Animatedvideo" {
		t.Errorf("expected Type Animatedvideo, got %s", node.Type)
	}

	if node.Props["src"] != "video.mp4" {
		t.Errorf("expected src video.mp4, got %v", node.Props["src"])
	}
}

func TestParseScenePatch_WithChild(t *testing.T) {
	input := []byte(`{
		"animatedvideo-0": {
			"src": "video.mp4"
		},
		"text-animatedvideo-0": {
			"style": {
				"color": "#641414"
			}
		}
	}`)

	nodes, err := ParseScenePatch(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	node := nodes[0]

	child, exists := node.Children["text"]
	if !exists {
		t.Fatalf("expected child 'text'")
	}

	style := child["style"].(map[string]interface{})
	if style["color"] != "#641414" {
		t.Errorf("expected color #641414, got %v", style["color"])
	}
}

func TestParseScenePatch_MultipleRoots(t *testing.T) {
	input := []byte(`{
		"animatedvideo-0": {
			"src": "video.mp4"
		},
		"text-1": {
			"value": "hello"
		}
	}`)

	nodes, err := ParseScenePatch(input)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(nodes) != 2 {
		t.Fatalf("expected 2 nodes, got %d", len(nodes))
	}
}
