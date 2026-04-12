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
          "index": 10,
          "elements": [
            {
              "component": "IconShowcase",
              "props": "{\n  \"iconasset-0\": { \"icon\": \"openai\" },\n  \"textstagger-0\": { \"text\": \"AI models\" },\n\n  \"iconasset-1\": { \"icon\": \"google\" },\n  \"textstagger-1\": { \"text\": \"Search APIs\" }\n}",
              "children": []
            }
          ]
        }`
	var scene types.Scene
	err := json.Unmarshal([]byte(sceneJson), &scene)
	if err != nil {
		t.Fatal(fmt.Errorf("error unmarshalling scene json: %s", err))
	}

	out, err := ConvertToSceneConfig(&scene, nil)

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
