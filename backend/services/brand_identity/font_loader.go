package brand_identity

import (
	_ "embed"
	"encoding/json"
	"go.uber.org/zap"
	"log/slog"
	"strings"
)

//go:embed supported_google_fonts.json
var googleFontsJSON []byte

type fontLoader struct {
	fontMap map[string]string
}

type googleFontEntry struct {
	Family string `json:"family"`
}

// newGoogleFontLoader creates a new font loader from the specified JSON file path
func newGoogleFontLoader(logger *zap.Logger) fontLoader {
	loader := fontLoader{fontMap: make(map[string]string)}
	data := googleFontsJSON

	if len(data) == 0 {
		logger.Error("Google Fonts JSON is empty")
		return loader
	}

	var fonts []googleFontEntry
	if err := json.Unmarshal(data, &fonts); err != nil {
		slog.Warn("Failed to parse Google Fonts JSON file", "error", err)
		return loader
	}

	// Build case-insensitive lookup map
	for _, font := range fonts {
		if font.Family != "" {
			fontLower := strings.ToLower(font.Family)
			// Store the actual name from JSON (preserving original casing)
			loader.fontMap[fontLower] = font.Family
		}
	}

	logger.Info("Loaded Google Fonts lookup map", zap.Int("count", len(loader.fontMap)))
	return loader
}

// getFont checks if a font family exists in the provided Google Fonts map
// (case-agnostic) and returns the actual font name from the JSON if found, otherwise returns empty string
func (v fontLoader) getFont(fontFamily string) string {
	// Case-insensitive lookup
	fontLower := strings.ToLower(strings.TrimSpace(fontFamily))
	if actualName, exists := v.fontMap[fontLower]; exists {
		return actualName
	}

	return ""
}
