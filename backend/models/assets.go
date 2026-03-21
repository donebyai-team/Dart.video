package models

import (
	"database/sql/driver"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"time"
)

//go:generate go-enum -f=$GOFILE

// ENUM(GCP)
type MediaAssetProvider string

type MediaAsset struct {
	ID             string             `db:"id"`
	OrganizationID string             `db:"organization_id"`
	Path           string             `db:"path"`
	MimeType       string             `db:"mime_type"`
	MediaType      pbcore.MediaType   `db:"media_type"`
	Provider       MediaAssetProvider `db:"provider"`
	Metadata       AssetMetadata      `db:"metadata"`
	CreatedAt      time.Time          `db:"created_at"`
	UpdatedAt      *time.Time         `db:"updated_at"`

	UserNote    string `db:"-"`
	Description string `db:"-"`
	Tags        string `db:"-"`
}

type AssetMetadata struct {
	Width    int    `json:"width"`
	Height   int    `json:"height"`
	FileName string `json:"fileName"`
	Duration *int   `json:"duration"`
	Size     int64  `json:"size"`
}

func (v AssetMetadata) Value() (driver.Value, error) {
	return valueAsJSON(v, "AssetMetadata metadata")
}

func (b *AssetMetadata) Scan(value interface{}) error {
	return scanFromJSON(value, b, "AssetMetadata feature flags")
}
