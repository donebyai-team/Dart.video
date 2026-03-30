package llm

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/models"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

// LLMService declares all LLM interactions in the pipeline.
// Not implemented — wire in your preferred provider (Anthropic, OpenAI, etc.)
type LLMService interface {
	AnalyzeImage(ctx context.Context, asset *models.MediaAsset) (*types.AssetAnalysis, error)
	GeneratePlanV2(
		ctx context.Context,
		req types.VideoGenerationPlanRequest,
		conversationHistory []types.Message,
		onThinking func(thinking string),
	) (*types.Union2AskUserQuestionOrGeneratedVideoPlan, error)
	GenerateScene(
		ctx context.Context,
		req types.AddSceneRequest,
		conversationHistory []types.Message,
		onThinking func(thinking string),
	) (*types.Union2AskUserQuestionOrScene, error)
	GenerateAnimationCodeV2(
		ctx context.Context,
		req types.GenerateAnimationCodeRequestV2,
		conversationHistory []types.Message,
		onThinking func(thinking string),
	) (*types.GenerateAnimationCodeResponseV2, error)
}

type llmService struct {
	logger *zap.Logger
	cache  cache.Cache
}

func getTags(ctx context.Context) map[string]string {
	tags := make(map[string]string)

	if traceID, ok := ctx.Value("session_id").(string); ok {
		tags["trace_id"] = traceID
	}

	return tags
}

func (l *llmService) GenerateAnimationCodeV2(ctx context.Context, req types.GenerateAnimationCodeRequestV2, conversationHistory []types.Message, onThinking func(thinking string)) (*types.GenerateAnimationCodeResponseV2, error) {
	l.logger.Info("🚀 Starting code generation..")

	thinkingMessages := []string{
		"Planning the video structure...",
		"Generating...",
		"Designing...",
		"Organizing...",
	}

	extractor := l.NewThinkingExtractor(onThinking, thinkingMessages)

	stream, err := baml_client.Stream.GenerateAnimationV2(ctx, req, conversationHistory,
		baml_client.WithOnTick(extractor.HandleTick),
		baml_client.WithTags(getTags(ctx)))
	if err != nil {
		return nil, handleInitialError(err)
	}

	// Ensure stream is properly closed on exit
	defer func() {
		if stream != nil {
			// Note: In practice, range automatically handles closing
			// but explicit cleanup is shown here for demonstration
			l.logger.Info("Stream completed")
		}
	}()

	for value := range stream {
		// Handle context cancellation
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}
		// Handle streaming errors
		if value.IsError {
			return nil, handleContextError(value.Error)
		}

		// Process final result
		if value.IsFinal && value.Final() != nil {
			final := *value.Final()

			summary := extractor.FinalSummary()
			duration := extractor.Duration()
			final.ThinkingSummary = utils.Ptr(summary)

			l.logger.Info("Final thinking summary",
				zap.String("summary", summary),
				zap.Float64("duration", duration),
			)

			return &final, nil
		}
	}

	return nil, fmt.Errorf("stream closed without final result")
}

func NewLlmService(logger *zap.Logger, cache cache.Cache) LLMService {
	return &llmService{logger: logger, cache: cache}
}

func (l *llmService) GenerateScene(ctx context.Context, req types.AddSceneRequest, conversationHistory []types.Message, onThinking func(thinking string)) (*types.Union2AskUserQuestionOrScene, error) {
	l.logger.Info("🚀 Starting scene generation..")

	thinkingMessages := []string{
		"Understanding the request...",
		"Planning the video structure...",
		"Designing flow...",
		"Organizing the storyline...",
		"Finalizing the plan...",
	}

	extractor := l.NewThinkingExtractor(onThinking, thinkingMessages)

	stream, err := baml_client.Stream.GenerateScene(ctx, req, conversationHistory,
		baml_client.WithOnTick(extractor.HandleTick),
		baml_client.WithTags(getTags(ctx)))
	if err != nil {
		return nil, handleInitialError(err)
	}

	// Ensure stream is properly closed on exit
	defer func() {
		if stream != nil {
			// Note: In practice, range automatically handles closing
			// but explicit cleanup is shown here for demonstration
			l.logger.Info("Stream completed")
		}
	}()

	for value := range stream {
		// Handle context cancellation
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}
		// Handle streaming errors
		if value.IsError {
			return nil, handleContextError(value.Error)
		}

		// Process final result
		if value.IsFinal && value.Final() != nil {
			final := *value.Final()

			summary := extractor.FinalSummary()
			duration := extractor.Duration()

			l.logger.Info("Final thinking summary",
				zap.String("summary", summary),
				zap.Float64("duration", duration),
			)

			if final.Scene.IsScene() {
				final.Scene.AsScene().ThinkingSummary = utils.Ptr(summary)
			} else if final.Scene.IsAskUserQuestion() {
				final.Scene.AsAskUserQuestion().ThinkingSummary = utils.Ptr(summary)
			}

			return &final.Scene, nil
		}
	}

	return nil, fmt.Errorf("stream closed without final result")
}

func (l *llmService) GeneratePlanV2(
	ctx context.Context,
	req types.VideoGenerationPlanRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string),
) (*types.Union2AskUserQuestionOrGeneratedVideoPlan, error) {
	l.logger.Info("🚀 Starting video plan generation..")

	thinkingMessages := []string{
		"Understanding the request...",
		"Planning the video structure...",
		"Designing flow...",
		"Organizing the storyline...",
		"Finalizing the plan...",
	}

	extractor := l.NewThinkingExtractor(onThinking, thinkingMessages)

	stream, err := baml_client.Stream.GeneratePlan(ctx, req, conversationHistory,
		baml_client.WithOnTick(extractor.HandleTick),
		baml_client.WithTags(getTags(ctx)))
	if err != nil {
		return nil, handleInitialError(err)
	}

	// Ensure stream is properly closed on exit
	defer func() {
		if stream != nil {
			// Note: In practice, range automatically handles closing
			// but explicit cleanup is shown here for demonstration
			l.logger.Info("Stream completed")
		}
	}()

	for value := range stream {
		// Handle context cancellation
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}
		// Handle streaming errors
		if value.IsError {
			return nil, handleContextError(value.Error)
		}

		// Process final result
		if value.IsFinal && value.Final() != nil {
			final := *value.Final()

			summary := extractor.FinalSummary()
			duration := extractor.Duration()

			l.logger.Info("Final thinking summary",
				zap.String("summary", summary),
				zap.Float64("duration", duration),
			)

			if final.Plan.IsGeneratedVideoPlan() {
				final.Plan.AsGeneratedVideoPlan().ThinkingSummary = utils.Ptr(summary)
			} else if final.Plan.IsAskUserQuestion() {
				final.Plan.AsAskUserQuestion().ThinkingSummary = utils.Ptr(summary)
			}

			return &final.Plan, nil
		}
	}

	return nil, fmt.Errorf("stream closed without final result")
}
