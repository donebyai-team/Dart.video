package scenes

import (
	"encoding/json"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
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
		{
			name: "content aware scene with oneof text + media",
			inputJSON: `{
	  "elements": [
		{
		  "component": "TextWithImageScene",
		  "props": "{\"textComponent\":\"textwithwordcycle\",\"textComponentProps\":{\"text\":\"An AI assistant for\",\"cyclingWords\":[\"planning\",\"debugging\",\"shipping\"]},\"image\":\"fake_handle\"}",
		  "children": []
		}
	  ]
	}`,
			expectedJSON: `{
  "ID": "textwithimagescene",
  "Name": "TextWithImageScene",
  "Props": {
    "textwithwordcycle": {
      "text": "AI models",
      "cyclingWords": ["planning","debugging","shipping"]
    },
    "imageasset": {
      "image": "https://www.thesvg.org/icons/openai/light.svg"
    }
  },
  "Children": null
}`,
			expectJSX: []string{
				"<TextWithImageScene",
			},
			editsToScene: []string{
				"imageasset",
				"textwithwordcycle",
				"image",
				"fake_original_url",
				"width",
				"height",
				"duration",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			registryBuilder := services.NewMediaAssetRegistryBuilder()
			registryBuilder.AddAssets([]*models.MediaAsset{
				{

					Path:      "fake_original_url",
					MediaType: pbcore.MediaType_MEDIA_TYPE_IMAGE,
					Metadata: models.AssetMetadata{
						Width:    100,
						Height:   100,
						Duration: 10,
					},
				},
			})
			registry := registryBuilder.Build()
			handles := registry.GetAssetHandles()

			var scene types.Scene
			if err := json.Unmarshal([]byte(tt.inputJSON), &scene); err != nil {
				t.Fatalf("failed to unmarshal input: %v", err)
			}

			scene.Elements[0].Props = strings.ReplaceAll(scene.Elements[0].Props, "fake_handle", handles[0])

			out, err := ConvertToSceneConfig(&scene, registry)
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
