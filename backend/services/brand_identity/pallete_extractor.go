package brand_identity

import (
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"math"
	"strconv"
	"strings"
)

// ---------------- DEFAULTS ----------------

// Default fallback colors if nothing is scraped / provided
var defaultColors = map[string]string{
	"primary":       "#6366F1",
	"secondary":     "#A5B4FC",
	"accent":        "#F59E0B",
	"background":    "#FFFFFF",
	"textPrimary":   "#0A0A0A",
	"textSecondary": "#6B7280",
}

// Order ensures consistent output ordering
var colorOrder = []string{
	"primary", "secondary", "accent", "background", "textPrimary", "textSecondary",
}

// Mapping to protobuf priority
var priorityMap = map[string]pbcore.BrandAssetPriority{
	"primary":       pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY,
	"secondary":     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY,
	"accent":        pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT,
	"background":    pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND,
	"textPrimary":   pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY,
	"textSecondary": pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY,
}

// ---------------- MAIN ENTRY ----------------

// Entry point:
// 1. Build palette (scraped/user input = source of truth)
// 2. Fill missing colors ONLY once
// 3. Return structured list
func ExtractOrGenerateColors(input map[string]string) []*pbcore.BrandColor {
	if input == nil {
		input = map[string]string{} // treat as empty input
	}

	colors := buildColorPalette(input)

	result := make([]*pbcore.BrandColor, 0)
	seen := make(map[string]bool)

	for _, colorName := range colorOrder {
		hex := strings.TrimSpace(colors[colorName])
		if hex == "" {
			continue
		}

		// Avoid duplicate hex values
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

// ---------------- PALETTE BUILD ----------------

// Builds final palette ONCE
// - Scraped/user colors take priority
// - Missing colors are derived
// - After this → palette is fixed (no more mutation later)
func buildColorPalette(input map[string]string) map[string]string {

	result := make(map[string]string)

	// Step 1: Start with defaults
	for k, v := range defaultColors {
		result[k] = v
	}

	// Step 2: Override with scraped/user input (source of truth)
	for k, v := range input {
		if v != "" {
			result[k] = normalizeHex(v)
		}
	}

	primary := result["primary"]

	// Step 3: Derive missing colors

	// Secondary: lighter version of primary (keeps brand consistency)
	if input["secondary"] == "" {
		result["secondary"] = lightenHSL(primary, 0.25)
	}

	// Accent: hue-shifted version (creates visual separation)
	if input["accent"] == "" {
		result["accent"] = shiftHue(primary, 35)
	}

	// Background: very light version of primary
	// IMPORTANT: never allow pure/near white
	if input["background"] == "" {
		bg := lightenHSL(primary, 0.9)
		if isTooLight(bg) {
			bg = lightenHSL(primary, 0.85)
		}
		result["background"] = bg
	}

	// Text colors are NOT finalized here
	// They will be computed based on gradient later
	if input["textPrimary"] == "" {
		result["textPrimary"] = "#000000"
	}

	if input["textSecondary"] == "" {
		result["textSecondary"] = "#6B7280"
	}

	return result
}

// ---------------- GRADIENT ----------------
const defaultBackgroundColor = "#FFFFFF"

func GenerateSolidFromBackground(colors []*pbcore.BrandColor) *pbcore.SolidColor {
	bg := defaultBackgroundColor

	// Extract palette colors
	for _, c := range colors {
		switch c.Priority {
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND:
			bg = c.ColorHexCode
		}
	}
	return &pbcore.SolidColor{
		Hex: bg,
	}
}

func GetTextColorForSolid(g *pbcore.SolidColor) string {
	return getReadableTextOnGradient(g.Hex, g.Hex)
}

func GenerateGradientFromBackground(colors []*pbcore.BrandColor) *pbcore.Gradient {
	var bg string

	// Extract palette colors
	for _, c := range colors {
		switch c.Priority {
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND:
			bg = c.ColorHexCode
		}
	}

	if bg == "" {
		return GenerateGradient(colors)
	}

	start := bg
	end := lightenHSL(bg, 0.45)

	// Ensure end is light enough for UI backgrounds
	if lightness(end) < 0.85 {
		end = lightenHSL(end, 0.25)
	}

	// Avoid near-white gradients
	if isTooLight(start) {
		start = darkenHSL(start, 0.15)
	}

	if isTooLight(end) {
		end = darkenHSL(end, 0.05)
	}

	// Ensure visible difference
	if colorDistance(start, end) < 20 {
		end = lightenHSL(end, 0.2)
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

// Gradient is computed EVERY time (pure function)
// based on current palette (user may edit anytime)
func GenerateGradient(colors []*pbcore.BrandColor) *pbcore.Gradient {
	var primary, secondary, accent string

	// Extract palette colors
	for _, c := range colors {
		switch c.Priority {
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY:
			primary = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY:
			secondary = c.ColorHexCode
		case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT:
			accent = c.ColorHexCode
		}
	}

	var start, end string

	// ---- PRIMARY STRATEGY ----
	if accent != "" {
		start = accent

		// Use secondary only if it is lighter
		if secondary != "" && lightness(secondary) > lightness(primary) {
			end = secondary
		} else {
			// Generate pastel version of primary
			end = lightenHSL(accent, 0.45)
		}
	} else {
		// ---- FALLBACK STRATEGY ----
		if secondary != "" {
			start = secondary
			end = lightenHSL(secondary, 0.35)
		} else if primary != "" {
			start = primary
			end = lightenHSL(primary, 0.35)
		} else if len(colors) > 0 {
			start = colors[0].ColorHexCode
			end = lightenHSL(start, 0.35)
		}
	}

	// ---- SAFETY RULES ----

	// Ensure end color is light enough for backgrounds
	if lightness(end) < 0.85 {
		end = lightenHSL(end, 0.35)
	}

	// Avoid near white
	if isTooLight(start) {
		start = darkenHSL(start, 0.15)
	}
	if isTooLight(end) {
		end = darkenHSL(end, 0.05)
	}

	// Ensure visible gradient difference
	if colorDistance(start, end) < 20 {
		end = lightenHSL(end, 0.2)
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

func lightness(hex string) float64 {
	r, g, b := hexToRGB(hex)

	rf := float64(r) / 255
	gf := float64(g) / 255
	bf := float64(b) / 255

	max := math.Max(rf, math.Max(gf, bf))
	min := math.Min(rf, math.Min(gf, bf))

	return (max + min) / 2
}

// ---------------- TEXT (GRADIENT-AWARE) ----------------

// Computes text color based on BOTH gradient stops
// Ensures readability across entire gradient
func GetTextColorForGradient(g *pbcore.Gradient) string {
	if len(g.Stops) < 2 {
		return "#FFFFFF"
	}

	start := g.Stops[0].Color
	end := g.Stops[1].Color

	return getReadableTextOnGradient(start, end)
}

// Chooses black or white based on worst-case contrast
// (minimum contrast across both gradient stops)
func getReadableTextOnGradient(start, end string) string {

	blackStart := contrastRatio(start, "#000000")
	blackEnd := contrastRatio(end, "#000000")

	whiteStart := contrastRatio(start, "#FFFFFF")
	whiteEnd := contrastRatio(end, "#FFFFFF")

	// Take worst-case contrast (important for gradients)
	blackMin := math.Min(blackStart, blackEnd)
	whiteMin := math.Min(whiteStart, whiteEnd)

	if blackMin > whiteMin {
		return "#000000"
	}

	return "#FFFFFF"
}

// ---------------- CONTRAST ----------------

// Standard WCAG contrast ratio formula
func contrastRatio(a, b string) float64 {
	l1 := luminance(a)
	l2 := luminance(b)

	if l1 < l2 {
		l1, l2 = l2, l1
	}

	return (l1 + 0.05) / (l2 + 0.05)
}

// ---------------- COLOR UTILS ----------------

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

// ---------------- HSL ----------------

// Convert HEX → HSL (used for perceptual color adjustments)
func hexToHSL(hex string) (float64, float64, float64) {
	r, g, b := hexToRGB(hex)

	rf := float64(r) / 255
	gf := float64(g) / 255
	bf := float64(b) / 255

	max := math.Max(rf, math.Max(gf, bf))
	min := math.Min(rf, math.Min(gf, bf))

	l := (max + min) / 2

	var h, s float64

	if max == min {
		h, s = 0, 0
	} else {
		d := max - min

		if l > 0.5 {
			s = d / (2 - max - min)
		} else {
			s = d / (max + min)
		}

		switch max {
		case rf:
			h = (gf - bf) / d
		case gf:
			h = 2 + (bf-rf)/d
		case bf:
			h = 4 + (rf-gf)/d
		}

		h *= 60
		if h < 0 {
			h += 360
		}
	}

	return h, s, l
}

func hslToHex(h, s, l float64) string {
	c := (1 - math.Abs(2*l-1)) * s
	x := c * (1 - math.Abs(math.Mod(h/60, 2)-1))
	m := l - c/2

	var r, g, b float64

	switch {
	case h < 60:
		r, g, b = c, x, 0
	case h < 120:
		r, g, b = x, c, 0
	case h < 180:
		r, g, b = 0, c, x
	case h < 240:
		r, g, b = 0, x, c
	case h < 300:
		r, g, b = x, 0, c
	default:
		r, g, b = c, 0, x
	}

	return rgbToHex(
		int((r+m)*255),
		int((g+m)*255),
		int((b+m)*255),
	)
}

// ---------------- DERIVATION ----------------

// Lighten/darken using HSL (better than RGB scaling)
func lightenHSL(hex string, p float64) string {
	h, s, l := hexToHSL(hex)
	l = math.Min(1, l+p)
	return hslToHex(h, s, l)
}

func darkenHSL(hex string, p float64) string {
	h, s, l := hexToHSL(hex)
	l = math.Max(0, l-p)
	return hslToHex(h, s, l)
}

// Shift hue → creates visually distinct accent
func shiftHue(hex string, deg float64) string {
	h, s, l := hexToHSL(hex)
	h = math.Mod(h+deg, 360)
	return hslToHex(h, s, l)
}

// ---------------- HELPERS ----------------

// Relative luminance (used for contrast calculations)
func luminance(hex string) float64 {
	r, g, b := hexToRGB(hex)

	rs := float64(r) / 255
	gs := float64(g) / 255
	bs := float64(b) / 255

	return 0.2126*rs + 0.7152*gs + 0.0722*bs
}

func isTooLight(hex string) bool {
	return luminance(hex) > 0.92
}

func isDark(hex string) bool {
	return luminance(hex) < 0.25
}

// Simple RGB distance to detect visually similar colors
func colorDistance(a, b string) float64 {
	r1, g1, b1 := hexToRGB(a)
	r2, g2, b2 := hexToRGB(b)

	return math.Sqrt(
		math.Pow(float64(r1-r2), 2) +
			math.Pow(float64(g1-g2), 2) +
			math.Pow(float64(b1-b2), 2),
	)
}
