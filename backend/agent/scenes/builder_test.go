package scenes

import "testing"

func TestBuildWithNonRequiredProps(t *testing.T) {
	prompt := BuildScenesList(true, nil)

	if prompt == "" {
		t.Fatalf("invalid prompt")
	}
}
