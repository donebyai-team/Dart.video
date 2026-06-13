package code_builder

import (
	"fmt"
	"github.com/shank318/coasterai/services"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
	"regexp"
	"strings"
)

const defaultDataKey = "DEFAULT_DATA"

var urlRegex = regexp.MustCompile(`"(https?://[^"]+)"`)

func resolveIconURL(code string) string {
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

func PreProcess(code string) string {
	code = resolveIconURL(code)

	return code
}

func InjectDefaultDataGeneratedCode(
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
