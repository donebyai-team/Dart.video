package brand_identity

import (
	"context"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/wrapperspb"
	"math/rand"
	"net/url"
	"strings"
	"time"
)

type BrandIdentity interface {
	CreateBrandIdentity(ctx context.Context, orgID string, website string) (*pbcore.BrandIdentity, error)
	UpdateBrandIdentity(ctx context.Context, orgID string, identity *pbcore.BrandIdentity) error
	GetBrandIdentities(ctx context.Context, orgID string) ([]*pbcore.BrandIdentity, error)
	GetSupportedFonts(ctx context.Context, orgID string) []string
	GetBrandIdentityByID(ctx context.Context, ID string) (*models.BrandIdentity, error)
	GetBrandIdentity(ctx context.Context, ID string) (*BrandIdentityRegistry, error)
}

type brandIdentity struct {
	db               datastore.Repository
	logger           *zap.Logger
	fireCrawlClient  *Client
	mediaStore       services.MediaStore
	googleFontLoader fontLoader
}

func (b brandIdentity) GetBrandIdentity(ctx context.Context, ID string) (*BrandIdentityRegistry, error) {
	brandIdentity, err := b.db.GetBrandIdentityByID(ctx, ID)
	if err != nil {
		return nil, err
	}
	brandIdentity.BrandIdentity.Id = brandIdentity.ID
	return NewBrandIdentityRegistry(brandIdentity.BrandIdentity), nil
}

func (b brandIdentity) GetBrandIdentityByID(ctx context.Context, ID string) (*models.BrandIdentity, error) {
	return b.db.GetBrandIdentityByID(ctx, ID)
}

func (b brandIdentity) GetSupportedFonts(ctx context.Context, orgID string) []string {
	fonts := make([]string, 0, len(b.googleFontLoader.fontMap))

	for _, v := range b.googleFontLoader.fontMap {
		fonts = append(fonts, v)
	}
	return fonts
}

func NewBrandIdentityService(
	logger *zap.Logger,
	db datastore.Repository,
	mediaStore services.MediaStore,
	fireCrawlAPIKey string) BrandIdentity {
	client, err := NewClient(fireCrawlAPIKey, DefaultBaseURL)
	if err != nil {
		panic(err)
	}

	return &brandIdentity{
		db:               db,
		fireCrawlClient:  client,
		mediaStore:       mediaStore,
		logger:           logger,
		googleFontLoader: newGoogleFontLoader(logger),
	}
}

func extractDomain(rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}

	host := parsed.Hostname()
	host = strings.TrimPrefix(host, "www.")

	return host, nil
}

func (b brandIdentity) CreateBrandIdentity(ctx context.Context, orgID string, website string) (*pbcore.BrandIdentity, error) {
	identityName, err := extractDomain(website)
	if err != nil {
		return nil, fmt.Errorf("failed to extract domain: %w", err)
	}

	existingIdentity, err := b.db.GetBrandIdentityByDomain(ctx, orgID, identityName)
	if err != nil {
		if !errors.Is(err, datastore.NotFound) {
			return nil, err
		}
	}

	var brandIdentity *pbcore.BrandIdentity
	if existingIdentity == nil {
		brandIdentity = &pbcore.BrandIdentity{
			Name:       identityName,
			WebsiteUrl: identityName,
		}
	} else {
		brandIdentity = existingIdentity.BrandIdentity
	}

	maxTimeout := 300000 // 5 minutes, Firecrawl's maximum
	req := ScrapeRequest{
		URL: website,
		Formats: []Format{
			{Type: "branding"},
		},
		Timeout: &maxTimeout,
	}

	resp, err := b.fireCrawlClient.Scrape(ctx, req)
	if err != nil {
		return nil, err
	}

	// Extract title and description from metadata
	if resp.Data.Metadata != nil {
		// Extract title - prefer og:title, fallback to title
		if ogTitle, ok := resp.Data.Metadata["og:title"].(string); ok && ogTitle != "" {
			brandIdentity.Tagline = wrapperspb.String(ogTitle)
		} else if title, ok := resp.Data.Metadata["title"].(string); ok && title != "" {
			brandIdentity.Tagline = wrapperspb.String(title)
		}

		// Extract description - prefer og:description, fallback to description
		if ogDesc, ok := resp.Data.Metadata["og:description"].(string); ok && ogDesc != "" {
			brandIdentity.Description = wrapperspb.String(ogDesc)
		} else if desc, ok := resp.Data.Metadata["description"].(string); ok && desc != "" {
			brandIdentity.Description = wrapperspb.String(desc)
		}
	}

	// Extract colors from branding response
	brandIdentity.Colors = ExtractOrGenerateColors(resp.Data.Branding.Colors)

	// Extract fonts from branding response
	brandIdentity.Fonts = b.extractFonts(resp.Data.Branding.Fonts)

	// Extract additional images (favicon, og:image, logo)
	logos, _ := b.extractMediaImages(ctx, resp.Data.Branding.Images, orgID)
	// Add logos to identity.Logos (append to existing if any)
	if len(logos) > 0 {
		brandIdentity.Logos = logos
	} else {
		brandIdentity.Logos = make([]*pbcore.BrandMedia, 0)
	}

	if existingIdentity != nil {
		err = b.db.UpdateBrandIdentity(ctx, orgID, brandIdentity)
		if err != nil {
			return nil, err
		}
		return brandIdentity, nil
	}

	return b.db.CreateBrandIdentity(ctx, orgID, brandIdentity)
}

