package scenes

import (
	"strings"
	"testing"
)

func TestBuildWithNonRequiredProps(t *testing.T) {
	prompt := BuildScenesList(false, SkipLLMFields)

	if prompt == "" {
		t.Fatalf("invalid prompt")
	}
}

func TestBuildScenesListIncludesEnumsInEditMode(t *testing.T) {
	prompt := BuildScenesList(true, nil)

	if prompt == "" {
		t.Fatalf("invalid prompt")
	}

	if !contains(prompt, "## Enums") {
		t.Fatalf("expected enums section in edit mode prompt")
	}

	if len(registry.AvailableEnums) > 0 && !contains(prompt, registry.AvailableEnums[0].Name) {
		t.Fatalf("expected enum name %q in prompt", registry.AvailableEnums[0].Name)
	}
}

func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
