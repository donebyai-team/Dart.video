package services

import (
	"github.com/shank318/coasterai/models"
	"strings"
	"testing"
)

func TestResolveMediaHandles_BasicReplacement(t *testing.T) {
	registry := &MediaAssetRegistry{
		assetMapper: map[string]*models.MediaAsset{
			"@generated/test/0.png": {
				Path: "https://cdn.example.com/logo.png",
			},
		},
	}

	input := `<img src="@generated/test/0.png">`

	out := registry.ResolveMediaHandles(input)

	expected := `<img src="https://cdn.example.com/logo.png">`

	if out != expected {
		t.Fatalf("expected %s, got %s", expected, out)
	}
}

func TestResolveMediaHandles_AngleBracketReplacement_RemovesBrackets(t *testing.T) {
	registry := &MediaAssetRegistry{
		assetMapper: map[string]*models.MediaAsset{
			"@generated/test/0.png": {
				Path: "https://cdn.example.com/logo.png",
			},
		},
	}

	input := `Path: <@generated/test/0.png>`

	out := registry.ResolveMediaHandles(input)

	expected := `Path: https://cdn.example.com/logo.png`

	if out != expected {
		t.Fatalf("expected %s, got %s", expected, out)
	}
}

func TestResolveMediaHandles_MixedHandleFormats(t *testing.T) {
	registry := &MediaAssetRegistry{
		assetMapper: map[string]*models.MediaAsset{
			"@generated/a/0.png": {Path: "https://cdn.example.com/a.png"},
		},
	}

	input := `
<img src="@generated/a/0.png">
Path: <@generated/a/0.png>
`

	out := registry.ResolveMediaHandles(input)

	if strings.Contains(out, "@generated") {
		t.Fatalf("expected all handles replaced, got %s", out)
	}

	if !strings.Contains(out, "https://cdn.example.com/a.png") {
		t.Fatalf("expected Path replacement")
	}
}

func TestResolveMediaHandles_MultipleHandles(t *testing.T) {
	registry := &MediaAssetRegistry{
		assetMapper: map[string]*models.MediaAsset{
			"@generated/a/0.png": {Path: "https://cdn.example.com/a.png"},
			"@generated/b/1.png": {Path: "https://cdn.example.com/b.png"},
		},
	}

	input := `
<img src="@generated/a/0.png">
<img src="<@generated/b/1.png>">
`

	out := registry.ResolveMediaHandles(input)

	if !strings.Contains(out, "https://cdn.example.com/a.png") {
		t.Fatalf("expected replacement for a.png")
	}

	if !strings.Contains(out, "https://cdn.example.com/b.png") {
		t.Fatalf("expected replacement for b.png")
	}

	if strings.Contains(out, "@generated") {
		t.Fatalf("expected no handles remaining")
	}
}

func TestResolveMediaHandles_SkipNilOrEmptyAssets(t *testing.T) {
	registry := &MediaAssetRegistry{
		assetMapper: map[string]*models.MediaAsset{
			"@generated/test/0.png": nil,
			"@generated/test/1.png": {Path: ""},
		},
	}

	input := `@generated/test/0.png <@generated/test/1.png>`

	out := registry.ResolveMediaHandles(input)

	if out != input {
		t.Fatalf("expected unchanged string, got %s", out)
	}
}

func TestResolveMediaHandles_NoHandles(t *testing.T) {
	registry := &MediaAssetRegistry{
		assetMapper: map[string]*models.MediaAsset{},
	}

	input := `<img src="logo.png">`

	out := registry.ResolveMediaHandles(input)

	if out != input {
		t.Fatalf("expected unchanged string")
	}
}
