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
	GenerateAnimation(ctx context.Context,
		req types.GenerateAnimationCodeRequest,
		conversationHistory []types.Message,
		onThinking func(thinking string)) (*types.Union2AskUserQuestionOrGenerateAnimationCodeResponse, error)
}

type llmService struct {
	logger *zap.Logger
	cache  cache.Cache
}

const mockResponse = "import { useCurrentFrame, useVideoConfig, AbsoluteFill, interpolate, spring } from \"remotion\";\nimport { SafeArea, AbsoluteCenter } from \"./primitives\";\n\nexport default function RemoteComponent() {\n  /*\n   * A wide dashboard-style visual showing a recruiter buried under manual offer-letter work.\n   * Staggered letter cards, task chips, and a fast-moving clock emphasize how repetitive sending, editing, and follow-up consumes hours.\n   */\n  const frame = useCurrentFrame();\n  const { width, height, fps } = useVideoConfig();\n\n  const COLORS = {\n    BACKGROUND: '#F7F3EA',\n    INK: '#202124',\n    MUTED: '#6B6258',\n    ACCENT: '#D95D39',\n    PAPER: '#FFFFFF',\n  };\n  const TITLE_TEXT = 'Recruiters lose huge time sending offer letters manually';\n  const SUBTITLE_TEXT = 'Every candidate means copying, editing, attaching, emailing, and following up — again and again.';\n  const PENDING_TEXT = '18 pending offers';\n  const HOURS_LABEL_TEXT = 'spent on repetitive offer admin';\n  const OFFER_LABEL_TEXT = 'OFFER LETTER';\n  const EMAIL_LABEL_TEXT = 'Manual email queue';\n  const STEP_LABELS = ['Copy template', 'Edit candidate details', 'Attach PDF', 'Send + follow up'];\n  const STEP_MINUTES = ['8 min', '12 min', '5 min', '10 min'];\n  const FADE_DURATION = 22;\n  const CARD_STAGGER = 8;\n  const STEP_STAGGER = 12;\n  const SCREEN_PADDING = Math.max(56, Math.round(width * 0.055));\n  const TITLE_SIZE = Math.max(44, Math.round(width * 0.038));\n  const SUBTITLE_SIZE = Math.max(22, Math.round(width * 0.015));\n  const PANEL_RADIUS = Math.max(28, Math.round(width * 0.018));\n  const PANEL_GAP = Math.max(28, Math.round(width * 0.022));\n  const LEFT_PANEL_WIDTH = Math.max(610, Math.round(width * 0.34));\n  const RIGHT_PANEL_WIDTH = Math.max(520, Math.round(width * 0.29));\n  const CARD_WIDTH = Math.max(350, Math.round(width * 0.22));\n  const CARD_HEIGHT = Math.max(118, Math.round(height * 0.11));\n  const CLOCK_SIZE = Math.max(260, Math.round(width * 0.15));\n  const CHIP_HEIGHT = Math.max(70, Math.round(height * 0.07));\n  const BODY_TOP = Math.max(210, Math.round(height * 0.205));\n\n  const clampOptions = { extrapolateLeft: 'clamp' as const, extrapolateRight: 'clamp' as const };\n  const titleOpacity = interpolate(frame, [0, FADE_DURATION], [0, 1], clampOptions);\n  const titleTranslate = interpolate(frame, [0, FADE_DURATION], [18, 0], clampOptions);\n  const panelsEntrance = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 95 } });\n  const recruiterBounce = spring({ frame: frame - 28, fps, config: { damping: 12, stiffness: 120 } });\n  const clockEntrance = spring({ frame: frame - 42, fps, config: { damping: 15, stiffness: 105 } });\n  const hoursValue = Math.round(interpolate(frame, [58, 132], [0, 6], clampOptions));\n  const clockHandRotation = interpolate(frame, [45, 150], [-35, 335], clampOptions);\n  const queuePulse = 1 + interpolate(frame % 36, [0, 18, 36], [0, 0.045, 0], clampOptions);\n  const warningOpacity = interpolate(frame, [116, 145], [0, 1], clampOptions);\n  const warningTranslate = interpolate(frame, [116, 145], [16, 0], clampOptions);\n  const offerCards = Array.from({ length: 7 }, (_, index) => {\n    const delay = 26 + index * CARD_STAGGER;\n    const enterProgress = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 110 } });\n    const driftProgress = interpolate(frame, [delay + 28, delay + 88], [0, 1], clampOptions);\n    return { index, enterProgress, driftProgress };\n  });\n\n  return (\n    <SafeArea>\n      <AbsoluteCenter axis=\"both\">\n\n          <div\n            style={{\n              position: 'absolute',\n              inset: 0,\n              padding: SCREEN_PADDING,\n              color: COLORS.INK,\n              boxSizing: 'border-box',\n            }}\n          >\n            <div\n              style={{\n                opacity: titleOpacity,\n                transform: `translateY(${titleTranslate}px)`,\n                width: '100%',\n              }}\n            >\n              <div\n                style={{\n                  fontSize: TITLE_SIZE,\n                  fontWeight: 850,\n                  lineHeight: 1.05,\n                  letterSpacing: '-0.045em',\n                  maxWidth: Math.round(width * 0.82),\n                }}\n              >\n                {TITLE_TEXT}\n              </div>\n              <div\n                style={{\n                  marginTop: Math.max(14, Math.round(height * 0.014)),\n                  fontSize: SUBTITLE_SIZE,\n                  lineHeight: 1.35,\n                  color: COLORS.MUTED,\n                  maxWidth: Math.round(width * 0.74),\n                  fontWeight: 520,\n                }}\n              >\n                {SUBTITLE_TEXT}\n              </div>\n            </div>\n\n            <div\n              style={{\n                position: 'absolute',\n                left: SCREEN_PADDING,\n                right: SCREEN_PADDING,\n                top: BODY_TOP,\n                bottom: SCREEN_PADDING,\n                display: 'flex',\n                gap: PANEL_GAP,\n                transform: `translateY(${(1 - panelsEntrance) * 28}px)`,\n                opacity: panelsEntrance,\n              }}\n            >\n              <div\n                style={{\n                  width: LEFT_PANEL_WIDTH,\n                  borderRadius: PANEL_RADIUS,\n                  backgroundColor: 'rgba(255,255,255,0.82)',\n                  border: `3px solid rgba(32,33,36,0.1)`,\n                  boxShadow: '0 28px 70px rgba(32,33,36,0.13)',\n                  position: 'relative',\n                  overflow: 'hidden',\n                  padding: Math.max(30, Math.round(width * 0.022)),\n                  boxSizing: 'border-box',\n                }}\n              >\n                <div style={{ fontSize: Math.max(24, Math.round(width * 0.017)), fontWeight: 820, letterSpacing: '-0.03em' }}>\n                  {EMAIL_LABEL_TEXT}\n                </div>\n                <div style={{ marginTop: 8, color: COLORS.MUTED, fontSize: Math.max(18, Math.round(width * 0.011)), fontWeight: 620 }}>\n                  {PENDING_TEXT}\n                </div>\n\n                <div\n                  style={{\n                    position: 'absolute',\n                    left: Math.max(34, Math.round(width * 0.024)),\n                    bottom: Math.max(26, Math.round(height * 0.028)),\n                    width: Math.max(160, Math.round(width * 0.1)),\n                    height: Math.max(190, Math.round(height * 0.19)),\n                    transform: `scale(${0.86 + recruiterBounce * 0.14})`,\n                    transformOrigin: 'bottom center',\n                  }}\n                >\n                  <div style={{ position: 'absolute', left: '34%', top: 0, width: 78, height: 78, borderRadius: '50%', backgroundColor: COLORS.ACCENT }} />\n                  <div style={{ position: 'absolute', left: '20%', top: 68, width: 118, height: 134, borderRadius: '42px 42px 18px 18px', backgroundColor: COLORS.INK }} />\n                  <div style={{ position: 'absolute', left: 0, bottom: 0, width: 184, height: 28, borderRadius: 18, backgroundColor: 'rgba(32,33,36,0.14)' }} />\n                </div>\n\n                {offerCards.map((card) => {\n                  const stackX = Math.max(180, Math.round(width * 0.12)) + card.index * 16;\n                  const stackY = Math.max(116, Math.round(height * 0.108)) + card.index * 34;\n                  const sendX = card.driftProgress * Math.max(90, Math.round(width * 0.07));\n                  const sendY = card.driftProgress * -Math.max(22, Math.round(height * 0.025));\n                  return (\n                    <div\n                      key={card.index}\n                      style={{\n                        position: 'absolute',\n                        left: stackX + sendX,\n                        top: stackY + sendY,\n                        width: CARD_WIDTH,\n                        height: CARD_HEIGHT,\n                        borderRadius: 18,\n                        backgroundColor: COLORS.PAPER,\n                        border: `2px solid rgba(32,33,36,0.12)`,\n                        boxShadow: '0 18px 34px rgba(32,33,36,0.12)',\n                        transform: `translateY(${(1 - card.enterProgress) * 48}px) rotate(${-7 + card.index * 2}deg) scale(${0.86 + card.enterProgress * 0.14})`,\n                        opacity: card.enterProgress,\n                        padding: 20,\n                        boxSizing: 'border-box',\n                      }}\n                    >\n                      <div style={{ fontSize: Math.max(15, Math.round(width * 0.0085)), color: COLORS.ACCENT, fontWeight: 850, letterSpacing: '0.08em' }}>{OFFER_LABEL_TEXT}</div>\n                      <div style={{ marginTop: 14, width: '82%', height: 10, borderRadius: 8, backgroundColor: 'rgba(32,33,36,0.18)' }} />\n                      <div style={{ marginTop: 10, width: '58%', height: 10, borderRadius: 8, backgroundColor: 'rgba(32,33,36,0.12)' }} />\n                      <div style={{ position: 'absolute', right: 18, bottom: 16, fontSize: 28, transform: `scale(${queuePulse})` }}>✉️</div>\n                    </div>\n                  );\n                })}\n              </div>\n\n              <div\n                style={{\n                  flex: 1,\n                  borderRadius: PANEL_RADIUS,\n                  backgroundColor: 'rgba(255,255,255,0.58)',\n                  border: `3px dashed rgba(217,93,57,0.35)`,\n                  padding: Math.max(28, Math.round(width * 0.02)),\n                  boxSizing: 'border-box',\n                  display: 'flex',\n                  flexDirection: 'column',\n                  justifyContent: 'center',\n                  gap: Math.max(16, Math.round(height * 0.018)),\n                }}\n              >\n                {STEP_LABELS.map((label, index) => {\n                  const delay = 42 + index * STEP_STAGGER;\n                  const stepProgress = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 115 } });\n                  const lineProgress = interpolate(frame, [delay + 10, delay + 34], [0, 1], clampOptions);\n                  return (\n                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16, opacity: stepProgress, transform: `translateX(${(1 - stepProgress) * -34}px)` }}>\n                      <div\n                        style={{\n                          width: Math.max(42, Math.round(width * 0.026)),\n                          height: Math.max(42, Math.round(width * 0.026)),\n                          borderRadius: '50%',\n                          backgroundColor: COLORS.ACCENT,\n                          color: COLORS.PAPER,\n                          display: 'flex',\n                          alignItems: 'center',\n                          justifyContent: 'center',\n                          fontWeight: 850,\n                          fontSize: Math.max(18, Math.round(width * 0.011)),\n                        }}\n                      >\n                        {index + 1}\n                      </div>\n                      <div\n                        style={{\n                          height: CHIP_HEIGHT,\n                          flex: 1,\n                          borderRadius: 20,\n                          backgroundColor: COLORS.PAPER,\n                          boxShadow: '0 12px 28px rgba(32,33,36,0.09)',\n                          display: 'flex',\n                          alignItems: 'center',\n                          justifyContent: 'space-between',\n                          padding: `0 ${Math.max(22, Math.round(width * 0.014))}px`,\n                          boxSizing: 'border-box',\n                          position: 'relative',\n                          overflow: 'hidden',\n                        }}\n                      >\n                        <div style={{ position: 'absolute', left: 0, bottom: 0, height: 5, width: `${lineProgress * 100}%`, backgroundColor: COLORS.ACCENT }} />\n                        <div style={{ fontSize: Math.max(20, Math.round(width * 0.0125)), fontWeight: 780, letterSpacing: '-0.02em' }}>{label}</div>\n                        <div style={{ color: COLORS.ACCENT, fontSize: Math.max(19, Math.round(width * 0.012)), fontWeight: 850 }}>{STEP_MINUTES[index]}</div>\n                      </div>\n                    </div>\n                  );\n                })}\n              </div>\n\n              <div\n                style={{\n                  width: RIGHT_PANEL_WIDTH,\n                  borderRadius: PANEL_RADIUS,\n                  backgroundColor: COLORS.INK,\n                  color: COLORS.PAPER,\n                  boxShadow: '0 30px 78px rgba(32,33,36,0.24)',\n                  padding: Math.max(32, Math.round(width * 0.024)),\n                  boxSizing: 'border-box',\n                  position: 'relative',\n                  overflow: 'hidden',\n                  transform: `scale(${0.92 + clockEntrance * 0.08})`,\n                  opacity: clockEntrance,\n                }}\n              >\n                <div style={{ position: 'absolute', right: -90, top: -90, width: 260, height: 260, borderRadius: '50%', backgroundColor: 'rgba(217,93,57,0.22)' }} />\n                <div\n                  style={{\n                    width: CLOCK_SIZE,\n                    height: CLOCK_SIZE,\n                    borderRadius: '50%',\n                    border: `10px solid ${COLORS.PAPER}`,\n                    position: 'relative',\n                    margin: '0 auto',\n                    backgroundColor: 'rgba(255,255,255,0.08)',\n                  }}\n                >\n                  <div style={{ position: 'absolute', left: '50%', top: '50%', width: 16, height: 16, borderRadius: '50%', backgroundColor: COLORS.ACCENT, transform: 'translate(-50%, -50%)' }} />\n                  <div style={{ position: 'absolute', left: '50%', top: '18%', width: 8, height: '34%', borderRadius: 8, backgroundColor: COLORS.PAPER, transformOrigin: '50% 94%', transform: `translateX(-50%) rotate(${clockHandRotation}deg)` }} />\n                  <div style={{ position: 'absolute', left: '50%', top: '28%', width: 6, height: '24%', borderRadius: 8, backgroundColor: COLORS.ACCENT, transformOrigin: '50% 92%', transform: `translateX(-50%) rotate(${clockHandRotation * 0.55}deg)` }} />\n                </div>\n\n                <div style={{ marginTop: Math.max(28, Math.round(height * 0.028)), textAlign: 'center' }}>\n                  <div style={{ fontSize: Math.max(74, Math.round(width * 0.052)), lineHeight: 0.95, fontWeight: 900, letterSpacing: '-0.07em', color: COLORS.ACCENT }}>\n                    {hoursValue}+\n                  </div>\n                  <div style={{ marginTop: 8, fontSize: Math.max(28, Math.round(width * 0.019)), fontWeight: 850, letterSpacing: '-0.035em' }}>hours / week</div>\n                  <div style={{ marginTop: 12, fontSize: Math.max(18, Math.round(width * 0.0115)), lineHeight: 1.35, color: 'rgba(255,255,255,0.72)', fontWeight: 560 }}>\n                    {HOURS_LABEL_TEXT}\n                  </div>\n                </div>\n\n                <div\n                  style={{\n                    position: 'absolute',\n                    left: Math.max(28, Math.round(width * 0.018)),\n                    right: Math.max(28, Math.round(width * 0.018)),\n                    bottom: Math.max(28, Math.round(height * 0.026)),\n                    borderRadius: 20,\n                    backgroundColor: 'rgba(217,93,57,0.18)',\n                    border: `2px solid rgba(217,93,57,0.45)`,\n                    padding: 18,\n                    boxSizing: 'border-box',\n                    opacity: warningOpacity,\n                    transform: `translateY(${warningTranslate}px)`,\n                    fontSize: Math.max(20, Math.round(width * 0.0125)),\n                    fontWeight: 760,\n                    lineHeight: 1.25,\n                  }}\n                >\n                  More offers = more manual touchpoints, not more hiring conversations.\n                </div>\n              </div>\n            </div>\n          </div>\n      </AbsoluteCenter>\n    </SafeArea>\n  );\n}"

func (l *llmService) GenerateAnimation(
	ctx context.Context,
	req types.GenerateAnimationCodeRequest,
	conversationHistory []types.Message,
	onThinking func(thinking string)) (*types.Union2AskUserQuestionOrGenerateAnimationCodeResponse, error) {
	l.logger.Info("🚀 Starting code generation..")

	thinkingMessages := []string{
		"Understanding the request...",
		"Planning the animation structure...",
		"Sailing...",
		"Organizing...",
		"Finalizing...",
	}

	extractor := l.NewThinkingExtractor(onThinking, thinkingMessages)

	stream, err := baml_client.Stream.GenerateAnimation(ctx, req, conversationHistory,
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

	//var plan types.GeneratedVideoPlan
	//err := json.Unmarshal([]byte(mockGeneratePlanV2ResponseJSON), &plan)
	//if err != nil {
	//	return nil, err
	//}
	//
	//a := types.Union2AskUserQuestionOrGeneratedVideoPlan__NewGeneratedVideoPlan(plan)
	//
	//return &a, nil

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
