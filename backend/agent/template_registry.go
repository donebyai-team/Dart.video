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
	"sort"
	"strings"
)

type TemplateRegistry struct {
	assetRegistry   *services.MediaAssetRegistry
	templates       map[string]*models.Template
	templateService templates.Service
	codeGenerator   CodeGeneratorAgent
	logger          *zap.Logger
}

func NewTemplateRegistry(
	templateService templates.Service,
	assetRegistry *services.MediaAssetRegistry,
	codeGenerator CodeGeneratorAgent,
	logger *zap.Logger) *TemplateRegistry {
	return &TemplateRegistry{
		templateService: templateService,
		assetRegistry:   assetRegistry,
		templates:       make(map[string]*models.Template),
		codeGenerator:   codeGenerator,
		logger:          logger}
}

func (r *TemplateRegistry) WithRandomTemplates(ctx context.Context) error {
	selectedTemplates, err := r.templateService.FetchTemplatesByCategories(ctx, scenes.AllCategories)
	if err != nil {
		return err
	}

	for _, template := range selectedTemplates {
		r.templates[strings.ToLower(template.Name)] = template
	}

	return nil
}

func (r *TemplateRegistry) WithTemplateIds(ctx context.Context, templateIds []string) error {
	seen := make(map[string]struct{})

	for _, templateId := range templateIds {
		if _, exists := seen[templateId]; exists {
			continue
		}
		seen[templateId] = struct{}{}

		template, err := r.templateService.GetTemplateByID(ctx, templateId)
		if err != nil {
			return err
		}
		r.templates[strings.ToLower(template.Name)] = template
	}

	return nil
}

func (r *TemplateRegistry) GetIDs() []string {
	ids := make([]string, 0, len(r.templates))
	for _, temp := range r.templates {
		ids = append(ids, temp.ID)
	}
	return ids
}

func (r *TemplateRegistry) GetAssetRegistry() *services.MediaAssetRegistry {
	return r.assetRegistry
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
	// Sort before construction to avail prompt caching
	sortedTemplates := make([]*models.Template, 0, len(r.templates))
	for _, t := range r.templates {
		sortedTemplates = append(sortedTemplates, t)
	}

	sort.Slice(sortedTemplates, func(i, j int) bool {
		return sortedTemplates[i].ID < sortedTemplates[j].ID
		// or strings.ToLower(templates[i].Name) < strings.ToLower(templates[j].Name)
	})

	var b strings.Builder

	b.WriteString("# Available Scenes\n\n")

	var components []types2.Component

	for _, template := range sortedTemplates {
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
	if template == nil {
		return nil, fmt.Errorf("scene %s not found", scene.Element.Component)
	}

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
