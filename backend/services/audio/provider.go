package audio

import (
	"context"
	"time"

	"github.com/hashicorp/go-retryablehttp"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
)

type Provider interface {
	GenerateMusic(ctx context.Context, video *models.Video) ([]*pbcore.MediaAsset, error)
}

const ELEVENLABS_API_URL = "https://api.elevenlabs.io"
const ELEVANLABS_COMPOSITION_URL = "/v1/music/plan"

type compositionPlanRequest struct {
	Prompt   string `json:"prompt"`
	Duration int    `json:"music_length_ms"`
}

type ElevenLabs struct {
	mediaStore services.MediaStore
	apiKey     string
	httpClient *retryablehttp.Client
}

func NewElevenLabsProvider(apiKey string, mediaStore services.MediaStore) (Provider, error) {
	//if apiKey == "" {
	//	return nil, fmt.Errorf("elevenlabs api key is empty")
	//}

	return &ElevenLabs{
		apiKey:     apiKey,
		mediaStore: mediaStore,
		httpClient: services.NewRetryableHTTPClient(5*time.Minute, 100*time.Millisecond, 2*time.Second, 3, nil),
	}, nil
}

func (e ElevenLabs) GenerateMusic(ctx context.Context, video *models.Video) ([]*pbcore.MediaAsset, error) {
	//videoDescription, err := GeneratePrompt(video)
	//if err != nil {
	//	return nil, err
	//}
	//
	//fps := float64(videoDescription.FPS)
	//durationInMs := int(float64(videoDescription.TotalDurationInFrames) / fps * 1000)
	//
	//requestBody, err := json.Marshal(compositionPlanRequest{
	//	Prompt:   videoDescription.Prompt,
	//	Duration: durationInMs,
	//})
	//if err != nil {
	//	return nil, fmt.Errorf("marshal composition plan request: %w", err)
	//}
	//
	//url := fmt.Sprintf("%s%s", ELEVENLABS_API_URL, ELEVANLABS_COMPOSITION_URL)
	//respBytes, statusCode, err := services.DoRequest(ctx, e.httpClient, http.MethodPost, url, requestBody, map[string]string{
	//	"Content-Type": "application/json",
	//	"xi-api-key":   e.apiKey,
	//})
	//if err != nil {
	//	return nil, err
	//}
	//
	//if statusCode < 200 || statusCode >= 300 {
	//	return nil, fmt.Errorf("error: status=%d body=%s", statusCode, string(respBytes))
	//}
	//
	//log.Printf("elevenlabs composition plan response: %s", string(respBytes))

	return nil, nil
}
