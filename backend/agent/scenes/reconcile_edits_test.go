package scenes

import (
	"encoding/json"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
	"testing"
)

func TestMergeEdits(t *testing.T) {
	tests := []struct {
		name     string
		left     string
		right    string
		expected string
	}{
		{
			name: "deep merge nested props",
			left: `{
				"animatednumber-0": {
					"startText": "Solved",
					"style": { "color": "red", "fontSize": 12 }
				}
			}`,
			right: `{
				"animatednumber-0": {
					"style": { "fontSize": 18 }
				}
			}`,
			expected: `{
				"animatednumber-0": {
					"startText": "Solved",
					"style": { "color": "red", "fontSize": 18 }
				}
			}`,
		},
		{
			name: "right overrides value",
			left: `{
				"animatednumber-0": {
					"to": 100
				}
			}`,
			right: `{
				"animatednumber-0": {
					"to": 200
				}
			}`,
			expected: `{
				"animatednumber-0": {
					"to": 200
				}
			}`,
		},
		{
			name: "replace root scene and remove children",
			left: `{
				"animatednumber-0": { "to": 100 },
				"text-animatednumber-0": { "value": "hello" }
			}`,
			right: `{
				"textstagger-0": { "text": "new headline" }
			}`,
			expected: `{
				"textstagger-0": { "text": "new headline" }
			}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {

			leftStruct := &structpb.Struct{}
			err := protojson.Unmarshal([]byte(tt.left), leftStruct)
			require.NoError(t, err)

			result, err := ReconcileEditsPatch(leftStruct, json.RawMessage(tt.right))
			require.NoError(t, err)

			var got map[string]any
			var expected map[string]any

			err = json.Unmarshal(result, &got)
			require.NoError(t, err)

			err = json.Unmarshal([]byte(tt.expected), &expected)
			require.NoError(t, err)

			require.Equal(t, expected, got)
		})
	}
}
