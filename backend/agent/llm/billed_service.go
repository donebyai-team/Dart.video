package llm

import (
	"context"

	"github.com/shank318/coasterai/baml_client"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	creditsvc "github.com/shank318/coasterai/services/credits"
	"go.uber.org/zap"
)

type providerModel struct {
	provider string
	model    string
}

func (l *llmService) chargeUsage(ctx context.Context, logger *zap.Logger, collector baml_client.Collector, target providerModel, action creditsvc.Action) {
	usage, err := collector.Usage()
	if err != nil {
		logger.Error("Failed to get usage information", zap.Error(err))
		return
	}

	if err := l.creditsService.ChargeCredits(ctx, creditsvc.ChargeCreditsInput{
		Provider: target.provider,
		Model:    target.model,
		Usage:    usage,
		Action:   action,
	}); err != nil {
		logger.Error("failed to charge credits", zap.Error(err), zap.String("provider", target.provider), zap.String("model", target.model), zap.String("action", string(action)))
	}
}

func animationProviderModel(options *LLMOptions) providerModel {
	if options != nil && options.Model == pbcore.AIModel_AI_MODEL_GPT_5_5 {
		return providerModel{provider: "openai", model: "gpt-5.5"}
	}
	if options != nil && options.Model == pbcore.AIModel_AI_MODEL_GPT_5_6_SOL {
		return providerModel{provider: "openai", model: "gpt-5.6"}
	}
	return providerModel{provider: "gemini", model: "gemini-3-pro"}
}
