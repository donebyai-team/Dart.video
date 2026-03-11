package figma

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strings"

	"go.uber.org/zap"
	"golang.org/x/oauth2"
)

const (
	authURL     = "https://www.figma.com/oauth"
	tokenURL    = "https://api.figma.com/v1/oauth/token"
	apiBaseURL  = "https://api.figma.com/v1"
	meEndpoint  = apiBaseURL + "/me"
	filesAPIURL = apiBaseURL + "/files"
	imagesURL   = apiBaseURL + "/images"
)

type OauthClient struct {
	config *oauth2.Config
	logger *zap.Logger
}

type User struct {
	ID     string `json:"id"`
	Email  string `json:"email"`
	Handle string `json:"handle"`
}

type AuthorizeResult struct {
	User         User
	AccessToken  string
	RefreshToken string
	Expiry       int64
}

func NewOauthClient(clientID, clientSecret, redirectURL string, logger *zap.Logger) *OauthClient {
	config := &oauth2.Config{
		ClientID:     clientID,
		ClientSecret: clientSecret,
		RedirectURL:  redirectURL,
		Scopes: []string{
			"current_user:read",
			"file_content:read",
		},
		Endpoint: oauth2.Endpoint{
			AuthURL:  authURL,
			TokenURL: tokenURL,
		},
	}

	return &OauthClient{
		config: config,
		logger: logger,
	}
}

func (c *OauthClient) AuthorizeURL(state string) string {
	return c.config.AuthCodeURL(state, oauth2.AccessTypeOffline)
}

func (c *OauthClient) Authorize(ctx context.Context, code string) (*AuthorizeResult, error) {
	token, err := c.config.Exchange(ctx, code)
	if err != nil {
		c.logger.Error("failed to exchange figma code", zap.Error(err))
		return nil, err
	}

	user, err := c.GetCurrentUser(ctx, token.AccessToken)
	if err != nil {
		return nil, err
	}

	return &AuthorizeResult{
		User:         *user,
		AccessToken:  token.AccessToken,
		RefreshToken: token.RefreshToken,
		Expiry:       token.Expiry.Unix(),
	}, nil
}

func (c *OauthClient) GetCurrentUser(ctx context.Context, accessToken string) (*User, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, meEndpoint, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("figma current user request failed: %s", resp.Status)
	}

	var out struct {
		ID     string `json:"id"`
		Email  string `json:"email"`
		Handle string `json:"handle"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}

	return &User{
		ID:     out.ID,
		Email:  out.Email,
		Handle: out.Handle,
	}, nil
}

func FilesAPIURL(fileKey string) string {
	return fmt.Sprintf("%s/%s", filesAPIURL, fileKey)
}

func ImagesURL(fileKey string, nodeIDs []string) string {
	q := url.Values{}
	q.Set("ids", strings.Join(nodeIDs, ","))
	q.Set("format", "png")
	return fmt.Sprintf("%s/%s?%s", imagesURL, fileKey, q.Encode())
}
