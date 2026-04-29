package field_resolvers

import (
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
)

type ColorResolver struct{}

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

	// else set it to primary color
	palette := brand_identity.BrandColorTokens(brandColors)
	return palette[brand_identity.COLOR_PRIMARY], nil
}

func (r ColorResolver) Reverse(value any, fieldValueMapper *services.MediaAssetRegistry) (any, error) {
	return value, nil
}
