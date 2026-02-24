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

// streamEvent is a normalised view of one value off a BAML stream channel.
// Both PlanSlides and SelectTemplates produce values that fit this shape;
// the two callbacks below are the only thing that differs between them.
type streamEvent struct {
	isError bool
	isFinal bool
	err     error

	// partialThinking returns the thinking text accumulated so far (may be nil).
	partialThinking func() *string
	// finalThinking returns the thinking text from the final result (may be nil).
	finalThinking func() *string
	// markDone is called when isFinal is true; it lets the caller capture the
	// concrete final value via a closure before handleStream returns.
	markDone func()
}

// handleStream runs the shared select-loop that both methods used to duplicate.
// The caller is responsible for converting each channel read into a streamEvent
// and for capturing the final typed result inside markDone.
func (l *llmService) handleStream(
	ctx context.Context,
	recv func() (streamEvent, bool), // returns (event, channelOpen)
	onThinking func(string),
) error {
	const streamTimeout = 30 * time.Second
	timer := time.NewTimer(streamTimeout)
	defer timer.Stop()

	var (
		lastThinkingLen  int
		thinkingComplete bool
		gotFinal         bool
	)

	for {
		// We can't select on a generic channel, so we poll recv() in a
		// goroutine and funnel the result back through a typed channel.
		type recvResult struct {
			event streamEvent
			open  bool
		}
		ch := make(chan recvResult, 1)
		go func() {
			e, ok := recv()
			ch <- recvResult{e, ok}
		}()

		select {
		case <-ctx.Done():
			return handleContextError(ctx.Err())

		case <-timer.C:
			l.logger.Error("⏰ Stream timeout - no data received within timeout period")
			return fmt.Errorf("stream timeout after %v", streamTimeout)

		case r := <-ch:
			timer.Reset(streamTimeout)

			if !r.open {
				if !gotFinal {
					return fmt.Errorf("stream closed without final result")
				}
				l.logger.Info("✅ Stream completed successfully")
				return nil
			}

			e := r.event
			if e.isError {
				return fmt.Errorf("stream error: %w", e.err)
			}

			// Partial thinking update.
			if !e.isFinal && onThinking != nil && !thinkingComplete {
				if t := e.partialThinking(); t != nil {
					onThinking(stripThinkingTags(*t))
				}
			}

			// Final result.
			if e.isFinal {
				e.markDone()
				gotFinal = true

				if onThinking != nil && !thinkingComplete {
					if t := e.finalThinking(); t != nil {
						finalThinking := *t
						if len(finalThinking) > lastThinkingLen {
							if lastThinkingLen == 0 {
								onThinking(finalThinking)
							} else {
								onThinking(finalThinking[lastThinkingLen:])
							}
						}
						thinkingComplete = true
					}
				}
			}
		}
	}
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

	var finalPlan *types.Union2AskUserQuestionOrVideoGenerationPlan

	recv := func() (streamEvent, bool) {
		value, ok := <-stream
		if !ok {
			return streamEvent{}, false
		}
		e := streamEvent{
			isError: value.IsError,
			isFinal: value.IsFinal,
			err:     value.Error,
		}
		if !value.IsFinal && value.Stream() != nil {
			partial := *value.Stream()
			e.partialThinking = func() *string { return partial.Thinking.Value }
		} else {
			e.partialThinking = func() *string { return nil }
		}
		if value.IsFinal && value.Final() != nil {
			final := *value.Final()
			e.finalThinking = func() *string { return final.Thinking }
			e.markDone = func() { finalPlan = &final.Plan }
		} else {
			e.finalThinking = func() *string { return nil }
			e.markDone = func() {}
		}
		return e, true
	}

	if err := l.handleStream(ctx, recv, onThinking); err != nil {
		return nil, err
	}
	return finalPlan, nil
}

func (l llmService) SelectTemplates(ctx context.Context, req *types.MatchTemplateRequest, onThinking func(thinking string)) ([]types.TemplateItem, error) {
	stream, err := baml_client.Stream.MatchTemplate(ctx, *req)
	if err != nil {
		return nil, handleInitialError(err)
	}

	var finalTemplates []types.TemplateItem

	recv := func() (streamEvent, bool) {
		value, ok := <-stream
		if !ok {
			return streamEvent{}, false
		}
		e := streamEvent{
			isError: value.IsError,
			isFinal: value.IsFinal,
			err:     value.Error,
		}
		if !value.IsFinal && value.Stream() != nil {
			partial := *value.Stream()
			e.partialThinking = func() *string { return partial.Thinking.Value }
		} else {
			e.partialThinking = func() *string { return nil }
		}
		if value.IsFinal && value.Final() != nil {
			final := *value.Final()
			e.finalThinking = func() *string { return final.Thinking }
			e.markDone = func() { finalTemplates = final.Templates }
		} else {
			e.finalThinking = func() *string { return nil }
			e.markDone = func() {}
		}
		return e, true
	}

	if err := l.handleStream(ctx, recv, onThinking); err != nil {
		return nil, err
	}
	return finalTemplates, nil
}

var thinkingTagRegex = regexp.MustCompile(`(?i)</?thinking>`)

func stripThinkingTags(s string) string {
	return thinkingTagRegex.ReplaceAllString(s, "")
}
