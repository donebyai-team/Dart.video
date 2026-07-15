package server

import (
	_ "embed"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/auth"
	"github.com/shank318/coasterai/auth/middleware"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/errorx"
	"github.com/shank318/coasterai/pb/coasterai/portal/v1/pbportalconnect"
	"github.com/shank318/coasterai/portal/server/handlers"
	"github.com/shank318/coasterai/services/credits"
	"net/http"
	"regexp"
	"strings"

	"connectrpc.com/connect"

	dgrpcserver "github.com/streamingfast/dgrpc/server"
	"github.com/streamingfast/dgrpc/server/connectrpc"
	"github.com/streamingfast/shutter"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	*shutter.Shutter
	httpListenAddr    string
	authenticator     *auth.Authenticator
	creditsService    credits.Service
	corsURLRegexAllow *regexp.Regexp
	isAppReady        func() bool
	logger            *zap.Logger
}

func New(
	httpListenAddr string,
	authenticator *auth.Authenticator,
	creditsService credits.Service,
	corsURLRegexAllow *regexp.Regexp,
	isAppReady func() bool,
	logger *zap.Logger,
) *Server {
	return &Server{
		Shutter:           shutter.New(),
		authenticator:     authenticator,
		creditsService:    creditsService,
		httpListenAddr:    httpListenAddr,
		corsURLRegexAllow: corsURLRegexAllow,
		isAppReady:        isAppReady,
		logger:            logger,
	}
}

// this is a blocking call
func (s *Server) Run(
	portalHandler pbportalconnect.PortalServiceHandler,
	mediaHandler *handlers.UploadHandler,
) {
	tracerProvider := otel.GetTracerProvider()
	options := []dgrpcserver.Option{
		dgrpcserver.WithLogger(s.logger),
		dgrpcserver.WithHealthCheck(dgrpcserver.HealthCheckOverGRPC|dgrpcserver.HealthCheckOverHTTP, s.healthzHandler()),
		dgrpcserver.WithPostUnaryInterceptor(otelgrpc.UnaryServerInterceptor(otelgrpc.WithTracerProvider(tracerProvider))),
		dgrpcserver.WithPostStreamInterceptor(otelgrpc.StreamServerInterceptor(otelgrpc.WithTracerProvider(tracerProvider))),
		dgrpcserver.WithGRPCServerOptions(grpc.MaxRecvMsgSize(25 * 1024 * 1024)),
		// TODO: Uncomment when auth is implemented
		dgrpcserver.WithConnectInterceptor(middleware.NewAuthInterceptor(s.authenticator, s.logger)),
		dgrpcserver.WithConnectInterceptor(middleware.NewCreditsInterceptor(s.creditsService, s.logger)),
		dgrpcserver.WithConnectInterceptor(connectrpc.NewErrorsInterceptor(s.logger, connectrpc.WithErrorMapper(func(err error) error {
			if errors.Is(err, datastore.NotFound) {
				return errorx.ToConnect(errorx.New(errorx.CodeNotFound, "DATASTORE_NOT_FOUND", err.Error(), err))
			}

			if errors.Is(err, datastore.ErrMessageSourceAlreadyExists) {
				return errorx.ToConnect(errorx.New(
					errorx.CodeInvalidArgument,
					"MESSAGE_SOURCE_ALREADY_EXISTS",
					"Message Sources already configured for this user",
					fmt.Errorf("message source already exists: %w", err),
				))
			}

			return errorx.ToConnect(err)
		}))),
		dgrpcserver.WithConnectCORS(s.corsOption()),
	}
	if strings.Contains(s.httpListenAddr, "*") {
		s.logger.Info("grpc server with insecure server")
		options = append(options, dgrpcserver.WithInsecureServer())
	} else {
		s.logger.Info("grpc server with plain text server")
		options = append(options, dgrpcserver.WithPlainTextServer())
	}

	options = append(options,
		dgrpcserver.WithConnectWebHTTPHandlers([]dgrpcserver.HTTPHandlerGetter{
			func() (string, http.Handler) {
				return "/media/upload", s.withHTTPAuth("/media/upload", http.HandlerFunc(mediaHandler.UploadMedia))
			},
			func() (string, http.Handler) {
				return "/video/render", http.HandlerFunc(mediaHandler.PollVideoProgress)
			},
		}),
	)

	portalHandlerGetter := func(opts ...connect.HandlerOption) (string, http.Handler) {
		return pbportalconnect.NewPortalServiceHandler(portalHandler, opts...)
	}

	srv := connectrpc.New([]connectrpc.HandlerGetter{
		portalHandlerGetter,
	}, options...)

	s.OnTerminating(func(_ error) {
		s.logger.Info("shutting down connect web server")
		srv.Shutdown(nil)
	})

	addr := strings.ReplaceAll(s.httpListenAddr, "*", "")
	srv.Launch(addr)
	<-srv.Terminated()
}

func (s *Server) withHTTPAuth(path string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctx, err := s.authenticator.Authenticate(r.Context(), path, r.Header, middleware.RealIP(r.RemoteAddr, r.Header))
		if err != nil {
			http.Error(w, mapAuthErrorMessage(err), mapAuthErrorCode(err))
			return
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func mapAuthErrorCode(err error) int {
	st, ok := status.FromError(err)
	if !ok {
		return http.StatusUnauthorized
	}

	switch st.Code() {
	case codes.PermissionDenied:
		return http.StatusForbidden
	case codes.Unauthenticated:
		return http.StatusUnauthorized
	default:
		return http.StatusUnauthorized
	}
}

func mapAuthErrorMessage(err error) string {
	st, ok := status.FromError(err)
	if !ok {
		return "Unauthorized"
	}

	switch st.Code() {
	case codes.Internal, codes.Unavailable, codes.Unknown:
		return "error with authentication service, please try again later"
	default:
		return st.Message()
	}
}
