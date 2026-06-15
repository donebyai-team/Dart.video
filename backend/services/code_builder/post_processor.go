package code_builder

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/services"
	"github.com/titanous/json5"
	"regexp"
	"strings"
)

func PostProcess(code string) string {
	// Replace theme.logo.url with theme.logo?.url
	replacements := map[string]string{
		"theme.logo.url":        "theme.logo?.url",
		"theme.logo.width":      "theme.logo?.width",
		"theme.logo.height":     "theme.logo?.height",
		"theme.logoIcon.url":    "theme.logoIcon?.url",
		"theme.logoIcon.width":  "theme.logoIcon?.width",
		"theme.logoIcon.height": "theme.logoIcon?.height",
	}

	for old, newVal := range replacements {
		code = strings.ReplaceAll(code, old, newVal)
	}

	// Resolve icons eg. Icon: "icon:heart" -> our icon URL
	code = ResolveIcons(code)

	return code
}

var iconRegex = regexp.MustCompile(`"(icon:[^"]+)"`)

func ResolveIcons(code string) string {
	// icon:name -> URL
	code = iconRegex.ReplaceAllStringFunc(code, func(match string) string {
		value := strings.Trim(match, `"`)

		iconName := strings.TrimPrefix(value, "icon:")
		url := services.ResolveIconFromName(iconName)

		if url == "" {
			return match
		}

		return `"` + url + `"`
	})
	return code
}

func ExtractDefaultDataPropsFromGeneratedCode(
	code string,
) (json.RawMessage, string, error) {
	marker := fmt.Sprintf("const %s =", defaultDataKey)

	idx := strings.Index(code, marker)
	if idx == -1 {
		return nil, "", fmt.Errorf("%s not found", defaultDataKey)
	}

	// Find opening brace
	start := strings.Index(code[idx:], "{")
	if start == -1 {
		return nil, "", fmt.Errorf("opening brace for %s not found", defaultDataKey)
	}
	start += idx

	// Extract object using brace counting
	depth := 0
	end := -1

outer:
	for i := start; i < len(code); i++ {
		switch code[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				end = i
				break outer
			}
		}
	}

	if end == -1 {
		return nil, "", fmt.Errorf("closing brace for %s not found", defaultDataKey)
	}

	obj := code[start : end+1]

	// ------------------------------------------------------------------
	// Convert component identifiers into strings
	//
	// icon: Heart,
	// icon: BarChart3,
	//
	// ->
	//
	// icon: "Heart",
	// icon: "BarChart3",
	// ------------------------------------------------------------------
	pascalCaseValue := regexp.MustCompile(`:\s*([A-Z][A-Za-z0-9_]*)\s*([,\}\]])`)
	obj = pascalCaseValue.ReplaceAllString(obj, `: "$1"$2`)

	// ------------------------------------------------------------------
	// Parse as JSON5
	// Handles:
	// - unquoted keys
	// - single quoted strings
	// - trailing commas
	// ------------------------------------------------------------------
	var parsed any

	if err := json5.Unmarshal([]byte(obj), &parsed); err != nil {
		return nil, "", fmt.Errorf(
			"failed to parse %s as JSON5: %w\nObject:\n%s",
			defaultDataKey,
			err,
			obj,
		)
	}

	// ------------------------------------------------------------------
	// Convert back to strict JSON
	// ------------------------------------------------------------------
	normalizedJSON, err := json.Marshal(parsed)
	if err != nil {
		return nil, "", fmt.Errorf(
			"failed to marshal %s to JSON: %w",
			defaultDataKey,
			err,
		)
	}

	// ------------------------------------------------------------------
	// Replace extracted object with placeholder
	//
	// const DEFAULT_DATA = {...}
	//
	// ->
	//
	// const DEFAULT_DATA = __DEFAULT_DATA__
	// ------------------------------------------------------------------
	placeholder := fmt.Sprintf("__%s__", defaultDataKey)

	updatedCode :=
		code[:start] +
			placeholder +
			code[end+1:]

	return json.RawMessage(normalizedJSON), updatedCode, nil
}
