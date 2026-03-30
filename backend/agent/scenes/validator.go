package scenes

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/baml_client/types"
	"math/rand"
	"time"
)

// Convert the LLM generated scene to internal config
func ConvertToSceneConfig(scene *types.Scene) (*SceneConfig, error) {
	if len(scene.Elements) == 0 {
		return nil, fmt.Errorf("scene can't have empty elements")
	}

	element := scene.Elements[0]
	componentName := element.Component

	var props map[string]interface{}
	if err := json.Unmarshal([]byte(element.Props), &props); err != nil {
		return nil, fmt.Errorf("invalid scene props json: %w", err)
	}

	for _, group := range componentGroups {
		for _, component := range group.Components {

			if component.Name != componentName {
				continue
			}

			finalProps := make(map[string]interface{})

			// merge defaults + validate required
			for _, prop := range component.Props {

				val, exists := props[prop.Name]

				if !exists {
					if prop.Required {
						return nil, fmt.Errorf("missing required prop: %s", prop.Name)
					}

					// use default if defined
					if prop.Default != nil {
						finalProps[prop.Name] = prop.Default
					}

					continue
				}

				finalProps[prop.Name] = val
			}

			return &SceneConfig{
				ID:    component.ID + "-" + shortID(6),
				Name:  component.Name,
				Props: finalProps,
			}, nil
		}
	}

	return nil, fmt.Errorf("scene component %s not found in component list", componentName)
}

const idChars = "abcdefghijklmnopqrstuvwxyz0123456789"

func shortID(n int) string {
	rand.Seed(time.Now().UnixNano())

	b := make([]byte, n)
	for i := range b {
		b[i] = idChars[rand.Intn(len(idChars))]
	}

	return string(b)
}
