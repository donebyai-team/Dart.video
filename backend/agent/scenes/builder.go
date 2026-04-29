package scenes

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/agent/scenes/types"
	"github.com/shank318/coasterai/utils"
	"strings"
)

// LLM fields that we don't want LLM to generate
// eg. entranceAnimation
var SkipLLMFields = []string{"width", "height", "dragStyle"}

//go:embed scene_manifest.json
var componentsJSON []byte

type AvailableEnum struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Value       []string `json:"value"`
}

type SceneRegistry struct {
	AvailableEnums []AvailableEnum        `json:"available_enums"`
	Components     []types.ComponentGroup `json:"components"`
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

func BuildScenesList(editMode bool, fieldsToSkip []string) string {

	var scenes []types.Component

	for _, g := range registry.Components {
		if g.Title == "Scenes" {
			scenes = g.Components
			break
		}
	}

	var sectional, filler []types.Component

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
		writeScene(&b, s, "Sectional", fieldsToSkip)
	}

	b.WriteString("## Filler Scenes\n")
	b.WriteString("Can be used anywhere in the video.\n\n")

	for _, s := range filler {
		writeScene(&b, s, "Filler", fieldsToSkip)
	}

	if editMode && len(registry.AvailableEnums) > 0 {
		writeAvailableEnums(&b)
	}

	return b.String()
}

func writeScene(b *strings.Builder, c types.Component, category string, fieldsToSkip []string) {

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
	writeProps(b, c.LLMSchema, fieldsToSkip)

	b.WriteString("\n---\n\n")
}

func fieldMeta(f types.LLMField) string {
	var parts []string

	if f.Required != nil && !*f.Required {
		parts = append(parts, "optional")
	}

	if len(parts) == 0 {
		return ""
	}

	return ", " + strings.Join(parts, ", ")
}

func writeFieldDetails(b *strings.Builder, f types.LLMField, indent string) {
	if f.Default != nil {
		fmt.Fprintf(b, "%sDefault: %v\n", indent, f.Default)
	}
	if f.Hint != "" {
		fmt.Fprintf(b, "%sHint: %s\n", indent, f.Hint)
	}

	if f.Range != "" {
		fmt.Fprintf(b, "%sRange: %s\n", indent, f.Range)
	}

	if len(f.Enum) > 0 {
		fmt.Fprintf(b, "%sAllowed values: %s\n", indent, strings.Join(f.Enum, ", "))
	}
}

func writeProps(b *strings.Builder, fields []types.LLMField, skipLLMFields []string) {
	for _, f := range fields {
		if utils.Contains(skipLLMFields, f.Name) {
			continue
		}
		if f.Type == "array" && f.Items != nil {
			if len(f.Items.Fields) > 0 {
				fmt.Fprintf(b, "- %s: array of objects%s\n", f.Name, fieldMeta(f))
				fmt.Fprintf(b, "  Each item:\n")

				for _, s := range f.Items.Fields {
					fmt.Fprintf(b, "  - %s: %s%s\n", s.Name, s.Type, fieldMeta(s))
					writeFieldDetails(b, s, "    ")
				}
			} else {
				fmt.Fprintf(b, "- %s: array of %s%s\n", f.Name, f.Items.Type, fieldMeta(f))
				writeFieldDetails(b, f, "  ")
			}

			continue
		}

		fmt.Fprintf(b, "- %s: %s%s\n", f.Name, f.Type, fieldMeta(f))
		writeFieldDetails(b, f, "  ")
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

func FindComponent(name string) (*types.Component, error) {

	for _, g := range registry.Components {
		for i := range g.Components {
			if strings.EqualFold(g.Components[i].Name, name) {
				return &g.Components[i], nil
			}
		}
	}

	return nil, fmt.Errorf("component %s not found", name)
}

var llmEntranceAnimations = []string{
	"slideUp",
	"slideDown",
	"slideLeft",
	"slideRight",
	"scaleIn",
	"rotateIn",
	"elasticScale",
	"zoomIn",
}

func GetAvailableEntranceAnimations() []string {
	for _, g := range registry.AvailableEnums {
		if g.Name == "entranceAnimation" && !utils.Contains(SkipLLMFields, g.Name) {
			return filterAllowed(g.Value, llmEntranceAnimations)
		}
	}
	return nil
}

func filterAllowed(source, allowedList []string) []string {
	allowed := make(map[string]struct{}, len(allowedList))
	for _, a := range allowedList {
		allowed[a] = struct{}{}
	}

	var result []string
	for _, v := range source {
		if _, ok := allowed[v]; ok {
			result = append(result, v)
		}
	}
	return result
}
