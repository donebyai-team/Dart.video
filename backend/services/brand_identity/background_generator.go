package brand_identity

import pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"

type TextKind string

const (
	TextNormal    TextKind = "normal"
	TextHighlight TextKind = "highlight"
)

const (
	minNormalTextContrast    = 4.5
	minHighlightTextContrast = 3.0
)

func minContrastForTextKind(kind TextKind) float64 {
	if kind == TextHighlight {
		return minHighlightTextContrast
	}
	return minNormalTextContrast
}

// Entry for scenes (solid background)
func GetReadableTextColorForSolid(
	bg string,
	colors []*pbcore.BrandColor,
	kind TextKind,
) string {

	palette := extractPalette(colors)

	var candidates []string

	switch kind {
	case TextHighlight:
		candidates = []string{
			palette["primary"],
			palette["secondary"],
			palette["accent"],
			"#000000",
			"#FFFFFF",
		}
	default:
		candidates = []string{
			palette["textPrimary"],
			palette["textSecondary"],
			"#000000",
			"#FFFFFF",
		}
	}

	best := "#000000"
	bestContrast := 0.0
	minContrast := minContrastForTextKind(kind)

	for _, c := range candidates {
		if c == "" {
			continue
		}

		cr := contrastRatio(bg, c)

		if cr >= minContrast {
			return normalizeHex(c)
		}

		if cr > bestContrast {
			bestContrast = cr
			best = c
		}
	}

	return normalizeHex(best)
}

func extractPalette(colors []*pbcore.BrandColor) map[string]string {
	out := make(map[string]string)

	for _, c := range colors {
		switch c.Priority {
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY:
			out["primary"] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY:
			out["secondary"] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT:
			out["accent"] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND:
			out["background"] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY:
			out["textPrimary"] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY:
			out["textSecondary"] = c.ColorHexCode
		}
	}

	return out
}