// extractMediaImages extracts images from the branding response
// Returns logos and other media separately - logos should be added to identity.Logos, media to identity.Media
// Only processes images with PNG, JPEG, or WebP extensions
func (a brandIdentity) extractMediaImages(ctx context.Context, images map[string]string, orgId string) (logos []*pbcore.BrandMedia, media []*pbcore.BrandMedia) {
	logos = make([]*pbcore.BrandMedia, 0)
	media = make([]*pbcore.BrandMedia, 0)

	// Extract logo (goes to logos, not media)
	if logo, ok := images["logo"]; ok && logo != "" {
		asset, err := a.processImageURL(ctx, logo, orgId)
		if err != nil {
			a.logger.Info("Skipping logo", zap.Error(err), zap.String("logo", logo))
		} else {
			logos = append(logos, createBrandMediaFromAsset(ctx, asset, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY, pbcore.BrandMediaType_BRAND_MEDIA_TYPE_LOGO))
		}
	}

	if logo, ok := images["favicon"]; ok && logo != "" {
		asset, err := a.processImageURL(ctx, logo, orgId)
		if err != nil {
			a.logger.Info("Skipping logo", zap.Error(err), zap.String("logo", logo))
		} else {
			logos = append(logos, createBrandMediaFromAsset(ctx, asset, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY, pbcore.BrandMediaType_BRAND_MEDIA_TYPE_LOGO))
		}
	}

	return logos, media
}

func createBrandMediaFromAsset(_ context.Context, asset *pbcore.MediaAsset, priority pbcore.BrandAssetPriority, mediaType pbcore.BrandMediaType) *pbcore.BrandMedia {
	return &pbcore.BrandMedia{
		Asset:    asset,
		Priority: priority,
		Type:     mediaType,
	}
}

func (a brandIdentity) extractFonts(fonts []FontInfo) []*pbcore.BrandFont {
	result := make([]*pbcore.BrandFont, 0, len(fonts))
	seen := make(map[string]struct{})

	for _, f := range fonts {
		if f.Family == "" {
			continue
		}

		familyLower := strings.ToLower(f.Family)

		if _, exists := seen[familyLower]; exists {
			continue
		}

		googleFontName := a.googleFontLoader.getFont(f.Family)
		if googleFontName == "" {
			// Skip if not found
			a.logger.Info("google font not found, skipping", zap.String("family", f.Family))
			continue
		}

		brandFont := &pbcore.BrandFont{
			Name:            f.Family,
			GoogleFontsName: wrapperspb.String(googleFontName),
		}

		result = append(result, brandFont)
		seen[familyLower] = struct{}{}
	}

	return result
}

func (b brandIdentity) UpdateBrandIdentity(ctx context.Context, orgID string, identity *pbcore.BrandIdentity) error {
	return b.db.UpdateBrandIdentity(ctx, orgID, identity)
}

func (b brandIdentity) GetBrandIdentities(ctx context.Context, orgID string) ([]*pbcore.BrandIdentity, error) {
	return b.db.GetBrandIdentities(ctx, orgID)
}

type BrandIdentityRegistry struct {
	assetMapper  map[string]*pbcore.MediaAsset
	identity     *pbcore.BrandIdentity
	assetHandles []string
}

func (registry *BrandIdentityRegistry) GetIdentity() *pbcore.BrandIdentity {
	return registry.identity
}

func (registry *BrandIdentityRegistry) ResolveMediaHandles(code string) string {
	replacements := make([]string, 0, len(registry.assetMapper)*4)

	for handleID, asset := range registry.assetMapper {
		if asset == nil || asset.Url == "" {
			continue
		}

		// Handle <@generated/...>
		replacements = append(replacements, "<"+handleID+">", asset.Url)

		// Handle @generated/...
		replacements = append(replacements, handleID, asset.Url)
	}

	replacer := strings.NewReplacer(replacements...)
	return replacer.Replace(code)
}

