package brand_identity

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"testing"
)

func colorByPriority(p Palette, priority pbcore.BrandAssetPriority) string {
	for _, c := range p.Colors {
		if c.Priority == priority {
			return c.ColorHexCode
		}
	}
	return ""
}

func TestBuildPalette_Defaults(t *testing.T) {
	p := BuildPalette(nil)

	require.Len(t, p.Colors, 6)

	assert.Equal(t, "#7CFFDC", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY))
	assert.Equal(t, "#FFD166", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY))
	assert.Equal(t, "#FFD166", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT))
	assert.Equal(t, "#111337", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND))
	assert.Equal(t, "#FFFFFF", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY))

	gradient := p.BgStyle.GetGradient()
	require.NotNil(t, gradient)
	assert.Len(t, gradient.Stops, 2)
	assert.EqualValues(t, 180, gradient.Angle)
}

func TestBuildPalette_UsesProvidedColors(t *testing.T) {
	input := map[string]string{
		COLOR_PRIMARY:        "#007FFF",
		COLOR_SECONDARY:      "#00308F",
		COLOR_ACCENT:         "#FF5500",
		COLOR_BACKGROUND:     "#FFFFFF",
		COLOR_TEXT_PRIMARY:   "#022169",
		COLOR_TEXT_SECONDARY: "#445566",
	}

	p := BuildPalette(input)

	assert.Equal(t, "#007FFF", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY))
	assert.Equal(t, "#00308F", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY))
	assert.Equal(t, "#FF5500", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT))
	assert.Equal(t, "#FFFFFF", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND))
	assert.Equal(t, "#022169", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY))
	assert.Equal(t, "#445566", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY))
}

func TestBuildPalette_GeneratesGradientForWhiteBackground(t *testing.T) {
	p := BuildPalette(map[string]string{
		COLOR_PRIMARY:    "#007FFF",
		COLOR_BACKGROUND: "#FFFFFF",
	})

	gradient := p.BgStyle.GetGradient()
	require.NotNil(t, gradient)

	assert.Equal(t, "#FFFFFF", gradient.Stops[0].Color)
	assert.NotEqual(t, "#FFFFFF", gradient.Stops[1].Color)
	assert.False(t, isDark(gradient.Stops[1].Color))
}

func TestBuildPalette_GeneratesGradientForDarkBackground(t *testing.T) {
	p := BuildPalette(map[string]string{
		COLOR_PRIMARY:    "#007FFF",
		COLOR_BACKGROUND: "#111111",
	})

	gradient := p.BgStyle.GetGradient()
	require.NotNil(t, gradient)

	assert.NotEqual(t, "#111111", gradient.Stops[0].Color)
	assert.NotEqual(t, "#111111", gradient.Stops[1].Color)

	assert.True(t, isDark(gradient.Stops[0].Color))
	assert.True(t, isDark(gradient.Stops[1].Color))
}

func TestBuildPalette_AutoContrastText(t *testing.T) {
	p := BuildPalette(map[string]string{
		COLOR_PRIMARY: "#007FFF",
	})

	text := colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY)

	assert.True(t, text == "#000000" || text == "#FFFFFF")
}

func TestBuildPalette_DerivesSecondaryText(t *testing.T) {
	p := BuildPalette(map[string]string{
		COLOR_TEXT_PRIMARY: "#FFFFFF",
	})

	assert.Equal(t,
		deriveSecondaryText("#FFFFFF"),
		colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY),
	)
}

func TestBuildPalette_WhiteBackgroundBlueBrandGradientIsBlueTint(t *testing.T) {
	p := BuildPalette(map[string]string{
		COLOR_PRIMARY:    "#007FFF",
		COLOR_BACKGROUND: "#FFFFFF",
	})

	gradient := p.BgStyle.GetGradient()
	end := gradient.Stops[1].Color

	// Should not remain white.
	assert.NotEqual(t, "#FFFFFF", end)

	// Should still be a light non-dark tint.
	assert.False(t, isDark(end))

	// Should have a blue component greater than red.
	r, _, b := hexToRGB(end)
	assert.Greater(t, b, r)
}

func TestBuildPalette_ProvidedWhiteBackgroundAndTextPrimary(t *testing.T) {
	//// Digital API
	p := BuildPalette(map[string]string{
		COLOR_PRIMARY:      "#0000EE",
		COLOR_SECONDARY:    "#00308F",
		COLOR_ACCENT:       "#007FFF",
		COLOR_BACKGROUND:   "#FFFFFF",
		COLOR_TEXT_PRIMARY: "#022169",
	})

	// Anthropic
	//p := BuildPalette(map[string]string{
	//	COLOR_PRIMARY:      "#C6613F",
	//	COLOR_SECONDARY:    "#D97757",
	//	COLOR_ACCENT:       "#141413",
	//	COLOR_BACKGROUND:   "#F0EEE6",
	//	COLOR_TEXT_PRIMARY: "#141413",
	//})

	assert.Equal(t, "#007FFF", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY))
	assert.Equal(t, "#00308F", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY))
	assert.Equal(t, "#007FFF", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT))
	assert.Equal(t, "#FFFFFF", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND))
	assert.Equal(t, "#022169", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY))

	gradient := p.BgStyle.GetGradient()
	require.NotNil(t, gradient)
	require.Len(t, gradient.Stops, 2)
	assert.Equal(t, "#FFFFFF", gradient.Stops[0].Color)
	assert.Equal(t, "#D9ECFF", gradient.Stops[1].Color)
	assert.False(t, isDark(gradient.Stops[1].Color))
}

func TestBuildPalette_OverridesUnreadableDarkTextOnDarkBackground(t *testing.T) {
	p := BuildPalette(map[string]string{
		COLOR_PRIMARY:      "#879AA2",
		COLOR_SECONDARY:    "#4C565B",
		COLOR_ACCENT:       "#000000",
		COLOR_BACKGROUND:   "#111113",
		COLOR_TEXT_PRIMARY: "#111113",
	})

	assert.Equal(t, "#879AA2", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY))
	assert.Equal(t, "#4C565B", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY))
	assert.Equal(t, "#000000", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT))
	assert.Equal(t, "#111113", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND))
	assert.Equal(t, "#FFFFFF", colorByPriority(p, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY))

	gradient := p.BgStyle.GetGradient()
	require.NotNil(t, gradient)
	require.Len(t, gradient.Stops, 2)
	assert.True(t, isDark(gradient.Stops[0].Color))
	assert.True(t, isDark(gradient.Stops[1].Color))
}
