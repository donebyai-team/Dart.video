package services

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/hashicorp/go-retryablehttp"
)

func DefaultRetryableHTTPCheckRetry(ctx context.Context, resp *http.Response, err error) (bool, error) {
	if ctx.Err() != nil {
		return false, ctx.Err()
	}

	if err != nil {
		return true, nil
	}

	if resp != nil && resp.StatusCode >= 500 && resp.StatusCode < 600 {
		return true, nil
	}

	return false, nil
}

func NewRetryableHTTPClient(timeout, retryWaitMin, retryWaitMax time.Duration, retryMax int, checkRetry retryablehttp.CheckRetry) *retryablehttp.Client {
	retryClient := retryablehttp.NewClient()
	retryClient.RetryMax = retryMax
	retryClient.RetryWaitMin = retryWaitMin
	retryClient.RetryWaitMax = retryWaitMax
	retryClient.Logger = nil
	retryClient.HTTPClient = &http.Client{Timeout: timeout}

	if checkRetry != nil {
		retryClient.CheckRetry = checkRetry
	} else {
		retryClient.CheckRetry = DefaultRetryableHTTPCheckRetry
	}

	return retryClient
}

func DoRequest(ctx context.Context, client *retryablehttp.Client, method, url string, body []byte, headers map[string]string) ([]byte, int, error) {
	var req *retryablehttp.Request
	var err error

	if body != nil {
		req, err = retryablehttp.NewRequestWithContext(ctx, method, url, bytes.NewReader(body))
	} else {
		req, err = retryablehttp.NewRequestWithContext(ctx, method, url, nil)
	}
	if err != nil {
		return nil, 0, fmt.Errorf("build request: %w", err)
	}

	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("http request: %w", err)
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(io.LimitReader(resp.Body, 2_000_000))
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("read response: %w", err)
	}

	return respBytes, resp.StatusCode, nil
}
