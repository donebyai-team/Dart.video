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
	PlanSlidesWithStreaming(
		ctx context.Context,
		req types.VideoGenerationPlanRequest,
		conversationHistory []types.Message,
		onThinking func(thinking string),
	) (*types.Union2AskUserQuestionOrVideoGenerationPlan, error)
	MatchTemplates(ctx context.Context, req *types.MatchTemplateRequest) ([]types.TemplateItem, error)
	AnalyzeImage(ctx context.Context, asset *models.MediaAsset) (*types.AssetAnalysis, error)
	GeneratePlanV2(
		ctx context.Context,
		req types.VideoGenerationPlanRequest,
		conversationHistory []types.Message,
		onThinking func(thinking string),
	) (*types.Union2AskUserQuestionOrVideoPlanV2, error)
}

type llmService struct {
	logger *zap.Logger
	cache  cache.Cache
}

func NewLlmService(logger *zap.Logger, cache cache.Cache) LLMService {
	return &llmService{logger: logger}
}

func (l *llmService) PlanSlidesWithStreaming(
	ctx context.Context,
	req types.VideoGenerationPlanRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string),
) (*types.Union2AskUserQuestionOrVideoGenerationPlan, error) {
	l.logger.Info("🚀 Starting video plan generation..")

	thinkingMessages := []string{
		"Understanding the request...",
		"Planning the video structure...",
		"Designing flow...",
		"Organizing the storyline...",
		"Finalizing the plan...",
	}

	extractor := l.NewThinkingExtractor(onThinking, thinkingMessages)

	stream, err := baml_client.Stream.GeneratePlanStreaming(ctx, req, conversationHistory, baml_client.WithOnTick(extractor.HandleTick))
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

			if final.Plan.IsVideoGenerationPlan() {
				final.Plan.AsVideoGenerationPlan().ThinkingSummary = utils.Ptr(summary)
			} else if final.Plan.IsAskUserQuestion() {
				final.Plan.AsAskUserQuestion().ThinkingSummary = utils.Ptr(summary)
			}

			return &final.Plan, nil
		}
	}

	return nil, fmt.Errorf("stream closed without final result")
}

func (l *llmService) GeneratePlanV2(
	ctx context.Context,
	req types.VideoGenerationPlanRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string),
) (*types.Union2AskUserQuestionOrVideoPlanV2, error) {
	l.logger.Info("🚀 Starting video plan generation..")

	thinkingMessages := []string{
		"Understanding the request...",
		"Planning the video structure...",
		"Designing flow...",
		"Organizing the storyline...",
		"Finalizing the plan...",
	}

	extractor := l.NewThinkingExtractor(onThinking, thinkingMessages)

	stream, err := baml_client.Stream.GeneratePlanV2(ctx, req, conversationHistory, baml_client.WithOnTick(extractor.HandleTick))
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

			if final.Plan.IsVideoPlanV2() {
				final.Plan.AsVideoPlanV2().ThinkingSummary = utils.Ptr(summary)
			} else if final.Plan.IsAskUserQuestion() {
				final.Plan.AsAskUserQuestion().ThinkingSummary = utils.Ptr(summary)
			}

			return &final.Plan, nil
		}
	}

	return nil, fmt.Errorf("stream closed without final result")
}

func (l *llmService) MatchTemplates(ctx context.Context, req *types.MatchTemplateRequest) ([]types.TemplateItem, error) {
	template, err := baml_client.MatchTemplate(ctx, *req)
	if err != nil {
		return nil, handleInitialError(err)
	}

	return template.Templates, nil
}
