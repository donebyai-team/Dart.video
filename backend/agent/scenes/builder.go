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
	Name        string   `json:"name"`
	Tags        []string `json:"tags"`
	ID          string   `json:"id"`
	Description string   `json:"description"`
	Props       []Prop   `json:"props"`
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

	// Find the Scenes group
	var components []Component
	for _, g := range componentGroups {
		if g.Title == "Scenes" {
			components = g.Components
			break
		}
	}

	var sectional, filler []Component
	for _, c := range components {
		if len(c.Tags) > 0 {
			sectional = append(sectional, c)
		} else {
			filler = append(filler, c)
		}
	}

	var b strings.Builder

	b.WriteString("## Available Scenes\n\n")

	b.WriteString("### Sectional — prefer for opening/closing of each section\n\n")
	for _, c := range sectional {
		fmt.Fprintf(&b, "%s | %s\n", c.Name, strings.Join(c.Tags, ", "))
		fmt.Fprintf(&b, "%s\n", c.Description)
		fmt.Fprintf(&b, "Props: %s\n\n", buildPropsInline(c.Props, requiredOnly, exclude))
	}

	b.WriteString("### Filler — use anywhere, not tied to a specific section\n\n")
	for _, c := range filler {
		fmt.Fprintf(&b, "%s — %s Props: %s\n\n", c.Name, c.Description, buildPropsInline(c.Props, requiredOnly, exclude))
	}

	return b.String()
}

func buildPropsInline(props []Prop, requiredOnly bool, exclude map[string]bool) string {
	var parts []string
	for _, p := range props {
		if exclude[p.Name] {
			continue
		}
		if requiredOnly && !p.Required {
			continue
		}
		entry := fmt.Sprintf("%s: %s", p.Name, p.Type)
		if p.Required {
			entry += "*"
		}
		parts = append(parts, entry)
	}
	return strings.Join(parts, "  ")
}

func loadComponents() error {
	err := json.Unmarshal(componentsJSON, &componentGroups)
	if err != nil {
		return err
	}

	componentNameMap = make(map[string]string)

	for gi := range componentGroups {
		for ci := range componentGroups[gi].Components {
			c := &componentGroups[gi].Components[ci]

			componentNameMap[c.ID] = c.Name

			c.Props = append(c.Props, Prop{
				Name: "style",
				Type: "object",
			})
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
