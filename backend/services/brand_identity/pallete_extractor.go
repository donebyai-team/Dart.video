package brand_identity

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"strings"
)

const (
	COLOR_PRIMARY        = "primary"
	COLOR_SECONDARY      = "secondary"
	COLOR_ACCENT         = "accent"
	COLOR_BACKGROUND     = "background"
	COLOR_TEXT_PRIMARY   = "textPrimary"
	COLOR_TEXT_SECONDARY = "textSecondary"
)

// Default fallback colors if nothing is scraped / provided
var defaultColors = map[string]string{
	COLOR_PRIMARY:        "#7CFFDC", // light green
	COLOR_SECONDARY:      "#FFD166", // yellowish
	COLOR_ACCENT:         "#FFD166",
	COLOR_BACKGROUND:     "#111337", // dark blue
	COLOR_TEXT_PRIMARY:   "#000000",
	COLOR_TEXT_SECONDARY: "#6B7280",
}

var defaultBGGradient = []string{
	"#0b1922",
	"#0e4f59",
}

type Palette struct {
	Colors  []*pbcore.BrandColor
	BgStyle *pbcore.BackgroundStyle
}

func BuildPalette(input map[string]string) Palette {
	if input == nil {
		input = map[string]string{} // treat as empty input
	}

	colors := make([]*pbcore.BrandColor, 0)

	p := Palette{}

	//------------------------------------------------------------------
	// Primary
	//------------------------------------------------------------------

	primary := normalizeHex(input[COLOR_PRIMARY])
	if primary == "" {
		primary = defaultColors[COLOR_PRIMARY]
	}

	colors = append(colors, &pbcore.BrandColor{
		ColorHexCode: primary,
		Priority:     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY,
	})

	//------------------------------------------------------------------
	// Secondary
	//------------------------------------------------------------------

	// Secondary — fallback chain, but purely for its own use, not background
	secondary := normalizeHex(input[COLOR_SECONDARY])
	if secondary == "" {
		if accentInput := normalizeHex(input[COLOR_ACCENT]); accentInput != "" {
			secondary = accentInput
		} else {
			secondary = rotateHueLighten(primary, +18, 0.20)
		}
	}

	colors = append(colors, &pbcore.BrandColor{
		ColorHexCode: secondary,
		Priority:     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY,
	})

	//------------------------------------------------------------------
	// Accent
	//------------------------------------------------------------------
	// Accent — kept for future, derived independently, never touches gradient
	accent := normalizeHex(input[COLOR_ACCENT])
	if accent == "" {
		accent = rotateHueLighten(primary, -18, 0.12)
	}

	colors = append(colors, &pbcore.BrandColor{
		ColorHexCode: accent,
		Priority:     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT,
	})

	//------------------------------------------------------------------
	// Background
	//------------------------------------------------------------------

	background := normalizeHex(input[COLOR_BACKGROUND])

	// Respect an explicitly supplied background.
	// Otherwise use the default.
	if background == "" {
		background = defaultColors[COLOR_BACKGROUND]
	}

	colors = append(colors, &pbcore.BrandColor{
		ColorHexCode: background,
		Priority:     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND,
	})

	//------------------------------------------------------------------
	// Gradient
	//------------------------------------------------------------------

	const minContrastVsPrimary = 1.6 // decorative-element threshold, not text-scale

	var gradientStart, gradientEnd string

	switch {
	case isTooLight(background) || isTooDark(background) || isGeneric(background):
		// Background carries no usable hue signal (white, black, or gray at any
		// lightness) — discard it entirely and synthesize purely from primary.
		gradientStart, gradientEnd = synthesizeFromPrimary(primary)

	default:
		// Real, colorful, usable background — keep it, just add gentle depth.
		gradientStart = lightenHSL(background, 0.03)
		gradientEnd = darkenHSL(background, 0.03)
	}

	// Guarantee primary itself stays visible against whatever we picked.
	// If not, fall back to a safe primary-derived tint that's guaranteed to pass.
	if ContrastRatio(primary, gradientStart) < minContrastVsPrimary ||
		ContrastRatio(primary, gradientEnd) < minContrastVsPrimary {
		gradientStart, gradientEnd = safeFallbackFromPrimary(primary)
	}

	// if no brand is extracted use this default gradient
	if len(input) == 0 {
		gradientStart = defaultBGGradient[0]
		gradientEnd = defaultBGGradient[1]
	}

	p.BgStyle = &pbcore.BackgroundStyle{
		Style: &pbcore.BackgroundStyle_Gradient{
			Gradient: &pbcore.Gradient{
				Type:  pbcore.GradientType_GRADIENT_TYPE_LINEAR,
				Angle: 180,
				Stops: []*pbcore.GradientStop{
					{
						Color:    gradientStart,
						Position: 0,
					},
					{
						Color:    gradientEnd,
						Position: 100,
					},
				},
			},
		},
		Pattern:        pbcore.BackgroundPattern_BACKGROUND_PATTERN_DOTS,
		PatternOpacity: utils.Ptr(DefaultBackgroundPatternOpacity),
	}

	//------------------------------------------------------------------
	// Text
	//------------------------------------------------------------------

	textPrimary := visibleTextColor(input[COLOR_TEXT_PRIMARY], gradientStart, gradientEnd)

	colors = append(colors, &pbcore.BrandColor{
		ColorHexCode: textPrimary,
		Priority:     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY,
	})

	textSecondary := normalizeHex(input[COLOR_TEXT_SECONDARY])
	if textSecondary == "" {
		textSecondary = deriveSecondaryText(textPrimary)
	}
	if textSecondary == "" {
		textSecondary = defaultColors[COLOR_TEXT_SECONDARY]
	}
	colors = append(colors, &pbcore.BrandColor{
		ColorHexCode: textSecondary,
		Priority:     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY,
	})

	p.Colors = colors

	return p
}

