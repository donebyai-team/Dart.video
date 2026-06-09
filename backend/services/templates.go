package services

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
)

type TemplateRegistry interface {
	CreateTemplate(code string) (string, error)
}

func ExtractDefaultData(code string) (json.RawMessage, error) {
	const marker = "const DEFAULT_DATA ="

	idx := strings.Index(code, marker)
	if idx == -1 {
		return nil, fmt.Errorf("DEFAULT_DATA not found")
	}

	// Find opening brace
	start := strings.Index(code[idx:], "{")
	if start == -1 {
		return nil, fmt.Errorf("opening brace for DEFAULT_DATA not found")
	}
	start += idx

	// Extract object using brace counting
	depth := 0
	end := -1

	for i := start; i < len(code); i++ {
		switch code[i] {
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				end = i
				break
			}
		}
	}

	if end == -1 {
		return nil, fmt.Errorf("closing brace for DEFAULT_DATA not found")
	}

	obj := code[start : end+1]

	// ------------------------------------------------------------------
	// Convert PascalCase identifiers into strings
	//
	// Example:
	// icon: Heart,
	// icon: BarChart3,
	//
	// becomes:
	// icon: "Heart",
	// icon: "BarChart3",
	// ------------------------------------------------------------------
	pascalCaseValue := regexp.MustCompile(`:\s*([A-Z][A-Za-z0-9_]*)\s*([,\}\]])`)
	obj = pascalCaseValue.ReplaceAllString(obj, `: "$1"$2`)

	// ------------------------------------------------------------------
	// Quote keys
	//
	// title: "Hello"
	// ->
	// "title": "Hello"
	// ------------------------------------------------------------------
	keyRegex := regexp.MustCompile(`([A-Za-z_][A-Za-z0-9_]*)\s*:`)
	obj = keyRegex.ReplaceAllString(obj, `"$1":`)

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
		return nil, fmt.Errorf("DEFAULT_DATA is not valid JSON after normalization: %w", err)
	}

	return json.RawMessage(obj), nil
}
