package llm

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"go.uber.org/zap"
	"regexp"
	"time"
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
	SelectTemplates(ctx context.Context, req *types.MatchTemplateRequest, onThinking func(thinking string)) ([]types.TemplateItem, error)
}

type llmService struct {
	logger *zap.Logger
}

func NewLlmService(logger *zap.Logger) LLMService {
	return &llmService{logger: logger}
}

func (l llmService) PlanSlidesWithStreaming(
	ctx context.Context,
	req types.VideoGenerationPlanRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string),
) (*types.Union2AskUserQuestionOrVideoGenerationPlan, error) {

	l.logger.Info("🚀 Starting video plan generation..",
		zap.Bool("thinking", req.EnableThinking != nil && *req.EnableThinking),
	)

	stream, err := baml_client.Stream.GeneratePlanStreaming(ctx, req, conversationHistory)
	if err != nil {
		return nil, handleInitialError(err)
	}

	var (
		finalPlan        *types.Union2AskUserQuestionOrVideoGenerationPlan
		lastThinkingLen  int
		thinkingComplete bool
	)

	// Add a timeout for stream operations
	streamTimeout := 30 * time.Second
	timer := time.NewTimer(streamTimeout)
	defer timer.Stop()

	for {
		select {
		case <-ctx.Done():
			return nil, handleContextError(ctx.Err())

		case <-timer.C:
			// Stream timeout - this might be why your stream is "stopping"
			l.logger.Error("⏰ Stream timeout - no data received within timeout period")
			return nil, fmt.Errorf("stream timeout after %v", streamTimeout)

		case value, ok := <-stream:
			// Reset timer on each successful read
			timer.Reset(streamTimeout)
			if !ok {
				// Stream closed - return final result if we have it
				if finalPlan == nil {
					return nil, fmt.Errorf("stream closed without final result")
				}
				l.logger.Info("✅ Stream completed successfully")
				return finalPlan, nil
			}

			// Handle stream-level errors
			if value.IsError {
				return nil, fmt.Errorf("stream error: %w", value.Error)
			}

			// Handle partial updates (streaming)
			if !value.IsFinal && value.Stream() != nil {
				partial := *value.Stream()

				// Handle thinking updates
				if onThinking != nil && partial.Thinking.Value != nil && !thinkingComplete {
					currentThinking := stripThinkingTags(*partial.Thinking.Value)
					//currentLen := len(currentThinking)
					onThinking(currentThinking)

					//// Only send new thinking content to avoid duplicates
					//if currentLen > lastThinkingLen {
					//	if lastThinkingLen == 0 {
					//		// First thinking update - send all
					//		onThinking(currentThinking)
					//		l.logger.Info("🤔 Thinking started", zap.Int("length", currentLen))
					//	} else {
					//		// Send only new content
					//		newContent := currentThinking[lastThinkingLen:]
					//		onThinking(newContent)
					//		l.logger.Info("🤔 Thinking updated",
					//			zap.Int("new_chars", len(newContent)),
					//			zap.Int("total_chars", currentLen))
					//	}
					//	lastThinkingLen = currentLen
					//}

					// Check if thinking seems complete (heuristic)
					//if currentLen > 100 && strings.Contains(strings.ToLower(currentThinking), "final") {
					//	thinkingComplete = true
					//	l.logger.Info("🤔 Thinking appears complete")
					//}
				}
			}

			// Handle final result
			if value.IsFinal && value.Final() != nil {
				final := *value.Final()
				finalPlan = &final.Plan

				// Send final thinking if we haven't sent it yet
				if onThinking != nil && final.Thinking != nil && !thinkingComplete {
					finalThinking := *final.Thinking
					if len(finalThinking) > lastThinkingLen {
						if lastThinkingLen == 0 {
							onThinking(finalThinking)
						} else {
							newContent := finalThinking[lastThinkingLen:]
							onThinking(newContent)
						}
					}
				}
			}
		}
	}
}

var thinkingTagRegex = regexp.MustCompile(`(?i)</?thinking>`)

func stripThinkingTags(s string) string {
	return thinkingTagRegex.ReplaceAllString(s, "")
}

func (l llmService) SelectTemplates(ctx context.Context, req *types.MatchTemplateRequest, onThinking func(thinking string)) ([]types.TemplateItem, error) {
	stream, err := baml_client.Stream.MatchTemplate(ctx, *req)
	if err != nil {
		return nil, handleInitialError(err)
	}

	var (
		finalPlan        []types.TemplateItem
		lastThinkingLen  int
		thinkingComplete bool
	)

	for {
		select {
		case <-ctx.Done():
			return nil, handleContextError(ctx.Err())

		case value, ok := <-stream:
			if !ok {
				// Stream closed - return final result if we have it
				if finalPlan == nil {
					return nil, fmt.Errorf("stream closed without final result")
				}
				l.logger.Info("✅ Stream completed successfully")
				return finalPlan, nil
			}

			// Handle stream-level errors
			if value.IsError {
				return nil, fmt.Errorf("stream error: %w", value.Error)
			}

			// Handle partial updates (streaming)
			if !value.IsFinal && value.Stream() != nil {
				partial := *value.Stream()

				// Handle thinking updates
				if onThinking != nil && partial.Thinking.Value != nil && !thinkingComplete {
					currentThinking := stripThinkingTags(*partial.Thinking.Value)
					onThinking(currentThinking)
				}
			}

			// Handle final result
			if value.IsFinal && value.Final() != nil {
				final := *value.Final()
				finalPlan = final.Templates

				// Send final thinking if we haven't sent it yet
				if onThinking != nil && final.Thinking != nil && !thinkingComplete {
					finalThinking := *final.Thinking
					if len(finalThinking) > lastThinkingLen {
						if lastThinkingLen == 0 {
							onThinking(finalThinking)
						} else {
							newContent := finalThinking[lastThinkingLen:]
							onThinking(newContent)
						}
					}
				}
			}
		}
	}
}
