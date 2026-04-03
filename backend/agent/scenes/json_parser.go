package scenes

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/agent/scenes/field_resolvers"
	"github.com/shank318/coasterai/baml_client/types"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
	"strings"
)

// This is what even dynamic scenes will store
type SceneConfig struct {
	ID       string
	Name     string
	Props    map[string]interface{}
	Children []SceneConfig
}

func (s SceneConfig) ToEditsPatch() json.RawMessage {
	patch := make(map[string]map[string]interface{})

	var walk func(SceneConfig)
	walk = func(node SceneConfig) {
		if node.ID != "" {
			patch[node.ID] = node.Props
		}

		for _, child := range node.Children {
			walk(child)
		}
	}

	walk(s)

	data, _ := json.Marshal(patch)
	return data
}

// Convert edits to scene parent only
func EditsToScene(edits *structpb.Struct) (*types.Scene, error) {
	if edits == nil {
		return nil, nil
	}

	// Convert protobuf Struct → JSON
	jsonBytes, err := protojson.Marshal(edits)
	if err != nil {
		return nil, err
	}

	nodes, err := ParseSceneConfigFromEditsPatch(jsonBytes)
	if err != nil {
		return nil, err
	}

	if len(nodes) == 0 {
		return nil, fmt.Errorf("invalid scene patch, length of nodes is zero")
	}

	// Convert to scene, skipping child nodes are they are already part of the scene
	node := nodes[0]

	marshal, err := json.Marshal(node.Props)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal node props: %w", err)
	}

	elements := make([]types.SceneElement, 0)
	elements = append(elements, types.SceneElement{
		Component: node.Name,
		Props:     string(marshal),
		Children:  nil,
	})

	// Call your existing parser
	return &types.Scene{
		Elements: elements,
	}, nil
}

func ParseSceneConfigFromEditsPatch(data []byte) ([]SceneConfig, error) {
	var raw map[string]json.RawMessage
	err := json.Unmarshal(data, &raw)
	if err != nil {
		return nil, err
	}

	nodes := map[string]*SceneConfig{}

	// Pass 1: find root objects
	for key, value := range raw {

		if !strings.Contains(key, "-") {
			continue
		}

		parts := strings.Split(key, "-")

		// root node pattern: type-index
		if len(parts) == 2 {

			props := map[string]interface{}{}
			err := json.Unmarshal(value, &props)
			if err != nil {
				return nil, fmt.Errorf("failed to unmarshal props %s: %w", key, err)
			}

			name := GetComponentName(parts[0])
			if name == "" {
				return nil, fmt.Errorf("invalid component name: %s", parts[0])
			}

			nodes[key] = &SceneConfig{
				ID:       key,
				Name:     name,
				Props:    props,
				Children: nil,
			}
		}
	}

	// Pass 2: attach children
	for key, value := range raw {

		parts := strings.Split(key, "-")

		// if < 3 that means its a root, we have already captured it above
		if len(parts) < 3 {
			continue
		}

		// child id always has child-xxx-rootid eg. text-right-[animatedvideo-0]
		// child = parts[0]
		// parent = end part split by -
		rootID := parts[len(parts)-2] + "-" + parts[len(parts)-1]

		node, exists := nodes[rootID]
		if !exists {
			continue
		}

		// For now, not doing child validations as only scenes exists
		//name := GetComponentName(parts[0])
		//if name == "" {
		//	return nil, fmt.Errorf("invalid component name: %s", parts[0])
		//}

		props := map[string]interface{}{}
		err := json.Unmarshal(value, &props)
		if err != nil {
			return nil, fmt.Errorf("failed to unmarshal props %s: %w", key, err)
		}

		node.Children = append(node.Children, SceneConfig{
			ID:       key,
			Name:     parts[0],
			Props:    props,
			Children: nil,
		})
	}

	result := []SceneConfig{}

	for _, node := range nodes {

		for propName, val := range node.Props {

			resolved, err := field_resolvers.FieldMappings.ResolveReverse(propName, val)
			if err != nil {
				return nil, fmt.Errorf(
					"unable to reverse resolve %s of component %s: %w",
					propName,
					node.Name,
					err,
				)
			}

			// write back into props
			node.Props[propName] = resolved
		}

		result = append(result, *node)
	}

	return result, nil
}
