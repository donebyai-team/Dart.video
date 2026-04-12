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
	Type       string            `json:"type"` // component | repeat
	Name       string            `json:"name,omitempty"`
	Source     string            `json:"source,omitempty"`
	Fields     []FieldSchema     `json:"fields,omitempty"`     // used when type is component
	Components []ComponentSchema `json:"components,omitempty"` // used when type is repeat
	Map        string            `json:"map,omitempty"`
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
	Name    string    `json:"name"`
	Type    string    `json:"type"`
	Subtype string    `json:"subtype,omitempty"`
	Items   *LLMItems `json:"items,omitempty"`
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

func BuildScenesList() string {

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

	b.WriteString("## Available Scenes\n\n")

	b.WriteString("### Sectional — prefer for opening/closing of each section\n\n")

	for _, s := range sectional {
		writeScene(&b, s)
	}

	b.WriteString("### Filler — use anywhere\n\n")

	for _, s := range filler {
		writeScene(&b, s)
	}

	return b.String()
}

func writeScene(b *strings.Builder, c Component) {

	fmt.Fprintf(b, "%s", c.Name)

	if len(c.Tags) > 0 {
		fmt.Fprintf(b, " | %s", strings.Join(c.Tags, ", "))
	}

	fmt.Fprintf(b, "\n")

	if c.Description != "" {
		fmt.Fprintf(b, "%s\n", c.Description)
	}

	fmt.Fprintf(b, "Props: %s\n\n", buildPropsInline(c.LLMSchema))
}

func buildPropsInline(fields []LLMField) string {

	var parts []string

	for _, f := range fields {

		if f.Type == "array" {

			if f.Items != nil {

				if len(f.Items.Fields) > 0 {

					var objParts []string
					for _, sub := range f.Items.Fields {
						objParts = append(objParts, fmt.Sprintf("%s:%s", sub.Name, sub.Type))
					}

					parts = append(parts,
						fmt.Sprintf("%s:[{%s}]", f.Name, strings.Join(objParts, ", ")),
					)

				} else {
					parts = append(parts,
						fmt.Sprintf("%s:[%s]", f.Name, f.Items.Type),
					)
				}

			}

			continue
		}

		parts = append(parts, fmt.Sprintf("%s:%s", f.Name, f.Type))
	}

	return strings.Join(parts, "  ")
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
