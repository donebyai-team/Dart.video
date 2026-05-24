package scenes

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/agent/scenes/field_resolvers"
	"github.com/shank318/coasterai/baml_client/types"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
	"strings"
)

// This is what even dynamic scenes will store
type SceneConfig struct {
	ID                 string
	Name               string
	Props              map[string]any
	DurationExpression string
	Children           []SceneConfig
	Background         *pbcore.BackgroundStyle
}

func convertToSceneConfig(
	scene *types.Scene,
	background *pbcore.BackgroundStyle,
	fieldValueMapper *services.MediaAssetRegistry,
) ([]*SceneConfig, error) {
	element := scene.Element

	if groupedComponent, ok := groupedComponents[element.Component]; ok {
		return groupedComponent.Ungroup(scene, fieldValueMapper)
	}

	component, err := FindComponent(element.Component)
	if err != nil {
		return nil, err
	}

	var props map[string]any
	if err := json.Unmarshal([]byte(element.Props), &props); err != nil {
		return nil, fmt.Errorf("invalid scene props json: %w", err)
	}

	finalProps, err := GenerateEditsFromProps(
		component.Schema,
		props,
		field_resolvers.FieldResolverForward,
		fieldValueMapper,
		background,
	)
	if err != nil {
		return nil, err
	}

	cfg := &SceneConfig{
		ID:                 strings.ToLower(component.Name),
		Name:               component.Name,
		DurationExpression: component.CELExpression,
		Props:              finalProps,
		Background:         background,
	}

	return []*SceneConfig{cfg}, nil
}

func ConvertToSceneConfigWithBackground(
	scene *types.Scene,
	background *pbcore.BackgroundStyle,
	fieldValueMapper *services.MediaAssetRegistry,
) ([]*SceneConfig, error) {
	return convertToSceneConfig(scene, background, fieldValueMapper)
}

// Convert the LLM generated scene to internal config
// Merge the props from scene with defaults
func ConvertToSceneConfig(
	scene *types.Scene,
	fieldValueMapper *services.MediaAssetRegistry,
) ([]*SceneConfig, error) {
	background := resolveSceneBackground(scene, fieldValueMapper)

	configs, err := convertToSceneConfig(scene, background, fieldValueMapper)
	if err != nil {
		return nil, err
	}

	// TODO: Move it in a better place
	for _, cfg := range configs {
		if strings.EqualFold(cfg.Name, "animatedtext") {
			textStaggerProps := cfg.Props["animatedtext"].(map[string]any)
			text := textStaggerProps["text"].(string)

			if len(strings.Split(text, " ")) == 1 {
				textStaggerProps["variant"] = "display2xl"
			}
		}
	}

	return configs, nil
}

// Convert to edits
func (s SceneConfig) ToEditsPatch() json.RawMessage {
	m := make(map[string]interface{})

	// add name
	m["name"] = s.Name

	// merge props
	for k, v := range s.Props {
		m[k] = v
	}

	b, _ := json.Marshal(m)
	return json.RawMessage(b)
}

// Convert edits to scene parent only
func EditsToScene(edits *structpb.Struct, fieldValueMapper *services.MediaAssetRegistry) (*types.Scene, error) {
	if edits == nil {
		return nil, nil
	}

	// Convert protobuf Struct → JSON
	jsonBytes, err := protojson.Marshal(edits)
	if err != nil {
		return nil, err
	}

	config, err := sceneConfigFromPatch(jsonBytes, fieldValueMapper)
	if err != nil {
		return nil, err
	}

	marshal, err := json.Marshal(config.Props)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal node props: %w", err)
	}

	// Call your existing parser
	return &types.Scene{
		Element: types.SceneElement{
			Component: config.Name,
			Props:     string(marshal),
		},
	}, nil
}

func sceneConfigFromPatch(data []byte, fieldValueMapper *services.MediaAssetRegistry) (*SceneConfig, error) {
	var raw map[string]any

	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, err
	}

	cfg := &SceneConfig{
		Props: make(map[string]any),
	}

	if len(raw) == 0 {
		return nil, fmt.Errorf("invalid scene patch, length of raw config is zero")
	}

	for k, v := range raw {
		if k == "name" {
			if name, ok := v.(string); ok {
				cfg.Name = name
			}
			continue
		}

		cfg.Props[k] = v
	}

	// Resolve
	component, err := FindComponent(cfg.Name)
	if err != nil {
		return nil, err
	}

	finalProps, err := GenerateEditsFromProps(component.Schema, cfg.Props, field_resolvers.FieldResolverReverse, fieldValueMapper, nil)
	if err != nil {
		return nil, err
	}

	cfg.Props = finalProps
	cfg.DurationExpression = component.CELExpression

	return cfg, nil
}
