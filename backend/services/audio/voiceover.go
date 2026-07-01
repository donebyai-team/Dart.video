package audio

import (
	"context"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services/providers"
	"go.uber.org/zap"
	"math"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
)

type Service interface {
	GenerateVoiceover(ctx context.Context, params providers.VoiceOverParams) (*pbcore.Voiceover, error)
}

type audioService struct {
	provider providers.LLMProvider
	logger   *zap.Logger
}

func NewAudioService(provider providers.LLMProvider, logger *zap.Logger) Service {
	return &audioService{provider: provider, logger: logger}
}

const voiceoverFPS = 30
const DefaultVoiceId = "Puck"
const DefaultVoiceProvider = "google"

var pauseTokenRegex = regexp.MustCompile(`@(\d+)@`)

func (a audioService) GenerateVoiceover(ctx context.Context, params providers.VoiceOverParams) (*pbcore.Voiceover, error) {
	text := strings.TrimSpace(params.Text)
	if text == "" {
		return nil, fmt.Errorf("voice over text is required")
	}

	segmentsText, pauses, err := splitVoiceoverText(text)
	if err != nil {
		return nil, err
	}

	if params.VoiceID == "" {
		params.VoiceID = DefaultVoiceId
	}

	voiceover := &pbcore.Voiceover{
		Provider: a.provider.GetName(),
		VoiceId:  params.VoiceID,
		FullText: params.Text,
		Segments: make([]*pbcore.VoiceoverSegment, 0, len(segmentsText)),
	}

	currentTimelineMs := 0

	for i, segmentText := range segmentsText {
		currentTimelineMs += pauses[i]

		asset, err := a.provider.GenerateVoiceOver(ctx, providers.VoiceOverParams{
			Text:     segmentText,
			VoiceID:  params.VoiceID,
			OrgID:    params.OrgID,
			FileName: segmentFileName(params.FileName, i),
		})
		if err != nil {
			return nil, err
		}

		startFrame := millisecondsToFrame(currentTimelineMs)
		currentTimelineMs += int(math.Round(float64(asset.GetDuration()) * 1000))
		endFrame := millisecondsToFrame(currentTimelineMs)

		voiceover.Segments = append(voiceover.Segments, &pbcore.VoiceoverSegment{
			Text:       segmentText,
			Asset:      asset,
			StartFrame: startFrame,
			EndFrame:   endFrame,
		})
	}

	return voiceover, nil
}

func splitVoiceoverText(text string) ([]string, []int, error) {
	matches := pauseTokenRegex.FindAllStringSubmatchIndex(text, -1)
	if len(matches) == 0 {
		return []string{strings.TrimSpace(text)}, []int{0}, nil
	}

	segments := make([]string, 0, len(matches)+1)
	pauses := make([]int, 0, len(matches)+1)
	pendingPauseMs := 0
	lastIndex := 0

	for _, match := range matches {
		segmentText := strings.TrimSpace(text[lastIndex:match[0]])
		if segmentText != "" {
			segments = append(segments, segmentText)
			pauses = append(pauses, pendingPauseMs)
			pendingPauseMs = 0
		}

		pauseValue, err := strconv.Atoi(text[match[2]:match[3]])
		if err != nil {
			return nil, nil, fmt.Errorf("parse pause duration: %w", err)
		}
		pendingPauseMs += pauseValue
		lastIndex = match[1]
	}

	trailingText := strings.TrimSpace(text[lastIndex:])
	if trailingText != "" {
		segments = append(segments, trailingText)
		pauses = append(pauses, pendingPauseMs)
	}

	if len(segments) == 0 {
		return nil, nil, fmt.Errorf("voice over text must contain at least one spoken segment")
	}

	return segments, pauses, nil
}

func millisecondsToFrame(milliseconds int) int32 {
	return int32(math.Floor(float64(milliseconds) * voiceoverFPS / 1000.0))
}

func segmentFileName(fileName string, index int) string {
	baseName := strings.TrimSpace(fileName)
	if baseName == "" {
		return fmt.Sprintf("voiceover-segment-%d.wav", index+1)
	}

	ext := filepath.Ext(baseName)
	nameWithoutExt := strings.TrimSuffix(baseName, ext)
	if nameWithoutExt == "" {
		nameWithoutExt = "voiceover"
	}

	return fmt.Sprintf("%s-segment-%d%s", nameWithoutExt, index+1, ext)
}
