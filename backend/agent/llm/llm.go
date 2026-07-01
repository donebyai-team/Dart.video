package llm

import (
	"context"
	"fmt"
	baml "github.com/boundaryml/baml/engine/language_client_go/pkg"
	"github.com/shank318/coasterai/agent/scenes"
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
	) (*types.GeneratedVideoPlan, error)
	CategorizeScene(ctx context.Context, req types.MatchCategoriesRequest) (*types.MatchCategoriesResponse, error)
	GenerateAnimation(ctx context.Context,
		req types.GenerateAnimationCodeRequest,
		conversationHistory []types.Message,
		onThinking func(thinking string),
		options *LLMOptions) (*types.Union2AskUserQuestionOrGenerateAnimationCodeResponse, *string, error)
	ExtractTemplateConfig(ctx context.Context, req types.ExtractTemplateConfigRequest) (*types.ExtractTemplateConfigResponse, error)
	GenerateScript(
		ctx context.Context,
		req types.ScriptPlannerRequest,
		conversationHistory []types.Message,
		onThinking func(thinking string),
	) (*types.Union2ListAskUserQuestionOrScript, *string, error)
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

func (l *llmService) ExtractTemplateConfig(ctx context.Context, req types.ExtractTemplateConfigRequest) (*types.ExtractTemplateConfigResponse, error) {
	categories, err := baml_client.ExtractTemplateConfig(ctx, req, baml_client.WithTags(getTags(ctx)))
	if err != nil {
		return nil, err
	}
	return &categories, nil
}

func (l *llmService) GenerateAnimation(
	ctx context.Context,
	req types.GenerateAnimationCodeRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string), options *LLMOptions) (*types.Union2AskUserQuestionOrGenerateAnimationCodeResponse, *string, error) {
	l.logger.Info("🚀 Starting code generation..")

	var extractor *ThinkingExtractor
	cr := baml.NewClientRegistry()

	if options != nil && options.Model == pbcore.AIModel_AI_MODEL_GPT_5_5 {
		cr.SetPrimaryClient("CustomOpenAI55WithThinkingSummary")
		extractor = l.NewThinkingExtractor(NewOpenAIExtractor(), onThinking, thinkingMessages)
	} else if options != nil && options.Model == pbcore.AIModel_AI_MODEL_GEMINI_3_5_FLASH {
		cr.SetPrimaryClient("CustomGemini3Flash")
		extractor = l.NewThinkingExtractor(NewGeminiExtractor(), onThinking, thinkingMessages)
	} else {
		extractor = l.NewThinkingExtractor(NewGeminiExtractor(), onThinking, thinkingMessages)
	}

	callOptions := []baml_client.CallOptionFunc{
		baml_client.WithOnTick(extractor.HandleTick),
		baml_client.WithTags(getTags(ctx)),
	}

	callOptions = append(callOptions, baml_client.WithClientRegistry(cr))

	stream, err := baml_client.Stream.GenerateAnimation(ctx, req, conversationHistory, callOptions...)
	if err != nil {
		return nil, nil, handleInitialError(err)
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
			return nil, nil, ctx.Err()
		default:
		}
		// Handle streaming errors
		if value.IsError {
			return nil, nil, handleContextError(value.Error)
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

			return &final, utils.Ptr(summary), nil
		}
	}

	return nil, nil, fmt.Errorf("stream closed without final result")
}

func NewLlmService(logger *zap.Logger, cache cache.Cache) Service {
	return &llmService{logger: logger, cache: cache}
}

func (l *llmService) GeneratePlanV2(
	ctx context.Context,
	req types.VideoGenerationPlanRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string),
) (*types.GeneratedVideoPlan, error) {
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
			return &final, nil
		}
	}

	return nil, fmt.Errorf("stream closed without final result")
}

func (l *llmService) GenerateScript(
	ctx context.Context,
	req types.ScriptPlannerRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string),
) (*types.Union2ListAskUserQuestionOrScript, *string, error) {
	l.logger.Info("🚀 Starting planning script generation..")

	extractor := l.NewThinkingExtractor(NewOpenAIExtractor(), onThinking, thinkingMessages)

	tb, err := baml_client.NewTypeBuilder()
	if err != nil {
		return nil, nil, err
	}

	sec, err := tb.VideoSection()
	if err != nil {
		return nil, nil, err
	}

	for _, category := range scenes.AvailableCategoriesToCategorize {
		_, err = sec.AddValue(category.Name)
		if err != nil {
			return nil, nil, err
		}
	}

	stream, err := baml_client.Stream.GenerateScript(ctx, req, conversationHistory,
		baml_client.WithOnTick(extractor.HandleTick),
		baml_client.WithTypeBuilder(tb),
		baml_client.WithTags(getTags(ctx)))
	if err != nil {
		return nil, nil, handleInitialError(err)
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
			return nil, nil, ctx.Err()
		default:
		}
		// Handle streaming errors
		if value.IsError {
			return nil, nil, handleContextError(value.Error)
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

			return &final.Plan, utils.Ptr(summary), nil
		}
	}

	return nil, nil, fmt.Errorf("stream closed without final result")
}
