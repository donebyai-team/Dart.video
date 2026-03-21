package datastore

import (
	"context"
	"errors"
	"github.com/lib/pq"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
)

var NotFound = errors.New("not found")
var ErrMessageSourceAlreadyExists = errors.New("message source already exists")
var IntegrationNotFoundOrActive = errors.New("integration not found or active")
var AllIntegrationsAccountsBanned = errors.New("integration not found or active")

func IsUniqueViolation(err error) bool {
	if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
		return true
	}
	return false
}

type Repository interface {
	OrganizationRepository
	IntegrationRepository
	UserRepository
	VideoRepository
	TemplateRepository
	BrandIdentityRepository
	MediaAssetRepository
}

type OrganizationRepository interface {
	CreateOrganization(context.Context, *models.Organization) (*models.Organization, error)
	UpdateOrganization(context.Context, *models.Organization) error
	GetOrganizations(context.Context) ([]*models.Organization, error)
	GetOrganizationById(context.Context, string) (*models.Organization, error)
	GetOrganizationByName(context.Context, string) (*models.Organization, error)
	UpdateOrganizationFeatureFlags(ctx context.Context, orgID string, updates map[string]any) error
}

type IntegrationRepository interface {
	UpsertIntegration(ctx context.Context, integration *models.Integration) (*models.Integration, error)
	GetIntegrationByOrgAndType(ctx context.Context, organizationId string, integrationType models.IntegrationType) ([]*models.Integration, error)
	GetIntegrationsByOrgID(ctx context.Context, orgID string) ([]*models.Integration, error)
	GetIntegrationById(ctx context.Context, id string) (*models.Integration, error)
	GetIntegrationsByReferenceId(ctx context.Context, referenceId string) ([]*models.Integration, error)
}

type UserRepository interface {
	CreateUser(ctx context.Context, user *models.User) (*models.User, error)
	UpdateUser(ctx context.Context, user *models.User) error
	GetUserById(ctx context.Context, userID string) (*models.User, error)
	GetUserByAuth0Id(ctx context.Context, auth0ID string) (*models.User, error)
	GetUserByEmail(ctx context.Context, email string) (*models.User, error)
	GetUsersByOrgID(ctx context.Context, orgID string) ([]*models.User, error)
}

type VideoRepository interface {
	CreateVideo(ctx context.Context, video *models.Video) (*models.Video, error)
	UpdateVideo(ctx context.Context, video *models.Video) error
	GetVideoById(ctx context.Context, ID, organizationID string) (*models.Video, error)
	GetVideos(ctx context.Context, organizationID string) ([]*models.Video, error)
	DeleteByID(ctx context.Context, id, organizationID string) error
	UpdateVideoStatus(ctx context.Context, video *models.Video) error
}

type BrandIdentityRepository interface {
	GetBrandIdentityByID(ctx context.Context, ID string) (*models.BrandIdentity, error)
	GetBrandIdentityByDomain(ctx context.Context, orgID string, domain string) (*models.BrandIdentity, error)
	GetBrandIdentities(ctx context.Context, organizationID string) ([]*pbcore.BrandIdentity, error)
	UpdateBrandIdentity(ctx context.Context, orgID string, identity *pbcore.BrandIdentity) error
	CreateBrandIdentity(ctx context.Context, orgID string, identity *pbcore.BrandIdentity) (*pbcore.BrandIdentity, error)
}

type TemplateRepository interface {
	CreateTemplateCategory(ctx context.Context, tc *models.TemplateCategory) (*models.TemplateCategory, error)
	UpdateTemplateCategory(ctx context.Context, tc *models.TemplateCategory) error
	GetTemplateCategoriesByAnimationType(
		ctx context.Context,
		animationType types.AnimationType,
	) ([]*models.TemplateCategory, error)
	GetTemplateCategoryByName(
		ctx context.Context,
		animationType types.AnimationType,
		name string,
	) (*models.TemplateCategory, error)
	CreateTemplate(ctx context.Context, t *models.Template) (*models.Template, error)
	UpdateTemplate(ctx context.Context, t *models.Template) error
	GetTemplatesByCategory(
		ctx context.Context,
		category string,
		animationType types.AnimationType,
		usedIds []string,
	) ([]*models.Template, error)
	GetTemplateByName(
		ctx context.Context,
		animationType types.AnimationType,
		name string,
	) (*models.Template, error)
}

type MediaAssetRepository interface {
	GetMediaAssetsByID(ctx context.Context, IDs []string) ([]*models.MediaAsset, error)
	GetMediaAssetsByOrgID(ctx context.Context, orgID string) ([]*models.MediaAsset, error)
	CreateMediaAsset(ctx context.Context, asset *models.MediaAsset) (*models.MediaAsset, error)
}
