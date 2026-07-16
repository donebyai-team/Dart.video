package llm

import (
	"context"
	"encoding/json"
	"errors"
	baml "github.com/boundaryml/baml/engine/language_client_go/pkg"
	"github.com/shank318/coasterai/models"
	"github.com/shank318/coasterai/services/providers"
	"google.golang.org/genai"
	"strings"

	"github.com/shank318/coasterai/baml_client"
	creditsvc "github.com/shank318/coasterai/services/credits"
	"go.uber.org/zap"
)

func extractUsageFromGemini(call baml.LLMCall) (*genai.GenerateContentResponse, error) {
	var text string

	if streamCall, ok := call.(baml.LLMStreamCall); ok {
		chunks, err := streamCall.SSEChunks()
		if err != nil {
			return nil, err
		}
		if len(chunks) == 0 {
			return nil, errors.New("gemini stream returned no SSE chunks")
		}

		// Gemini usage metadata is emitted in the final SSE event.
		text, err = chunks[len(chunks)-1].Text()
		if err != nil {
			return nil, err
		}
	} else {
		response, err := call.HttpResponse()
		if err != nil {
			return nil, err
		}
		if response == nil {
			return nil, errors.New("gemini call returned nil HTTP response")
		}

		body, err := response.Body()
		if err != nil {
			return nil, err
		}
		if body == nil {
			return nil, errors.New("gemini response body is nil")
		}

		text, err = body.Text()
		if err != nil {
			return nil, err
		}
	}

	var geminiResp genai.GenerateContentResponse
	if err := json.Unmarshal([]byte(text), &geminiResp); err != nil {
		return nil, err
	}

	return &geminiResp, nil
}

// TODO: Have an adapter per provider to extract usage from the LLM call.
func (l *llmService) chargeUsage(ctx context.Context, collector baml_client.Collector, action creditsvc.Action) *models.CreditLedgerEntry {
	usage, err := collector.Usage()
	if err != nil {
		l.logger.Error("Failed to get usage information", zap.Error(err))
		return nil
	}

	var provider, model string
	var creditsUsage creditsvc.Usage = usage

	last, _ := collector.Last()
	if last != nil {
		call, _ := last.SelectedCall()
		if call != nil {
			provider, _ = call.Provider()

			if strings.Contains(provider, "google") {
				if geminiResp, err := extractUsageFromGemini(call); err != nil {
					l.logger.Warn("failed to extract gemini usage metadata", zap.Error(err))
				} else {
					model = geminiResp.ModelVersion
					if geminiUsage := providers.ProcessGeminiUsage(geminiResp.UsageMetadata); geminiUsage != nil {
						creditsUsage = geminiUsage
					}
				}
			}

			// Extract model from request, non-gemini calls.
			request, _ := call.HttpRequest()
			if request != nil && model == "" {
				// Try body first., don't use body.JSON() it panic, baml bug
				if body, err := request.Body(); err == nil && body != nil {
					if text, err := body.Text(); err == nil {
						var payload struct {
							Model string `json:"model"`
						}
						if err := json.Unmarshal([]byte(text), &payload); err == nil {
							model = payload.Model
						}
					}
				}
			}
		}
	}

	entry, err := l.creditsService.ChargeCredits(ctx, creditsvc.ChargeCreditsInput{
		Provider: provider,
		Model:    model,
		Usage:    creditsUsage,
		Action:   action,
	})

	if err != nil {
		l.logger.Error("failed to charge credits", zap.Error(err), zap.String("provider", provider), zap.String("model", model), zap.String("action", string(action)))
		return nil
	}

	return entry
}
