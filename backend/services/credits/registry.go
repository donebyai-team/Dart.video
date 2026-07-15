package credits

import "strings"

const (
	DefaultMultiplier   = 5
	DefaultFreeCredits  = 500 // 500 credits = 5$
	DefaultActionCharge = 10
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
		InputCostPer1MTokens:  0.15,
		OutputCostPer1MTokens: 0.60,
		CachedCostPer1MTokens: 0.075,
	},
	pricingKey("openai", "gpt-5.6-sol"): {
		Provider:              "openai",
		Model:                 "gpt-5.6-sol",
		InputCostPer1MTokens:  5,
		OutputCostPer1MTokens: 30,
		CachedCostPer1MTokens: 0.50,
	},
	pricingKey("openai", "gpt-5.5"): {
		Provider:              "openai",
		Model:                 "gpt-5.5",
		InputCostPer1MTokens:  5,
		OutputCostPer1MTokens: 30,
		CachedCostPer1MTokens: 0.50,
	},
	pricingKey("google", "gemini-3.1-pro-preview"): {
		Provider:              "google",
		Model:                 "gemini-3.1-pro-preview",
		InputCostPer1MTokens:  2.0,
		OutputCostPer1MTokens: 12.0,
		CachedCostPer1MTokens: 0.20,
	},
	pricingKey("google", "gemini-2.5-flash-lite"): {
		Provider:              "google",
		Model:                 "gemini-2.5-flash-lite",
		InputCostPer1MTokens:  0.10,
		OutputCostPer1MTokens: 0.40,
		CachedCostPer1MTokens: 0.01,
	},
	pricingKey("google", "gemini-3.1-flash-tts-preview"): {
		Provider:              "google",
		Model:                 "gemini-3.1-flash-tts-preview",
		InputCostPer1MTokens:  1.0,
		OutputCostPer1MTokens: 20.0,
		CachedCostPer1MTokens: 0.00,
	},
}

var actionRegistry = map[Action]ActionConfig{
	ActionScriptGeneration: {
		EstimatedCredits: DefaultActionCharge * DefaultMultiplier,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionScenesGeneration: {
		EstimatedCredits: DefaultActionCharge * DefaultMultiplier,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionAnimationGeneration: {
		EstimatedCredits: DefaultActionCharge * DefaultMultiplier,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionCategorizeScene: {
		EstimatedCredits: 1 * DefaultMultiplier,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionVoiceGeneration: {
		EstimatedCredits: DefaultActionCharge * DefaultMultiplier,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionAnalyzeImage: {
		EstimatedCredits: 1 * DefaultMultiplier,
		Multiplier:       DefaultMultiplier,
		ChargeEnabled:    true,
	},
	ActionExtractTemplateConfig: {
		EstimatedCredits: 1 * DefaultMultiplier,
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
	
	if provider == "google-ai" {
		provider = "google"
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
