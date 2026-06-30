package llm

import (
	"context"
	"fmt"
	"strings"

	openai "github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
	"go.uber.org/zap"
)

type Service interface {
	CreateEmbedding(ctx context.Context, input string) ([]float64, error)
}

type openAIService struct {
	logger  *zap.Logger
	service openai.EmbeddingService
	model   openai.EmbeddingModel
}

func NewOpenAIService(logger *zap.Logger, apiKey string) Service {
	opts := []option.RequestOption{}
	if apiKey != "" {
		opts = append(opts,
			option.WithAPIKey(apiKey),
			option.WithBaseURL("https://api.openai.com/v1/"),
		)
	}

	return &openAIService{
		logger:  logger.Named("llm_provider"),
		service: openai.NewEmbeddingService(opts...),
		model:   openai.EmbeddingModelTextEmbedding3Small,
	}
}

func (s *openAIService) CreateEmbedding(ctx context.Context, input string) ([]float64, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return nil, fmt.Errorf("embedding input cannot be empty")
	}

	response, err := s.service.New(ctx, openai.EmbeddingNewParams{
		Model: s.model,
		Input: openai.EmbeddingNewParamsInputUnion{
			OfString: openai.String(input),
		},
		EncodingFormat: openai.EmbeddingNewParamsEncodingFormatFloat,
	})
	if err != nil {
		return nil, fmt.Errorf("create embedding: %w", err)
	}
	if response == nil || len(response.Data) == 0 {
		return nil, fmt.Errorf("create embedding: empty response")
	}

	embedding := response.Data[0].Embedding
	if len(embedding) == 0 {
		return nil, fmt.Errorf("create embedding: empty embedding")
	}

	s.logger.Debug("created embedding", zap.Int("dimensions", len(embedding)))
	return embedding, nil
}