// synthesizeFromPrimary produces a light-theme gradient pair by blending
// primary directly toward white, keeping visible brand hue instead of
// collapsing it the way pushing HSL lightness does.
func synthesizeFromPrimary(primary string) (string, string) {
	h, s, _ := hexToHSL(primary)

	// Preserve most of primary's own saturation — this is what keeps
	// dark, vivid primaries (like #0C0320) from washing out.
	tintSat := clampTo(s*0.85, 0.15, 0.90)

	startL := 0.88
	endL := 0.75

	start := hslToHex(h, tintSat, startL)
	end := hslToHex(h, tintSat, endL)

	return start, end
}
func clampTo(v, min, max float64) float64 {
	if v < min {
		return min
	}
	if v > max {
		return max
	}
	return v
}

// safeFallbackFromPrimary produces a near-gray, primary-hued pair that is
// guaranteed to clear the contrast gate against primary regardless of
// primary's own lightness.
func safeFallbackFromPrimary(primary string) (string, string) {
	h, _, l := hexToHSL(primary)
	// Push toward whichever extreme is farther from primary's own lightness.
	if l > 0.5 {
		return hslToHex(h, 0.10, 0.95), hslToHex(h, 0.10, 0.90)
	}
	return hslToHex(h, 0.10, 0.10), hslToHex(h, 0.10, 0.05)
}

func deriveSecondaryText(primary string) string {
	primary = strings.ToUpper(normalizeHex(primary))

	switch primary {
	case "#FFFFFF":
		// ~75% white
		return "#D1D5DB"

	case "#000000", "#111111", "#111827":
		// Slightly lighter dark gray
		return "#6B7280"

	default:
		if isDark(primary) {
			return lightenHSL(primary, 0.35)
		}
		return darkenHSL(primary, 0.35)
	}
}

func visibleTextColor(preferred, bgStart, bgEnd string) string {
	preferred = normalizeHex(preferred)
	if preferred != "" && hasReadableContrast(preferred, bgStart, bgEnd) {
		return preferred
	}

	contrastChoice := bestContrastForGradient(bgStart, bgEnd)
	if contrastChoice != "" {
		return contrastChoice
	}

	return defaultColors[COLOR_TEXT_PRIMARY]
}

func hasReadableContrast(text, bgStart, bgEnd string) bool {
	minContrast := ContrastRatio(text, bgStart)
	if contrast := ContrastRatio(text, bgEnd); contrast < minContrast {
		minContrast = contrast
	}

	return minContrast >= 4.5
}
