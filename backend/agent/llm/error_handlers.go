package llm

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strings"
	"syscall"
	"time"
	// Adjust import path based on your BAML client
)

// Error type checking helpers
func isValidationError(err error) bool {
	if err == nil {
		return false
	}

	// Check for validation error by error message patterns
	errMsg := strings.ToLower(err.Error())
	validationPatterns := []string{
		"validation error",
		"validation failed",
		"bamlvalidationerror",
		"failed to parse",
		"invalid json",
		"schema validation",
		"type mismatch",
		"assertion failed",
		"check failed",
		"required field",
		"missing field",
		"invalid format",
	}

	for _, pattern := range validationPatterns {
		if strings.Contains(errMsg, pattern) {
			return true
		}
	}

	return false
}

func isNetworkError(err error) bool {
	if err == nil {
		return false
	}

	// Check for common network error types
	var (
		netErr     *net.OpError
		urlErr     *url.Error
		dnsErr     *net.DNSError
		syscallErr *syscall.Errno
	)

	// Direct network error types
	if errors.As(err, &netErr) ||
		errors.As(err, &urlErr) ||
		errors.As(err, &dnsErr) {
		return true
	}

	// Syscall errors (connection refused, etc.)
	if errors.As(err, &syscallErr) {
		return true
	}

	// Check for specific network error conditions
	if errors.Is(err, syscall.ECONNREFUSED) ||
		errors.Is(err, syscall.ECONNRESET) ||
		errors.Is(err, syscall.ETIMEDOUT) ||
		errors.Is(err, syscall.EHOSTUNREACH) ||
		errors.Is(err, syscall.ENETUNREACH) {
		return true
	}

	// Check error message patterns for network issues
	errMsg := strings.ToLower(err.Error())
	networkPatterns := []string{
		"connection refused",
		"connection reset",
		"connection timeout",
		"connection timed out",
		"network is unreachable",
		"host is unreachable",
		"no such host",
		"dns lookup failed",
		"dial tcp",
		"dial udp",
		"i/o timeout",
		"broken pipe",
		"connection aborted",
		"network error",
		"socket error",
		"http client timeout",
		"request timeout",
		"gateway timeout",
		"service unavailable",
		"bad gateway",
		"proxy error",
		"ssl handshake",
		"tls handshake",
		"certificate",
		"x509",
	}

	for _, pattern := range networkPatterns {
		if strings.Contains(errMsg, pattern) {
			return true
		}
	}

	return false
}

// Additional BAML-specific error checkers
func isBamlClientError(err error) bool {
	if err == nil {
		return false
	}

	// Check by error message
	errMsg := strings.ToLower(err.Error())
	clientErrorPatterns := []string{
		"bamlclientfinishreasonerror",
		"finish reason",
		"content filter",
		"safety filter",
		"token limit",
		"rate limit",
		"quota exceeded",
		"model overloaded",
	}

	for _, pattern := range clientErrorPatterns {
		if strings.Contains(errMsg, pattern) {
			return true
		}
	}

	return false
}

func isBamlAbortError(err error) bool {
	if err == nil {
		return false
	}

	// Check by error message
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "bamlaborterror") ||
		strings.Contains(errMsg, "operation aborted") ||
		strings.Contains(errMsg, "request cancelled")
}

func isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	// Network errors are usually retryable
	if isNetworkError(err) {
		return true
	}

	// Some BAML client errors are retryable
	if isBamlClientError(err) {
		errMsg := strings.ToLower(err.Error())
		retryablePatterns := []string{
			"rate limit",
			"quota exceeded",
			"model overloaded",
			"service unavailable",
			"internal server error",
			"bad gateway",
			"gateway timeout",
		}

		for _, pattern := range retryablePatterns {
			if strings.Contains(errMsg, pattern) {
				return true
			}
		}
	}

	// Context errors are not retryable
	if errors.Is(err, context.Canceled) ||
		errors.Is(err, context.DeadlineExceeded) {
		return false
	}

	// Validation errors are not retryable
	if isValidationError(err) {
		return false
	}

	// Abort errors are not retryable
	if isBamlAbortError(err) {
		return false
	}

	return false
}

// Enhanced error handling functions
func handleInitialError(err error) error {
	if err == nil {
		return nil
	}

	switch {
	case errors.Is(err, context.Canceled):
		return fmt.Errorf("❌ Stream creation cancelled: %w", err)

	case errors.Is(err, context.DeadlineExceeded):
		return fmt.Errorf("❌ Stream creation timed out: %w", err)

	case isValidationError(err):
		return fmt.Errorf("❌ Input validation failed: %w", err)

	case isNetworkError(err):
		return fmt.Errorf("❌ Network error creating stream: %w", err)

	case isBamlClientError(err):
		return fmt.Errorf("❌ LLM client error: %w", err)

	case isBamlAbortError(err):
		return fmt.Errorf("❌ Operation aborted: %w", err)

	default:
		return fmt.Errorf("❌ Failed to create stream: %w", err)
	}
}

func handleContextError(ctxErr error) error {
	switch {
	case errors.Is(ctxErr, context.Canceled):
		return fmt.Errorf("🛑 Stream cancelled by user: %w", ctxErr)

	case errors.Is(ctxErr, context.DeadlineExceeded):
		return fmt.Errorf("⏰ Stream timed out: %w", ctxErr)

	default:
		return fmt.Errorf("❌ Context error: %w", ctxErr)
	}
}

// Comprehensive error categorization
func categorizeError(err error) string {
	if err == nil {
		return "none"
	}

	switch {
	case errors.Is(err, context.Canceled):
		return "cancelled"
	case errors.Is(err, context.DeadlineExceeded):
		return "timeout"
	case isValidationError(err):
		return "validation"
	case isNetworkError(err):
		return "network"
	case isBamlClientError(err):
		return "client"
	case isBamlAbortError(err):
		return "abort"
	default:
		return "unknown"
	}
}

// Usage example with comprehensive error handling
func handleErrorWithRetry(err error, attempt int, maxRetries int) (shouldRetry bool, backoff time.Duration) {
	category := categorizeError(err)

	// Don't retry certain error types
	nonRetryableCategories := []string{"cancelled", "validation", "abort"}
	for _, cat := range nonRetryableCategories {
		if category == cat {
			return false, 0
		}
	}

	// Don't retry if we've hit max attempts
	if attempt >= maxRetries {
		return false, 0
	}

	// Calculate backoff based on error type and attempt
	var baseBackoff time.Duration
	switch category {
	case "network":
		baseBackoff = 2 * time.Second
	case "client":
		baseBackoff = 5 * time.Second // Rate limits need longer backoff
	case "timeout":
		baseBackoff = 1 * time.Second
	default:
		baseBackoff = 3 * time.Second
	}

	// Exponential backoff with jitter
	backoff = baseBackoff * time.Duration(1<<uint(attempt-1))
	if backoff > 30*time.Second {
		backoff = 30 * time.Second // Cap at 30 seconds
	}

	return true, backoff
}
