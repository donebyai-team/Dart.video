package templates

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services/code_builder"
	"github.com/shank318/coasterai/utils"
	"net/url"
	"regexp"
	"strings"

	"google.golang.org/protobuf/types/known/structpb"
)

var (
	ignoredKeys = map[string]struct{}{
		"style":     {},
		"width":     {},
		"height":    {},
		"id":        {},
		"scale":     {},
		"color":     {},
		"dragX":     {},
		"dragY":     {},
		"_duration": {},
		"x":         {},
		"y":         {},
		"delay":     {},
	}

	hexColorRegex = regexp.MustCompile(`(?i)^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$`)
)

// Defaults are used as schema of the template
func BuildTemplateSchemaFromDefaults(template *models.Template) (string, error) {
	var payload []json.RawMessage

	var slides []*pbcore.Slide
	for _, section := range template.Config.Sections {
		slides = append(slides, section.Slides...)
	}

	for _, slide := range slides {
		if slide.Content.CodeRegistry.Defaults == nil {
			continue
		}

		s, err := BuildAndSanitizeLLMPropsPayload(
			slide.Content.CodeRegistry.Defaults,
		)
		if err != nil {
			return "", err
		}

		payload = append(payload, json.RawMessage(s))
	}

	b, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		return "", err
	}

	return string(b), nil
}

func ParseLLMOutputToTemplateDefaults(
	llmOutput string,
	template *models.Template,
) (*models.Template, error) {
	if template == nil {
		return nil, fmt.Errorf("template is nil")
	}

	llmOutput = code_builder.ResolveIcons(llmOutput)

	var outputs []json.RawMessage
	if err := json.Unmarshal([]byte(llmOutput), &outputs); err != nil {
		return template, fmt.Errorf("failed to parse llm output: %w", err)
	}

	outputIndex := 0
	var errs []error

	for _, section := range template.Config.Sections {
		for _, slide := range section.Slides {
			if slide.Content.CodeRegistry.Defaults == nil {
				continue
			}

			if outputIndex >= len(outputs) {
				errs = append(
					errs,
					fmt.Errorf(
						"missing llm output for slide %d",
						outputIndex,
					),
				)
				break
			}

			merged, err := mergeLLMOutput(
				slide.Content.CodeRegistry.Defaults,
				string(outputs[outputIndex]),
			)
			if err != nil {
				errs = append(
					errs,
					fmt.Errorf(
						"slide %d merge failed: %w",
						outputIndex,
						err,
					),
				)
			}

			slide.Content.CodeRegistry.Defaults = merged
			outputIndex++
		}
	}

	return template, errors.Join(errs...)
}

// Used to extract relevant fields from edits or defaults
func BuildAndSanitizeLLMPropsPayload(data *structpb.Struct) (string, error) {
	if data == nil {
		return "", nil
	}

	filtered := filterValue(data.AsMap())

	if filtered == nil {
		return "", nil
	}

	b, err := json.MarshalIndent(filtered, "", "  ")
	if err != nil {
		return "", err
	}

	return string(b), nil
}

// Used to merge LLM output with the original template schema
func mergeLLMOutput(
	original *structpb.Struct,
	llmOutput string,
) (*structpb.Struct, error) {
	if original == nil {
		return nil, fmt.Errorf("original is nil")
	}
	// Return original on any error.
	fallback := original

	var updates map[string]interface{}
	if err := json.Unmarshal([]byte(llmOutput), &updates); err != nil {
		return fallback, fmt.Errorf("invalid llm json: %w", err)
	}

	merged := utils.DeepMergeMaps(
		original.AsMap(),
		updates,
	)

	result, err := structpb.NewStruct(merged)
	if err != nil {
		return fallback, fmt.Errorf("failed creating structpb: %w", err)
	}

	return result, nil
}

func filterValue(v any) any {
	switch x := v.(type) {

	case map[string]any:
		result := make(map[string]any)

		for k, v := range x {
			if shouldDropKey(k) {
				continue
			}

			filtered := filterValue(v)

			if isEmpty(filtered) {
				continue
			}

			result[k] = filtered
		}

		if len(result) == 0 {
			return nil
		}

		return result

	case []any:
		var result []any

		for _, item := range x {
			filtered := filterValue(item)

			if isEmpty(filtered) {
				continue
			}

			result = append(result, filtered)
		}

		if len(result) == 0 {
			return nil
		}

		return result

	case string:
		if shouldDropString(x) {
			return nil
		}

		return x

	default:
		// drops numbers, bools, nulls, etc.
		return nil
	}
}

func shouldDropKey(key string) bool {
	_, found := ignoredKeys[strings.ToLower(key)]
	return found
}

func shouldDropString(v string) bool {
	v = strings.TrimSpace(v)

	if v == "" {
		return true
	}

	if hexColorRegex.MatchString(v) {
		return true
	}

	if isURL(v) {
		return true
	}

	return false
}

func isURL(s string) bool {
	u, err := url.Parse(s)
	if err != nil {
		return false
	}

	return u.Scheme != "" && u.Host != ""
}

func isEmpty(v any) bool {
	if v == nil {
		return true
	}

	switch x := v.(type) {
	case map[string]any:
		return len(x) == 0

	case []any:
		return len(x) == 0
	}

	return false
}
