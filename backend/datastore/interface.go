package datastore

import (
	"context"
	"errors"
	"github.com/lib/pq"
	"github.com/shank318/coasterai/models"
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
}
