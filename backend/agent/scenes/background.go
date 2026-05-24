package scenes

import (
	"github.com/shank318/coasterai/baml_client/types"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/utils"
	"strings"
)

const WordCycleBackgroundColor = "#1207e5"

// apply background to a scene
func resolveSceneBackground(selectedScene *types.Scene, fieldValueMapper *services.MediaAssetRegistry) *pbcore.BackgroundStyle {
	if fieldValueMapper == nil {
		return nil
	}

	// special case
	selectedComponent := selectedScene.Element.Component

	if strings.EqualFold(selectedComponent, "WordCycle") {
		return &pbcore.BackgroundStyle{
			Pattern: pbcore.BackgroundPattern_BACKGROUND_PATTERN_DOTS,
			Effect: &pbcore.BackgroundEffect{
				Type: pbcore.BackgroundEffectType_BACKGROUND_EFFECT_TYPE_AURORA,
			},
			PatternOpacity: utils.Ptr(brand_identity.DefaultBackgroundPatternOpacity),
			Style:          &pbcore.BackgroundStyle_Solid{Solid: &pbcore.SolidColor{Hex: WordCycleBackgroundColor}},
		}
	}

	// Handle LLM generated background color
	bg := selectedScene.Background
	if bg == nil {
		return nil
	}

	var hex string
	// TODO: For now, ignore color
	if bg.Solid.IsString() && utils.IsValidHexColor(*bg.Solid.AsString()) {
		hex = *bg.Solid.AsString()
		return nil
	}

	if bg.Solid.IsColorToken() && *bg.Solid.AsColorToken() == types.ColorTokenPRIMARY {
		hex = brand_identity.BrandColorTokens(fieldValueMapper.GetBrandColors())[brand_identity.COLOR_PRIMARY]
	}

	if hex == "" {
		return nil
	}

	return &pbcore.BackgroundStyle{
		Style: &pbcore.BackgroundStyle_Solid{
			Solid: &pbcore.SolidColor{
				Hex: hex,
			},
		},
		Pattern:        pbcore.BackgroundPattern_BACKGROUND_PATTERN_DOTS,
		PatternOpacity: utils.Ptr(brand_identity.DefaultBackgroundPatternOpacity),
	}
}
