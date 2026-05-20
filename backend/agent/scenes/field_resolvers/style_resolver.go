package field_resolvers

import (
	"github.com/shank318/coasterai/agent/scenes/types"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/brand_identity"
	"strings"
)

type StyleResolver struct {
	BackgroundStyle  *pbcore.BackgroundStyle
	FieldValueMapper *services.MediaAssetRegistry
}

// Resolve if a background style is applied on a scene
// the forground colors should be changed to the most readable colors from brand tokens
func (resolver StyleResolver) Resolve(
	props map[string]any,
	fields []types.FieldSchema,
) map[string]any {
	if resolver.FieldValueMapper == nil {
		return props
	}

	backgroundColor, ok := resolver.backgroundColor()
	if !ok {
		return props
	}

	// TODO: special case for WordCycle
	// since we don't know the name of the component, this is a hack
	if backgroundColor == "#1207e5" {
		mergeStyleColor(props, "#FFFFFF")
		return props
	}

	brandColors := resolver.FieldValueMapper.GetBrandColors()
	if len(brandColors) == 0 {
		return props
	}

	textNormalColor := brand_identity.GetReadableTextColorForSolid(
		backgroundColor,
		brandColors,
		brand_identity.TextNormal,
	)

	// This aassumes that default color fields will always be primary color
	// if this changes, we have to pass the current color
	textHighlightColor := brand_identity.GetReadableTextColorForSolid(
		backgroundColor,
		brandColors,
		brand_identity.TextHighlight,
	)

	//hasTextField := false

	for _, field := range fields {
		switch field.DataType {
		case types.DataTypeText:
			//hasTextField = true

		case types.DataTypeColor:
			props[field.Name] = textHighlightColor
		}

		// For TextStagger, we need to change the entrance animation and stagger delay
		if field.Name == "splitBy" {
			if splitBy, ok := props[field.Name].(string); ok && strings.HasPrefix(splitBy, "word") {
				props["staggerDelay"] = 2
				props["entranceAnimation"] = "slideUp"
			}
		}
	}

	//if hasTextField {
	mergeStyleColor(props, textNormalColor)
	//}

	return props
}

func (resolver StyleResolver) backgroundColor() (string, bool) {
	if resolver.BackgroundStyle == nil ||
		resolver.BackgroundStyle.Style == nil ||
		resolver.BackgroundStyle.GetSolid() == nil ||
		resolver.BackgroundStyle.GetSolid().Hex == "" {
		return "", false
	}

	// If the effect is glow that is a light color,
	// the hex color will be dark and hence we override it
	if resolver.BackgroundStyle.Effect != nil &&
		resolver.BackgroundStyle.Effect.Type == pbcore.BackgroundEffectType_BACKGROUND_EFFECT_TYPE_GLOW {
		resolver.BackgroundStyle.GetSolid().Hex = "#FFFFFF"
	}

	return resolver.BackgroundStyle.GetSolid().Hex, true
}

func mergeStyleColor(props map[string]any, color string) {
	style, ok := props["style"].(map[string]any)
	if !ok {
		style = make(map[string]any)
		props["style"] = style
	}

	style["color"] = color
}
