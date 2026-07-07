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

	secondary := normalizeHex(input[COLOR_SECONDARY])
	if secondary == "" {
		secondary = lightenHSL(primary, 0.25)
	}

	colors = append(colors, &pbcore.BrandColor{
		ColorHexCode: secondary,
		Priority:     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY,
	})

	//------------------------------------------------------------------
	// Accent
	//------------------------------------------------------------------

	accent := normalizeHex(input[COLOR_ACCENT])
	if accent == "" {
		secondary = lightenHSL(primary, 0.25)
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

	var gradientStart, gradientEnd string

	switch {
	case isTooLight(background):
		// White/light backgrounds should stay airy, but pick up a visible brand tint.
		gradientStart = background
		gradientEnd = mixColors(background, primary, 0.55)

	case isTooDark(background):
		// Dark backgrounds: lift slightly and tint with the brand.
		lifted := lightenHSL(background, 0.06)
		gradientStart = lifted
		gradientEnd = mixColors(lifted, primary, 0.14)

	default:
		// Mid-tone backgrounds: create gentle depth.
		gradientStart = lightenHSL(background, 0.03)
		gradientEnd = darkenHSL(background, 0.03)
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
