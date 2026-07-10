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

type BuildSceneListOptions struct {
	Groups       bool
	Enums        bool
	FieldsToSkip []string
}

func GetAllTemplates() []types.Component {
	var scenes []types.Component

	for _, g := range registry.Components {
		if g.Title == "Scenes" {
			scenes = g.Components
			break
		}
	}

	return scenes
}

func BuildScenesListFromComponents(b *strings.Builder, components []types.Component, options BuildSceneListOptions) string {
	var sectional, filler []types.Component

	for _, s := range components {
		if len(s.Tags) > 0 && !utils.Contains(s.Tags, "FILLER") {
			sectional = append(sectional, s)
		} else {
			filler = append(filler, s)
		}
	}

	for _, s := range sectional {
		writeScene(b, s, "Sectional", options.FieldsToSkip)
	}

	b.WriteString("## Filler Scenes\n")
	b.WriteString("Can be used anywhere in the video.\n\n")

	for _, s := range filler {
		writeScene(b, s, "Filler", options.FieldsToSkip)
	}

	if options.Enums && len(registry.AvailableEnums) > 0 {
		writeAvailableEnums(b)
	}

	return b.String()
}

func BuildScenesList(options BuildSceneListOptions) string {

	var scenes []types.Component

	for _, g := range registry.Components {
		if g.Title == "Scenes" {
			scenes = g.Components
			break
		}
	}

	var b strings.Builder
	b.WriteString("# Available Scenes\n\n")

	return BuildScenesListFromComponents(&b, scenes, options)
}

func writeScene(b *strings.Builder, c types.Component, category string, fieldsToSkip []string) {

	fmt.Fprintf(b, "### Scene: %s\n\n", c.Name)

	fmt.Fprintf(b, "- Type: %s\n", category)

	if len(c.Tags) > 0 {
		fmt.Fprintf(b, "- Sections: %s\n", strings.Join(c.Tags, ", "))
	}

	b.WriteString("\n")

	// append the c.Instructions at the end of VisualDescription with .
	if c.Description != "" {
		desc := strings.TrimSpace(c.Description)

		// Add trailing period if missing
		if !strings.HasSuffix(desc, ".") {
			desc += "."
		}

		// Append instructions if present
		if strings.TrimSpace(c.Instructions) != "" {
			desc += " " + strings.TrimSpace(c.Instructions)
		}

		b.WriteString("**VisualDescription**\n")
		fmt.Fprintf(b, "%s\n\n", desc)
	}

	b.WriteString("**Props**\n")
	WriteJSONProps(b, c.LLMSchema, fieldsToSkip)

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

func WriteProps(b *strings.Builder, fields []types.LLMField, skipLLMFields []string) {
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

func WriteJSONProps(
	b *strings.Builder,
	fields []types.LLMField,
	skipLLMFields []string,
) {
	schema := buildPropsSchema(fields, skipLLMFields)

	schemaBytes, _ := json.MarshalIndent(schema, "", "  ")
	b.Write(schemaBytes)

	writeConstraints(b, fields, skipLLMFields)

	// Special case for textComponentProps, textwithmedia scene
	for _, f := range fields {
		if f.Name != "textComponentProps" {
			continue
		}

		// Find the sibling textComponent field which contains the enum values.
		var textComponentField *types.LLMField

		for i := range fields {
			if fields[i].Name == "textComponent" {
				textComponentField = &fields[i]
				break
			}
		}

		if textComponentField == nil {
			continue
		}

		for _, componentName := range textComponentField.Enum {
			component, err := FindComponent(componentName)
			if err != nil {
				continue
			}

			b.WriteString(fmt.Sprintf(
				"\n\ntextComponentProps schema when textComponent = %q:\n",
				componentName,
			))

			componentSchema := buildPropsSchema(
				component.LLMSchema,
				skipLLMFields,
			)

			schemaBytes, _ = json.MarshalIndent(componentSchema, "", "  ")
			b.Write(schemaBytes)

			writeConstraints(
				b,
				component.LLMSchema,
				skipLLMFields,
			)
		}
	}
}

func buildPropsSchema(
	fields []types.LLMField,
	skipLLMFields []string,
) map[string]any {
	schema := make(map[string]any)

	for _, f := range fields {
		if utils.Contains(skipLLMFields, f.Name) {
			continue
		}

		schema[f.Name] = buildFieldSchema(f)
	}

	return schema
}

func buildFieldSchema(f types.LLMField) any {
	switch f.Type {

	case "array":
		if f.Items == nil {
			return []any{}
		}

		if len(f.Items.Fields) > 0 {
			item := map[string]any{}

			for _, child := range f.Items.Fields {
				item[child.Name] = buildFieldSchema(child)
			}

			return []any{item}
		}

		return []any{f.Items.Type}

	case "object":
		obj := map[string]any{}

		if f.Items != nil {
			for _, child := range f.Items.Fields {
				obj[child.Name] = buildFieldSchema(child)
			}
		}

		return obj

	case "enum":
		return "enum"

	default:
		return f.Type
	}
}

func writeConstraints(
	b *strings.Builder,
	fields []types.LLMField,
	skipLLMFields []string,
) {
	var constraints []string

	for _, f := range fields {
		if utils.Contains(skipLLMFields, f.Name) {
			continue
		}

		if f.Range != "" {
			constraints = append(
				constraints,
				fmt.Sprintf("- %s: %s", f.Name, f.Range),
			)
		}

		if f.Hint != "" {
			constraints = append(
				constraints,
				fmt.Sprintf("- %s hint: %s", f.Name, f.Hint),
			)
		}

		if f.Default != nil {
			constraints = append(
				constraints,
				fmt.Sprintf("- %s default: %v", f.Name, f.Default),
			)
		}

		if len(f.Enum) > 0 {
			constraints = append(
				constraints,
				fmt.Sprintf("- %s enum: %s", f.Name, strings.Join(f.Enum, ", ")),
			)
		}
	}

	if len(constraints) == 0 {
		return
	}

	b.WriteString("\n\nConstraints:\n")

	for _, c := range constraints {
		b.WriteString(c)
		b.WriteString("\n")
	}
}
