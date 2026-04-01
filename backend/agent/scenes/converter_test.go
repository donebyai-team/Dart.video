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
