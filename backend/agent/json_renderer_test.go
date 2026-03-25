package agent

import (
	"github.com/shank318/coasterai/baml_client/types"
	"strings"
	"testing"
)

func TestGenerateReact_ValidSimpleProps(t *testing.T) {

	scene := types.Scene{
		Elements: []types.SceneElement{
			{
				Component: "AnimatedNumber",
				Props:     `{"startText":"Solving","endText":"incidents","from":0,"to":100}`,
			},
		},
	}

	out, err := GenerateReact(scene)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(out, `<AnimatedNumber startText="Solving" endText="incidents" from={0} to={100} />`) {
		t.Fatalf("unexpected output:\n%s", out)
	}
}

func TestGenerateReact_StyleObject(t *testing.T) {

	scene := types.Scene{
		Elements: []types.SceneElement{
			{
				Component: "Box",
				Props:     `{"style":{"color":"red","fontSize":20}}`,
			},
		},
	}

	out, err := GenerateReact(scene)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(out, `style={{"color":"red","fontSize":20}}`) {
		t.Fatalf("style object not rendered correctly:\n%s", out)
	}
}

func TestGenerateReact_ArrayProp(t *testing.T) {

	scene := types.Scene{
		Elements: []types.SceneElement{
			{
				Component: "Chart",
				Props:     `{"data":[1,2,3]}`,
			},
		},
	}

	out, err := GenerateReact(scene)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(out, `data={[1,2,3]}`) {
		t.Fatalf("array prop not rendered correctly:\n%s", out)
	}
}

func TestGenerateReact_NestedComponents(t *testing.T) {

	scene := types.Scene{
		Elements: []types.SceneElement{
			{
				Component: "Box",
				Props:     `{"padding":10}`,
				Children: []types.SceneElement{
					{
						Component: "TextHighlight",
						Props:     `{"text":"Hello World"}`,
					},
				},
			},
		},
	}

	out, err := GenerateReact(scene)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(out, `<TextHighlight text="Hello World" />`) {
		t.Fatalf("nested child not rendered:\n%s", out)
	}
}

func TestGenerateReact_InvalidJSONProps(t *testing.T) {

	scene := types.Scene{
		Elements: []types.SceneElement{
			{
				Component: "Box",
				Props:     `{color:'red'}`,
			},
		},
	}

	_, err := GenerateReact(scene)

	if err == nil {
		t.Fatal("expected error but got none")
	}

	if !strings.Contains(err.Error(), "Invalid props JSON") {
		t.Fatalf("unexpected error message: %v", err)
	}
}

func TestGenerateReact_ErrorPath(t *testing.T) {

	scene := types.Scene{
		Elements: []types.SceneElement{
			{
				Component: "Box",
				Children: []types.SceneElement{
					{
						Component: "TextHighlight",
						Props:     `{bad json}`,
					},
				},
			},
		},
	}

	_, err := GenerateReact(scene)

	if err == nil {
		t.Fatal("expected error")
	}

	if !strings.Contains(err.Error(), "TextHighlight") {
		t.Fatalf("error should include component path: %v", err)
	}
}

func TestGenerateReact_Snapshot(t *testing.T) {

	scene := types.Scene{
		Elements: []types.SceneElement{
			{
				Component: "AnimatedNumber",
				Props:     `{"from":0,"to":100}`,
			},
		},
	}

	out, err := GenerateReact(scene)

	if err != nil {
		t.Fatal(err)
	}

	expected := `<AnimatedNumber from={0} to={100} />`

	if !strings.Contains(out, expected) {
		t.Fatalf("snapshot mismatch:\n%s", out)
	}
}
