package utils

import (
	"regexp"
	"strings"
)

var hexColorRegex = regexp.MustCompile(`^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6})$`)

func IsValidHexColor(s string) bool {
	s = strings.TrimSpace(s)
	return s == "transparent" || hexColorRegex.MatchString(s)
}
