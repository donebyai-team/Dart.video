package services

import (
	"encoding/json"
	"fmt"
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

var brandIcons map[string][]string
var tablerList []string

type tablerIndex struct {
	Outline []string `json:"outline"`
	Filled  []string `json:"filled"`
}

/*
Initialize tabler icon list
*/

func init() {
	if err := loadBrandIcons(); err != nil {
		log.Printf("icon resolver: failed to load brand icons: %v", err)
	}

	if err := loadTablerIcons(); err != nil {
		log.Printf("icon resolver: failed to load tabler icons: %v", err)
	}
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

	// store only once
	tablerList = make([]string, 0, len(data.Outline)+len(data.Filled))

	for _, icon := range data.Outline {
		tablerList = append(tablerList, strings.ToLower(icon))
	}

	for _, icon := range data.Filled {
		tablerList = append(tablerList, strings.ToLower(icon))
	}

	log.Printf("icon resolver: loaded %d tabler icons", len(tablerList))

	return nil
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

	for slug, variants := range data {
		brandIcons[strings.ToLower(slug)] = variants
	}

	log.Printf("icon resolver: loaded %d brand icons", len(brandIcons))

	return nil
}

/*
Resolve best matching tabler icon
*/

func resolveTablerIcon(name string) (string, bool) {

	if len(tablerList) == 0 {
		return "", false
	}

	name = strings.ToLower(name)

	// 1 exact match
	for _, icon := range tablerList {
		if icon == name {
			return fmt.Sprintf("%s/%s.svg", TablerBase, icon), true
		}
	}

	// 2 prefix match
	for _, icon := range tablerList {
		if strings.HasPrefix(icon, name) {
			return fmt.Sprintf("%s/%s.svg", TablerBase, icon), true
		}
	}

	// 3 contains match
	for _, icon := range tablerList {
		if strings.Contains(icon, name) {
			return fmt.Sprintf("%s/%s.svg", TablerBase, icon), true
		}
	}

	return "", false
}

/*
Public API
*/

func ResolveIconFromName(name string) string {
	if url, ok := resolveBrandIcon(name); ok {
		return url
	}
	if url, ok := resolveTablerIcon(name); ok {
		return url
	}
	return ""
}

func ResolveIconNameFromURL(iconURL string) string {

	// Brand icon
	if strings.Contains(iconURL, "thesvg.org/icons/") {

		// https://www.thesvg.org/icons/openai/default.svg
		parts := strings.Split(iconURL, "/")

		if len(parts) >= 2 {
			slug := parts[len(parts)-2]
			return slug
		}
	}

	// Tabler icon
	if strings.Contains(iconURL, "@tabler/icons") {

		// https://cdn.jsdelivr.net/npm/@tabler/icons/icons/outline/arrow-left.svg
		parts := strings.Split(iconURL, "/")

		if len(parts) > 0 {
			file := parts[len(parts)-1]
			return strings.TrimSuffix(file, ".svg")
		}
	}

	return ""
}

func resolveBrandIcon(name string) (string, bool) {

	name = strings.ToLower(name)

	/* exact match */

	var slug string

	if _, ok := brandIcons[name]; ok {
		slug = name
	} else {

		/* fallback: contains match */

		for s := range brandIcons {
			if strings.Contains(s, name) {
				slug = s
				break
			}
		}

		if slug == "" {
			return "", false
		}
	}

	variants := brandIcons[slug]

	if len(variants) == 0 {
		return "", false
	}

	/* remove wordmarks */

	filtered := make([]string, 0, len(variants))

	for _, v := range variants {
		if !strings.Contains(strings.ToLower(v), "wordmark") {
			filtered = append(filtered, v)
		}
	}

	if len(filtered) == 0 {
		filtered = variants
	}

	/* variant priority */

	priority := []string{"color", "light", "dark", "default"}

	for _, p := range priority {
		for _, v := range filtered {
			if strings.EqualFold(v, p) {
				return fmt.Sprintf("%s/%s/%s.svg", SvgBase, slug, v), true
			}
		}
	}

	/* fallback */

	return fmt.Sprintf("%s/%s/%s.svg", SvgBase, slug, filtered[0]), true
}
