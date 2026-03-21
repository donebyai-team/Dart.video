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
	assetMapper  map[string]*models.MediaAsset
	identity     *pbcore.BrandIdentity
	assetHandles []string
}

type MediaAssetRegistryBuilder struct {
	registry *MediaAssetRegistry
}

func NewMediaAssetRegistryBuilder() *MediaAssetRegistryBuilder {
	return &MediaAssetRegistryBuilder{
		registry: &MediaAssetRegistry{
			assetMapper:  make(map[string]*models.MediaAsset),
			assetHandles: []string{},
		},
	}
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

func (b *MediaAssetRegistryBuilder) Build() *MediaAssetRegistry {
	return b.registry
}

func (b *MediaAssetRegistryBuilder) addAsset(a *models.MediaAsset) {
	index := len(b.registry.assetHandles)

	handleID := fmt.Sprintf(
		"@generated/%s/%d.%s",
		generateRandomID(),
		index,
		a.MediaType.Extension(),
	)

	b.registry.assetMapper[handleID] = a
	b.registry.assetHandles = append(b.registry.assetHandles, handleID)
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

	// ---- Colors ----
	/*
		if len(b.Colors) > 0 {
			writeLine(1, "<colors>")
			for _, c := range b.Colors {
				if c.Priority == pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_UNSPECIFIED {
					writeLine(2, "<color>%s</color>", c.ColorHexCode)
				} else {
					writeLine(2, "<color priority=\"%s\">%s</color>", c.Priority.String(), c.ColorHexCode)
				}
			}
			writeLine(1, "</colors>")
		}
	*/

	// ---- Fonts ----
	/*
		if len(b.Fonts) > 0 {
			writeLine(1, "<fonts>")
			for _, f := range b.Fonts {
				if f.GoogleFontsName != nil && f.GoogleFontsName.Value != "" {
					writeLine(2, "<font>%s</font>", f.GoogleFontsName.Value)
				}
			}
			writeLine(1, "</fonts>")
		}
	*/

	writeLine(0, "</brand_details>")

	return utils.Ptr(sb.String())
}

func (registry *MediaAssetRegistry) FormatAssets() *string {
	if registry.assetMapper == nil || len(registry.assetMapper) == 0 {
		return nil
	}
	var sb strings.Builder

	writeLine := func(indent int, format string, args ...interface{}) {
		sb.WriteString(strings.Repeat("  ", indent))
		sb.WriteString(fmt.Sprintf(format, args...))
		sb.WriteString("\n")
	}
	writeLine(0, "<attachments>")

	for _, handle := range registry.assetHandles {
		asset := registry.assetMapper[handle]
		if asset == nil {
			continue
		}

		writeLine(1, "<attachment>")
		writeLine(2, "<handle>%s</handle>", handle)
		writeLine(2, "<width>%d</width>", asset.Metadata.Width)
		writeLine(2, "<height>%d</height>", asset.Metadata.Height)
		writeLine(2, "<media_type>%s</media_type>", asset.MediaType.String())
		writeLine(2, "<mime_type>%s</mime_type>", asset.MimeType)
		writeLine(2, "<description>%s</description>", asset.Description)
		writeLine(2, "<tags>%s</tags>", asset.Tags)
		writeLine(2, "<user_note>%s</user_note>", asset.UserNote)
		writeLine(1, "</attachment>")
	}

	writeLine(0, "</attachments>")

	return utils.Ptr(sb.String())
}
