package brand_identity

import (
	"context"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"google.golang.org/protobuf/types/known/wrapperspb"
	"net/url"
	"strings"
)

const DefaultBackgroundPatternOpacity float32 = 0.3

type BrandIdentity interface {
	CreateBrandIdentity(ctx context.Context, orgID string, website string) (*pbcore.BrandIdentity, error)
	UpdateBrandIdentity(ctx context.Context, orgID string, identity *pbcore.BrandIdentity) error
	GetBrandIdentities(ctx context.Context, orgID string) ([]*pbcore.BrandIdentity, error)
	GetSupportedFonts(ctx context.Context, orgID string) []string
	GetBrandIdentityByID(ctx context.Context, ID string) (*models.BrandIdentity, error)
	GetBrandIdentity(ctx context.Context, ID string) (*models.BrandIdentity, error)
}

type brandIdentity struct {
	db               datastore.Repository
	logger           *zap.Logger
	fireCrawlClient  *Client
	mediaStore       services.MediaStore
	googleFontLoader fontLoader
}

func (b brandIdentity) GetBrandIdentity(ctx context.Context, ID string) (*models.BrandIdentity, error) {
	identity, err := b.db.GetBrandIdentityByID(ctx, ID)
	if err != nil {
		return nil, err
	}
	identity.BrandIdentity.Id = identity.ID
	if identity.BrandIdentity.BgStyle == nil {
		identity.BrandIdentity.BgStyle = GenerateDefaultBackground(identity.BrandIdentity.Colors)
	}
	return identity, nil
}

func ModifyTextColor(colors []*pbcore.BrandColor) []*pbcore.BrandColor {
	textColor := BrandColorTokens(colors)[COLOR_TEXT_PRIMARY]

	// because we are using glow gradient, we need to make sure the text color is dark enough,
	isTextDark := IsDark(textColor)
	if !isTextDark {
		textColor = "#000000"
	}

	// Step 4: update text color
	for _, brandColor := range colors {
		if brandColor.Priority == pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_TEXT_PRIMARY {
			brandColor.ColorHexCode = textColor
		}
	}

	return colors
}

func GenerateDefaultBackground(colors []*pbcore.BrandColor) *pbcore.BackgroundStyle {
	if len(colors) == 0 {
		return nil
	}

	bg := BrandColorTokens(colors)[COLOR_BACKGROUND]
	primary := BrandColorTokens(colors)[COLOR_PRIMARY]
	solidColor := DarkestOrBlack(bg, primary)

	return &pbcore.BackgroundStyle{
		Style: &pbcore.BackgroundStyle_Solid{
			Solid: &pbcore.SolidColor{
				Hex: solidColor,
			},
		},
		Pattern:        pbcore.BackgroundPattern_BACKGROUND_PATTERN_DOTS,
		PatternOpacity: utils.Ptr(DefaultBackgroundPatternOpacity),
		Effect: &pbcore.BackgroundEffect{
			Type: pbcore.BackgroundEffectType_BACKGROUND_EFFECT_TYPE_GLOW,
		},
	}
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
		brandIdentity.Id = existingIdentity.ID
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

	// Generate background style
	brandIdentity.BgStyle = GenerateDefaultBackground(brandIdentity.Colors)
	// Modify text color based on background color
	brandIdentity.Colors = ModifyTextColor(brandIdentity.Colors)

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
			logos = append(logos, createBrandMediaFromAsset(ctx, asset, pbcore.BrandAssetPriority_BRAND_ASSET_PRIORITY_PRIMARY, pbcore.BrandMediaType_BRAND_MEDIA_TYPE_ICON))
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
	identities, err := b.db.GetBrandIdentities(ctx, orgID)
	if err != nil {
		return nil, err
	}
	for _, identity := range identities {
		if identity.BgStyle == nil {
			identity.BgStyle = GenerateDefaultBackground(identity.Colors)
		}
	}
	return identities, nil
}
