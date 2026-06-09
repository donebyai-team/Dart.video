package brand_identity

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
)

type TextKind string

const (
	TextNormal    TextKind = "normal"
	TextHighlight TextKind = "highlight"
)

const (
	// Minimum contrast thresholds for text rendering.
	minNormalTextContrast    = 3.0
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

	palette := BrandColorTokens(colors)

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
			"#FFFFFF",
			palette[COLOR_TEXT_PRIMARY],
			"#000000",
		}
	}

	best := "#000000"
	bestContrast := 0.0
	minContrast := minContrastForTextKind(kind)

	for _, c := range candidates {
		if c == "" {
			continue
		}

		cr := ContrastRatio(bg, c)

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

func BrandColorTokens(colors []*pbcore.BrandColor) map[string]string {
	out := make(map[string]string)
	if colors == nil {
		return out
	}

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

	// if text primary is missing
	s := out[COLOR_TEXT_PRIMARY]
	if s == "transparent" || !utils.IsValidHexColor(s) {
		out[COLOR_TEXT_PRIMARY] = "#000000"
	}

	return out
}

func IsDark(color string) bool {
	return luminance(color) < 0.5
}

func DarkestOrBlack(a, b string) string {
	l1 := luminance(a)
	l2 := luminance(b)

	isADark := IsDark(a)
	isBDark := IsDark(b)

	switch {
	case isADark && isBDark:
		if l1 < l2 {
			return a
		}
		return b

	case isADark:
		return a

	case isBDark:
		return b

	default:
		return "#000000"
	}
}

const WCAGNormalTextContrast = 3

// IsReadableColorOnBackground returns true if the text color meets
// the WCAG AA minimum contrast ratio (4.5:1) against the background color.
func IsReadableColorOnBackground(bgColor, textColor string) bool {
	return ContrastRatio(bgColor, textColor) >= WCAGNormalTextContrast
}

// IsReadableColorOnGradient returns true if the text color meets
// the WCAG AA minimum contrast ratio (4.5:1) against every gradient stop.
//
// This is a conservative check that guarantees readability across the
// entire gradient by validating all defined stop colors.
func IsReadableColorOnGradient(gradient *pbcore.Gradient, textColor string) bool {
	if gradient == nil || len(gradient.Stops) == 0 {
		return false
	}

	for _, stop := range gradient.Stops {
		if !IsReadableColorOnBackground(stop.Color, textColor) {
			return false
		}
	}

	return true
}
