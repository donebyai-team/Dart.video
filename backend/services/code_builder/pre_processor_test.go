package code_builder

import (
	"github.com/stretchr/testify/require"
	"testing"
)

func TestResolveIcons(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "single icon",
			input:    `<IconAsset Icon="icon:google" />`,
			expected: `<IconAsset Icon="https://www.thesvg.org/icons/google/color.svg" />`,
		},
		{
			name: "multiple icons",
			input: `
				<IconAsset Icon="icon:google" />
				<IconAsset Icon="icon:openai" />
			`,
			expected: `
				<IconAsset Icon="https://www.thesvg.org/icons/google/color.svg" />
				<IconAsset Icon="https://www.thesvg.org/icons/openai/default.svg" />
			`,
		},
		{
			name:     "icon in const",
			input:    `const ICON = "icon:google"`,
			expected: `const ICON = "https://www.thesvg.org/icons/google/default.svg"`,
		},
		{
			name: "icon array",
			input: `
				const icons = [
					"icon:google",
					"icon:openai",
				]
			`,
			expected: `
				const icons = [
					"https://www.thesvg.org/icons/google/default.svg",
					"https://www.thesvg.org/icons/openai/default.svg",
				]
			`,
		},
		{
			name:     "lucide icon untouched",
			input:    `<IconAsset Icon={Heart} />`,
			expected: `<IconAsset Icon={Heart} />`,
		},
		{
			name:     "non icon string untouched",
			input:    `const title = "Hello World"`,
			expected: `const title = "Hello World"`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := resolveIcons(tt.input)
			require.Equal(t, tt.expected, actual)
		})
	}
}

func TestResolveIconURL(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "brand icon",
			input:    `<IconAsset Icon="https://www.thesvg.org/icons/google/default.svg" />`,
			expected: `<IconAsset Icon="icon:google" />`,
		},
		{
			name:     "tabler icon",
			input:    `<IconAsset Icon="https://cdn.jsdelivr.net/npm/@tabler/icons/icons/outline/arrow-left.svg" />`,
			expected: `<IconAsset Icon="icon:arrow-left" />`,
		},
		{
			name: "multiple urls",
			input: `
				"https://www.thesvg.org/icons/google/default.svg"
				"https://cdn.jsdelivr.net/npm/@tabler/icons/icons/outline/home.svg"
			`,
			expected: `
				"icon:google"
				"icon:home"
			`,
		},
		{
			name:     "non icon url untouched",
			input:    `const url = "https://google.com"`,
			expected: `const url = "https://google.com"`,
		},
		{
			name:     "lucide icon untouched",
			input:    `<IconAsset Icon={Heart} />`,
			expected: `<IconAsset Icon={Heart} />`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			actual := resolveIconURL(tt.input)
			require.Equal(t, tt.expected, actual)
		})
	}
}
