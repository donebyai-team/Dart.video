package field_resolvers

import (
	"github.com/shank318/coasterai/agent/scenes/types"
	"github.com/shank318/coasterai/services"
	"strings"
)

type PropsResolver struct {
	FieldValueMapper *services.MediaAssetRegistry
}

func (resolver PropsResolver) Resolve(
	props map[string]any,
	fields []types.FieldSchema,
) map[string]any {
	for _, field := range fields {
		// For AnimatedText, we need to change the entrance animation and stagger delay
		if field.Name == "splitBy" {
			if splitBy, ok := props[field.Name].(string); ok && strings.HasPrefix(splitBy, "word") {
				props["staggerDelay"] = 2
				props["entranceAnimation"] = "slideUp"
			}
		}
	}

	return props
}
