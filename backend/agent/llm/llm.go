package llm

import (
	"context"
	"encoding/json"
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
	GeneratePlanV2Mock(
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
	GenerateAnimation(ctx context.Context, prompt string) (types.GenerateAnimationCodeResponse, error)
}

type llmService struct {
	logger *zap.Logger
	cache  cache.Cache
}

const mockResponse = "import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from 'remotion';\n\nexport default function RemoteComponent() {\n  /*\n   * A dramatic two-part question reveal, with the first line entering boldly before dissolving away.\n   * The second line arrives after the fade, using staggered word motion for a tense manual-process punchline.\n   */\n  const frame = useCurrentFrame();\n  const { width, height, fps } = useVideoConfig();\n\n  const COLORS = {\n    background: '#070A12',\n    text: '#F8FAFC',\n    muted: '#94A3B8',\n    accent: '#F43F5E',\n  };\n  const FIRST_LINE_WORDS = ['Are', 'your', 'recruiters'];\n  const SECOND_LINE_WORDS = ['still', 'sending', 'offers', 'manually'];\n  const FIRST_LINE_START = 4;\n  const FIRST_LINE_FADE_START = 64;\n  const FIRST_LINE_FADE_END = 88;\n  const SECOND_LINE_START = 92;\n  const WORD_STAGGER = 5;\n  const WORD_FADE_DURATION = 12;\n  const SAFE_AREA_PADDING = Math.max(64, Math.round(width * 0.075));\n  const HORIZONTAL_PADDING = Math.max(48, Math.round(width * 0.055));\n  const FONT_SIZE = Math.max(76, Math.round(width * 0.071));\n  const LINE_HEIGHT = Math.max(88, Math.round(FONT_SIZE * 1.06));\n  const LETTER_SPACING = Math.max(-5, Math.round(width * -0.002));\n  const WORD_GAP = Math.max(18, Math.round(width * 0.018));\n  const ACCENT_HEIGHT = Math.max(5, Math.round(height * 0.008));\n  const GLOW_SIZE = Math.max(420, Math.round(width * 0.34));\n\n  const FIRST_LINE_ENTER_PROGRESS = spring({\n    frame: frame - FIRST_LINE_START,\n    fps,\n    config: { damping: 18, stiffness: 92, mass: 0.85 },\n  });\n  const FIRST_LINE_EXIT_PROGRESS = interpolate(\n    frame,\n    [FIRST_LINE_FADE_START, FIRST_LINE_FADE_END],\n    [0, 1],\n    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n  );\n  const SECOND_LINE_ENTER_PROGRESS = spring({\n    frame: frame - SECOND_LINE_START,\n    fps,\n    config: { damping: 17, stiffness: 88, mass: 0.9 },\n  });\n  const BACKDROP_GLOW_OPACITY = interpolate(\n    frame,\n    [0, 36, FIRST_LINE_FADE_END, 132],\n    [0.25, 0.48, 0.2, 0.44],\n    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n  );\n  const FIRST_LINE_OPACITY = interpolate(\n    frame,\n    [FIRST_LINE_START, FIRST_LINE_START + 10, FIRST_LINE_FADE_START, FIRST_LINE_FADE_END],\n    [0, 1, 1, 0],\n    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n  );\n  const SECOND_LINE_OPACITY = interpolate(\n    frame,\n    [SECOND_LINE_START, SECOND_LINE_START + 18],\n    [0, 1],\n    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n  );\n  const FIRST_LINE_TRANSLATE_Y = interpolate(\n    FIRST_LINE_EXIT_PROGRESS,\n    [0, 1],\n    [0, -42],\n    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n  );\n  const FIRST_LINE_BLUR = interpolate(\n    FIRST_LINE_EXIT_PROGRESS,\n    [0, 1],\n    [0, 12],\n    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n  );\n  const SECOND_LINE_UNDERLINE_SCALE = interpolate(\n    frame,\n    [SECOND_LINE_START + 12, SECOND_LINE_START + 34],\n    [0, 1],\n    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n  );\n\n\n  return (\n    <SafeArea>\n      <AbsoluteCenter axis={'both'}>\n        <div\n          style={{\n            position: 'absolute',\n            width: GLOW_SIZE,\n            height: GLOW_SIZE,\n            borderRadius: '50%',\n            backgroundColor: COLORS.accent,\n            opacity: BACKDROP_GLOW_OPACITY,\n            filter: 'blur(120px)',\n            transform: `translateY(${Math.round(height * 0.03)}px) scale(${0.8 + SECOND_LINE_ENTER_PROGRESS * 0.22})`,\n          }}\n        />\n\n        <div\n          style={{\n            width: '100%',\n            paddingLeft: HORIZONTAL_PADDING,\n            paddingRight: HORIZONTAL_PADDING,\n            boxSizing: 'border-box',\n            position: 'relative',\n            minHeight: LINE_HEIGHT * 2,\n            display: 'flex',\n            alignItems: 'center',\n            justifyContent: 'center',\n          }}\n        >\n          <div\n            style={{\n              position: 'absolute',\n              width: '100%',\n              display: 'flex',\n              justifyContent: 'center',\n              gap: WORD_GAP,\n              flexWrap: 'wrap',\n              opacity: FIRST_LINE_OPACITY,\n              filter: `blur(${FIRST_LINE_BLUR}px)`,\n              transform: `translateY(${(1 - FIRST_LINE_ENTER_PROGRESS) * 54 + FIRST_LINE_TRANSLATE_Y}px) scale(${0.94 + FIRST_LINE_ENTER_PROGRESS * 0.06 - FIRST_LINE_EXIT_PROGRESS * 0.03})`,\n            }}\n          >\n            {FIRST_LINE_WORDS.map((word, index) => {\n              const wordDelay = FIRST_LINE_START + index * WORD_STAGGER;\n              const wordProgress = spring({\n                frame: frame - wordDelay,\n                fps,\n                config: { damping: 16, stiffness: 105, mass: 0.75 },\n              });\n              const wordOpacity = interpolate(\n                frame,\n                [wordDelay, wordDelay + WORD_FADE_DURATION, FIRST_LINE_FADE_START, FIRST_LINE_FADE_END],\n                [0, 1, 1, 0],\n                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n              );\n\n              return (\n                <span\n                  key={word}\n                  style={{\n                    color: COLORS.text,\n                    fontFamily: 'Inter, sans-serif',\n                    fontSize: FONT_SIZE,\n                    lineHeight: `${LINE_HEIGHT}px`,\n                    fontWeight: 800,\n                    letterSpacing: LETTER_SPACING,\n                    opacity: wordOpacity,\n                    textShadow: `0 ${Math.max(8, Math.round(height * 0.014))}px ${Math.max(26, Math.round(width * 0.018))}px rgba(0,0,0,0.45)`,\n                    transform: `translateY(${(1 - wordProgress) * 36}px)`,\n                    display: 'inline-block',\n                  }}\n                >\n                  {word}\n                </span>\n              );\n            })}\n          </div>\n\n          <div\n            style={{\n              position: 'absolute',\n              width: '100%',\n              display: 'flex',\n              justifyContent: 'center',\n              gap: WORD_GAP,\n              flexWrap: 'wrap',\n              opacity: SECOND_LINE_OPACITY,\n              transform: `translateY(${(1 - SECOND_LINE_ENTER_PROGRESS) * 64}px) scale(${0.93 + SECOND_LINE_ENTER_PROGRESS * 0.07})`,\n            }}\n          >\n            {SECOND_LINE_WORDS.map((word, index) => {\n              const wordDelay = SECOND_LINE_START + index * WORD_STAGGER;\n              const wordProgress = spring({\n                frame: frame - wordDelay,\n                fps,\n                config: { damping: 15, stiffness: 102, mass: 0.78 },\n              });\n              const wordOpacity = interpolate(\n                frame,\n                [wordDelay, wordDelay + WORD_FADE_DURATION],\n                [0, 1],\n                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }\n              );\n              const isFinalWord = index === SECOND_LINE_WORDS.length - 1;\n\n              return (\n                <span\n                  key={word}\n                  style={{\n                    color: isFinalWord ? COLORS.accent : COLORS.text,\n                    fontFamily: 'Inter, sans-serif',\n                    fontSize: FONT_SIZE,\n                    lineHeight: `${LINE_HEIGHT}px`,\n                    fontWeight: 850,\n                    letterSpacing: LETTER_SPACING,\n                    opacity: wordOpacity,\n                    textShadow: isFinalWord\n                      ? `0 0 ${Math.max(22, Math.round(width * 0.018))}px rgba(244,63,94,0.45)`\n                      : `0 ${Math.max(8, Math.round(height * 0.014))}px ${Math.max(26, Math.round(width * 0.018))}px rgba(0,0,0,0.45)`,\n                    transform: `translateY(${(1 - wordProgress) * 42}px)`,\n                    display: 'inline-block',\n                    position: 'relative',\n                  }}\n                >\n                  {word}\n                  {isFinalWord ? (\n                    <span\n                      style={{\n                        position: 'absolute',\n                        left: 0,\n                        right: 0,\n                        bottom: Math.max(-12, Math.round(height * -0.01)),\n                        height: ACCENT_HEIGHT,\n                        backgroundColor: COLORS.accent,\n                        borderRadius: ACCENT_HEIGHT,\n                        transform: `scaleX(${SECOND_LINE_UNDERLINE_SCALE})`,\n                        transformOrigin: 'left center',\n                      }}\n                    />\n                  ) : null}\n                </span>\n              );\n            })}\n          </div>\n        </div>\n      </AbsoluteCenter>\n    </SafeArea>\n  );\n};"

func (l *llmService) GenerateAnimation(ctx context.Context, prompt string) (types.GenerateAnimationCodeResponse, error) {
	//return baml_client.GenerateAnimation(ctx, types.GenerateAnimationCodeRequest{Prompt: prompt}, nil)
	return types.GenerateAnimationCodeResponse{
		Code:         mockResponse,
		Total_frames: 150,
	}, nil
}

func (l *llmService) SuggestScenes(ctx context.Context, req types.SuggestScenesRequest) (types.SuggestScenesResponse, error) {
	return baml_client.SuggestScenes(ctx, req)
}

func getTags(ctx context.Context) map[string]string {
	tags := make(map[string]string)

	if traceID, ok := ctx.Value("session_id").(string); ok {
		tags["trace_id"] = traceID
	}

	return tags
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

func (l *llmService) GeneratePlanV2Mock(
	ctx context.Context,
	req types.VideoGenerationPlanRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string),
) (*types.Union2AskUserQuestionOrGeneratedVideoPlan, error) {
	if onThinking != nil {
		onThinking("Loading mock video plan...")
	}

	var generatedPlan types.GeneratedVideoPlan
	if err := json.Unmarshal([]byte(mockGeneratePlanV2ResponseJSON), &generatedPlan); err == nil {
		mockPlan := types.Union2AskUserQuestionOrGeneratedVideoPlan__NewGeneratedVideoPlan(generatedPlan)
		return &mockPlan, nil
	}

	var askUserQuestion types.AskUserQuestion
	if err := json.Unmarshal([]byte(mockGeneratePlanV2ResponseJSON), &askUserQuestion); err == nil {
		mockPlan := types.Union2AskUserQuestionOrGeneratedVideoPlan__NewAskUserQuestion(askUserQuestion)
		return &mockPlan, nil
	}

	return nil, fmt.Errorf("unmarshal mock GeneratePlanV2 response: json did not match GeneratedVideoPlan or AskUserQuestion")
}
