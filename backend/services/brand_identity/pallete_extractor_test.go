package brand_identity

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
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
