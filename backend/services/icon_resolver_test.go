package services

import (
	"strings"
	"testing"
)

func TestResolveIconFromName(t *testing.T) {
	brandIcons = map[string][]string{
		"google-ads": {"default"},
		"openai":     {"default"},
		"stripe":     {"default"},
	}

	brandIndex = map[string]string{
		"googleads": "google-ads",
		"openai":    "openai",
		"stripe":    "stripe",
	}

	searchableBrandIcons = []searchableBrandIcon{
		{
			Slug:       "google-ads",
			Normalized: "googleads",
		},
		{
			Slug:       "openai",
			Normalized: "openai",
		},
		{
			Slug:       "stripe",
			Normalized: "stripe",
		},
	}

	tablerIndexMap = map[string]string{
		"arrowleft":   "arrow-left",
		"chevrondown": "chevron-down",
		"google":      "brand-google",
	}

	searchableTablerIcons = []searchableTablerIcon{
		{
			Name:       "arrow-left",
			Normalized: "arrowleft",
		},
		{
			Name:       "chevron-down",
			Normalized: "chevrondown",
		},
		{
			Name:       "brand-google",
			Normalized: "google",
		},
	}

	tests := []struct {
		name     string
		input    string
		expected string
	}{
		{
			name:     "exact brand",
			input:    "openai",
			expected: SvgBase + "/openai/default.svg",
		},
		{
			name:     "brand normalization no dash",
			input:    "googleads",
			expected: SvgBase + "/google-ads/default.svg",
		},
		{
			name:     "brand normalization spaces",
			input:    "google ads",
			expected: SvgBase + "/google-ads/default.svg",
		},
		{
			name:     "brand normalization underscore",
			input:    "google_ads",
			expected: SvgBase + "/google-ads/default.svg",
		},
		{
			name:     "brand typo",
			input:    "googelads",
			expected: SvgBase + "/google-ads/default.svg",
		},
		{
			name:     "tabler exact",
			input:    "arrow-left",
			expected: TablerBase + "/arrow-left.svg",
		},
		{
			name:     "tabler normalization",
			input:    "arrowleft",
			expected: TablerBase + "/arrow-left.svg",
		},
		{
			name:     "tabler typo",
			input:    "arrwleft",
			expected: TablerBase + "/arrow-left.svg",
		},
		{
			name:     "brand wins over tabler",
			input:    "google",
			expected: SvgBase + "/google-ads/default.svg",
		},
		{
			name:     "empty",
			input:    "",
			expected: "",
		},
		{
			name:     "unknown",
			input:    "some-random-icon-name",
			expected: "",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			actual := ResolveIconFromName(tc.input)

			if actual != tc.expected {
				t.Fatalf(
					"expected %q, got %q",
					tc.expected,
					actual,
				)
			}
		})
	}
}

func TestNormalizeIconName(t *testing.T) {
	tests := map[string]string{
		"Google Ads": "googleads",
		"google-ads": "googleads",
		"google_ads": "googleads",
		"GOOGLE ADS": "googleads",
		"OpenAI":     "openai",
	}

	for input, expected := range tests {
		actual := normalizeIconName(input)

		if actual != expected {
			t.Fatalf("input=%s expected=%s got=%s", input, expected, actual)
		}
	}
}

func TestResolveIconFromName_RealData(t *testing.T) {
	// Reload the icons to ensure we're testing against the latest data.'
	loadBrandIcons()
	loadTablerIcons()

	tests := []struct {
		input            string
		expectedContains string
	}{
		{
			input:            "google",
			expectedContains: "google",
		},
		{
			input:            "googleads",
			expectedContains: "google-ads",
		},
		{
			input:            "openai",
			expectedContains: "openai",
		},
		{
			input:            "youtube",
			expectedContains: "youtube",
		},
		{
			input:            "github",
			expectedContains: "github",
		},
		{
			input:            "stripe",
			expectedContains: "stripe",
		},
		{
			input:            "facebook",
			expectedContains: "facebook",
		},
		{
			input:            "instagram",
			expectedContains: "instagram",
		},
		{
			input:            "arrow-left",
			expectedContains: "arrow-left",
		},
		{
			input:            "arrowleft",
			expectedContains: "arrow-left",
		},
		{
			input:            "chevrondown",
			expectedContains: "chevron-down",
		},
		{
			input:            "awslambda",
			expectedContains: "aws-aws-lambda",
		},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			got := ResolveIconFromName(tc.input)

			if got == "" {
				t.Fatalf("expected icon for %q", tc.input)
			}

			if tc.expectedContains != "" &&
				!strings.Contains(strings.ToLower(got), strings.ToLower(tc.expectedContains)) {
				t.Fatalf(
					"expected url %q to contain %q",
					got,
					tc.expectedContains,
				)
			}
		})
	}
}
