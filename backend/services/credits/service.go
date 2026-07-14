package credits

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/auth"
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

	usage, err := creditLedgerUsage(input.Usage)
	if err != nil {
		return fmt.Errorf("credit ledger usage: %w", err)
	}
	originalAmount := creditsFromUsage(usage, pricing)
	cfg := getActionConfig(input.Action)
	chargedAmount := originalAmount * cfg.Multiplier
	if !cfg.ChargeEnabled {
		chargedAmount = 0
	}

	metadata := models.CreditLedgerMetadata{
		Provider:   input.Provider,
		Model:      input.Model,
		Usage:      usage,
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

func (s *service) GetRechargeHistory(ctx context.Context, orgID string) ([]*models.CreditLedgerEntry, error) {
	return s.repo.ListCreditLedgerEntries(ctx, orgID)
}

func (s *service) GrantInitialCredits(ctx context.Context, orgID string) error {
	_, err := s.repo.CreateCreditLedgerEntry(ctx, &models.CreditLedgerEntry{
		OrganizationID: orgID,
		Type:           string(LedgerTypeCredit),
		Action:         string(ActionTopUp),
		Cost:           0,
		Amount:         DefaultFreeCredits,
		Metadata:       models.CreditLedgerMetadata{},
	})
	if err != nil {
		return fmt.Errorf("grant initial credits: %w", err)
	}

	return nil
}

func creditLedgerUsage(usage Usage) (models.CreditLedgerUsage, error) {
	if usage == nil {
		return models.CreditLedgerUsage{}, nil
	}

	inputTokens, err := usage.InputTokens()
	if err != nil {
		return models.CreditLedgerUsage{}, fmt.Errorf("input tokens: %w", err)
	}
	outputTokens, err := usage.OutputTokens()
	if err != nil {
		return models.CreditLedgerUsage{}, fmt.Errorf("output tokens: %w", err)
	}
	cachedInputTokens, err := usage.CachedInputTokens()
	if err != nil {
		return models.CreditLedgerUsage{}, fmt.Errorf("cached input tokens: %w", err)
	}

	return models.CreditLedgerUsage{
		InputTokens:       inputTokens,
		OutputTokens:      outputTokens,
		CachedInputTokens: cachedInputTokens,
	}, nil
}

func creditsFromUsage(usage models.CreditLedgerUsage, pricing Pricing) int {
	costUSD := 0.0
	costUSD += (float64(usage.InputTokens) / 1_000_000.0) * pricing.InputCostPer1MTokens
	costUSD += (float64(usage.OutputTokens) / 1_000_000.0) * pricing.OutputCostPer1MTokens
	costUSD += (float64(usage.CachedInputTokens) / 1_000_000.0) * pricing.CachedCostPer1MTokens
	if costUSD <= 0 {
		return 0
	}

	return int(math.Ceil(costUSD * 100))
}

func organizationIDFromContext(ctx context.Context) (string, error) {
	if orgID, ok := ctx.Value(auth.OrgIDKey).(string); ok && orgID != "" {
		return orgID, nil
	}
	return "", ErrMissingOrganizationID
}

func referenceIDFromContext(ctx context.Context) *string {
	if videoID, ok := ctx.Value(auth.VideoIDKey).(string); ok && videoID != "" {
		return &videoID
	}
	if sceneID, ok := ctx.Value(auth.SceneIDKey).(string); ok && sceneID != "" {
		return &sceneID
	}
	return nil
}
