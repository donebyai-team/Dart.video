package brand_identity

import (
	"fmt"
	"math"
	"strconv"
	"strings"
)

// Returns true if the color is too dark to be used as a background.
func isTooDark(hex string) bool {
	return luminance(hex) < 0.08
}

// Alias for consistency.
func isDark(hex string) bool {
	return luminance(hex) < 0.5
}

// Reduce saturation while preserving hue/lightness.
// amount = 0.7 means reduce saturation by 70%.
func desaturateHSL(hex string, amount float64) string {
	h, s, l := hexToHSL(hex)

	s *= (1 - amount)
	if s < 0 {
		s = 0
	}

	return hslToHex(h, s, l)
}

// Darken using HSL.
// amount should be between 0-1.
func darkenHSL(hex string, amount float64) string {
	h, s, l := hexToHSL(hex)

	l -= amount
	if l < 0 {
		l = 0
	}

	return hslToHex(h, s, l)
}

// Chooses whichever text color gives the highest WCAG contrast.
func bestContrast(background string) string {
	const (
		white = "#FFFFFF"
		black = "#000000"
	)

	if ContrastRatio(background, white) >= ContrastRatio(background, black) {
		return white
	}

	return black
}

// Chooses the black/white text color with the strongest worst-case contrast
// across a gradient.
func bestContrastForGradient(bgStart, bgEnd string) string {
	const (
		white = "#FFFFFF"
		black = "#000000"
	)

	whiteContrast := math.Min(ContrastRatio(white, bgStart), ContrastRatio(white, bgEnd))
	blackContrast := math.Min(ContrastRatio(black, bgStart), ContrastRatio(black, bgEnd))

	if whiteContrast >= blackContrast {
		return white
	}

	return black
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
	if hex == "" {
		return ""
	}

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

func IsDark(hex string) bool {
	return luminance(hex) < 0.5
}

// / Linear RGB interpolation.
// ratio = 0 -> a
// ratio = 1 -> b
func mixColors(a, b string, ratio float64) string {
	if ratio <= 0 {
		return normalizeHex(a)
	}
	if ratio >= 1 {
		return normalizeHex(b)
	}

	ar, ag, ab := hexToRGB(a)
	br, bg, bb := hexToRGB(b)

	r := int(math.Round(float64(ar) + (float64(br-ar) * ratio)))
	g := int(math.Round(float64(ag) + (float64(bg-ag) * ratio)))
	bc := int(math.Round(float64(ab) + (float64(bb-ab) * ratio)))

	return fmt.Sprintf("#%02X%02X%02X", r, g, bc)
}
