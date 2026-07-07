package brand_identity

import "testing"

func TestNormalizeHexRejectsIncompleteHash(t *testing.T) {
	if got := normalizeHex("#"); got != "" {
		t.Fatalf("expected incomplete hex to be rejected, got %q", got)
	}
}

func TestNormalizeHexExpandsShortHex(t *testing.T) {
	if got := normalizeHex("#abc"); got != "#AABBCC" {
		t.Fatalf("expected shorthand hex to expand, got %q", got)
	}
}
