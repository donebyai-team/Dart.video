package scenes

import (
	"fmt"
	"github.com/shank318/coasterai/agent/scenes/field_resolvers"
	"github.com/shank318/coasterai/services"
	"reflect"
	"strings"
)

func GenerateEditsFromProps(schema []SchemaNode, input map[string]any, direction field_resolvers.FieldResolverDirection, fieldValueMapper *services.MediaAssetRegistry) (map[string]any, error) {

	output := map[string]any{}

	for _, node := range schema {

		switch node.Type {
		case "oneof":

			value := resolveMap(node.Selector, input, nil)

			var componentName string

			// 1️⃣ selector mode (LLM input)
			if value != nil {
				componentName, _ = value.(string)
			}

			// 2️⃣ patch mode (detect existing component)
			if componentName == "" {
				for _, c := range node.Components {
					if _, ok := input[c.Name]; ok {
						componentName = c.Name
						break
					}
				}
			}

			if componentName == "" {
				continue
			}

			var component *ComponentSchema

			for i := range node.Components {
				if node.Components[i].Name == componentName {
					component = &node.Components[i]
					break
				}
			}

			if component == nil {
				continue
			}

			var componentInput map[string]interface{}

			if node.PropsPath != "" {
				componentInput, _ = resolveMap(node.PropsPath, input, nil).(map[string]interface{})
			} else {
				componentInput = input
			}

			existing := getExistingNode(input, component.Name)

			props, err := resolveFields(
				component.Fields,
				componentInput,
				existing,
				nil,
				direction,
				fieldValueMapper,
			)

			if err != nil {
				return nil, fmt.Errorf(
					"failed to resolve fields for component %s: %v",
					component.Name,
					err,
				)
			}

			output[component.Name] = props
		case "component":

			existing := getExistingNode(input, node.Name)

			props, err := resolveFields(node.Fields, input, existing, nil, direction, fieldValueMapper)
			if err != nil {
				return nil, fmt.Errorf("failed to resolve fields for component %s: %v", node.Name, err)
			}

			output[node.Name] = props
		case "repeat":

			arr := toSlice(resolveMap(node.Map, input, nil))

			// ---------- Case 1: LLM array ----------
			if len(arr) > 0 {

				for i, item := range arr {

					for _, comp := range node.Components {

						key := fmt.Sprintf("%s-%s-%d", comp.Name, node.Source, i)

						existing := getExistingNode(input, key)

						props, err := resolveFields(comp.Fields, input, existing, item, direction, fieldValueMapper)
						if err != nil {
							return nil, fmt.Errorf("failed to resolve fields for component %s: %v", comp.Name, err)
						}

						output[key] = props
					}
				}

				continue
			}

			// ---------- Case 2: existing component instances ----------
			for _, comp := range node.Components {

				prefix := comp.Name + "-" + node.Source + "-"

				for key, value := range input {

					if !strings.HasPrefix(key, prefix) {
						continue
					}

					existing, _ := value.(map[string]any)

					props, err := resolveFields(comp.Fields, input, existing, nil, direction, fieldValueMapper)
					if err != nil {
						return nil, fmt.Errorf("failed to resolve fields for component %s: %v", comp.Name, err)
					}

					output[key] = props
				}
			}
		}
	}

	return output, nil
}

func resolveFields(
	fields []FieldSchema,
	input map[string]any,
	existing map[string]any,
	item any,
	direction field_resolvers.FieldResolverDirection,
	fieldValueMapper *services.MediaAssetRegistry,
) (map[string]any, error) {

	out := map[string]any{}

	// preserve unknown existing fields
	for k, v := range existing {
		out[k] = v
	}

	for _, f := range fields {

		var value any

		// 1️⃣ existing patch value
		if v, ok := existing[f.Name]; ok {
			value = v
		}

		// 2️⃣ mapped value
		if value == nil && f.Map != "" {
			v := resolveMap(f.Map, input, item)
			if v != nil {
				value = v
			}
		}

		// 3️⃣ default
		if value == nil && f.Default != nil {
			value = f.Default
		}

		// 4️⃣ apply forward mapper
		if value != nil && f.DataType != "" {

			var err error

			switch direction {
			case field_resolvers.FieldResolverForward:
				value, err = field_resolvers.FieldMappings.ResolveForward(
					f.DataType,
					value,
					fieldValueMapper,
				)

			case field_resolvers.FieldResolverReverse:
				value, err = field_resolvers.FieldMappings.ResolveReverse(
					f.DataType,
					value,
					fieldValueMapper,
				)
			}

			if err != nil {
				return nil, fmt.Errorf(
					"unable to resolve data type %s: %w",
					f.DataType,
					err,
				)
			}
		}

		if value != nil {
			if mediaAssetFields, ok := value.(*field_resolvers.MediaAssetFields); ok {
				value = mediaAssetFields.Url
				mergeMediaAssetFields(out, mediaAssetFields)
			}

			out[f.Name] = value
		}
	}

	return out, nil
}

