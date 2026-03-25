package agent

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/baml_client/types"
	"strings"
)

func GenerateReact(scene types.Scene) (string, error) {
	var elements []string

	for _, el := range scene.Elements {

		rendered, err := renderElement(el, 3, el.Component)
		if err != nil {
			return "", err
		}

		elements = append(elements, rendered)
	}

	return fmt.Sprintf(`
export default function RemoteComponent() {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
%s
      </AbsoluteCenter>
    </SafeArea>
  );
}
`, strings.Join(elements, "\n")), nil
}

func renderElement(el types.SceneElement, indent int, path string) (string, error) {

	space := strings.Repeat("  ", indent)

	props, err := renderProps(el.Props, path)
	if err != nil {
		return "", err
	}

	tagOpen := el.Component
	if props != "" {
		tagOpen += " " + props
	}

	if len(el.Children) == 0 {
		return fmt.Sprintf("%s<%s />", space, tagOpen), nil
	}

	var children []string

	for i, child := range el.Children {

		childPath := fmt.Sprintf("%s > %s[%d]", path, child.Component, i)

		rendered, err := renderElement(child, indent+1, childPath)
		if err != nil {
			return "", err
		}

		children = append(children, rendered)
	}

	return fmt.Sprintf(
		"%s<%s>\n%s\n%s</%s>",
		space,
		tagOpen,
		strings.Join(children, "\n"),
		space,
		el.Component,
	), nil
}

func renderProps(propsStr string, path string) (string, error) {

	if propsStr == "" {
		return "", nil
	}

	var props map[string]interface{}

	err := json.Unmarshal([]byte(propsStr), &props)
	if err != nil {

		return "", fmt.Errorf(
			`Invalid props JSON for component "%s".

Props must be a valid JSON object.

Received:
%s

Error:
%s

Example valid props:
{
  "text": "Hello",
  "count": 10,
  "style": {"color":"red"}
}`,
			path,
			propsStr,
			err.Error(),
		)
	}

	var parts []string

	for key, value := range props {

		switch val := value.(type) {

		case string:
			parts = append(parts, fmt.Sprintf(`%s="%s"`, key, val))

		case float64:
			parts = append(parts, fmt.Sprintf(`%s={%v}`, key, val))

		case bool:
			parts = append(parts, fmt.Sprintf(`%s={%t}`, key, val))

		case []interface{}:
			b, _ := json.Marshal(val)
			parts = append(parts, fmt.Sprintf(`%s={%s}`, key, string(b)))

		case map[string]interface{}:
			b, _ := json.Marshal(val)
			parts = append(parts, fmt.Sprintf(`%s={%s}`, key, string(b)))

		case nil:
			parts = append(parts, fmt.Sprintf(`%s={null}`, key))

		default:
			return "", fmt.Errorf(
				`Invalid prop value type in component "%s".

Prop:
%s

Value:
%v

Allowed types:
string | number | boolean | array | object | null`,
				path,
				key,
				value,
			)
		}
	}

	return strings.Join(parts, " "), nil
}
