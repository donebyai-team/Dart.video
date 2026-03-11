package app

import (
	"context"
	"fmt"
	"github.com/shank318/coasterai/auth"
	"github.com/shank318/coasterai/auth/crypto"
	"github.com/shank318/coasterai/datastore"
	figma2 "github.com/shank318/coasterai/integrations/figma"
	google2 "github.com/shank318/coasterai/integrations/google"
	"github.com/shank318/coasterai/services"
	"github.com/streamingfast/logging"
	"go.uber.org/dig"
	"go.uber.org/zap"
	"golang.org/x/oauth2"
	"regexp"
	"strings"
)

type GoogleConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
	Scopes       []string
	Endpoint     oauth2.Endpoint
}

type FigmaConfig struct {
	ClientID     string
	ClientSecret string
	RedirectURL  string
}

type DependenciesBuilder struct {
	imageKitKey        string
	PGDSN              string
	KMSKeyPath         string
	CorsURLRegexAllow  string
	AttachmentStoreURL string
	PubsubGCPProject   string
	Processor          bool
	AIConfig           *AIConfig
	GoogleConfig       *GoogleConfig
	FigmaConfig        *FigmaConfig
	dig                *dig.Container
}

func NewDependenciesBuilder() *DependenciesBuilder {
	return &DependenciesBuilder{
		dig: dig.New(),
	}
}

type AIConfig struct {
	LiteLLMAPIKey        string
	OpenAIAPIKey         string
	OpenAIOrganization   string
	OpenAIDebugLogsStore string
	LangsmithApiKey      string
	LangsmithProject     string
}

func (b *DependenciesBuilder) mustProvide(constructor interface{}) {
	if err := b.dig.Provide(constructor); err != nil {
		panic(fmt.Errorf("failed to register provider: %w", err))
	}
}

func (b *DependenciesBuilder) WithDataStore(pgDSN string) *DependenciesBuilder {
	b.mustProvide(func() PostgresDSNString { return PostgresDSNString(pgDSN) })
	b.PGDSN = pgDSN
	return b
}

func (b *DependenciesBuilder) WithGoogle(clientId, clientSecret, redirectUrl string) *DependenciesBuilder {
	redirectUrl = strings.Replace(redirectUrl, "auth/callback", "callback/login", 1)

	b.GoogleConfig = &GoogleConfig{
		ClientID:     clientId,
		ClientSecret: clientSecret,
		RedirectURL:  redirectUrl,
	}
	return b
}

func (b *DependenciesBuilder) WithFigma(clientId, clientSecret, redirectUrl string) *DependenciesBuilder {
	if clientId == "" || clientSecret == "" {
		return b
	}
	b.FigmaConfig = &FigmaConfig{
		ClientID:     clientId,
		ClientSecret: clientSecret,
		RedirectURL:  redirectUrl,
	}
	return b
}

func (b *DependenciesBuilder) WithAI(defaultLLMModel, liteLLMAPIKey string, openAIAPIKey string, openAIOrg string, openAIDebugLogsStore string, langsmithApiKey string, langsmithProject string) *DependenciesBuilder {
	b.AIConfig = &AIConfig{
		LiteLLMAPIKey:        liteLLMAPIKey,
		OpenAIAPIKey:         openAIAPIKey,
		OpenAIOrganization:   openAIOrg,
		OpenAIDebugLogsStore: openAIDebugLogsStore,
		LangsmithApiKey:      langsmithApiKey,
		LangsmithProject:     langsmithProject,
	}
	return b
}

func (b *DependenciesBuilder) WithMediaStore(imageKitKey string) *DependenciesBuilder {
	b.imageKitKey = imageKitKey
	return b
}

func (b *DependenciesBuilder) WithKMSKeyPath(kmsKeyPath string) *DependenciesBuilder {
	b.KMSKeyPath = kmsKeyPath
	return b
}

func (b *DependenciesBuilder) WithCORSURLRegexAllow(corsURLRegexAllow string) *DependenciesBuilder {
	b.CorsURLRegexAllow = corsURLRegexAllow
	return b
}

func (b *DependenciesBuilder) Build(ctx context.Context, logger *zap.Logger, tracer logging.Tracer) (out *Dependencies, err error) {
	b.mustProvide(func() *zap.Logger { return logger })
	b.mustProvide(func() logging.Tracer { return tracer })
	b.mustProvide(func() context.Context { return ctx })
	b.mustProvide(newDataStore)

	logger.Info("building dependencies", zap.Reflect("builder", b))

	out = &Dependencies{
		coasteraiDepMissing: []string{},
	}

	if b.PGDSN != "" {
		err := b.dig.Invoke(func(dataStore datastore.Repository) {
			out.DataStore = dataStore
		})
		if err != nil {
			return nil, fmt.Errorf("failed to setup datastore: %w", err)
		}
		// out.DataStore, err = SetupDataStore(ctx, b.PGDSN, logger, tracer)
	} else {
		out.coasteraiDepMissing = append(out.coasteraiDepMissing, "datastore")
	}

	if b.KMSKeyPath != "" {
		out.AuthSigningKeyGetter, out.AuthTokenValidator, err = SetupKMS(ctx, b.KMSKeyPath, logger)
		if err != nil {
			return nil, fmt.Errorf("failed to setup kms: %w", err)
		}
	} else {
		out.AuthSigningKeyGetter, out.AuthTokenValidator, err = SetupMockKMS(ctx, "", logger)
		if err != nil {
			return nil, fmt.Errorf("failed to setup kms: %w", err)
		}
	}

	if b.CorsURLRegexAllow != "" {
		urlRegex, err := regexp.Compile(b.CorsURLRegexAllow)
		if err != nil {
			return nil, fmt.Errorf("failed to compile CORS URL regex: %w", err)
		}
		out.CorsURLRegexAllow = urlRegex
	}

	if b.GoogleConfig != nil {
		logger.Info("setting up google",
			zap.Reflect("client_id", b.GoogleConfig.ClientID),
		)
		out.GoogleClient = google2.NewOauthClient(b.GoogleConfig.ClientID, b.GoogleConfig.ClientSecret, b.GoogleConfig.RedirectURL, logger)
	}

	if b.FigmaConfig != nil {
		logger.Info("setting up figma",
			zap.Reflect("client_id", b.FigmaConfig.ClientID),
		)
		out.FigmaClient = figma2.NewOauthClient(b.FigmaConfig.ClientID, b.FigmaConfig.ClientSecret, b.FigmaConfig.RedirectURL, logger)
	}

	out.MediaStore = services.NewGcpMediaStore()

	//if b.imageKitKey != "" {
	//	client := imagekit.NewClient(
	//		option.WithPrivateKey(b.imageKitKey), // defaults to os.LookupEnv("IMAGEKIT_PRIVATE_KEY")
	//	)
	//
	//	out.MediaStore = services.NewImagekitMediaStore(&client)
	//}

	return out, nil
}

type Dependencies struct {
	DataStore  datastore.Repository
	MediaStore services.MediaStore

	AuthSigningKeyGetter crypto.SigningKeyGetter
	AuthTokenValidator   auth.TokenValidationFunc

	CorsURLRegexAllow *regexp.Regexp

	coasteraiDepMissing []string

	GoogleClient *google2.OauthClient
	FigmaClient  *figma2.OauthClient
}
