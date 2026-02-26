package agent

import (
	"errors"
	"regexp"
	"strings"
)

var (
	// XML / HTML tag detection
	htmlTagRegex = regexp.MustCompile(`</?([a-zA-Z][a-zA-Z0-9]*)[^>]*>`)

	// Common code patterns
	codePatterns = []string{
		"```",
		"function(",
		"func(",
		"class ",
		"import ",
		"package ",
		"console.log",
		"eval(",
		"exec(",
		"os.",
		"sys.",
		"<?xml",
		"<script",
	}

	// Prompt injection attempts
	injectionPatterns = []string{
		"ignore previous",
		"disregard above",
		"act as system",
		"you are now",
		"pretend to be",
		"override",
		"bypass",
		"developer mode",
		"reveal instructions",
		"show hidden",
		"follow these rules instead",
		"new instructions",
		"forget earlier",
		"stop following",
	}

	// Restricted words
	restrictedWords = []string{
		"password",
		"secret",
		"api key",
		"private key",
		"token",
		"credentials",
		"ssh",
		"root access",
	}
)

func ValidatePrompt(prompt string) error {

	prompt = strings.TrimSpace(prompt)

	if prompt == "" {
		return nil
	}

	// -------- Length Guard --------
	if len(prompt) > 1000 {
		return errors.New("prompt length is too big, use \"Add Script\" instead")
	}

	wordCount := len(strings.Fields(prompt))
	if wordCount > 200 {
		return errors.New("prompt length is too big, use \"Add Script\" instead")
	}

	// -------- HTML / XML Injection --------
	if htmlTagRegex.MatchString(prompt) {
		return errors.New("prompt contains HTML/XML which is not allowed")
	}

	lower := strings.ToLower(prompt)

	// -------- Code Injection --------
	for _, pattern := range codePatterns {
		if strings.Contains(lower, pattern) {
			return errors.New("prompt appears to contain code which is not allowed")
		}
	}

	// -------- Prompt Injection --------
	for _, pattern := range injectionPatterns {
		if strings.Contains(lower, pattern) {
			return errors.New("prompt contains unsafe instruction patterns")
		}
	}

	// -------- Restricted Words --------
	for _, word := range restrictedWords {
		if strings.Contains(lower, word) {
			return errors.New("prompt contains restricted content")
		}
	}

	return nil
}
