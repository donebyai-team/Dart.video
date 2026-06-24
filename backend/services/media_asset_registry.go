package services

import (
	"fmt"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"math/rand"
	"strings"
	"time"
)

type MediaAssetRegistry struct {
	assetMapper       map[string]*models.MediaAsset
	identity          *pbcore.BrandIdentity
	assetHandles      []string
	brandAssetHandles []string
	fieldValueMapper  map[string]string
}

type MediaAssetRegistryBuilder struct {
	registry *MediaAssetRegistry
}

func NewMediaAssetRegistryBuilder() *MediaAssetRegistryBuilder {
	return &MediaAssetRegistryBuilder{
		registry: &MediaAssetRegistry{
			assetMapper:       make(map[string]*models.MediaAsset),
			assetHandles:      []string{},
			brandAssetHandles: []string{},
			fieldValueMapper:  make(map[string]string),
		},
	}
}

func NewMediaAssetRegistryBuilderFromExisting(registry *MediaAssetRegistry) *MediaAssetRegistryBuilder {
	return &MediaAssetRegistryBuilder{
		registry: registry,
	}
}

func (registry *MediaAssetRegistry) AddFieldValueMapping(key string, value string) {
	registry.fieldValueMapper[key] = value
}

func (registry *MediaAssetRegistry) GetResolvedFieldValue(key string) string {
	return registry.fieldValueMapper[key]
}

func (registry *MediaAssetRegistry) GetBrandColors() []*pbcore.BrandColor {
	if registry.GetIdentity() == nil ||
		len(registry.GetIdentity().Colors) == 0 {
		return nil
	}

	return registry.GetIdentity().Colors
}

func (b *MediaAssetRegistryBuilder) WithBrandIdentity(identity *pbcore.BrandIdentity) *MediaAssetRegistryBuilder {
	b.registry.identity = identity

	if identity == nil {
		return b
	}

	return b
}

func (b *MediaAssetRegistryBuilder) AddAssets(assets []*models.MediaAsset) *MediaAssetRegistryBuilder {
	for _, a := range assets {
		b.addAsset(a)
	}
	return b
}

func (b *MediaAssetRegistryBuilder) AddAndFormatAssets(assets []*models.MediaAsset) *string {
	handleIDs := make([]string, 0, len(assets))
	for _, a := range assets {
		handleIDs = append(handleIDs, b.addAsset(a))
	}

	return utils.Ptr(b.registry.toAttachment(handleIDs))
}

func (b *MediaAssetRegistryBuilder) WithBrandAssets() *MediaAssetRegistryBuilder {
	if b.registry.identity == nil {
		panic("WithBrandAssets requires identity")
	}
	// update registry
	for _, logo := range b.registry.identity.Logos {
		index := len(b.registry.brandAssetHandles)
		a := logo.Asset

		handleID := fmt.Sprintf(
			"@brand/%s/%d.%s",
			generateRandomID(),
			index,
			a.MediaType.Extension(),
		)

		model := &models.MediaAsset{
			ID:        a.Id,
			Path:      a.Url,
			MimeType:  a.MediaType.Extension(),
			MediaType: a.MediaType,
			Metadata: models.AssetMetadata{
				Width:    int(a.Width),
				Height:   int(a.Height),
				FileName: a.FileName,
				Duration: float64(a.Duration),
				Size:     int64(a.Size),
			},
			Description: "brand logo",
		}

		if logo.Type == pbcore.BrandMediaType_BRAND_MEDIA_TYPE_ICON {
			model.Description = "brand icon"
		}

		b.registry.assetMapper[handleID] = model
		b.registry.brandAssetHandles = append(b.registry.brandAssetHandles, handleID)
	}

	return b
}

func (b *MediaAssetRegistryBuilder) Build() *MediaAssetRegistry {
	return b.registry
}

func (b *MediaAssetRegistryBuilder) addAsset(a *models.MediaAsset) string {
	index := len(b.registry.assetHandles)

	handleID := fmt.Sprintf(
		"@asset/%s/%d.%s",
		generateRandomID(),
		index,
		a.MediaType.Extension(),
	)

	b.registry.assetMapper[handleID] = a
	b.registry.assetHandles = append(b.registry.assetHandles, handleID)
	return handleID
}

func generateRandomID() string {
	const letters = "abcdefghijklmnopqrstuvwxyzx"
	rand.Seed(time.Now().UnixNano())
	id := make([]byte, 6)
	for i := range id {
		id[i] = letters[rand.Intn(len(letters))]
	}
	return string(id)
}

func (registry *MediaAssetRegistry) GetIdentity() *pbcore.BrandIdentity {
	return registry.identity
}

func (registry *MediaAssetRegistry) GetAssetHandles() []string {
	return registry.assetHandles
}

