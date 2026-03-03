package psql

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
)

func init() {
	registerFiles([]string{
		"brand_identity/create_brand_identity.sql",
		"brand_identity/update_brand_identity.sql",
		"brand_identity/query_by_domain.sql",
		"brand_identity/query_brand_identities_by_org.sql",
	})
}

func (r *Database) GetBrandIdentityByDomain(ctx context.Context, orgID string, domain string) (*models.BrandIdentity, error) {
	brandIdentity, err := getOne[models.BrandIdentity](ctx, r, "brand_identity/query_by_domain.sql", map[string]any{
		"organization_id": orgID,
		"domain":          domain,
	})
	if err != nil {
		return nil, err
	}
	return brandIdentity, nil
}

func (r *Database) CreateBrandIdentity(ctx context.Context, orgID string, identity *pbcore.BrandIdentity) (*pbcore.BrandIdentity, error) {
	stmt := r.mustGetStmt("brand_identity/create_brand_identity.sql")
	var id string

	err := stmt.GetContext(ctx, &id, map[string]interface{}{
		"name":            identity.Name,
		"domain":          identity.WebsiteUrl,
		"identity":        identity,
		"organization_id": orgID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create brand identity: %w", err)
	}
	identity.Id = id
	return identity, nil
}

func (r *Database) UpdateBrandIdentity(ctx context.Context, orgID string, identity *pbcore.BrandIdentity) error {
	stmt := r.mustGetStmt("brand_identity/update_brand_identity.sql")
	_, err := stmt.ExecContext(ctx, map[string]interface{}{
		"identity":        identity,
		"organization_id": orgID,
		"name":            identity.Name,
		"id":              identity.Id,
	})
	if err != nil {
		return fmt.Errorf("failed to update brand identity %q: %w", identity.Id, err)
	}
	return nil
}

func (r *Database) GetBrandIdentities(ctx context.Context, organizationID string) ([]*pbcore.BrandIdentity, error) {
	brandIdentities, err := getMany[models.BrandIdentity](ctx, r, "brand_identity/query_brand_identities_by_org.sql", map[string]any{
		"organization_id": organizationID,
	})
	if err != nil {
		return nil, err
	}

	identities := make([]*pbcore.BrandIdentity, 0, len(brandIdentities))
	for _, brandIdentity := range brandIdentities {
		pbIdentity := brandIdentity.BrandIdentity
		pbIdentity.Id = brandIdentity.ID
		identities = append(identities, pbIdentity)
	}

	return identities, nil
}
