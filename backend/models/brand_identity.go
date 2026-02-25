package models

import (
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"time"
)

type BrandIdentity struct {
	ID             string                `db:"id"`
	Name           string                `db:"name"`
	BrandIdentity  *pbcore.BrandIdentity `db:"identity"`
	OrganizationID string                `db:"organization_id"`
	CreatedAt      time.Time             `db:"created_at"`
	UpdatedAt      *time.Time            `db:"updated_at"`
}
