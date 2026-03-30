package scenes

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
)

//go:embed scene_manifest.json
var componentsJSON []byte

type ComponentGroup struct {
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Components  []Component `json:"components"`
}

type Component struct {
	Name        string `json:"name"`
	ID          string `json:"id"`
	Description string `json:"description"`
	Props       []Prop `json:"props"`
}

type Prop struct {
	Name     string      `json:"name"`
	Type     string      `json:"type"`
	Required bool        `json:"required"`
	Default  interface{} `json:"default"`
}

var (
	componentGroups  []ComponentGroup
	componentNameMap map[string]string
)

func BuildScenesList(requiredOnly bool, excludeProps []string) string {
	exclude := map[string]bool{}
	for _, p := range excludeProps {
		exclude[p] = true
	}

	var b strings.Builder

	for _, g := range componentGroups {

		fmt.Fprintf(&b, "## %s — %s\n\n", g.Title, g.Description)

		for _, c := range g.Components {

			fmt.Fprintf(&b, "### %s\n", c.Name)
			fmt.Fprintf(&b, "%s\n", c.Description)
			fmt.Fprintf(&b, "Props:\n")

			for _, p := range c.Props {

				if requiredOnly && !p.Required {
					continue
				}

				if exclude[p.Name] {
					continue
				}

				req := ""
				if p.Required {
					req = " (required)"
				}

				fmt.Fprintf(&b, "- %s: %s%s\n", p.Name, p.Type, req)
			}

			b.WriteString("\n")
		}
	}

	return b.String()
}

func loadComponents() error {
	err := json.Unmarshal(componentsJSON, &componentGroups)
	if err != nil {
		return err
	}

	componentNameMap = make(map[string]string)

	for _, g := range componentGroups {
		for _, c := range g.Components {
			componentNameMap[c.ID] = c.Name
		}
	}

	return nil
}

func GetComponentName(id string) string {
	if name, ok := componentNameMap[id]; ok {
		return name
	}
	return ""
}

func init() {
	err := loadComponents()
	if err != nil {
		panic(fmt.Sprintf("failed to load components: %v", err))
	}
}
