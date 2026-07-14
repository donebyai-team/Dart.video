package psql

import (
	"context"
	"fmt"
	"time"

	"github.com/shank318/coasterai/models"
)

func init() {
	registerFiles([]string{
		"credits/create_credit_ledger_entry.sql",
		"credits/query_available_credits.sql",
		"credits/query_credit_ledger_entries.sql",
	})
}

func (r *Database) CreateCreditLedgerEntry(ctx context.Context, entry *models.CreditLedgerEntry) (*models.CreditLedgerEntry, error) {
	stmt := r.mustGetStmt("credits/create_credit_ledger_entry.sql")

	result := struct {
		ID        string    `db:"id"`
		CreatedAt time.Time `db:"created_at"`
	}{}

	err := stmt.GetContext(ctx, &result, map[string]any{
		"org_id":       entry.OrganizationID,
		"reference_id": entry.ReferenceID,
		"type":         entry.Type,
		"action":       entry.Action,
		"cost":         entry.Cost,
		"amount":       entry.Amount,
		"metadata":     entry.Metadata,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create credit ledger entry: %w", err)
	}

	entry.ID = result.ID
	entry.CreatedAt = result.CreatedAt
	return entry, nil
}

func (r *Database) GetAvailableCredits(ctx context.Context, orgID string, referenceID *string) (int, error) {
	stmt := r.mustGetStmt("credits/query_available_credits.sql")
	available := 0
	err := stmt.GetContext(ctx, &available, map[string]any{
		"org_id":       orgID,
		"reference_id": optionalString(referenceID),
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get available credits: %w", err)
	}

	return available, nil
}

func (r *Database) ListCreditLedgerEntries(ctx context.Context, orgID string, referenceID *string, entryType *string) ([]*models.CreditLedgerEntry, error) {
	return getMany[models.CreditLedgerEntry](ctx, r, "credits/query_credit_ledger_entries.sql", map[string]any{
		"org_id":       orgID,
		"reference_id": optionalString(referenceID),
		"entry_type":   optionalString(entryType),
	})
}

func optionalString(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
