package services

import (
	"encoding/json"
	"fmt"
	"github.com/agnivade/levenshtein"
	"log"
	"net/http"
	"strings"
)

const (
	SvgBase        = "https://www.thesvg.org/icons"
	TablerBase     = "https://cdn.jsdelivr.net/npm/@tabler/icons/icons/outline"
	TablerIndexURL = "https://storage.googleapis.com/coasterai-public/tabler-icons.json.gz"
	TheSVGIndexURL = "https://storage.googleapis.com/coasterai-public/thesvg-icons.json.gz"
)

type searchableBrandIcon struct {
	Slug       string
	Normalized string
}

type searchableTablerIcon struct {
	Name       string
	Normalized string
}

var (
	brandIcons map[string][]string

	brandIndex     map[string]string
	tablerIndexMap map[string]string

	searchableBrandIcons  []searchableBrandIcon
	searchableTablerIcons []searchableTablerIcon
)

type tablerIndex struct {
	Outline []string `json:"outline"`
	Filled  []string `json:"filled"`
}

func init() {
	if err := loadBrandIcons(); err != nil {
		log.Printf("icon resolver: failed to load brand icons: %v", err)
	}

	if err := loadTablerIcons(); err != nil {
		log.Printf("icon resolver: failed to load tabler icons: %v", err)
	}
}

func normalizeIconName(s string) string {
	s = strings.ToLower(s)

	var b strings.Builder

	for _, r := range s {
		if (r >= 'a' && r <= 'z') ||
			(r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}

	return b.String()
}

func loadBrandIcons() error {
	resp, err := http.Get(TheSVGIndexURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var data map[string][]string

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return err
	}

	brandIcons = make(map[string][]string, len(data))
	brandIndex = make(map[string]string, len(data))
	searchableBrandIcons = make([]searchableBrandIcon, 0, len(data))

	for slug, variants := range data {
		slug = strings.ToLower(slug)

		brandIcons[slug] = variants

		norm := normalizeIconName(slug)

		if existing, ok := brandIndex[norm]; !ok || len(slug) < len(existing) {
			brandIndex[norm] = slug
		}

		searchableBrandIcons = append(searchableBrandIcons, searchableBrandIcon{
			Slug:       slug,
			Normalized: norm,
		})
	}

	log.Printf("icon resolver: loaded %d brand icons", len(brandIcons))

	return nil
}

func loadTablerIcons() error {
	resp, err := http.Get(TablerIndexURL)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	var data tablerIndex

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return err
	}

	total := len(data.Outline) + len(data.Filled)

	tablerIndexMap = make(map[string]string, total)
	searchableTablerIcons = make([]searchableTablerIcon, 0, total)

	add := func(icon string) {
		icon = strings.ToLower(icon)

		norm := normalizeIconName(icon)

		if existing, ok := tablerIndexMap[norm]; !ok || len(icon) < len(existing) {
			tablerIndexMap[norm] = icon
		}

		searchableTablerIcons = append(searchableTablerIcons, searchableTablerIcon{
			Name:       icon,
			Normalized: norm,
		})
	}

	for _, icon := range data.Outline {
		add(icon)
	}

	for _, icon := range data.Filled {
		add(icon)
	}

	log.Printf("icon resolver: loaded %d tabler icons", len(searchableTablerIcons))

	return nil
}

// github                -> github
// icon:github           -> github
// icon:random:github    -> github
// random:github         -> github
func ResolveIconFromName(name string) string {
	name = strings.TrimSpace(name)

	if idx := strings.LastIndex(name, ":"); idx >= 0 {
		name = name[idx+1:]
	}

	name = strings.TrimSpace(name)

	// Brand icons always get priority.
	if url, ok := resolveBrandIcon(name); ok {
		return url
	}

	if url, ok := resolveTablerIcon(name); ok {
		return url
	}

	return ""
}

