package llm

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
)

// Service declares all LLM interactions in the pipeline.
// Not implemented — wire in your preferred provider (Anthropic, OpenAI, etc.)
type Service interface {
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
	SuggestScenes(
		ctx context.Context,
		req types.SuggestScenesRequest,
	) (types.SuggestScenesResponse, error)
	CategorizeScene(ctx context.Context, req types.MatchCategoriesRequest) (*types.MatchCategoriesResponse, error)
	GenerateAnimation(ctx context.Context,
		req types.GenerateAnimationCodeRequest,
		conversationHistory []types.Message,
		onThinking func(thinking string),
		options *LLMOptions) (*types.Union2AskUserQuestionOrGenerateAnimationCodeResponse, error)
}

type LLMOptions struct {
	Model pbcore.AIModel
}

type llmService struct {
	logger *zap.Logger
	cache  cache.Cache
}

func (l *llmService) CategorizeScene(ctx context.Context, req types.MatchCategoriesRequest) (*types.MatchCategoriesResponse, error) {
	categories, err := baml_client.MatchCategories(ctx, req, baml_client.WithTags(getTags(ctx)))
	if err != nil {
		return nil, err
	}
	return &categories, nil
}

func (l *llmService) GenerateAnimation(
	ctx context.Context,
	req types.GenerateAnimationCodeRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string), options *LLMOptions) (*types.Union2AskUserQuestionOrGenerateAnimationCodeResponse, error) {
	l.logger.Info("🚀 Starting code generation..")

	extractor := l.NewThinkingExtractor(NewGeminiExtractor(), onThinking, thinkingMessages)

	callOptions := []baml_client.CallOptionFunc{
		baml_client.WithOnTick(extractor.HandleTick),
		baml_client.WithTags(getTags(ctx)),
	}

	if options != nil && options.Model == pbcore.AIModel_AI_MODEL_GPT_5_5 {
		callOptions = append(callOptions, baml_client.WithClient("CustomOpenAI55WithThinkingSummary"))
	}

	stream, err := baml_client.Stream.GenerateAnimation(ctx, req, conversationHistory, callOptions...)
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

			if final.IsGenerateAnimationCodeResponse() {
				final.AsGenerateAnimationCodeResponse().ThinkingSummary = utils.Ptr(summary)
			} else if final.IsAskUserQuestion() {
				final.AsAskUserQuestion().ThinkingSummary = utils.Ptr(summary)
			}

			return &final, nil
		}
	}

	return nil, fmt.Errorf("stream closed without final result")
}

func (l *llmService) SuggestScenes(ctx context.Context, req types.SuggestScenesRequest) (types.SuggestScenesResponse, error) {
	return baml_client.SuggestScenes(ctx, req, baml_client.WithTags(getTags(ctx)))
}

func NewLlmService(logger *zap.Logger, cache cache.Cache) Service {
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

	extractor := l.NewThinkingExtractor(NewOpenAIExtractor(), onThinking, thinkingMessages)

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

	//var plan types.GeneratedVideoPlan
	//err := json.Unmarshal([]byte(mockGeneratePlanV2ResponseJSON), &plan)
	//if err != nil {
	//	return nil, err
	//}
	//
	//a := types.Union2AskUserQuestionOrGeneratedVideoPlan__NewGeneratedVideoPlan(plan)
	//
	//return &a, nil

	extractor := l.NewThinkingExtractor(NewOpenAIExtractor(), onThinking, thinkingMessages)

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
