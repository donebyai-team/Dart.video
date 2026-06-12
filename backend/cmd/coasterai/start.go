package main

import (
	"fmt"
	"github.com/pkg/errors"
	"github.com/shank318/coasterai/agent/llm"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/services/audio"
	"github.com/shank318/coasterai/services/brand_identity"
	"github.com/shank318/coasterai/services/code_builder"
	"github.com/shank318/coasterai/services/templates"
	"os"
	"regexp"
	"time"

	"github.com/shank318/coasterai/app"
	"github.com/shank318/coasterai/auth"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/portal"
	"github.com/shank318/coasterai/services"

	"github.com/spf13/cobra"
	"github.com/spf13/pflag"
	"github.com/streamingfast/cli"
	"github.com/streamingfast/cli/sflags"
	tracing "github.com/streamingfast/sf-tracing"
	"golang.org/x/exp/maps"
)

var StartCmd = cli.Command(startCmdE,
	"start",
	"Starts the given applications, one of portal, extractor",
	cli.ArbitraryArgs(),
	cli.Flags(func(flags *pflag.FlagSet) {
		flags.Duration("common-phone-call-ttl", 5*time.Minute, cli.FlagDescription(`TTL to set in redis for a phone call`))
		flags.String("common-pubsub-project", "coasterai-local", "Google GCP Project")
		flags.String("common-gpt-model", "redora-dev-gpt-4.1-mini-2025-04-14", "GPT Model to use for message creator and categorization")
		flags.String("common-gpt-advance-model", "redora-dev-gpt-4.1-2025-04-14", "GPT Model to use for message creator and categorization")
		flags.String("common-resend-api-key", "", "Resend email api key")
		flags.String("common-dodopayment-api-key", "", "DodoPayment api key")
		flags.String("common-brevo-api-key", "", "Brevo api key")
		flags.String("common-browserless-api-key", "", "Browserless api key")
		flags.String("common-browserless-warmup-api-key", "2SIxpPBYG6XJqLj5ec45cd436c170abdbec8713fd1bbaffe4", "Browserless api key")
		flags.String("common-steel-api-key", "", "Steel Browser api key")
		flags.String("common-imagekit-api-key", "", "Imagekit api key")
		flags.String("common-firecrawl-api-key", "", "Firecrawl api key")
		flags.String("common-elevenlabs-api-key", "", "Elevenlabs api key")
		flags.String("common-code-builder-service", "", "Code builder service")
		flags.String("common-google-api-key", "", "Google api key")
		flags.String("common-openai-api-key", "", "LiteLLM API key")
		flags.String("common-openai-gpt-api-key", "", "OpenAI API key")
		flags.String("common-openai-debug-store", "data/debugstore", "OpenAI debug store")
		flags.String("common-playwright-debug-store", "data/debugstore", "PlayWright debug store")
		flags.String("common-openai-organization", "", "OpenAI Organization")
		flags.String("common-langsmith-api-key", "", "Langsmith API key")
		flags.String("common-langsmith-project", "", "Langsmith project name")
		flags.Uint64("common-auto-mem-limit-percent", 0, "Automatically sets GOMEMLIMIT to a percentage of memory limit from cgroup (useful for container environments)")
		flags.Duration("spooler-db-polling-interval", 10*time.Minute, "How often the spooler will check the database for new investigation")

		flags.String("portal-reddit-redirect-url", "http://localhost:3000/auth/callback", "Reddit App Client ID")
		flags.String("portal-reddit-client-id", "", "Reddit App Client ID")
		flags.String("portal-reddit-client-secret", "", "Reddit App Client Secret")
		flags.String("portal-figma-redirect-url", "http://localhost:3000/auth/callback", "Figma OAuth callback URL")

		flags.String("portal-cors-url-regex-allow", "^.*", "Regex to allow CORS origin requests from, matched on the full URL (scheme, host, port, path, etc.), defaults to allow all")
		flags.String("portal-http-listen-addr", ":8787", "http listen address")

		flags.String("portal-fullstory-org-id", "", "FullStory org id")
		flags.String("portal-auth0-domain", "", "Auth0 tenant domain")
		flags.String("portal-auth0-portal-client-id", "", "Auth0 Portal AppFactory Client ID")
		flags.String("portal-auth0-portal-client-secret", "", "Auth0 Portal AppFactory Client Secret")
		flags.String("portal-auth0-api-redirect-uri", "http://localhost:8787/auth/callback", "The API Auth callback URL")
	}),
)

type App interface {
	cli.Shutter
	cli.RunnableContextError
}

type AppFactory func(cmd *cobra.Command, isAppReady func() bool) (App, error)

var appToFactory = map[string]AppFactory{
	"portal-api": portalApp,
	//"vana-spooler":   vanaSpoolerApp,
}

