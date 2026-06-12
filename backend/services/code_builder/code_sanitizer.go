package code_builder

import (
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/services"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
	"regexp"
	"strings"
)

const defaultDataKey = "DEFAULT_DATA"

var iconRegex = regexp.MustCompile(`"(icon:[^"]+)"`)
var urlRegex = regexp.MustCompile(`"(https?://[^"]+)"`)

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

func ResolveIconURL(code string) string {
	// URL -> icon:name
	code = urlRegex.ReplaceAllStringFunc(code, func(match string) string {
		value := strings.Trim(match, `"`)

		iconName := services.ResolveIconNameFromURL(value)
		if iconName == "" {
			return match
		}

		return `"icon:` + iconName + `"`
	})

	return code
}

func sanitizeCommonCode(code string) string {
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

	code = ResolveIcons(code)

	return code
}

func ExtractData(
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
	// Convert PascalCase identifiers into strings
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
	// Quote object keys
	// ------------------------------------------------------------------
	keyRegex := regexp.MustCompile(`([,{]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)`)
	obj = keyRegex.ReplaceAllString(obj, `$1"$2"$3`)

	// ------------------------------------------------------------------
	// Remove trailing commas
	// ------------------------------------------------------------------
	trailingObjectComma := regexp.MustCompile(`,\s*}`)
	obj = trailingObjectComma.ReplaceAllString(obj, `}`)

	trailingArrayComma := regexp.MustCompile(`,\s*]`)
	obj = trailingArrayComma.ReplaceAllString(obj, `]`)

	// ------------------------------------------------------------------
	// Validate JSON
	// ------------------------------------------------------------------
	var tmp any
	if err := json.Unmarshal([]byte(obj), &tmp); err != nil {
		return nil, "", fmt.Errorf(
			"%s is not valid JSON after normalization: %w\nNormalized JSON:\n%s",
			defaultDataKey,
			err,
			obj,
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

	return json.RawMessage(obj), updatedCode, nil
}

func InjectDefaultData(
	code string,
	data *structpb.Struct,
) (string, error) {
	if data == nil {
		return "", fmt.Errorf("%s data is nil", defaultDataKey)
	}

	placeholder := fmt.Sprintf("__%s__", defaultDataKey)

	if !strings.Contains(code, placeholder) {
		return "", fmt.Errorf("placeholder %s not found", placeholder)
	}

	jsonBytes, err := protojson.MarshalOptions{
		Multiline: true,
		Indent:    "  ",
	}.Marshal(data)
	if err != nil {
		return "", fmt.Errorf("marshal %s: %w", defaultDataKey, err)
	}

	return strings.Replace(
		code,
		placeholder,
		string(jsonBytes),
		1,
	), nil
}
