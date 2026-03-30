package agent

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/baml_client/types"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
	"strings"
)

type PatchOverlay struct {
	ID       string
	Type     string
	Props    map[string]interface{}
	Children map[string]map[string]interface{}
}

func ParseScenePatchFromStruct(edits *structpb.Struct) (*types.Scene, error) {
	if edits == nil {
		return nil, nil
	}

	// Convert protobuf Struct → JSON
	jsonBytes, err := protojson.Marshal(edits)
	if err != nil {
		return nil, err
	}

	nodes, err := ParseScenePatch(jsonBytes)
	if err != nil {
		return nil, err
	}

	if len(nodes) == 0 {
		return nil, fmt.Errorf("invalid scene patch, length of nodes is zero")
	}

	// Convert to scene
	node := nodes[0]

	marshal, err := json.Marshal(node.Props)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal node props: %w", err)
	}

	elements := make([]types.SceneElement, 0)
	elements = append(elements, types.SceneElement{
		Component: node.Type,
		Props:     string(marshal),
		Children:  nil,
	})

	// Call your existing parser
	return &types.Scene{
		Elements: elements,
	}, nil
}

func ParseScenePatch(data []byte) ([]PatchOverlay, error) {
	var raw map[string]json.RawMessage
	err := json.Unmarshal(data, &raw)
	if err != nil {
		return nil, err
	}

	nodes := map[string]*PatchOverlay{}

	// Pass 1: find root objects
	for key, value := range raw {

		if !strings.Contains(key, "-") {
			continue
		}

		parts := strings.Split(key, "-")

		// root node pattern: type-index
		if len(parts) == 2 {

			props := map[string]interface{}{}
			json.Unmarshal(value, &props)

			nodes[key] = &PatchOverlay{
				ID:       key,
				Type:     scenes.GetComponentName(parts[0]),
				Props:    props,
				Children: map[string]map[string]interface{}{},
			}
		}
	}

	// Pass 2: attach children
	for key, value := range raw {

		parts := strings.Split(key, "-")

		if len(parts) < 3 {
			continue
		}

		rootID := parts[len(parts)-2] + "-" + parts[len(parts)-1]

		node, exists := nodes[rootID]
		if !exists {
			continue
		}

		childType := parts[0]

		props := map[string]interface{}{}
		json.Unmarshal(value, &props)

		node.Children[childType] = props
	}

	result := []PatchOverlay{}
	for _, node := range nodes {
		result = append(result, *node)
	}

	return result, nil
}