func startCmdE(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()
	main := cli.NewApplication(ctx)

	if len(args) == 0 {
		args = maps.Keys(appToFactory)
	}

	var apps []App
	for _, arg := range args {
		factory, found := appToFactory[arg]
		cli.Ensure(found, "Unknown app %q", arg)

		a, err := factory(cmd, main.IsReady)
		cli.NoError(err, "Unable to create app %q", arg)

		apps = append(apps, a)
	}

	err := setAutoMemoryLimit(sflags.MustGetUint64(cmd, "common-auto-mem-limit-percent"), zlog)
	if err != nil {
		return err
	}

	if os.Getenv("SF_TRACING") != "" {
		zlog.Info("setting up  tracing")
		if err := tracing.SetupOpenTelemetry(cmd.Context(), "loadlogic"); err != nil {
			return fmt.Errorf("failed to setup tracing: %w", err)
		}
	}

	for _, app := range apps {
		main.SuperviseAndStart(app)
	}

	shutdownUnreadyPeriod := sflags.MustGetDuration(cmd, "shutdown-unready-period")
	shutdownGracePeriod := sflags.MustGetDuration(cmd, "shutdown-grace-period")

	return main.WaitForTermination(zlog, shutdownUnreadyPeriod, shutdownGracePeriod)
}

func portalApp(cmd *cobra.Command, isAppReady func() bool) (App, error) {
	getString := sflags.MustGetString(cmd, "common-google-api-key")
	if getString == "" {
		return nil, fmt.Errorf("must specify --common-google-api-key")
	}
	redisAddr := sflags.MustGetString(cmd, "redis-addr")

	//var isDev bool
	//// TODO: Hack to know the env
	//if strings.Contains(redisAddr, "localhost") {
	//	isDev = true
	//}

	deps, err := app.NewDependenciesBuilder().
		WithMediaStore(sflags.MustGetString(cmd, "common-imagekit-api-key")).
		WithDataStore(sflags.MustGetString(cmd, "pg-dsn")).
		WithKMSKeyPath(sflags.MustGetString(cmd, "jwt-kms-keypath")).
		WithCORSURLRegexAllow(sflags.MustGetString(cmd, "portal-cors-url-regex-allow")).
		WithGoogle(
			sflags.MustGetString(cmd, "google-client-id"),
			sflags.MustGetString(cmd, "google-client-secret"),
			sflags.MustGetString(cmd, "portal-reddit-redirect-url"),
		).
		WithFigma(
			sflags.MustGetString(cmd, "figma-client-id"),
			sflags.MustGetString(cmd, "figma-client-secret"),
			sflags.MustGetString(cmd, "portal-figma-redirect-url"),
		).
		Build(cmd.Context(), zlog, tracer)
	if err != nil {
		return nil, err
	}

	whitelistDomains := []*regexp.Regexp{
		regexp.MustCompile(".*localhost"),
		regexp.MustCompile(".*127.0.0.1"),
		regexp.MustCompile(`.*\.donebyai.team`),
	}

	authenticator := auth.NewAuthenticator(deps.AuthTokenValidator, deps.DataStore, zlog)

	//logger := zlog.Named("portal")

	authConfig := &services.Auth0Config{
		Auth0PortalClientID:     sflags.MustGetString(cmd, "portal-auth0-portal-client-id"),
		Auth0PortalClientSecret: sflags.MustGetString(cmd, "portal-auth0-portal-client-secret"),
		Auth0ApiRedirectURL:     sflags.MustGetString(cmd, "portal-auth0-api-redirect-uri"),
		Auth0Domain:             sflags.MustGetString(cmd, "portal-auth0-domain"),
	}

	// TODO: Understand how to setup this as part of an auth use case
	config := &pbportal.Config{
		Auth0Domain:            authConfig.Auth0Domain,
		Auth0ClientId:          authConfig.Auth0PortalClientID,
		Auth0Scope:             "openid email",
		FullStoryOrgId:         sflags.MustGetString(cmd, "portal-fullstory-org-id"),
		GoogleAuth0CallbackUrl: sflags.MustGetString(cmd, "portal-reddit-redirect-url"),
	}

	authUsecase, err := services.NewAuthUsecase(cmd.Context(), authConfig, deps.DataStore, deps.AuthSigningKeyGetter, zlog)
	if err != nil {
		return nil, fmt.Errorf("unable to create auth usecase: %w", err)
	}

	cacheStore := cache.NewRedisStore(redisAddr, zlog)
	videoRenderService, err := services.NewRenderVideoService(cmd.Context(), cacheStore, zlog)
	if err != nil {
		return nil, errors.Wrap(err, "unable to create render video service")
	}

	provider, err := audio.NewElevenLabsProvider(sflags.MustGetString(cmd, "common-elevenlabs-api-key"), deps.MediaStore)
	if err != nil {
		return nil, err
	}

	p := portal.New(
		deps.MediaStore,
		deps.GoogleClient,
		deps.FigmaClient,
		authenticator,
		cacheStore,
		authUsecase,
		deps.DataStore,
		services.NewVideoGeneration(deps.DataStore, zlog),
		videoRenderService,
		brand_identity.NewBrandIdentityService(zlog, deps.DataStore, deps.MediaStore, sflags.MustGetString(cmd, "common-firecrawl-api-key")),
		code_builder.NewCodeBuilderService(deps.MediaStore, zlog),
		provider,
		llm.NewLlmService(zlog, cacheStore),
		templates.NewService(deps.DataStore),
		sflags.MustGetString(cmd, "portal-http-listen-addr"),
		deps.CorsURLRegexAllow,
		config,
		whitelistDomains,
		isAppReady,
		zlog.Named("portal"),
		tracer,
	)
	return p, nil
}
