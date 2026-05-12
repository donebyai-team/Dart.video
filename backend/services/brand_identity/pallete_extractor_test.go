package brand_identity

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"math"
	"strings"
	"testing"
)

func TestColorSystem(t *testing.T) {

	tests := []struct {
		name     string
		input    map[string]string
		validate func(t *testing.T, result []*pbcore.BrandColor)
	}{
		{
			name:  "no input uses defaults",
			input: map[string]string{},
			validate: func(t *testing.T, result []*pbcore.BrandColor) {

				if len(result) == 0 {
					t.Fatal("expected default colors")
				}

				found := false

				for _, c := range result {
					if strings.EqualFold(c.ColorHexCode, defaultColors["primary"]) {
						found = true
					}
				}

				if !found {
					t.Fatal("default primary not found")
				}
			},
		},
		{
			name: "primary only generates palette",
			input: map[string]string{
				"primary": "#FF0000",
			},
			validate: func(t *testing.T, result []*pbcore.BrandColor) {

				if len(result) < 3 {
					t.Fatal("expected derived colors")
				}

				foundPrimary := false

				for _, c := range result {

					if strings.EqualFold(c.ColorHexCode, "#FF0000") {
						foundPrimary = true
					}

					if strings.EqualFold(c.ColorHexCode, "#FFFFFF") {
						t.Fatal("background should never be white")
					}
				}

				if !foundPrimary {
					t.Fatal("primary missing")
				}
			},
		},
		{
			name: "secondary override works",
			input: map[string]string{
				"primary":   "#123456",
				"secondary": "#ABCDEF",
			},
			validate: func(t *testing.T, result []*pbcore.BrandColor) {

				found := false

				for _, c := range result {
					if strings.EqualFold(c.ColorHexCode, "#ABCDEF") {
						found = true
					}
				}

				if !found {
					t.Fatal("secondary override missing")
				}
			},
		},
		{
			name: "light primary still produces tinted background",
			input: map[string]string{
				"primary": "#F4D03F",
			},
			validate: func(t *testing.T, result []*pbcore.BrandColor) {

				for _, c := range result {

					if strings.EqualFold(c.ColorHexCode, "#FFFFFF") {
						t.Fatal("background must never be pure white")
					}
				}
			},
		},
	}

	for _, tt := range tests {

		t.Run(tt.name, func(t *testing.T) {

			result := ExtractOrGenerateColors(tt.input)

			tt.validate(t, result)
		})
	}
}

func TestBrightness(t *testing.T) {

	if lightness("#FFFFFF") < 200 {
		t.Fatal("white should be very bright")
	}

	if lightness("#000000") > 50 {
		t.Fatal("black should be dark")
	}
}

func TestContrastRatio(t *testing.T) {
	tests := []struct {
		name     string
		a        string
		b        string
		expected float64
	}{
		{
			name: "same black colors",
			a:    "#000000",
			b:    "#000000",
			// Same colors always have 1:1 contrast
			expected: 1.0,
		},
		{
			name: "jisr black shared",
			a:    "#879AA2",
			b:    "#111113",
			// they both are sark , a is greyish and b is blackisg
			expected: 6.44,
		},
		{
			name: "black vs white",
			a:    "#000000",
			b:    "#FFFFFF",
			// Highest possible contrast
			expected: 21.0,
		},
		{
			name: "very similar dark colors",
			a:    "#111111",
			b:    "#181818",
			// Very hard to distinguish visually
			expected: 1.1,
		},
		{
			name: "similar gray colors",
			a:    "#777777",
			b:    "#888888",
			// Low contrast
			expected: 1.3,
		},
		{
			name: "dark blue vs slate",
			a:    "#0f172a",
			b:    "#1e293b",
			// Some visible distinction
			expected: 1.4,
		},
		{
			name: "black vs red",
			a:    "#000000",
			b:    "#FF0000",
			// Strong visible contrast
			expected: 5.2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ContrastRatio(tt.a, tt.b)

			// Allow tiny floating point differences
			if math.Abs(got-tt.expected) > 0.3 {
				t.Fatalf(
					"ContrastRatio(%s, %s) = %.2f, expected around %.2f",
					tt.a,
					tt.b,
					got,
					tt.expected,
				)
			}
		})
	}
}