/*
Brand Identity:

	ID: brand_123
	Name: Stripe
	Website: <https://stripe.com>
	Tagline: Payments infrastructure for the internet
	Description: Stripe builds economic infrastructure...
*/
func (registry *BrandIdentityRegistry) FormatBrandDetails() string {
	b := registry.identity
	var sb strings.Builder

	writeLine := func(indent int, format string, args ...interface{}) {
		sb.WriteString(strings.Repeat("  ", indent))
		sb.WriteString(fmt.Sprintf(format, args...))
		sb.WriteString("\n")
	}

	writeLine(0, "Brand Identity:")
	//writeLine(1, "ID: %s", b.Id)
	writeLine(1, "Name: %s", b.Name) // Name is sam as website, skip for now
	//writeLine(1, "Website: <%s>", b.WebsiteUrl)

	if b.Tagline != nil && b.Tagline.Value != "" {
		writeLine(1, "Tagline: %s", b.Tagline.Value)
	}

	if b.Description != nil && b.Description.Value != "" {
		writeLine(1, "Description: %s", b.Description.Value)
	}

	// ---- Colors ----
	//if len(b.Colors) > 0 {
	//	writeLine(1, "Colors:")
	//	for _, c := range b.Colors {
	//		if c.Priority == pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_UNSPECIFIED {
	//			writeLine(2, "- %s", c.ColorHexCode)
	//		} else {
	//			writeLine(2, "- %s (%s)", c.ColorHexCode, c.Priority.String())
	//		}
	//	}
	//}
	//
	//// ---- Fonts ----
	//if len(b.Fonts) > 0 {
	//	writeLine(1, "Fonts:")
	//	for _, f := range b.Fonts {
	//		if f.GoogleFontsName != nil && f.GoogleFontsName.Value != "" {
	//			writeLine(2, "- %s", f.GoogleFontsName.Value)
	//		}
	//	}
	//}

	return sb.String()
}

func NewBrandIdentityRegistry(identity *pbcore.BrandIdentity) *BrandIdentityRegistry {
	registry := &BrandIdentityRegistry{
		identity:     identity,
		assetMapper:  make(map[string]*pbcore.MediaAsset),
		assetHandles: []string{},
	}

	for index, m := range identity.Logos {
		if m.Asset == nil {
			continue
		}

		a := m.Asset

		handleID := fmt.Sprintf(
			"@generated/%s/%d.%s",
			generateRandomID(),
			index,
			a.MediaType.Extension(),
		)

		registry.assetMapper[handleID] = a
		registry.assetHandles = append(registry.assetHandles, handleID)
	}

	return registry
}

/*
		Media:
		 - Type: BRAND_MEDIA_TYPE_LOGO
	   		Priority: BRAND_ASSET_PRIORITY_PRIMARY
	   		URL: <https://cdn.example.com/logo.png>
	   		MIME Type: image/png
	   		Asset Type: MEDIA_TYPE_IMAGE
	   		Dimensions: 1024x256
	   		Render Hint: Use <img> tag
*/
func (registry *BrandIdentityRegistry) FormatBrandAndAssetDetails() string {
	b := registry.identity
	var sb strings.Builder

	sb.WriteString(registry.FormatBrandDetails())

	writeLine := func(indent int, format string, args ...interface{}) {
		sb.WriteString(strings.Repeat("  ", indent))
		sb.WriteString(fmt.Sprintf(format, args...))
		sb.WriteString("\n")
	}

	if len(b.Logos) > 0 {
		writeLine(1, "Media:")

		for index, m := range b.Logos {
			if m.Asset == nil {
				continue
			}

			a := m.Asset
			handleID := registry.assetHandles[index]

			writeLine(2, "- Type: %s", m.Type.String())

			if m.Priority != pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_UNSPECIFIED {
				writeLine(3, "Priority: %s", m.Priority.String())
			}

			writeLine(3, "URL: <%s>", handleID)

			if a.MimeType != "" {
				writeLine(3, "MIME Type: %s", a.MimeType)
			}

			if a.MediaType != pbcore.MediaType_MEDIA_TYPE_UNDEFINED {
				writeLine(3, "Asset Type: %s", a.MediaType.String())
			}

			if a.MediaType == pbcore.MediaType_MEDIA_TYPE_IMAGE {
				if a.Width > 0 && a.Height > 0 {
					writeLine(3, "Dimensions: %.0fx%.0f", a.Width, a.Height)
				}
			}
		}
	}

	return sb.String()
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
