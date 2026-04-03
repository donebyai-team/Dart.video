package scenes

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/baml_client/types"
	"strings"
	"testing"
)

func TestConvertSceneToSceneConfig(t *testing.T) {
	sceneJson := `{
    "index": 0,
    "elements": [
      {
        "component": "AnimatedImage",
        "props": "{\"text\":\"Upload your stats\",\"src\":\"https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1775021255-group-882.svg\",\"variant\":\"heading\",\"entranceAnimation\":\"scaleIn\",\"borderRadius\":0,\"width\":900,\"height\":700,\"style\":{\"boxShadow\":\"none\"}}",
        "children": []
      }
    ]
  }`
	var scene types.Scene
	err := json.Unmarshal([]byte(sceneJson), &scene)
	if err != nil {
		t.Fatal(fmt.Errorf("error unmarshalling scene json: %s", err))
	}

	out, err := ConvertToSceneConfig(&scene)

	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if out.Props["style"] == nil {
		t.Fatalf("style missing:\n%s", out)
	}

	config, err := RenderJSXCodeFromSceneConfig(out)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !strings.Contains(config, `style={{"boxShadow":"none"}}`) {
		t.Fatalf("nested child not rendered:\n%s", out)
	}
}

func TestConvertIconsSceneToSceneConfig(t *testing.T) {

	tests := []struct {
		name          string
		sceneJson     string
		expectedIcons int
	}{
		{
			name: "mixed icons",
			sceneJson: `{
			  "index": 0,
			  "elements": [
				{
				  "component": "IconShowcase",
				  "props": "{\"text\":\"Upload your stats\",\"icons\":[\"openai\",\"anthropic\",\"arrow-right\",\"sparkles\"]}",
				  "children": []
				}
			  ]
			}`,
			expectedIcons: 4,
		},
		{
			name: "brand icons",
			sceneJson: `{
			  "index": 0,
			  "elements": [
				{
				  "component": "IconShowcase",
				  "props": "{\"text\":\"Upload your stats\",\"icons\":[\"openai\",\"anthropic\"]}",
				  "children": []
				}
			  ]
			}`,
			expectedIcons: 2,
		},
		{
			name: "generic icons",
			sceneJson: `{
			  "index": 0,
			  "elements": [
				{
				  "component": "IconShowcase",
				  "props": "{\"text\":\"Upload your stats\",\"icons\":[\"arrow-right\",\"sparkles\"]}",
				  "children": []
				}
			  ]
			}`,
			expectedIcons: 2,
		},
		{
			name: "unknown icon",
			sceneJson: `{
			  "index": 0,
			  "elements": [
				{
				  "component": "IconShowcase",
				  "props": "{\"text\":\"Upload your stats\",\"icons\":[\"unknown-icon\",\"user\"]}",
				  "children": []
				}
			  ]
			}`,
			expectedIcons: 1,
		},
	}

	for _, tt := range tests {

		t.Run(tt.name, func(t *testing.T) {

			var scene types.Scene

			err := json.Unmarshal([]byte(tt.sceneJson), &scene)
			if err != nil {
				t.Fatalf("error unmarshalling scene json: %v", err)
			}

			out, err := ConvertToSceneConfig(&scene)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if out.Props["icons"] == nil {
				t.Fatalf("icons missing in output")
			}

			iconsUrls, ok := out.Props["icons"].([]string)
			if !ok {
				t.Fatalf("icons not converted to []string")
			}

			if len(iconsUrls) != tt.expectedIcons {
				t.Fatalf("expected %d icons, got %d", tt.expectedIcons, len(iconsUrls))
			}
		})
	}
}
