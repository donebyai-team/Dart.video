package services

import (
	"context"
	"fmt"
	"github.com/mendableai/firecrawl-go/v2"
	"github.com/shank318/coasterai/datastore"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"go.uber.org/zap"
	"net/url"
	"strings"
)

type BrandIdentity interface {
	CreateBrandIdentity(ctx context.Context, orgID string, website string) (*pbcore.BrandIdentity, error)
	UpdateBrandIdentity(ctx context.Context, orgID string, identity *pbcore.BrandIdentity) error
	GetBrandIdentities(ctx context.Context, orgID string) ([]*pbcore.BrandIdentity, error)
}

type brandIdentity struct {
	db         datastore.Repository
	logger     *zap.Logger
	app        *firecrawl.FirecrawlApp
	mediaStore MediaStore
}

func NewBrandIdentityService(db datastore.Repository, mediaStore MediaStore, fireCrawlAPIKey string) BrandIdentity {
	app, err := firecrawl.NewFirecrawlApp(fireCrawlAPIKey, "")
	if err != nil {
		panic(err)
	}
	return &brandIdentity{db: db, app: app, mediaStore: mediaStore}
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

	scrappedData, err := b.app.ScrapeURL(website, &firecrawl.ScrapeParams{
		Formats: []string{"branding"},
	})
	if err != nil {
		return nil, fmt.Errorf("failed to scrape url: %w", err)
	}

	fmt.Println(scrappedData)

	brandIdentity := &pbcore.BrandIdentity{
		Name: identityName,
	}

	return b.db.CreateBrandIdentity(ctx, orgID, brandIdentity)
}

func (b brandIdentity) UpdateBrandIdentity(ctx context.Context, orgID string, identity *pbcore.BrandIdentity) error {
	return b.db.UpdateBrandIdentity(ctx, orgID, identity)
}

func (b brandIdentity) GetBrandIdentities(ctx context.Context, orgID string) ([]*pbcore.BrandIdentity, error) {
	return b.db.GetBrandIdentities(ctx, orgID)
}
