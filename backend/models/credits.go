package models

import (
	"database/sql/driver"
	baml "github.com/boundaryml/baml/engine/language_client_go/pkg"
	"time"
)

type CreditLedgerEntry struct {
	ID             string               `db:"id"`
	OrganizationID string               `db:"org_id"`
	ReferenceID    *string              `db:"reference_id"`
	Type           string               `db:"type"`
	Action         string               `db:"action"`
	Cost           int                  `db:"cost"`
	Amount         int                  `db:"amount"`
	Metadata       CreditLedgerMetadata `db:"metadata"`
	CreatedAt      time.Time            `db:"created_at"`
}

type CreditLedgerMetadata struct {
	Provider   string     `json:"provider"`
	Model      string     `json:"model"`
	Usage      baml.Usage `json:"usage"`
	Multiplier int        `json:"multiplier"`
}

func (b CreditLedgerMetadata) Value() (driver.Value, error) {
	return valueAsJSON(b, "credits metadata")
}

func (b *CreditLedgerMetadata) Scan(value interface{}) error {
	return scanFromJSON(value, b, "credits metadata")
}