func resolveBrandIcon(name string) (string, bool) {
	query := normalizeIconName(name)

	if query == "" {
		return "", false
	}

	if slug, ok := brandIndex[query]; ok {
		return buildBrandURL(slug)
	}

	bestSlug := ""
	bestScore := 0

	for _, icon := range searchableBrandIcons {
		score := matchScore(query, icon.Normalized)

		if score > bestScore {
			bestScore = score
			bestSlug = icon.Slug
			continue
		}

		if score == bestScore &&
			score > 0 &&
			(bestSlug == "" || len(icon.Slug) < len(bestSlug)) {
			bestSlug = icon.Slug
		}
	}

	if bestScore == 0 {
		for _, icon := range searchableBrandIcons {
			score := typoScore(query, icon.Normalized)

			if score > bestScore {
				bestScore = score
				bestSlug = icon.Slug
				continue
			}

			if score == bestScore &&
				score > 0 &&
				(bestSlug == "" || len(icon.Slug) < len(bestSlug)) {
				bestSlug = icon.Slug
			}
		}
	}

	if bestScore == 0 {
		return "", false
	}

	return buildBrandURL(bestSlug)
}

func resolveTablerIcon(name string) (string, bool) {
	query := normalizeIconName(name)

	if query == "" {
		return "", false
	}

	if icon, ok := tablerIndexMap[query]; ok {
		return fmt.Sprintf("%s/%s.svg", TablerBase, icon), true
	}

	bestIcon := ""
	bestScore := 0

	for _, icon := range searchableTablerIcons {
		score := matchScore(query, icon.Normalized)

		if score > bestScore {
			bestScore = score
			bestIcon = icon.Name
			continue
		}

		if score == bestScore &&
			score > 0 &&
			(bestIcon == "" || len(icon.Name) < len(bestIcon)) {
			bestIcon = icon.Name
		}
	}

	if bestScore == 0 {
		for _, icon := range searchableTablerIcons {
			score := typoScore(query, icon.Normalized)

			if score > bestScore {
				bestScore = score
				bestIcon = icon.Name
				continue
			}

			if score == bestScore &&
				score > 0 &&
				(bestIcon == "" || len(icon.Name) < len(bestIcon)) {
				bestIcon = icon.Name
			}
		}
	}

	if bestScore == 0 {
		return "", false
	}

	return fmt.Sprintf("%s/%s.svg", TablerBase, bestIcon), true
}

func matchScore(query, candidate string) int {
	switch {
	case query == candidate:
		return 100

	case strings.HasPrefix(candidate, query):
		return 80

	case strings.HasSuffix(candidate, query):
		return 70

	case strings.Contains(candidate, query):
		return 50

	default:
		return 0
	}
}

func typoScore(query, candidate string) int {
	if len(query) < 5 {
		return 0
	}

	diff := len(query) - len(candidate)
	if diff < 0 {
		diff = -diff
	}

	if diff > 2 {
		return 0
	}

	dist := levenshtein.ComputeDistance(query, candidate)

	switch {
	case dist == 1:
		return 35
	case dist == 2:
		return 25
	default:
		return 0
	}
}

func buildBrandURL(slug string) (string, bool) {
	variants := brandIcons[slug]

	if len(variants) == 0 {
		return "", false
	}

	filtered := make([]string, 0, len(variants))

	for _, v := range variants {
		if !strings.Contains(strings.ToLower(v), "wordmark") {
			filtered = append(filtered, v)
		}
	}

	if len(filtered) == 0 {
		filtered = variants
	}

	priority := []string{
		"color",
		"light",
		"dark",
		"default",
	}

	for _, p := range priority {
		for _, v := range filtered {
			if strings.EqualFold(v, p) {
				return fmt.Sprintf("%s/%s/%s.svg", SvgBase, slug, v), true
			}
		}
	}

	return fmt.Sprintf("%s/%s/%s.svg", SvgBase, slug, filtered[0]), true
}

func ResolveIconNameFromURL(iconURL string) string {

	if strings.Contains(iconURL, "thesvg.org/icons/") {
		parts := strings.Split(iconURL, "/")

		if len(parts) >= 2 {
			return parts[len(parts)-2]
		}
	}

	if strings.Contains(iconURL, "@tabler/icons") {
		parts := strings.Split(iconURL, "/")

		if len(parts) > 0 {
			return strings.TrimSuffix(parts[len(parts)-1], ".svg")
		}
	}

	return ""
}
