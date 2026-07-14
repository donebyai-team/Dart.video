package credits

import (
	"context"
	"fmt"
	baml "github.com/boundaryml/baml/engine/language_client_go/pkg"
	"github.com/shank318/coasterai/agent/common"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	"go.uber.org/zap"
	"math"
)

type service struct {
	logger *zap.Logger
	repo   datastore.Repository
}

func NewService(repo datastore.Repository, logger *zap.Logger) Service {
	return &service{repo: repo, logger: logger.Named("credits")}
}

func (s *service) ChargeCredits(ctx context.Context, input ChargeCreditsInput) error {
	orgID, err := organizationIDFromContext(ctx)
	if err != nil {
		return err
	}

	pricing, found := getPricing(input.Provider, input.Model)
	if !found {
		return fmt.Errorf("pricing not found for provider=%s model=%s", input.Provider, input.Model)
	}

	originalAmount, err := creditsFromUsage(input.Usage, pricing)
	if err != nil {
		return fmt.Errorf("credits from usage: %w", err)
	}
	cfg := getActionConfig(input.Action)
	chargedAmount := originalAmount * cfg.Multiplier
	if !cfg.ChargeEnabled {
		chargedAmount = 0
	}

	metadata := models.CreditLedgerMetadata{
		Provider:   input.Provider,
		Model:      input.Model,
		Usage:      input.Usage,
		Multiplier: cfg.Multiplier,
	}

	_, err = s.repo.CreateCreditLedgerEntry(ctx, &models.CreditLedgerEntry{
		OrganizationID: orgID,
		ReferenceID:    referenceIDFromContext(ctx),
		Type:           string(LedgerTypeDebit),
		Action:         string(input.Action),
		Cost:           originalAmount,
		Amount:         -chargedAmount,
		Metadata:       metadata,
	})
	if err != nil {
		return fmt.Errorf("create credit ledger debit entry: %w", err)
	}

	return nil
}

func (s *service) GetAvailableCredits(ctx context.Context, orgID string, referenceID *string) (int, error) {
	return s.repo.GetAvailableCredits(ctx, orgID, referenceID)
}

func (s *service) GetEstimatedCredits(actions []Action) int {
	total := 0
	for _, action := range actions {
		total += getActionConfig(action).EstimatedCredits
	}
	return total
}

func (s *service) GetRechargeHistory(ctx context.Context, orgID string, referenceID *string) ([]*models.CreditLedgerEntry, error) {
	entryType := string(LedgerTypeCredit)
	return s.repo.ListCreditLedgerEntries(ctx, orgID, referenceID, &entryType)
}

func (s *service) GrantInitialCredits(ctx context.Context, orgID string) error {
	_, err := s.repo.CreateCreditLedgerEntry(ctx, &models.CreditLedgerEntry{
		OrganizationID: orgID,
		Type:           string(LedgerTypeCredit),
		Action:         string(ActionScriptGeneration),
		Cost:           0,
		Amount:         DefaultFreeCredits,
		Metadata:       models.CreditLedgerMetadata{},
	})
	if err != nil {
		return fmt.Errorf("grant initial credits: %w", err)
	}

	return nil
}

func creditsFromUsage(usage baml.Usage, pricing Pricing) (int, error) {
	if usage == nil {
		return 0, nil
	}

	inputTokens, err := usage.InputTokens()
	if err != nil {
		return 0, fmt.Errorf("input tokens: %w", err)
	}
	outputTokens, err := usage.OutputTokens()
	if err != nil {
		return 0, fmt.Errorf("output tokens: %w", err)
	}
	cachedInputTokens, err := usage.CachedInputTokens()
	if err != nil {
		return 0, fmt.Errorf("cached input tokens: %w", err)
	}

	costUSD := 0.0
	costUSD += (float64(inputTokens) / 1_000_000.0) * pricing.InputCostPer1MTokens
	costUSD += (float64(outputTokens) / 1_000_000.0) * pricing.OutputCostPer1MTokens
	costUSD += (float64(cachedInputTokens) / 1_000_000.0) * pricing.CachedCostPer1MTokens
	if costUSD <= 0 {
		return 0, nil
	}

	return int(math.Ceil(costUSD * 100)), nil
}

func organizationIDFromContext(ctx context.Context) (string, error) {
	if orgID, ok := ctx.Value(common.OrgIDKey).(string); ok && orgID != "" {
		return orgID, nil
	}
	return "", ErrMissingOrganizationID
}

func referenceIDFromContext(ctx context.Context) *string {
	if videoID, ok := ctx.Value(common.VideoIDKey).(string); ok && videoID != "" {
		return &videoID
	}
	if sceneID, ok := ctx.Value(common.SceneIDKey).(string); ok && sceneID != "" {
		return &sceneID
	}
	return nil
}
