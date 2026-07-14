package credits

import (
	"context"
	"errors"
	baml "github.com/boundaryml/baml/engine/language_client_go/pkg"
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
	GetRechargeHistory(ctx context.Context, orgID string, referenceID *string) ([]*models.CreditLedgerEntry, error)
	GrantInitialCredits(ctx context.Context, orgID string) error
}

type ChargeCreditsInput struct {
	Provider string
	Model    string
	Usage    baml.Usage
	Action   Action
}
