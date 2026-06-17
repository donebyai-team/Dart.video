package services

import (
	"bytes"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"testing"
)

func TestExtractMediaDimensionsSVGWidthHeight(t *testing.T) {
	reader := bytes.NewReader([]byte(`<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg"></svg>`))

	width, height, _ := gcpMediaStore{}.extractMediaDimensions(reader, pbcore.MediaType_MEDIA_TYPE_SVG, "image/svg+xml")

	if width != 320 || height != 180 {
		t.Fatalf("expected 320x180, got %vx%v", width, height)
	}
}

func TestExtractMediaDimensionsSVGWithUnits(t *testing.T) {
	reader := bytes.NewReader([]byte(`<svg width="128px" height="64px" xmlns="http://www.w3.org/2000/svg"></svg>`))

	width, height, _ := gcpMediaStore{}.extractMediaDimensions(reader, pbcore.MediaType_MEDIA_TYPE_SVG, "image/svg+xml")

	if width != 128 || height != 64 {
		t.Fatalf("expected 128x64, got %vx%v", width, height)
	}
}

func TestExtractMediaDimensionsSVGViewBoxFallback(t *testing.T) {
	reader := bytes.NewReader([]byte(`<svg viewBox="0 0 400 225" xmlns="http://www.w3.org/2000/svg"></svg>`))

	width, height, _ := gcpMediaStore{}.extractMediaDimensions(reader, pbcore.MediaType_MEDIA_TYPE_SVG, "image/svg+xml")

	if width != 400 || height != 225 {
		t.Fatalf("expected 400x225, got %vx%v", width, height)
	}
}
