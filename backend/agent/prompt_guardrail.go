package agent

import (
	"errors"
	"regexp"
	"strings"
)

var (
	// XML / HTML tag detection
	dangerousHTMLPatterns = []*regexp.Regexp{
		regexp.MustCompile(`(?i)<script\b`),
		regexp.MustCompile(`(?i)<iframe\b`),
		regexp.MustCompile(`(?i)<object\b`),
		regexp.MustCompile(`(?i)<embed\b`),
		regexp.MustCompile(`(?i)<meta\b`),
		regexp.MustCompile(`(?i)<link\b`),
	}

	// Common code patterns that are unlikely to occur in normal prose
	codePatterns = []*regexp.Regexp{
		regexp.MustCompile("```(js|ts|tsx|go|py|java|cpp|c|sh|bash|sql)"),
		regexp.MustCompile(`\bfunction\s*\(`),
		regexp.MustCompile(`\bfunc\s*\(`),
		regexp.MustCompile(`\bconsole\.log\b`),
		regexp.MustCompile(`\beval\s*\(`),
		regexp.MustCompile(`\bexec\s*\(`),
		regexp.MustCompile(`\bos\.[a-z_][a-z0-9_]*\b`),
		regexp.MustCompile(`\bsys\.[a-z_][a-z0-9_]*\b`),
		regexp.MustCompile(`<\?xml\b`),
		regexp.MustCompile(`<script\b`),
	}

	// Language keywords that need syntax context to avoid false positives in prose.
	codeKeywordPatterns = []*regexp.Regexp{
		regexp.MustCompile(`\bclass\s+[a-zA-Z_][a-zA-Z0-9_]*\s*(\{|extends\b|implements\b|:)`),
		regexp.MustCompile(`\bpackage\s+[a-zA-Z_][a-zA-Z0-9_]*\b`),
	}

	// Prompt injection attempts
	//injectionPatterns = []string{
	//	"ignore previous",
	//	"disregard above",
	//	"act as system",
	//	"you are now",
	//	"pretend to be",
	//	"override",
	//	"bypass",
	//	"developer mode",
	//	"reveal instructions",
	//	"show hidden",
	//	"follow these rules instead",
	//	"new instructions",
	//	"forget earlier",
	//	"stop following",
	//}
	//
	//// Restricted words
	//restrictedWords = []string{
	//	"password",
	//	"secret",
	//	"api key",
	//	"private key",
	//	"token",
	//	"credentials",
	//	"ssh",
	//	"root access",
	//}
)

func ValidatePrompt(prompt string) error {
	prompt = strings.TrimSpace(prompt)

	if prompt == "" {
		return nil
	}

	// -------- Length Guard --------
	if len(prompt) > 5000 {
		return errors.New("prompt length is too big")
	}

	wordCount := len(strings.Fields(prompt))
	if wordCount > 1000 {
		return errors.New("prompt length is too big")
	}

	// -------- HTML / XML Injection --------
	for _, pattern := range dangerousHTMLPatterns {
		if pattern.MatchString(prompt) {
			return errors.New("prompt contains unsafe HTML")
		}
	}

	lower := strings.ToLower(prompt)

	// -------- Code Injection --------
	for _, pattern := range codePatterns {
		if pattern.MatchString(lower) {
			return errors.New("prompt appears to contain code which is not allowed")
		}
	}

	for _, pattern := range codeKeywordPatterns {
		if pattern.MatchString(lower) {
			return errors.New("prompt appears to contain code which is not allowed")
		}
	}

	// -------- Prompt Injection --------
	//for _, pattern := range injectionPatterns {
	//	if strings.Contains(lower, pattern) {
	//		return errors.New("prompt contains unsafe instruction patterns")
	//	}
	//}
	//
	//// -------- Restricted Words --------
	//for _, word := range restrictedWords {
	//	if strings.Contains(lower, word) {
	//		return errors.New("prompt contains restricted content")
	//	}
	//}

	return nil
}
