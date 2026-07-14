package credits

import "strings"

const (
	DefaultMultiplier   = 5
	DefaultFreeCredits  = 500
	DefaultActionCharge = 30
)

type Pricing struct {
	Provider              string
	Model                 string
	InputCostPer1MTokens  float64 // in dollars
	OutputCostPer1MTokens float64 // in dollars
	CachedCostPer1MTokens float64 // in dollars
}

type ActionConfig struct {
	EstimatedCredits int
	Multiplier       int
	ChargeEnabled    bool
}

var providerPricingRegistry = map[string]Pricing{
	pricingKey("openai", "gpt-4o-mini"): {
		Provider:              "openai",
		Model:                 "gpt-4o-mini",
		InputCostPer1MTokens:  2.40,
		OutputCostPer1MTokens: 8.20,
		CachedCostPer1MTokens: 0.80,
	},
	pricingKey("openai", "gpt-5.5"): {
		Provider:              "openai",
		Model:                 "gpt-5.5",
		InputCostPer1MTokens:  1.90,
		OutputCostPer1MTokens: 6.40,
		CachedCostPer1MTokens: 0.60,
	},
	pricingKey("google-ai", "gemini-3.1-pro-preview"): {
		Provider:              "gemini",
		Model:                 "gemini-3.1-pro-preview",
		InputCostPer1MTokens:  1.35,
		OutputCostPer1MTokens: 5.10,
		CachedCostPer1MTokens: 0.35,
	},
	pricingKey("google-ai", "gemini-3-pro"): {
		Provider:              "gemini",
		Model:                 "gemini-3-pro",
		InputCostPer1MTokens:  1.10,
		OutputCostPer1MTokens: 4.60,
		CachedCostPer1MTokens: 0.25,
	},
}

var actionRegistry = map[Action]ActionConfig{
	ActionScriptGeneration: {
		EstimatedCredits: DefaultActionCharge,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionScenesGeneration: {
		EstimatedCredits: DefaultActionCharge,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionAnimationGeneration: {
		EstimatedCredits: DefaultActionCharge,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionCategorizeScene: {
		EstimatedCredits: DefaultActionCharge,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionVoiceGeneration: {
		EstimatedCredits: DefaultActionCharge,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionAnalyzeImage: {
		EstimatedCredits: DefaultActionCharge,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionExtractTemplateConfig: {
		EstimatedCredits: DefaultActionCharge,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
}

func pricingKey(provider, model string) string {
	provider = strings.ToLower(strings.TrimSpace(provider))
	model = strings.ToLower(strings.TrimSpace(model))

	if provider == "openai-responses" {
		provider = "openai"
	}

	return provider + "::" + model
}

func getPricing(provider, model string) (Pricing, bool) {
	pricing, found := providerPricingRegistry[pricingKey(provider, model)]
	return pricing, found
}

func getActionConfig(action Action) ActionConfig {
	cfg, found := actionRegistry[action]
	if found {
		return cfg
	}

	return ActionConfig{
		EstimatedCredits: DefaultActionCharge,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	}
}
