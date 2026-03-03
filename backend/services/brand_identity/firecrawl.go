package brand_identity

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/hashicorp/go-retryablehttp"
	"io"
	"net/http"
	"time"
)

// BrandingResponse maps the firecrawl branding output structure
type FontInfo struct {
	Family string `json:"family"`
}

// Format represents a Firecrawl output format entry.
type Format struct {
	Type string `json:"type"`
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
	OnlyMainContent *bool    `json:"onlyMainContent,omitempty"`
	IncludeTags     []string `json:"includeTags,omitempty"`
	ExcludeTags     []string `json:"excludeTags,omitempty"`
	RemoveBase64    *bool    `json:"removeBase64Images,omitempty"`
	BlockAds        *bool    `json:"blockAds,omitempty"`
	StoreInCache    *bool    `json:"storeInCache,omitempty"`
	Timeout         *int     `json:"timeout,omitempty"`
}

// ScrapeResponse models the important parts of the Firecrawl scrape response.
type ScrapeResponse struct {
	Success bool `json:"success"`
	Data    struct {
		Branding BrandingResponse       `json:"branding"`
		Metadata map[string]interface{} `json:"metadata"`
	} `json:"data"`
	Error string `json:"error"`
}

// Client is a minimal Firecrawl REST client.
type Client struct {
	apiKey     string
	baseURL    string
	httpClient *retryablehttp.Client
}

// NewClient constructs a Client with the provided API key and base URL.
func NewClient(apiKey, baseURL string) (*Client, error) {
	if apiKey == "" {
		return nil, fmt.Errorf("firecrawl api key is empty")
	}
	if baseURL == "" {
		baseURL = DefaultBaseURL
	}

	// Create retryable HTTP client
	retryClient := retryablehttp.NewClient()
	retryClient.RetryMax = 3
	retryClient.RetryWaitMin = 100 * time.Millisecond
	retryClient.RetryWaitMax = 2 * time.Second
	retryClient.Logger = nil // Disable default logging

	// Use provided HTTP client or create default one
	retryClient.HTTPClient = &http.Client{
		Timeout: 5 * time.Minute,
	}

	// Configure retry check to retry on 5xx errors and network errors
	retryClient.CheckRetry = func(ctx context.Context, resp *http.Response, err error) (bool, error) {
		// Don't retry if context is cancelled
		if ctx.Err() != nil {
			return false, ctx.Err()
		}

		// Retry on network errors
		if err != nil {
			return true, nil
		}

		// Retry on 5xx server errors
		if resp != nil && resp.StatusCode >= 500 && resp.StatusCode < 600 {
			return true, nil
		}

		// Don't retry on other status codes
		return false, nil
	}

	return &Client{
		apiKey:     apiKey,
		baseURL:    baseURL,
		httpClient: retryClient,
	}, nil
}

// doRequest performs an HTTP request with retry logic and returns the response body.
func (c *Client) doRequest(ctx context.Context, method, path string, body []byte) ([]byte, error) {
	url := fmt.Sprintf("%s%s", c.baseURL, path)
	var req *retryablehttp.Request
	var err error

	if body != nil {
		req, err = retryablehttp.NewRequestWithContext(ctx, method, url, bytes.NewReader(body))
	} else {
		req, err = retryablehttp.NewRequestWithContext(ctx, method, url, nil)
	}
	if err != nil {
		return nil, fmt.Errorf("build request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(io.LimitReader(resp.Body, 2_000_000))
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("firecrawl error: status=%d body=%s", resp.StatusCode, string(respBytes))
	}

	return respBytes, nil
}

// Scrape executes a Firecrawl scrape request.
func (c *Client) Scrape(ctx context.Context, req ScrapeRequest) (*ScrapeResponse, error) {
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

	if !parsed.Success {
		if parsed.Error != "" {
			return nil, fmt.Errorf("firecrawl error: %s", parsed.Error)
		}
		return nil, fmt.Errorf("firecrawl scrape unsuccessful")
	}

	return &parsed, nil
}
