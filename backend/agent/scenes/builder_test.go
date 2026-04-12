package scenes

import "testing"

func TestBuildWithNonRequiredProps(t *testing.T) {
	prompt := BuildScenesList()

	if prompt == "" {
		t.Fatalf("invalid prompt")
	}
}
