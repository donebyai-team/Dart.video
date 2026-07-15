package portal

import (
	"connectrpc.com/connect"
	"context"
	"fmt"
	"github.com/shank318/coasterai/auth"
	"github.com/shank318/coasterai/services/templates"
	"github.com/streamingfast/logging"
	"go.uber.org/zap"
)

func (p *Portal) gethAuthContext(ctx context.Context) (*auth.AuthContext, error) {
	cred, ok := auth.FromContext(ctx)
	if !ok {
		return nil, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("unauthenticated user access"))

	}
	p.setupLogger(ctx, cred)
	return cred, nil
}

func (p *Portal) setupLogger(ctx context.Context, user *auth.AuthContext) {
	logger := logging.Logger(ctx, p.logger)
	logger = logger.With(zap.String("actor", user.ID), zap.String("actor_org_id", user.OrganizationID))
	logging.WithLogger(ctx, logger)
}

func (p *Portal) setContext(ctx context.Context, orgID, videoID, sceneID string) context.Context {
	ctx = context.WithValue(ctx, auth.OrgIDKey, orgID)
	if videoID != "" {
		resourceID, _ := templates.ParseResourceID(videoID)
		ctx = context.WithValue(ctx, auth.VideoIDKey, resourceID)
	}
	if sceneID != "" {
		ctx = context.WithValue(ctx, auth.SceneIDKey, sceneID)
	}
	return ctx
}
