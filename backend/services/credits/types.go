package credits

import (
	"context"
	"errors"
	"github.com/shank318/coasterai/models"
)

type Action string

type LedgerType string

const (
	ActionScriptGeneration      Action = "SCRIPT_GENERATION"
	ActionScenesGeneration      Action = "SCENES_GENERATION"
	ActionAnimationGeneration   Action = "ANIMATION_GENERATION"
	ActionCategorizeScene       Action = "CATEGORIZE_SCENE"
	ActionVoiceGeneration       Action = "VOICE_GENERATION"
	ActionAnalyzeImage          Action = "ANALYZE_IMAGE"
	ActionExtractTemplateConfig Action = "EXTRACT_TEMPLATE_CONFIG"
	ActionTopUp                 Action = "TOP_UP"
)

const (
	LedgerTypeCredit LedgerType = "CREDIT"
	LedgerTypeDebit  LedgerType = "DEBIT"
)

var ErrMissingOrganizationID = errors.New("missing organization id")

type Service interface {
	ChargeCredits(ctx context.Context, input ChargeCreditsInput) error
	GetAvailableCredits(ctx context.Context, orgID string, referenceID *string) (int, error)
	GetEstimatedCredits(actions []Action) int
	GetRechargeHistory(ctx context.Context, orgID string) ([]*models.CreditLedgerEntry, error)
	GrantInitialCredits(ctx context.Context, orgID string) error
}

type Usage interface {
	InputTokens() (int64, error)
	OutputTokens() (int64, error)
	CachedInputTokens() (int64, error)
}

type usage struct {
	inputTokens       int64
	outputTokens      int64
	cachedInputTokens int64
}

func NewUsage(inputTokens, outputTokens, cachedInputTokens int64) Usage {
	return usage{inputTokens: inputTokens, outputTokens: outputTokens, cachedInputTokens: cachedInputTokens}
}

func (u usage) InputTokens() (int64, error) {
	return u.inputTokens, nil
}

func (u usage) OutputTokens() (int64, error) {
	return u.outputTokens, nil
}

func (u usage) CachedInputTokens() (int64, error) {
	return u.cachedInputTokens, nil
}

type ChargeCreditsInput struct {
	Provider string
	Model    string
	Usage    Usage
	Action   Action
}
