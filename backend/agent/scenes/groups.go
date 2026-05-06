package scenes

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/agent/scenes/field_resolvers"
	"github.com/shank318/coasterai/agent/scenes/types"
	baml_client "github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/services"
	"strings"
)

type UngroupFunc func(
	scene *baml_client.Scene,
	fieldValueMapper *services.MediaAssetRegistry,
) ([]*SceneConfig, error)

type GroupedComponent struct {
	Name        string
	Tags        []string
	LLMSchema   []types.LLMField
	Description string
	Ungroup     UngroupFunc
}

var groupedComponents = map[string]GroupedComponent{
	"SocialProofList": {
		Name:        "SocialProofList",
		Tags:        []string{"Social Proof"},
		Description: "Fast social proof sequence. Use near the end of a video to quickly show multiple social proofs, achievements, stats, or wins before the final CTA. Each text appears for 30 frames.",
		Ungroup:     ungroupSocialProof,
		LLMSchema: []types.LLMField{
			{
				Name:  "proofs",
				Type:  "array",
				Items: &types.LLMItems{Type: "string"},
				Range: "min 2 proofs",
			},
		},
	},
}

func ungroupSocialProof(scene *baml_client.Scene, fieldValueMapper *services.MediaAssetRegistry) ([]*SceneConfig, error) {
	element := scene.Element
	var llmProps map[string]any
	if err := json.Unmarshal([]byte(element.Props), &llmProps); err != nil {
		return nil, fmt.Errorf("invalid scene props json: %w", err)
	}

	rawTexts, ok := llmProps["proofs"].([]any)
	if !ok {
		return nil, fmt.Errorf("proofs must be an array")
	}

	texts := make([]string, 0, len(rawTexts))
	for _, rawText := range rawTexts {
		text, ok := rawText.(string)
		if !ok {
			return nil, fmt.Errorf("proofs must contain only strings")
		}

		texts = append(texts, text)
	}

	component, err := FindComponent("textstagger")
	if err != nil {
		return nil, err
	}
	background := resolveSceneBackground(scene, fieldValueMapper)

	sceneConfigs := make([]*SceneConfig, 0, len(texts))
	for _, text := range texts {
		finalProps, err := GenerateEditsFromProps(
			component.Schema,
			map[string]any{
				"text":              strings.TrimSpace(text),
				"variant":           "headingLg",
				"entranceAnimation": "zoomIn",
				"splitBy":           "line",
				"staggerDelay":      15,
				"duration":          15,
			},
			field_resolvers.FieldResolverForward,
			fieldValueMapper,
			background)
		if err != nil {
			return nil, err
		}

		sceneConfigs = append(sceneConfigs, &SceneConfig{
			ID:                 strings.ToLower(component.Name),
			Name:               component.Name,
			DurationExpression: component.CELExpression,
			Props:              finalProps,
		})

	}
	return sceneConfigs, err
}