func (registry *MediaAssetRegistry) ResolveMediaHandles(code string) string {
	replacements := make([]string, 0, len(registry.assetMapper)*4)

	for handleID, asset := range registry.assetMapper {
		if asset == nil || asset.Path == "" {
			continue
		}

		// Handle <@generated/...>
		replacements = append(replacements, "<"+handleID+">", asset.Path)

		// Handle @generated/...
		replacements = append(replacements, handleID, asset.Path)
	}

	replacer := strings.NewReplacer(replacements...)
	return replacer.Replace(code)
}

func (registry *MediaAssetRegistry) GetAssetFromHandle(handleID string) *models.MediaAsset {
	asset, ok := registry.assetMapper[handleID]
	if !ok {
		return nil
	}
	return asset
}

func (registry *MediaAssetRegistry) FormatBrandTokens() *string {
	if registry.identity == nil {
		return nil
	}

	b := registry.identity
	var sb strings.Builder

	writeLine := func(indent int, format string, args ...interface{}) {
		sb.WriteString(strings.Repeat("  ", indent))
		sb.WriteString(fmt.Sprintf(format, args...))
		sb.WriteString("\n")
	}

	writeLine(0, "<brand_tokens>")

	if len(b.Colors) > 0 {
		writeLine(1, "<colors>")

		for _, c := range b.Colors {
			if c.ColorHexCode == "" {
				continue
			}

			switch c.Priority {
			case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY:
				writeLine(2, "<primary>%s</primary>", c.ColorHexCode)

			case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_SECONDARY:
				writeLine(2, "<secondary>%s</secondary>", c.ColorHexCode)

			//case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_ACCENT:
			//	writeLine(2, "<accent>%s</accent>", c.ColorHexCode)
			//
			//case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_BACKGROUND:
			//	writeLine(2, "<background>%s</background>", c.ColorHexCode)

			case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY:
				writeLine(2, "<text_foreground>%s</text_foreground>", c.ColorHexCode)

				//case pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_SECONDARY:
				//	writeLine(2, "<text_secondary>%s</text_secondary>", c.ColorHexCode)
			}
		}

		writeLine(1, "</colors>")
	}

	writeLine(0, "</brand_tokens>")

	return utils.Ptr(sb.String())
}

func (registry *MediaAssetRegistry) FormatBrandDetails() *string {
	if registry.identity == nil {
		return nil
	}
	b := registry.identity
	var sb strings.Builder

	writeLine := func(indent int, format string, args ...interface{}) {
		sb.WriteString(strings.Repeat("  ", indent))
		sb.WriteString(fmt.Sprintf(format, args...))
		sb.WriteString("\n")
	}

	writeLine(0, "<brand_details>")

	writeLine(1, "<name>%s</name>", b.Name)

	if b.Tagline != nil && b.Tagline.Value != "" {
		writeLine(1, "<tagline>%s</tagline>", b.Tagline.Value)
	}

	if b.Description != nil && b.Description.Value != "" {
		writeLine(1, "<description>%s</description>", b.Description.Value)
	}

	if b.WebsiteUrl != "" {
		writeLine(1, "<website>%s</website>", b.WebsiteUrl)
	}

	attachments := registry.toAttachment(registry.brandAssetHandles)
	if attachments != "" {
		writeLine(1, "%s", attachments)
	}

	writeLine(0, "</brand_details>")

	return utils.Ptr(sb.String())
}

func (registry *MediaAssetRegistry) toAttachment(handles []string) string {
	if len(handles) == 0 {
		return ""
	}
	var sb strings.Builder

	writeLine := func(indent int, format string, args ...interface{}) {
		sb.WriteString(strings.Repeat("  ", indent))
		sb.WriteString(fmt.Sprintf(format, args...))
		sb.WriteString("\n")
	}
	writeLine(0, "<attachments>")

	for _, handle := range handles {
		asset := registry.assetMapper[handle]
		if asset == nil {
			continue
		}

		writeLine(1, "<attachment>")
		writeLine(2, "<url>%s</url>", handle)
		writeLine(2, "<width>%d</width>", asset.Metadata.Width)
		writeLine(2, "<height>%d</height>", asset.Metadata.Height)
		writeLine(2, "<media_type>%s</media_type>", asset.MediaType.String())
		writeLine(2, "<mime_type>%s</mime_type>", asset.MimeType)
		if asset.Metadata.Duration > 0 {
			writeLine(2, "<duration>%.2f</duration>", asset.Metadata.Duration)
		}
		if asset.Description != "" {
			writeLine(2, "<description>%s</description>", asset.Description)
		}
		if len(asset.Tags) > 0 {
			writeLine(2, "<tags>%s</tags>", asset.Tags)
		}

		if asset.UserNote != "" {
			writeLine(2, "<user_note>%s</user_note>", asset.UserNote)
		}
		writeLine(1, "</attachment>")
	}

	writeLine(0, "</attachments>")
	return sb.String()
}

func (registry *MediaAssetRegistry) FormatAssets() *string {
	if registry.assetMapper == nil || len(registry.assetMapper) == 0 {
		return nil
	}

	return utils.Ptr(registry.toAttachment(registry.assetHandles))
}
