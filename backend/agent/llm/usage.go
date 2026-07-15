package llm

import (
	"context"
	"github.com/shank318/coasterai/models"
	"regexp"

	"github.com/shank318/coasterai/baml_client"
	creditsvc "github.com/shank318/coasterai/services/credits"
	"go.uber.org/zap"
)

func (l *llmService) chargeUsage(ctx context.Context, collector baml_client.Collector, action creditsvc.Action) *models.CreditLedgerEntry {
	usage, err := collector.Usage()
	if err != nil {
		l.logger.Error("Failed to get usage information", zap.Error(err))
		return nil
	}

	var provider, model string

	last, _ := collector.Last()
	if last != nil {
		call, _ := last.SelectedCall()
		if call != nil {
			provider, _ = call.Provider()

			request, _ := call.HttpRequest()
			if request != nil {
				// Try body first.
				if body, err := request.Body(); err == nil && body != nil {
					if jsonBody, err := body.JSON(); err == nil {
						if m, ok := jsonBody.(map[string]any); ok {
							if v, ok := m["model"].(string); ok {
								model = v
							}
						}
					}
				}

				// Fall back to URL.
				if model == "" {
					if url, err := request.Url(); err == nil {
						if matches := regexp.MustCompile(`/models/([^:/?]+)`).FindStringSubmatch(url); len(matches) > 1 {
							model = matches[1]
						}
					}
				}
			}
		}
	}

	entry, err := l.creditsService.ChargeCredits(ctx, creditsvc.ChargeCreditsInput{
		Provider: provider,
		Model:    model,
		Usage:    usage,
		Action:   action,
	})

	if err != nil {
		l.logger.Error("failed to charge credits", zap.Error(err), zap.String("provider", provider), zap.String("model", model), zap.String("action", string(action)))
		return nil
	}

	return entry
}
