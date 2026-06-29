package code_builder

import (
	"encoding/json"
	"github.com/stretchr/testify/require"
	"testing"
)

func TestExtractDefaultDataPropsFromGeneratedCode(t *testing.T) {
	tests := []struct {
		name        string
		code        string
		expected    string
		expectError bool
	}{
		{
			name: "standard json",
			code: `
const DEFAULT_DATA = {
	"name": "Claude"
}

export default Component
`,
			expected: `{"name":"Claude"}`,
		},
		{
			name: "unquoted keys",
			code: `
const DEFAULT_DATA = {
	name: "Claude",
	version: "1.0"
}
`,
			expected: `{"name":"Claude","version":"1.0"}`,
		},
		{
			name: "single quoted strings",
			code: `
const DEFAULT_DATA = {
	brandName: 'Claude',
	promptPlaceholder: 'Ask anything...'
}
`,
			expected: `{"brandName":"Claude","promptPlaceholder":"Ask anything..."}`,
		},
		{
			name: "pascal case identifiers",
			code: `
const DEFAULT_DATA = {
	icon: Heart,
	secondaryIcon: BarChart3
}
`,
			expected: `{"icon":"Heart","secondaryIcon":"BarChart3"}`,
		},
		{
			name: "nested structures",
			code: `
const DEFAULT_DATA = {
	title: 'Dashboard',
	features: [
		{
			name: 'Analytics',
			icon: BarChart3,
		},
		{
			name: 'Favorites',
			icon: Heart,
		},
	],
}
`,
			expected: `{
				"title":"Dashboard",
				"features":[
					{
						"name":"Analytics",
						"icon":"BarChart3"
					},
					{
						"name":"Favorites",
						"icon":"Heart"
					}
				]
			}`,
		},
		{
			name: "trailing commas",
			code: `
const DEFAULT_DATA = {
	name: 'Claude',
	items: [
		'one',
		'two',
	],
}
`,
			expected: `{"name":"Claude","items":["one","two"]}`,
		},
		{
			name: "constant not found",
			code: `
const SOMETHING_ELSE = {
	name: 'Claude'
}
`,
			expectError: true,
		},
		{
			name: "invalid object",
			code: `
const DEFAULT_DATA = {
	name: 'Claude',
	items: [
}
`,
			expectError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			raw, updatedCode, err := ExtractDefaultDataPropsFromGeneratedCode(tt.code)

			if tt.expectError {
				require.Error(t, err)
				return
			}

			require.NoError(t, err)

			var actual any
			require.NoError(t, json.Unmarshal(raw, &actual))

			var expected any
			require.NoError(t, json.Unmarshal([]byte(tt.expected), &expected))

			require.Equal(t, expected, actual)

			require.NotContains(t, updatedCode, "{")
			require.Contains(t, updatedCode, "__DEFAULT_DATA__")
		})
	}
}

func TestExtractComponentComment(t *testing.T) {
	tests := []struct {
		name string
		code string
		want string
	}{
		{
			name: "extract component comment",
			code: `/**
 * A dynamic typography animation highlighting a sequence of actions.
 * The prefix text animates in first.
 * The carousel rotates through items.
 */
export default function RemoteComponent() {
}`,
			want: `A dynamic typography animation highlighting a sequence of actions.
The prefix text animates in first.
The carousel rotates through items.`,
		},
		{
			name: "ignore comments inside component",
			code: `/**
 * Component description.
 */
export default function RemoteComponent() {
  // This should not be extracted.
  /*
   * Neither should this.
   */
}`,
			want: "Component description.",
		},
		{
			name: "no component comment",
			code: `export default function RemoteComponent() {
}`,
			want: "",
		},
		{
			name: "other comments before component are ignored",
			code: `// File comment

/* License */

const foo = 1;

/**
 * Actual component description.
 */
export default function RemoteComponent() {
}`,
			want: "Actual component description.",
		},
		{
			name: "comment not immediately before component",
			code: `/**
 * Old comment.
 */

const foo = 1;

export default function RemoteComponent() {
}`,
			want: "",
		},
		{
			name: "single line comment",
			code: `/** Single line description. */
export default function RemoteComponent() {
}`,
			want: "Single line description.",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ExtractDescriptionCommentsFromGeneratedCode(tt.code)
			if got != tt.want {
				t.Fatalf("got %q, want %q", got, tt.want)
			}
		})
	}
}
