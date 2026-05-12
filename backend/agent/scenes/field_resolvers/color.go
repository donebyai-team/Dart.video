package field_resolvers

import (
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
)

type ColorResolver struct{}

const fallbackHighlightColor = "#ffe604"
const minContrastRatio = 1.5

func (r ColorResolver) Forward(value any, fieldValueMapper *services.MediaAssetRegistry) (any, error) {
	brandColors := fieldValueMapper.GetBrandColors()
	if len(brandColors) == 0 {
		return value, nil
	}

	colorValue, ok := value.(string)
	// if value exists or user has modief it don't override
	if !ok || colorValue != "" {
		return value, nil
	}

	palette := brand_identity.BrandColorTokens(brandColors)
	textPrimary := palette[brand_identity.COLOR_TEXT_PRIMARY]
	primary := palette[brand_identity.COLOR_PRIMARY]

	// If the contrast is too low, the highlight effect won't be visible
	// In this case, we fall back to an arbitrary color
	if brand_identity.ContrastRatio(textPrimary, primary) < minContrastRatio {
		primary = fallbackHighlightColor
	}

	return primary, nil
}

func (r ColorResolver) Reverse(value any, fieldValueMapper *services.MediaAssetRegistry) (any, error) {
	return value, nil
}
