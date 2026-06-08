package common

import (
	"github.com/shank318/coasterai/services"
	"regexp"
	"strings"
)

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

func SanitizeCommonCode(code string) string {
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
