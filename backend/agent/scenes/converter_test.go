package scenes

import (
	"encoding/json"
	"github.com/shank318/coasterai/baml_client/types"
	"google.golang.org/protobuf/types/known/structpb"
	"reflect"
	"strings"
	"testing"
)

func TestConvertSceneToSceneConfig(t *testing.T) {
	tests := []struct {
		name         string
		inputJSON    string
		expectedJSON string
		expectJSX    []string
		editsToScene []string
	}{
		{
			name: "icon showcase with stagger text",
			inputJSON: `{
			  "elements": [
				{
				  "component": "IconShowcase",
				  "props": "{\n  \"iconasset-icons-0\": { \"icon\": \"openai\", \"style\": {\"color\": \"#000\"} },\n  \"textstagger\": { \"text\": \"AI models\" },\n  \"iconasset-icons-1\": { \"icon\": \"google\" }\n}",
				  "children": []
				}
			  ]
			}`,
			expectedJSON: `{
  "ID": "iconshowcase",
  "Name": "IconShowcase",
  "Props": {
    "iconasset-icons-0": {
      "icon": "https://www.thesvg.org/icons/openai/light.svg",
      "size": 90,
      "style": {
        "color": "#000"
      }
    },
    "iconasset-icons-1": {
      "icon": "https://www.thesvg.org/icons/google/color.svg",
      "size": 90
    },
    "textstagger": {
      "duration": 15,
      "entranceAnimation": "scaleIn",
      "splitBy": "word",
      "staggerDelay": 5,
      "variant": "heading"
    }
  },
  "Children": null
}`,
			expectJSX:    []string{"<IconShowcase"},
			editsToScene: []string{"openai", "google", "textstagger", "iconasset-icons-1", "iconasset-icons-0"},
		},
		{
			name: "icon showcase LLM props",
			inputJSON: `{
			  "elements": [
				{
				  "component": "IconShowcase",
				  "props": "{\n  \"icons\": [\"openai\", \"google\"],\n\"text\": \"\"\n}",
				  "children": []
				}
			  ]
			}`,
			expectedJSON: `{
  "ID": "iconshowcase",
  "Name": "IconShowcase",
  "Props": {
    "iconasset-icons-0": {
      "icon": "https://www.thesvg.org/icons/openai/light.svg",
      "size": 90
    },
    "iconasset-icons-1": {
      "icon": "https://www.thesvg.org/icons/google/color.svg",
      "size": 90
    },
    "textstagger": {
      "text": "",
      "duration": 15,
      "entranceAnimation": "scaleIn",
      "splitBy": "word",
      "staggerDelay": 5,
      "variant": "heading"
    }
  },
  "Children": null
}`,
			expectJSX:    []string{"<IconShowcase"},
			editsToScene: []string{"openai", "google", "textstagger", "iconasset-icons-1", "iconasset-icons-0"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {

			var scene types.Scene
			if err := json.Unmarshal([]byte(tt.inputJSON), &scene); err != nil {
				t.Fatalf("failed to unmarshal input: %v", err)
			}

			out, err := ConvertToSceneConfig(&scene, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			// Convert output to generic map
			outBytes, err := json.Marshal(out)
			if err != nil {
				t.Fatalf("marshal output: %v", err)
			}

			var actual map[string]any
			if err := json.Unmarshal(outBytes, &actual); err != nil {
				t.Fatalf("unmarshal actual: %v", err)
			}

			var expected map[string]any
			if err := json.Unmarshal([]byte(tt.expectedJSON), &expected); err != nil {
				t.Fatalf("unmarshal expected: %v", err)
			}

			if !reflect.DeepEqual(actual["props"], expected["props"]) {
				t.Fatalf("props mismatch\nexpected: %v\nactual: %v", expected["props"], actual["props"])
			}

			config, err := RenderJSXCodeFromSceneConfig(out)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			for _, s := range tt.expectJSX {
				if !strings.Contains(config, s) {
					t.Fatalf("expected JSX to contain %s\n%s", s, config)
				}
			}

			patch := out.ToEditsPatch()
			patchStruct, err := RawMessageToStructPB(patch)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			// Edits to Scene
			sceneAfterEdits, err := EditsToScene(patchStruct, nil)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if sceneAfterEdits == nil {
				t.Fatalf("scene config is nil")
			}

			propsString := sceneAfterEdits.Elements[0].Props

			for _, s := range tt.editsToScene {
				if !strings.Contains(propsString, s) {
					t.Fatalf("expected propsString to contain %s\n%s", s, config)
				}
			}
		})
	}
}

func RawMessageToStructPB(raw json.RawMessage) (*structpb.Struct, error) {
	var m map[string]interface{}

	if err := json.Unmarshal(raw, &m); err != nil {
		return nil, err
	}

	return structpb.NewStruct(m)
}
