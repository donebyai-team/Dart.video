package services

import (
	"bytes"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"math"
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

func TestDetectMediaTypeAudio(t *testing.T) {
	if got := DetectMediaType("audio/wav"); got != pbcore.MediaType_MEDIA_TYPE_AUDIO {
		t.Fatalf("expected audio media type, got %v", got)
	}
}

func TestEncodePCMToWAVAndExtractDuration(t *testing.T) {
	pcmData := make([]byte, 48000)

	wavData, err := EncodePCMToWAV(pcmData, 24000, 1, 16)
	if err != nil {
		t.Fatalf("expected wav encoding to succeed, got %v", err)
	}

	duration, err := extractWAVDuration(bytes.NewReader(wavData))
	if err != nil {
		t.Fatalf("expected wav duration extraction to succeed, got %v", err)
	}

	if math.Abs(duration-1) > 0.0001 {
		t.Fatalf("expected duration to be 1 second, got %v", duration)
	}
}

func TestExtractMediaDimensionsWAVDuration(t *testing.T) {
	pcmData := make([]byte, 24000)

	wavData, err := EncodePCMToWAV(pcmData, 24000, 1, 16)
	if err != nil {
		t.Fatalf("expected wav encoding to succeed, got %v", err)
	}

	_, _, duration := gcpMediaStore{}.extractMediaDimensions(bytes.NewReader(wavData), pbcore.MediaType_MEDIA_TYPE_AUDIO, "audio/wav")
	if math.Abs(duration-0.5) > 0.0001 {
		t.Fatalf("expected duration to be 0.5 seconds, got %v", duration)
	}
}
