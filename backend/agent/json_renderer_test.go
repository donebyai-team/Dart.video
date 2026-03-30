package agent

import (
	"github.com/shank318/coasterai/agent/scenes"
	"strings"
	"testing"
)

func TestGenerateReact_ValidSimpleProps(t *testing.T) {
	sceneConfig := scenes.SceneConfig{
		ID:   "",
		Name: "AnimatedNumber",
		Props: map[string]interface{}{
			"startText": "Solving",
			"endText":   "incidents",
			"from":      0,
			"to":        100,
		},
		Children: nil,
	}

	out, err := GenerateCodeFromSceneConfig(&sceneConfig)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(out, `<AnimatedNumber startText="Solving" endText="incidents" from={0} to={100} />`) {
		t.Fatalf("unexpected output:\n%s", out)
	}
}

func TestGenerateReact_StyleObject(t *testing.T) {
	sceneConfig := scenes.SceneConfig{
		Name: "Box",
		Props: map[string]interface{}{
			"style": map[string]interface{}{
				"color":    "red",
				"fontSize": 20,
			},
		},
		Children: nil,
	}

	out, err := GenerateCodeFromSceneConfig(&sceneConfig)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(out, `style={{"color":"red","fontSize":20}}`) {
		t.Fatalf("style object not rendered correctly:\n%s", out)
	}
}

func TestGenerateReact_ArrayProp(t *testing.T) {
	sceneConfig := scenes.SceneConfig{
		Name: "Chart",
		Props: map[string]interface{}{
			"data": []int{1, 2, 3},
		},
		Children: nil,
	}

	out, err := GenerateCodeFromSceneConfig(&sceneConfig)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(out, `data={[1,2,3]}`) {
		t.Fatalf("array prop not rendered correctly:\n%s", out)
	}
}

func TestGenerateReact_NestedComponents(t *testing.T) {
	sceneConfig := scenes.SceneConfig{
		Name: "Box",
		Props: map[string]interface{}{
			"padding": 10,
		},
		Children: []scenes.SceneConfig{
			scenes.SceneConfig{
				Name: "TextHighlight",
				Props: map[string]interface{}{
					"text": "Hello World",
				},
			},
		},
	}

	out, err := GenerateCodeFromSceneConfig(&sceneConfig)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(out, `<TextHighlight text="Hello World" />`) {
		t.Fatalf("nested child not rendered:\n%s", out)
	}
}

func TestGenerateReact_Snapshot(t *testing.T) {
	sceneConfig := scenes.SceneConfig{
		Name: "AnimatedNumber",
		Props: map[string]interface{}{
			"from": 0,
			"to":   100,
		},
	}

	out, err := GenerateCodeFromSceneConfig(&sceneConfig)

	if err != nil {
		t.Fatal(err)
	}

	expected := `<AnimatedNumber from={0} to={100} />`

	if !strings.Contains(out, expected) {
		t.Fatalf("snapshot mismatch:\n%s", out)
	}
}
