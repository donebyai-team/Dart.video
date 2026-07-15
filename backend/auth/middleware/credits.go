package middleware

import (
	"context"
	"fmt"

	"connectrpc.com/connect"
	"github.com/shank318/coasterai/auth"
	"github.com/shank318/coasterai/pb/coasterai/portal/v1/pbportalconnect"
	creditsvc "github.com/shank318/coasterai/services/credits"
	"go.uber.org/zap"
)

var _ connect.Interceptor = (*CreditsInterceptor)(nil)

var creditProtectedProcedures = map[string][]creditsvc.Action{
	pbportalconnect.PortalServiceCreateVideoProcedure:           {creditsvc.ActionAnalyzeImage, creditsvc.ActionScriptGeneration, creditsvc.ActionScenesGeneration},
	pbportalconnect.PortalServiceContinueVideoPlanningProcedure: {},
	pbportalconnect.PortalServiceGenerateOrEditSceneProcedure:   {creditsvc.ActionAnimationGeneration},
	pbportalconnect.PortalServiceGenerateSuggestionsProcedure:   {creditsvc.ActionCategorizeScene, creditsvc.ActionExtractTemplateConfig},
	pbportalconnect.PortalServiceRenderSuggestionProcedure:      {},
	pbportalconnect.PortalServiceGenerateVoiceoverProcedure:     {creditsvc.ActionVoiceGeneration},
}

type CreditsInterceptor struct {
	service creditsvc.Service
	logger  *zap.Logger
}

func NewCreditsInterceptor(service creditsvc.Service, logger *zap.Logger) *CreditsInterceptor {
	return &CreditsInterceptor{service: service, logger: logger}
}

func (i *CreditsInterceptor) WrapUnary(next connect.UnaryFunc) connect.UnaryFunc {
	return func(ctx context.Context, req connect.AnyRequest) (connect.AnyResponse, error) {
		childCtx, err := i.checkCredits(ctx, req.Spec().Procedure)
		if err != nil {
			return nil, err
		}

		return next(childCtx, req)
	}
}

func (i *CreditsInterceptor) WrapStreamingHandler(next connect.StreamingHandlerFunc) connect.StreamingHandlerFunc {
	return func(ctx context.Context, conn connect.StreamingHandlerConn) error {
		childCtx, err := i.checkCredits(ctx, conn.Spec().Procedure)
		if err != nil {
			return err
		}

		return next(childCtx, conn)
	}
}

func (i *CreditsInterceptor) WrapStreamingClient(next connect.StreamingClientFunc) connect.StreamingClientFunc {
	return next
}

func (i *CreditsInterceptor) checkCredits(ctx context.Context, procedure string) (context.Context, error) {
	actions, ok := creditProtectedProcedures[procedure]
	if !ok || i.service == nil {
		return ctx, nil
	}

	actor, ok := auth.FromContext(ctx)
	if !ok || actor.OrganizationID == "" {
		return ctx, connect.NewError(connect.CodeUnauthenticated, fmt.Errorf("unauthenticated user access"))
	}

	available, err := i.service.GetAvailableCredits(ctx, actor.OrganizationID, nil)
	if err != nil {
		i.logger.Error("failed to get available credits", zap.String("procedure", procedure), zap.String("org_id", actor.OrganizationID), zap.Error(err))
		return ctx, connect.NewError(connect.CodeInternal, fmt.Errorf("failed to get available credits"))
	}

	required := i.service.GetEstimatedCredits(actions)
	if available == 0 || (available < required) {
		return ctx, connect.NewError(connect.CodeFailedPrecondition, fmt.Errorf("insufficient credits"))
	}

	return ctx, nil
}
