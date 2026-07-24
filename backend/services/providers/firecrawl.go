package providers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/hashicorp/go-retryablehttp"
	"github.com/shank318/coasterai/services"
)

type Scrapper interface {
	Scrape(ctx context.Context, req ScrapeRequest) (*ScrapeResponse, error)
}

// BrandingResponse maps the firecrawl branding output structure
type FontInfo struct {
	Family string `json:"family"`
}

// Format represents a Firecrawl output format entry.
type Format struct {
	Type string `json:"type"`
}

type Parser struct {
	Type     string `json:"type"`
	MaxPages int    `json:"maxPages"`
}

type BrandingResponse struct {
	ColorScheme string                 `json:"colorScheme"`
	Logo        string                 `json:"logo"`
	Colors      map[string]string      `json:"colors"`
	Fonts       []FontInfo             `json:"fonts"`
	Typography  map[string]interface{} `json:"typography"`
	Images      map[string]string      `json:"images"`
}

const (
	// DefaultBaseURL is the default REST base URL for Firecrawl.
	DefaultBaseURL = "https://api.firecrawl.dev/v2"
)

// ScrapeRequest contains the supported scrape parameters.
type ScrapeRequest struct {
	URL             string   `json:"url"`
	Formats         []Format `json:"formats"`
	Parsers         []Parser `json:"parsers,omitempty"`
	OnlyMainContent *bool    `json:"onlyMainContent,omitempty"`
	IncludeTags     []string `json:"includeTags,omitempty"`
	ExcludeTags     []string `json:"excludeTags,omitempty"`
	RemoveBase64    *bool    `json:"removeBase64Images,omitempty"`
	BlockAds        *bool    `json:"blockAds,omitempty"`
	StoreInCache    *bool    `json:"storeInCache,omitempty"`
	Timeout         *int     `json:"timeout,omitempty"`
	RemoveLinks     bool     `json:"-"`
}

// ScrapeResponse models the important parts of the Firecrawl scrape response.
type ScrapeResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Branding BrandingResponse       `json:"branding"`
		Metadata map[string]interface{} `json:"metadata"`
		Markdown string                 `json:"markdown"`
	} `json:"data"`
	Error string `json:"error"`
}

type FirecrawlClient struct {
	apiKey     string
	baseURL    string
	httpClient *retryablehttp.Client
}

func NewFireCrawlClient(apiKey string) Scrapper {
	//return NewMockScrapper()
	if apiKey == "" {
		panic("firecrawl api key is required")
	}

	retryClient := services.NewRetryableHTTPClient(5*time.Minute, 100*time.Millisecond, 2*time.Second, 3, nil)

	return &FirecrawlClient{
		apiKey:     apiKey,
		baseURL:    DefaultBaseURL,
		httpClient: retryClient,
	}
}

var ErrUnsupportedWebsite = errors.New("firecrawl: unsupported website")

type FirecrawlError struct {
	StatusCode int
	Message    string
	Err        error
}

func (e *FirecrawlError) Error() string {
	return e.Message
}

func (e *FirecrawlError) Unwrap() error {
	return e.Err
}

type errorResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

// doRequest performs an HTTP request and converts Firecrawl API errors into typed errors.
func (c *FirecrawlClient) doRequest(ctx context.Context, method, path string, body []byte) ([]byte, error) {
	url := fmt.Sprintf("%s%s", c.baseURL, path)

	headers := map[string]string{
		"Authorization": "Bearer " + c.apiKey,
	}
	if body != nil {
		headers["Content-Type"] = "application/json"
	}

	respBytes, statusCode, err := services.DoRequest(ctx, c.httpClient, method, url, body, headers)
	if err != nil {
		return nil, err
	}

	if statusCode >= http.StatusOK && statusCode < http.StatusMultipleChoices {
		return respBytes, nil
	}

	var resp errorResponse
	if err := json.Unmarshal(respBytes, &resp); err == nil && resp.Error != "" {
		firecrawlErr := &FirecrawlError{
			StatusCode: statusCode,
			Message:    resp.Error,
		}

		if strings.Contains(strings.ToLower(resp.Error), "do not support this site") {
			firecrawlErr.Err = ErrUnsupportedWebsite
		}

		return nil, firecrawlErr
	}

	return nil, &FirecrawlError{
		StatusCode: statusCode,
		Message:    fmt.Sprintf("request failed with status %d", statusCode),
	}
}

var markdownImageRegex = regexp.MustCompile(`!\[[^\]]*\]\([^)]+\)`)

func (c *FirecrawlClient) Scrape(ctx context.Context, req ScrapeRequest) (*ScrapeResponse, error) {
	if req.URL == "" {
		return nil, fmt.Errorf("scrape url is required")
	}

	reqBytes, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	respBytes, err := c.doRequest(ctx, http.MethodPost, "/scrape", reqBytes)
	if err != nil {
		return nil, err
	}

	var parsed ScrapeResponse
	if err := json.Unmarshal(respBytes, &parsed); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	// Defensive check in case Firecrawl returns success=false with HTTP 200.
	if !parsed.Success {
		firecrawlErr := &FirecrawlError{
			Message: parsed.Error,
		}

		if strings.Contains(strings.ToLower(parsed.Error), "do not support this site") {
			firecrawlErr.Err = ErrUnsupportedWebsite
		}

		if firecrawlErr.Message == "" {
			firecrawlErr.Message = "firecrawl scrape unsuccessful"
		}

		return nil, firecrawlErr
	}

	if parsed.Data.Markdown == "" && req.RemoveLinks {
		parsed.Data.Markdown = markdownImageRegex.ReplaceAllString(parsed.Data.Markdown, "")
	}

	return &parsed, nil
}
