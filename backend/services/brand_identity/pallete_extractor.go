package brand_identity

import (
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"strconv"
	"strings"
)

// Same as DEFAULT_THEME in frontend
var defaultColors = map[string]string{
	"primary":       "#6366f1",
	"secondary":     "#a5b4fc",
	"accent":        "#F59E0B",
	"background":    "#ffffff",
	"textPrimary":   "#0a0a0a",
	"textSecondary": "#6B7280",
}

var colorOrder = []string{
	"primary",
	"secondary",
	"accent",
	"background",
	"textPrimary",
	"textSecondary",
}

var priorityMap = map[string]pbcore.BrandAssetPriority{
	"primary":       pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY,
	"secondary":     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY,
	"accent":        pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT,
	"background":    pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND,
	"textPrimary":   pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY,
	"textSecondary": pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY,
}

func brightness(hex string) float64 {
	r, g, b := hexToRGB(hex)

	return 0.299*float64(r) + 0.587*float64(g) + 0.114*float64(b)
}

func ExtractOrGenerateColors(input map[string]string) []*pbcore.BrandColor {

	colors := buildColorPalette(input)

	result := make([]*pbcore.BrandColor, 0)
	seen := make(map[string]bool)

	for _, colorName := range colorOrder {

		hex := strings.TrimSpace(colors[colorName])
		if hex == "" {
			continue
		}

		hexLower := strings.ToLower(hex)

		if !seen[hexLower] {

			result = append(result, &pbcore.BrandColor{
				ColorHexCode: hex,
				Priority:     priorityMap[colorName],
			})

			seen[hexLower] = true
		}
	}

	return result
}

func buildColorPalette(input map[string]string) map[string]string {

	result := make(map[string]string)

	// Step 1: start with defaults
	for k, v := range defaultColors {
		result[k] = v
	}

	// Step 2: override with provided tokens
	for k, v := range input {
		if v != "" {
			result[k] = normalizeHex(v)
		}
	}

	primary := result["primary"]

	bright := brightness(primary)

	// Secondary
	if input["secondary"] == "" {

		if bright > 200 {
			result["secondary"] = darken(primary, 0.25)
		} else if bright > 140 {
			result["secondary"] = darken(primary, 0.15)
		} else {
			result["secondary"] = lighten(primary, 0.35)
		}
	}

	// Accent
	if input["accent"] == "" {
		result["accent"] = darken(primary, 0.20)
	}

	// Background (never white)
	if input["background"] == "" {

		if bright > 200 {
			result["background"] = darken(primary, 0.90)
		} else {
			result["background"] = lighten(primary, 0.92)
		}
	}

	// Text
	if input["textPrimary"] == "" {
		result["textPrimary"] = "#111827"
	}

	if input["textSecondary"] == "" {
		result["textSecondary"] = "#6B7280"
	}

	return result
}

func normalizeHex(hex string) string {

	hex = strings.TrimSpace(hex)

	if !strings.HasPrefix(hex, "#") {
		hex = "#" + hex
	}

	if len(hex) == 4 {
		r := string(hex[1])
		g := string(hex[2])
		b := string(hex[3])

		hex = "#" + r + r + g + g + b + b
	}

	return strings.ToUpper(hex)
}

func hexToRGB(hex string) (int, int, int) {

	hex = strings.TrimPrefix(hex, "#")

	r, _ := strconv.ParseInt(hex[0:2], 16, 0)
	g, _ := strconv.ParseInt(hex[2:4], 16, 0)
	b, _ := strconv.ParseInt(hex[4:6], 16, 0)

	return int(r), int(g), int(b)
}

func rgbToHex(r, g, b int) string {
	return fmt.Sprintf("#%02X%02X%02X", clamp(r), clamp(g), clamp(b))
}

func clamp(v int) int {

	if v < 0 {
		return 0
	}

	if v > 255 {
		return 255
	}

	return v
}

func lighten(hex string, percent float64) string {

	r, g, b := hexToRGB(hex)

	r = int(float64(r) + (255-float64(r))*percent)
	g = int(float64(g) + (255-float64(g))*percent)
	b = int(float64(b) + (255-float64(b))*percent)

	return rgbToHex(r, g, b)
}

func darken(hex string, percent float64) string {

	r, g, b := hexToRGB(hex)

	r = int(float64(r) * (1 - percent))
	g = int(float64(g) * (1 - percent))
	b = int(float64(b) * (1 - percent))

	return rgbToHex(r, g, b)
}

func GenerateGradient(colors []*pbcore.BrandColor) *pbcore.Gradient {
	var primary string
	var accent string
	var secondary string

	for _, c := range colors {

		switch c.Priority {

		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY:
			primary = c.ColorHexCode

		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT:
			accent = c.ColorHexCode

		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY:
			secondary = c.ColorHexCode
		}
	}

	start := primary
	end := accent

	if start == "" {
		start = secondary
	}

	if end == "" {
		end = secondary
	}

	// Final fallback
	if start == "" && len(colors) > 0 {
		start = colors[0].ColorHexCode
	}

	if end == "" {
		end = darken(start, 0.2)
	}

	return &pbcore.Gradient{
		Type:  pbcore.GradientType_GRADIENT_TYPE_LINEAR,
		Angle: 135,
		Stops: []*pbcore.GradientStop{
			{
				Color:    start,
				Position: 0,
			},
			{
				Color:    end,
				Position: 100,
			},
		},
	}
}
