package portal

import (
	"connectrpc.com/connect"
	"context"
	"fmt"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/models"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"time"
)

type IntegrationHandler func(ctx context.Context, p *Portal, code string, organizationID string, oauthState *cache.State) error

var integrationsMap = map[pbportal.IntegrationType]IntegrationHandler{
	pbportal.IntegrationType_INTEGRATION_TYPE_FIGMA: handleFigmaOAuthCallback,
}

func (p *Portal) SocialLoginCallback(ctx context.Context, c *connect.Request[pbportal.OauthCallbackRequest]) (*connect.Response[pbportal.JWT], error) {
	_, err := p.validateState(c.Msg.State)
	if err != nil {
		return nil, fmt.Errorf("error validating state: %w", err)
	}

	email, err := p.googleOauthClient.Authorize(ctx, c.Msg.GetExternalCode())
	if err != nil {
		return nil, err
	}

	jwt, err := p.authUsecase.SignUser(ctx, email)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(jwt), nil
}

func (p *Portal) OauthCallback(ctx context.Context, c *connect.Request[pbportal.OauthCallbackRequest]) (*connect.Response[pbportal.OauthCallbackResponse], error) {
	actor, err := p.gethAuthContext(ctx)
	if err != nil {
		return nil, err
	}
	authState, err := p.validateState(c.Msg.State)
	if err != nil {
		return nil, fmt.Errorf("error validating state: %w", err)
	}

	handler, ok := integrationsMap[authState.IntegrationType]
	if !ok {
		return nil, fmt.Errorf("unknown %s handler: %w", authState.IntegrationType.String(), err)
	}
	if err = handler(ctx, p, c.Msg.GetExternalCode(), actor.OrganizationID, authState); err != nil {
		return nil, fmt.Errorf("error handling %s: %w", authState.IntegrationType.String(), err)
	}

	return connect.NewResponse(&pbportal.OauthCallbackResponse{RedirectUrl: authState.RedirectUri}), nil
}

func (p *Portal) validateState(state string) (*cache.State, error) {
	s, err := p.authStateStore.GetState(state)
	if err != nil {
		return nil, fmt.Errorf("unable to get state: %w", err)
	}

	if s.HasExpired() {
		return nil, fmt.Errorf("state expired")
	}

	return s, nil
}

func handleFigmaOAuthCallback(ctx context.Context, p *Portal, code string, organizationID string, _ *cache.State) error {
	if p.figmaOauthClient == nil {
		return fmt.Errorf("figma oauth client is not configured")
	}

	authResult, err := p.figmaOauthClient.Authorize(ctx, code)
	if err != nil {
		return err
	}

	integration := &models.Integration{
		OrganizationID: organizationID,
		Type:           models.IntegrationTypeFIGMA,
		State:          models.IntegrationStateACTIVE,
	}

	expiresAt := time.Unix(authResult.Expiry, 0)
	integration = models.SetIntegrationType(integration, models.IntegrationTypeFIGMA, &models.FigmaConfig{
		UserID:       authResult.User.ID,
		Handle:       authResult.User.Handle,
		Email:        authResult.User.Email,
		AccessToken:  authResult.AccessToken,
		RefreshToken: authResult.RefreshToken,
		ExpiresAt:    expiresAt,
	})

	_, err = p.db.UpsertIntegration(ctx, integration)
	return err
}
