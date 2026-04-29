package brand_identity

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"testing"
)

func TestGetReadableTextColorForSolid(t *testing.T) {

	buildColors := func(primary, secondary, accent, textPrimary, textSecondary string) []*pbcore.BrandColor {
		return []*pbcore.BrandColor{
			{ColorHexCode: primary, Priority: pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY},
			{ColorHexCode: secondary, Priority: pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY},
			{ColorHexCode: accent, Priority: pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT},
			{ColorHexCode: textPrimary, Priority: pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY},
			{ColorHexCode: textSecondary, Priority: pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY},
		}
	}

	tests := []struct {
		name     string
		bg       string
		colors   []*pbcore.BrandColor
		kind     TextKind
		expected string
	}{
		{
			name: "highlight picks secondary when primary fails on red background",
			bg:   "#FF4646",
			colors: buildColors(
				"#FF4646",
				"#263238",
				"#22C55E",
				"#111827",
				"#6B7280",
			),
			kind:     TextHighlight,
			expected: "#263238",
		},
		{
			name: "normal prefers textPrimary over secondary even if secondary is readable",
			bg:   "#FF4646",
			colors: buildColors(
				"#FF4646", // primary
				"#263238", // secondary (readable but should NOT be picked for normal)
				"#22C55E",
				"#111827", // textPrimary (also readable → should win)
				"#6B7280",
			),
			kind:     TextNormal,
			expected: "#111827",
		},
		{
			name: "cursor normal prefers textPrimary over secondary even if secondary is readable",
			bg:   "#F54E00",
			colors: buildColors(
				"#F54E00", // primary
				"#34785C", // secondary (readable but should NOT be picked for normal)
				"",
				"#26251E", // textPrimary (also readable → should win)
				"#6B7280",
			),
			kind:     TextNormal,
			expected: "#FFFFFF",
		},
		{
			name: "highlight falls back to black when brand colors fail",
			bg:   "#FF4646",
			colors: buildColors(
				"#FF4646",
				"#FF7A7A",
				"#FF8A8A",
				"#111827",
				"#6B7280",
			),
			kind:     TextHighlight,
			expected: "#000000",
		},
		{
			name: "normal picks textPrimary if readable",
			bg:   "#FFFFFF",
			colors: buildColors(
				"#6366F1",
				"#A5B4FC",
				"#F59E0B",
				"#111827",
				"#6B7280",
			),
			kind:     TextNormal,
			expected: "#111827",
		},
		{
			name: "normal falls back to black if text colors fail",
			bg:   "#FFFFFF",
			colors: buildColors(
				"#6366F1",
				"#A5B4FC",
				"#F59E0B",
				"#F5F5F5",
				"#EEEEEE",
			),
			kind:     TextNormal,
			expected: "#000000",
		},
		{
			name: "highlight prefers primary if readable",
			bg:   "#FFFFFF",
			colors: buildColors(
				"#111827",
				"#263238",
				"#22C55E",
				"#111827",
				"#6B7280",
			),
			kind:     TextHighlight,
			expected: "#111827",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := GetReadableTextColorForSolid(tt.bg, tt.colors, tt.kind)

			if got != tt.expected {
				t.Errorf("expected %s, got %s", tt.expected, got)
			}
		})
	}
}
