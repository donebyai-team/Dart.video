package brand_identity

import (
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"math"
	"strconv"
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
	COLOR_PRIMARY:        "#6366F1",
	COLOR_SECONDARY:      "#A5B4FC",
	COLOR_ACCENT:         "#F59E0B",
	COLOR_BACKGROUND:     "#FFFFFF",
	COLOR_TEXT_PRIMARY:   "#0A0A0A",
	COLOR_TEXT_SECONDARY: "#6B7280",
}

// Order ensures consistent output ordering
var colorOrder = []string{
	COLOR_PRIMARY,
	COLOR_SECONDARY,
	COLOR_ACCENT,
	COLOR_BACKGROUND,
	COLOR_TEXT_PRIMARY,
	COLOR_TEXT_SECONDARY,
}

// Mapping to protobuf priority
var priorityMap = map[string]pbcore.BrandAssetPriority{
	COLOR_PRIMARY:        pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY,
	COLOR_SECONDARY:      pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY,
	COLOR_ACCENT:         pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT,
	COLOR_BACKGROUND:     pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND,
	COLOR_TEXT_PRIMARY:   pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY,
	COLOR_TEXT_SECONDARY: pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY,
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

	for _, colorName := range colorOrder {
		hex := strings.TrimSpace(colors[colorName])
		if hex == "" {
			continue
		}

		result = append(result, &pbcore.BrandColor{
			ColorHexCode: hex,
			Priority:     priorityMap[colorName],
		})

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
	if input[COLOR_ACCENT] == "" {
		result[COLOR_ACCENT] = shiftHue(primary, 35)
	}

	// Background: very light version of primary
	// IMPORTANT: never allow pure/near white
	if input[COLOR_BACKGROUND] == "" {
		bg := lightenHSL(primary, 0.9)
		if isTooLight(bg) {
			bg = lightenHSL(primary, 0.85)
		}
		result[COLOR_BACKGROUND] = bg
	}

	// Text colors are NOT finalized here
	// They will be computed based on gradient later
	if input[COLOR_TEXT_PRIMARY] == "" {
		result[COLOR_TEXT_PRIMARY] = "#000000"
	}

	if input[COLOR_TEXT_SECONDARY] == "" {
		result[COLOR_TEXT_SECONDARY] = "#6B7280"
	}

	return result
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

// ---------------- CONTRAST ----------------

// Standard WCAG contrast ratio formula
func ContrastRatio(a, b string) float64 {
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
	hex = strings.TrimSpace(strings.ToLower(hex))

	// Handle transparent
	if hex == "transparent" || hex == "" {
		return 255, 255, 255 // treat as white
	}

	hex = strings.TrimPrefix(hex, "#")

	// Support shorthand hex (#fff)
	if len(hex) == 3 {
		hex = string([]byte{
			hex[0], hex[0],
			hex[1], hex[1],
			hex[2], hex[2],
		})
	}

	// Fallback safety
	if len(hex) != 6 {
		return 255, 255, 255
	}

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

	rs := linearizeRGB(float64(r) / 255)
	gs := linearizeRGB(float64(g) / 255)
	bs := linearizeRGB(float64(b) / 255)

	return 0.2126*rs + 0.7152*gs + 0.0722*bs
}

func linearizeRGB(v float64) float64 {
	if v <= 0.03928 {
		return v / 12.92
	}

	return math.Pow((v+0.055)/1.055, 2.4)
}

func isTooLight(hex string) bool {
	return luminance(hex) > 0.92
}