func mergeMediaAssetFields(out map[string]any, mediaAssetFields *field_resolvers.MediaAssetFields) {
	if mediaAssetFields == nil {
		return
	}

	// fields starting with _ , don't render in editor
	out["_width"] = mediaAssetFields.Width
	out["_height"] = mediaAssetFields.Height
	out["_duration"] = mediaAssetFields.Duration
	out["_mediaType"] = mediaAssetFields.MediaType
}

func resolveMap(path string, input map[string]any, item any) any {

	if path == "item" {
		return item
	}

	if strings.HasPrefix(path, "props.") {
		return getNested(input, strings.TrimPrefix(path, "props."))
	}

	if strings.HasPrefix(path, "item.") {

		obj, ok := item.(map[string]any)
		if !ok {
			return nil
		}

		return getNested(obj, strings.TrimPrefix(path, "item."))
	}

	return nil
}

func getNested(m map[string]any, path string) any {

	parts := strings.Split(path, ".")
	var cur any = m

	for _, p := range parts {

		obj, ok := cur.(map[string]any)
		if !ok {
			return nil
		}

		cur = obj[p]
	}

	return cur
}

func getExistingNode(input map[string]any, name string) map[string]any {

	if v, ok := input[name].(map[string]any); ok {
		return v
	}

	return map[string]any{}
}

func toSlice(v any) []any {

	rv := reflect.ValueOf(v)

	if rv.Kind() != reflect.Slice {
		return nil
	}

	out := make([]any, rv.Len())

	for i := 0; i < rv.Len(); i++ {
		out[i] = rv.Index(i).Interface()
	}

	return out
}

//func ParseSceneConfigFromEditsPatch(data []byte, fieldValueMapper *services.MediaAssetRegistry) ([]SceneConfig, error) {
//	var raw map[string]json.RawMessage
//	err := json.Unmarshal(data, &raw)
//	if err != nil {
//		return nil, err
//	}
//
//	nodes := map[string]*SceneConfig{}
//
//	// Pass 1: find root objects
//	for key, value := range raw {
//
//		if !strings.Contains(key, "-") {
//			continue
//		}
//
//		parts := strings.Split(key, "-")
//
//		// root node pattern: type-index
//		if len(parts) == 2 {
//
//			props := map[string]any{}
//			err := json.Unmarshal(value, &props)
//			if err != nil {
//				return nil, fmt.Errorf("failed to unmarshal props %s: %w", key, err)
//			}
//
//			name := "GetComponentName(parts[0])"
//			if name == "" {
//				return nil, fmt.Errorf("invalid component name: %s", parts[0])
//			}
//
//			nodes[key] = &SceneConfig{
//				ID:    key,
//				Name:  name,
//				Props: props,
//			}
//		}
//	}
//
//	// Pass 2: attach children
//	for key, value := range raw {
//
//		parts := strings.Split(key, "-")
//
//		// if < 3 that means its a root, we have already captured it above
//		if len(parts) < 3 {
//			continue
//		}
//
//		// child id always has child-xxx-rootid eg. text-right-[animatedvideo-0]
//		// child = parts[0]
//		// parent = end part split by -
//		rootID := parts[len(parts)-2] + "-" + parts[len(parts)-1]
//
//		node, exists := nodes[rootID]
//		if !exists {
//			continue
//		}
//
//		// For now, not doing child validations as only scenes exists
//		//name := GetComponentName(parts[0])
//		//if name == "" {
//		//	return nil, fmt.Errorf("invalid component name: %s", parts[0])
//		//}
//
//		props := map[string]any{}
//		err := json.Unmarshal(value, &props)
//		if err != nil {
//			return nil, fmt.Errorf("failed to unmarshal props %s: %w", key, err)
//		}
//
//		node.Children = append(node.Children, SceneConfig{
//			ID:       key,
//			Name:     parts[0],
//			Props:    props,
//			Children: nil,
//		})
//	}
//
//	result := []SceneConfig{}
//
//	for _, node := range nodes {
//
//		for propName, val := range node.Props {
//
//			resolved, err := field_resolvers.FieldMappings.ResolveReverse(propName, val, fieldValueMapper)
//			if err != nil {
//				return nil, fmt.Errorf(
//					"unable to reverse resolve %s of component %s: %w",
//					propName,
//					node.Name,
//					err,
//				)
//			}
//
//			// write back into props
//			node.Props[propName] = resolved
//		}
//
//		result = append(result, *node)
//	}
//
//	return result, nil
//}
