package templates

import (
	"encoding/json"
	"fmt"
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

// Used to send the template schema to LLM to generate new scene
func BuildLLMDataPayload(data *structpb.Struct) (string, error) {
	if data == nil {
		return "{}", nil
	}

	filtered := filterValue(data.AsMap())

	b, err := json.MarshalIndent(filtered, "", "  ")
	if err != nil {
		return "", err
	}

	return string(b), nil
}

// Used to merge LLM output with the original template schema
func MergeLLMOutput(
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
