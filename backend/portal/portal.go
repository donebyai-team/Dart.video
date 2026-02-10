package portal

import (
	"context"
	google2 "github.com/shank318/coasterai/integrations/google"
	"github.com/shank318/coasterai/portal/server/handlers"
	"github.com/shank318/coasterai/portal/state"
	"regexp"

	"github.com/shank318/coasterai/auth"
	"github.com/shank318/coasterai/datastore"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/portal/server"
	"github.com/shank318/coasterai/services"
	"github.com/streamingfast/logging"
	"github.com/streamingfast/shutter"
	"go.uber.org/zap"
)

type Portal struct {
	*shutter.Shutter
	authUsecase            *services.AuthUsecase
	isAppReady             func() bool
	httpListenAddr         string
	corsURLRegexAllow      *regexp.Regexp
	domainWhitelist        []*regexp.Regexp
	db                     datastore.Repository
	config                 *pbportal.Config
	logger                 *zap.Logger
	tracer                 logging.Tracer
	authenticator          *auth.Authenticator
	authStateStore         state.AuthStateStore
	googleOauthClient      *google2.OauthClient
	mediaService           services.MediaStore
	videoGenerationService services.VideoGeneration
}

func New(
	mediaService services.MediaStore,
	googleOauthClient *google2.OauthClient,
	authenticator *auth.Authenticator,
	authStateStore state.AuthStateStore,
	authUsecase *services.AuthUsecase,
	db datastore.Repository,
	videoGenerationService services.VideoGeneration,
	httpListenAddr string,
	corsURLRegexAllow *regexp.Regexp,
	config *pbportal.Config,
	domainWhitelist []*regexp.Regexp,
	isAppReady func() bool,
	logger *zap.Logger,
	tracer logging.Tracer,
) *Portal {
	return &Portal{
		mediaService:           mediaService,
		googleOauthClient:      googleOauthClient,
		authStateStore:         authStateStore,
		authUsecase:            authUsecase,
		Shutter:                shutter.New(),
		config:                 config,
		authenticator:          authenticator,
		db:                     db,
		httpListenAddr:         httpListenAddr,
		corsURLRegexAllow:      corsURLRegexAllow,
		domainWhitelist:        domainWhitelist,
		isAppReady:             isAppReady,
		logger:                 logger.Named("portal"),
		tracer:                 tracer,
		videoGenerationService: videoGenerationService,
	}
}

func (p *Portal) Run(ctx context.Context) error {
	p.logger.Info("starting portal server", zap.String("http_listen_addr", p.httpListenAddr))
	s := server.New(p.httpListenAddr, p.authenticator, p.corsURLRegexAllow, p.isAppReady, p.logger)
	p.OnTerminating(func(_ error) {
		s.Shutdown(nil)
	})

	s.Run(p, handlers.NewUploadHandler(p.mediaService))
	return nil
}
