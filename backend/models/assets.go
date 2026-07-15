package models

import (
	"database/sql/driver"
	"encoding/base64"
	"fmt"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"io"
	"net/http"
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

func (a MediaAsset) ToImage() (types.Image, error) {
	resp, err := http.Get(a.Path)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch image: %s", resp.Status)
	}

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	toString := base64.StdEncoding.EncodeToString(data)

	return baml_client.NewImageFromBase64(toString, utils.Ptr(a.MimeType))
}

func (asset MediaAsset) ToProto() *pbcore.MediaAsset {
	return &pbcore.MediaAsset{
		Url:       asset.Path,
		Width:     float32(asset.Metadata.Width),
		Height:    float32(asset.Metadata.Height),
		MimeType:  asset.MimeType,
		Size:      float32(asset.Metadata.Size),
		FileId:    asset.Metadata.FileName,
		FileName:  asset.Metadata.FileName,
		Id:        asset.ID,
		MediaType: asset.MediaType,
		Duration:  float32(asset.Metadata.Duration),
	}
}

type AssetMetadata struct {
	Width    int     `json:"width"`
	Height   int     `json:"height"`
	FileName string  `json:"fileName"`
	Duration float64 `json:"duration"`
	Size     int64   `json:"size"`
}

func (v AssetMetadata) Value() (driver.Value, error) {
	return valueAsJSON(v, "AssetMetadata metadata")
}

func (b *AssetMetadata) Scan(value interface{}) error {
	return scanFromJSON(value, b, "AssetMetadata feature flags")
}
