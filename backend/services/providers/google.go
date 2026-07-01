package providers

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"go.uber.org/zap"
	"google.golang.org/genai"
	"path/filepath"
	"strings"
	"time"
)

type LLMProvider interface {
	GenerateVoiceOver(ctx context.Context, params VoiceOverParams) (*pbcore.MediaAsset, error)
	GetName() string
}

type ProviderGoogle struct {
	client       *genai.Client
	logger       *zap.Logger
	mediaService services.MediaStore
}

func (p ProviderGoogle) GetName() string {
	return "google"
}

func NewProviderGoogle(apiKey string, mediaService services.MediaStore, logger *zap.Logger) LLMProvider {
	client, err := genai.NewClient(context.Background(), &genai.ClientConfig{
		APIKey:  apiKey,
		Backend: genai.BackendGeminiAPI,
	})

	if err != nil {
		logger.Fatal("failed to create genai client", zap.Error(err))
		panic(err)
	}

	return &ProviderGoogle{client: client, mediaService: mediaService, logger: logger.Named("google_provider")}
}

type VoiceOverParams struct {
	Text     string
	VoiceID  string
	OrgID    string
	FileName string
}

func (p ProviderGoogle) GenerateVoiceOver(ctx context.Context, params VoiceOverParams) (*pbcore.MediaAsset, error) {
	if strings.TrimSpace(params.Text) == "" {
		return nil, errors.New("voice over text is required")
	}

	if strings.TrimSpace(params.VoiceID) == "" {
		return nil, errors.New("voice id is required")
	}

	if strings.TrimSpace(params.OrgID) == "" {
		return nil, errors.New("organization id is required for voice over upload")
	}

	p.logger.Info("Generating voice over with Gemini TTS", zap.String("text_length", fmt.Sprint(len(params.Text))), zap.String("voice_id", params.VoiceID))

	// 1. Configure the TTS request payload
	// We must enforce the AUDIO response modality and define our chosen voice.
	config := &genai.GenerateContentConfig{
		ResponseModalities: []string{"AUDIO"},
		SpeechConfig: &genai.SpeechConfig{
			VoiceConfig: &genai.VoiceConfig{
				PrebuiltVoiceConfig: &genai.PrebuiltVoiceConfig{
					VoiceName: params.VoiceID,
				},
			},
		},
	}

	// 2. Dispatch the content generation request to the native TTS model
	modelName := "gemini-3.1-flash-tts-preview"
	resp, err := p.client.Models.GenerateContent(ctx, modelName, genai.Text(params.Text), config)
	if err != nil {
		p.logger.Error("failed to generate voice content via Gemini API", zap.Error(err))
		return nil, fmt.Errorf("gemini tts generation error: %w", err)
	}

	// 3. Drill down into the response structures to extract raw inline audio data
	if len(resp.Candidates) == 0 || resp.Candidates[0].Content == nil || len(resp.Candidates[0].Content.Parts) == 0 {
		return nil, errors.New("gemini api returned an empty content candidate payload")
	}

	if resp.Candidates[0].Content == nil || resp.Candidates[0].Content.Parts[0].InlineData == nil {
		return nil, errors.New("gemini api returned no inline audio data")
	}

	rawPcmData := resp.Candidates[0].Content.Parts[0].InlineData.Data
	if len(rawPcmData) == 0 {
		return nil, errors.New("no audio inline data found in the response chunk")
	}

	// Upload to media store
	wavBytes, err := services.EncodePCMToWAV(rawPcmData, 24000, 1, 16)
	if err != nil {
		return nil, fmt.Errorf("failed to encode voice over wav: %w", err)
	}

	fileName := strings.TrimSpace(params.FileName)
	if fileName == "" {
		fileName = fmt.Sprintf("voiceover-%d.wav", time.Now().Unix())
	} else if filepath.Ext(fileName) != ".wav" {
		fileName = strings.TrimSuffix(fileName, filepath.Ext(fileName)) + ".wav"
	}

	asset, err := p.mediaService.Upload(ctx, bytes.NewReader(wavBytes), params.OrgID, fileName)
	if err != nil {
		p.logger.Error("failed to upload generated voice over", zap.Error(err), zap.String("file_name", fileName))
		return nil, fmt.Errorf("upload generated voice over: %w", err)
	}

	return asset, nil
}
