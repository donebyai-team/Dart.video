package utils

import (
	"github.com/shank318/coasterai/baml_client/types"
	"reflect"
	"testing"
)

func TestMergeStructs_StyleMerge(t *testing.T) {
	// Step 1: create struct from map
	s1, _ := CreateStructFromDynamicClass(&types.DynamicProps{DynamicProperties: map[string]interface{}{
		"wordcycle": map[string]interface{}{
			"style": map[string]interface{}{
				"color": "#FFFFFF",
			},
		},
	}})

	// Step 2: raw JSON → struct
	rawJSON := []byte(`{
		"wordcycle": {
			"variant": "summer",
			"style": {
				"fontSize": 12
			}
		}
	}`)

	s2, err := RawMessageToStruct(rawJSON)
	if err != nil {
		t.Fatalf("failed to convert json to struct: %v", err)
	}

	// Step 3: merge
	merged := MergeStructs(s1, s2)

	// Step 4: validate
	result := merged.AsMap()

	expected := map[string]interface{}{
		"wordcycle": map[string]interface{}{
			"variant": "summer",
			"style": map[string]interface{}{
				"color":    "#FFFFFF",
				"fontSize": float64(12),
			},
		},
	}

	if !reflect.DeepEqual(result, expected) {
		t.Errorf("merge failed.\nExpected: %+v\nGot: %+v", expected, result)
	}
}
