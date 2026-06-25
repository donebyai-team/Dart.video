package templates

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/structpb"
)

func TestBuildAndSanitizeLLMPropsPayload_Nil(t *testing.T) {
	actual, err := BuildAndSanitizeLLMPropsPayload(nil)
	require.NoError(t, err)
	require.Empty(t, actual)
}

func TestBuildAndSanitizeLLMPropsPayload(t *testing.T) {
	tests := []struct {
		name      string
		input     map[string]any
		expected  any
		wantEmpty bool
	}{
		{
			name: "drops ignored keys and unsupported values",
			input: map[string]any{
				"title":    "  Hello world  ",
				"subtitle": "Secondary text",
				"style":    "bold",
				"accent":   "#fff",
				"link":     "https://example.com",
				"image":    "https://placehold.co/600x400/png",
				"count":    5,
				"enabled":  true,
				"empty":    "   ",
			},
			expected: map[string]any{
				"title":    "  Hello world  ",
				"subtitle": "Secondary text",
				"image":    "https://placehold.co/600x400/png",
			},
		},
		{
			name: "sanitizes nested maps and arrays",
			input: map[string]any{
				"items": []any{
					map[string]any{
						"text":  " First line \n second line ",
						"width": "200",
						"meta": map[string]any{
							"url":     "https://example.com/image.png",
							"preview": "https://placehold.co/300x200/jpg",
							"caption": " nested caption ",
						},
					},
					"   ",
					42,
					map[string]any{
						"text": "ok",
					},
				},
			},
			expected: map[string]any{
				"items": []any{
					map[string]any{
						"text": " First line \n second line ",
						"meta": map[string]any{
							"preview": "https://placehold.co/300x200/jpg",
							"caption": " nested caption ",
						},
					},
					map[string]any{
						"text": "ok",
					},
				},
			},
		},
		{
			name: "preserves long text",
			input: map[string]any{
				"title": "SEAMLESSLY\n{INTEGRATES} WITH\nYOUR {STACK}",
			},
			expected: map[string]any{
				"title": "SEAMLESSLY\n{INTEGRATES} WITH\nYOUR {STACK}",
			},
		},
		{
			name: "returns empty when everything is filtered out",
			input: map[string]any{
				"style":  "bold",
				"accent": "#fff",
				"link":   "https://example.com",
				"empty":  "   ",
				"count":  1,
			},
			wantEmpty: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := structpb.NewStruct(tt.input)
			require.NoError(t, err)

			actual, err := BuildAndSanitizeLLMPropsPayload(data)
			require.NoError(t, err)

			if tt.wantEmpty {
				require.Empty(t, actual)
				return
			}

			var actualValue any
			require.NoError(t, json.Unmarshal([]byte(actual), &actualValue))
			require.Equal(t, tt.expected, actualValue)
		})
	}
}
