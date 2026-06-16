package agent

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/agent/scenes"
	types2 "github.com/shank318/coasterai/agent/scenes/types"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/services/templates"
	"go.uber.org/zap"
	"strings"
)

type TemplateRegistry struct {
	assetRegistry *services.MediaAssetRegistry
	templates     map[string]*models.Template
	codeGenerator CodeGeneratorAgent
	logger        *zap.Logger
}

func NewTemplateRegistry(assetRegistry *services.MediaAssetRegistry, codeGenerator CodeGeneratorAgent, logger *zap.Logger) *TemplateRegistry {
	return &TemplateRegistry{
		assetRegistry: assetRegistry,
		templates:     make(map[string]*models.Template),
		codeGenerator: codeGenerator,
		logger:        logger}
}

func (r *TemplateRegistry) AddTemplate(template *models.Template) {
	r.templates[strings.ToLower(template.Name)] = template
}

func writeScene(b *strings.Builder, c *models.Template) {
	schema, _ := templates.BuildTemplateSchemaFromDefaults(c)
	if schema == "" {
		return
	}

	fmt.Fprintf(b, "### Scene: %s\n\n", c.Name)

	fmt.Fprintf(b, "- Type: %s\n", "Sectional")

	if len(c.Categories) > 0 {
		fmt.Fprintf(b, "- Sections: %s\n", strings.Join(c.Categories, ", "))
	}

	b.WriteString("\n")

	// append the c.Instructions at the end of Description with .
	if c.Description != "" {
		desc := strings.TrimSpace(c.Description)

		// Add trailing period if missing
		if !strings.HasSuffix(desc, ".") {
			desc += "."
		}

		b.WriteString("**Description**\n")
		fmt.Fprintf(b, "%s\n\n", desc)
	}

	b.WriteString("**Props**\n")
	b.WriteString(schema)
	b.WriteString("\n---\n\n")
}

func (r *TemplateRegistry) BuildPrompt() string {
	var b strings.Builder

	b.WriteString("# Available Scenes\n\n")

	var components []types2.Component

	for _, template := range r.templates {
		component, _ := scenes.FindComponent(template.Name)
		if component != nil {
			components = append(components, *component)
		} else {
			writeScene(&b, template)
		}
	}

	scenes.BuildScenesListFromComponents(&b, components, scenes.BuildSceneListOptions{
		FieldsToSkip: scenes.SkipLLMFields,
	})

	return b.String()
}

func (r *TemplateRegistry) ToSceneElements() []types.SceneElement {
	sceneElements := make([]types.SceneElement, 0)
	for _, template := range r.templates {
		scene := types.SceneElement{
			Component: template.Name,
		}
		templateName := template.Name
		component, _ := scenes.FindComponent(templateName)
		if component != nil {
			var b strings.Builder
			scenes.WriteProps(&b, component.LLMSchema, nil)
			scene.Props = b.String()
		} else {
			schema, err := templates.BuildTemplateSchemaFromDefaults(template)
			if err != nil {
				r.logger.Error("failed to build template schema from defaults", zap.Error(err))
			}
			if schema == "" {
				continue
			}
		}

		sceneElements = append(sceneElements, scene)
	}

	return sceneElements
}

func (r *TemplateRegistry) GenerateScene(ctx context.Context, scene *types.Scene) ([]*pbcore.Slide, error) {
	template := r.templates[strings.ToLower(scene.Element.Component)]

	slides := make([]*pbcore.Slide, 0)
	// Check if its old template
	component, _ := scenes.FindComponent(template.Name)

	if component != nil {
		sceneConfigs, err := scenes.ConvertToSceneConfig(scene, r.assetRegistry)
		if err != nil {
			return nil, err
		}

		for _, sceneConfig := range sceneConfigs {
			newTemplate, err := r.codeGenerator.GenerateCodeFromScene(ctx, sceneConfig)
			if err != nil {
				return nil, err
			}

			// add background if applicable
			newTemplate.BackgroundStyle = sceneConfig.Background
			slides = append(slides, newTemplate)
		}

	} else {
		updatedTemplate, err := templates.ParseLLMOutputToTemplateDefaults(scene.Element.Props, template)
		if err != nil {
			// Ignore error as template will always be returned
			r.logger.Error("failed to parse llm output to template defaults", zap.Error(err))
		}

		if updatedTemplate == nil {
			return slides, nil
		}

		slides = append(slides, updatedTemplate.Config.Sections[0].Slides...)
	}

	return slides, nil
}
