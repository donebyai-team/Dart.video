package models

import (
	"database/sql/driver"
	"time"
)

type CreditLedgerEntry struct {
	ID             string               `db:"id"`
	OrganizationID string               `db:"org_id"`
	ReferenceID    *string              `db:"reference_id"`
	Type           string               `db:"type"`
	Action         string               `db:"action"`
	Cost           int                  `db:"cost"`   // cost incurred
	Amount         int                  `db:"amount"` // amount charged after margin
	Metadata       CreditLedgerMetadata `db:"metadata"`
	CreatedAt      time.Time            `db:"created_at"`
}

type CreditLedgerUsage struct {
	InputTokens       int64 `json:"input_tokens"`
	OutputTokens      int64 `json:"output_tokens"`
	CachedInputTokens int64 `json:"cached_input_tokens"`
}

type CreditLedgerMetadata struct {
	Provider   string            `json:"provider"`
	Model      string            `json:"model"`
	Usage      CreditLedgerUsage `json:"usage"`
	Multiplier int               `json:"multiplier"`
}

func (b CreditLedgerMetadata) Value() (driver.Value, error) {
	return valueAsJSON(b, "credits metadata")
}

func (b *CreditLedgerMetadata) Scan(value interface{}) error {
	return scanFromJSON(value, b, "credits metadata")
}
