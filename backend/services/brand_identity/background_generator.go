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

	palette := ExtractPalette(colors)

	var candidates []string

	switch kind {
	case TextHighlight:
		candidates = []string{
			palette[COLOR_PRIMARY],
			palette[COLOR_SECONDARY],
			palette[COLOR_ACCENT],
			"#000000",
			"#FFFFFF",
		}
	default:
		candidates = []string{
			palette[COLOR_TEXT_PRIMARY],
			palette[COLOR_TEXT_SECONDARY],
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

func ExtractPalette(colors []*pbcore.BrandColor) map[string]string {
	out := make(map[string]string)

	for _, c := range colors {
		switch c.Priority {
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY:
			out[COLOR_PRIMARY] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY:
			out[COLOR_SECONDARY] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT:
			out[COLOR_ACCENT] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND:
			out[COLOR_BACKGROUND] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY:
			out[COLOR_TEXT_PRIMARY] = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY:
			out[COLOR_TEXT_SECONDARY] = c.ColorHexCode
		}
	}

	return out
}
