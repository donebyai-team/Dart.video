package scenes

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"strings"
)

//go:embed scene_manifest.json
var componentsJSON []byte

type AvailableEnum struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Value       []string `json:"value"`
}

type SceneRegistry struct {
	AvailableEnums []AvailableEnum  `json:"available_enums"`
	Components     []ComponentGroup `json:"components"`
}

type ComponentGroup struct {
	Title       string      `json:"title"`
	Description string      `json:"description"`
	Components  []Component `json:"components"`
}

type Component struct {
	Name          string       `json:"name"`
	Type          string       `json:"type"`
	Tags          []string     `json:"tags,omitempty"`
	Schema        []SchemaNode `json:"schema"`
	LLMSchema     []LLMField   `json:"llmSchema"`
	Description   string       `json:"description,omitempty"`
	CELExpression string       `json:"celExpression,omitempty"`
}

type SchemaNode struct {
	Type       string            `json:"type"` // component | repeat | oneof
	Name       string            `json:"name,omitempty"`
	Source     string            `json:"source,omitempty"`
	Fields     []FieldSchema     `json:"fields,omitempty"`     // used when type is component
	Components []ComponentSchema `json:"components,omitempty"` // used when type is repeat
	Map        string            `json:"map,omitempty"`
	Selector   string            `json:"selector,omitempty"`  // oneof
	PropsPath  string            `json:"propsPath,omitempty"` //oneof
}

type ComponentSchema struct {
	Name   string        `json:"name"`
	Fields []FieldSchema `json:"fields"`
}

type FieldSchema struct {
	Name     string      `json:"name"`
	Type     string      `json:"type"`
	Subtype  string      `json:"subtype,omitempty"`
	Map      string      `json:"map,omitempty"`
	Default  interface{} `json:"default,omitempty"`
	DataType string      `json:"datatype,omitempty"`
}

type LLMField struct {
	Name     string    `json:"name"`
	Type     string    `json:"type"`
	Subtype  string    `json:"subtype,omitempty"`
	Enum     []string  `json:"enum,omitempty"`
	Required bool      `json:"required,omitempty"`
	Items    *LLMItems `json:"items,omitempty"`
}

type LLMItems struct {
	Type   string     `json:"type"`
	Fields []LLMField `json:"fields,omitempty"`
}

var (
	registry SceneRegistry
)

func loadComponents() error {
	return json.Unmarshal(componentsJSON, &registry)
}

func init() {
	if err := loadComponents(); err != nil {
		panic(fmt.Sprintf("failed to load scene registry: %v", err))
	}
}

func BuildScenesList(editMode bool) string {

	var scenes []Component

	for _, g := range registry.Components {
		if g.Title == "Scenes" {
			scenes = g.Components
			break
		}
	}

	var sectional, filler []Component

	for _, s := range scenes {
		if len(s.Tags) > 0 {
			sectional = append(sectional, s)
		} else {
			filler = append(filler, s)
		}
	}

	var b strings.Builder

	b.WriteString("# Available Scenes\n\n")

	for _, s := range sectional {
		writeScene(&b, s, "Sectional")
	}

	b.WriteString("## Filler Scenes\n")
	b.WriteString("Can be used anywhere in the video.\n\n")

	for _, s := range filler {
		writeScene(&b, s, "Filler")
	}

	if editMode && len(registry.AvailableEnums) > 0 {
		writeAvailableEnums(&b)
	}

	return b.String()
}

func writeScene(b *strings.Builder, c Component, category string) {

	fmt.Fprintf(b, "### Scene: %s\n\n", c.Name)

	fmt.Fprintf(b, "- Type: %s\n", category)

	if len(c.Tags) > 0 {
		fmt.Fprintf(b, "- Sections: %s\n", strings.Join(c.Tags, ", "))
	}

	b.WriteString("\n")

	if c.Description != "" {
		b.WriteString("**Description**\n")
		fmt.Fprintf(b, "%s\n\n", c.Description)
	}

	b.WriteString("**Props**\n")
	writeProps(b, c.LLMSchema)

	b.WriteString("\n---\n\n")
}

func writeProps(b *strings.Builder, fields []LLMField) {

	for _, f := range fields {

		if f.Type == "array" && f.Items != nil {

			if len(f.Items.Fields) > 0 {

				var sub []string
				for _, s := range f.Items.Fields {
					sub = append(sub, fmt.Sprintf("%s:%s", s.Name, s.Type))
				}

				fmt.Fprintf(b, "- %s (array<object>) → {%s}\n",
					f.Name,
					strings.Join(sub, ", "),
				)

			} else {

				fmt.Fprintf(b, "- %s (array<%s>)\n", f.Name, f.Items.Type)

			}

			continue
		}

		fmt.Fprintf(b, "- %s (%s)", f.Name, f.Type)
		if !f.Required {
			fmt.Fprintf(b, " (optional)")
		}

		if len(f.Enum) > 0 {
			fmt.Fprintf(b, " | values: %s", strings.Join(f.Enum, ", "))
		}

		b.WriteString("\n")
	}
}

func writeAvailableEnums(b *strings.Builder) {

	b.WriteString("## Enums\n\n")

	for _, enum := range registry.AvailableEnums {

		fmt.Fprintf(b, "### %s\n", enum.Name)

		if enum.Description != "" {
			fmt.Fprintf(b, "%s\n\n", enum.Description)
		}

		if len(enum.Value) > 0 {

			for _, v := range enum.Value {
				fmt.Fprintf(b, "- %s\n", v)
			}

			b.WriteString("\n")
		}
	}
}

func findComponent(name string) (*Component, error) {

	for _, g := range registry.Components {
		for i := range g.Components {
			if strings.EqualFold(g.Components[i].Name, name) {
				return &g.Components[i], nil
			}
		}
	}

	return nil, fmt.Errorf("component %s not found", name)
}
