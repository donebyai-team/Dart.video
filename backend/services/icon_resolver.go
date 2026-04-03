package services

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	neturl "net/url"
	"strings"
)

const (
	SvgBase        = "https://www.thesvg.org/icons"
	TablerBase     = "https://cdn.jsdelivr.net/npm/@tabler/icons/icons/outline"
	TablerIndexURL = "https://storage.googleapis.com/coasterai-public/tabler-icons.json.gz"
)

var tablerList []string

type tablerIndex struct {
	Outline []string `json:"outline"`
	Filled  []string `json:"filled"`
}

/*
Initialize tabler icon list
*/

func init() {
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

	reqURL := "https://www.thesvg.org/api/registry?limit=1&q=" + neturl.QueryEscape(name)

	resp, err := http.Get(reqURL)
	if err != nil {
		return "", false
	}
	defer resp.Body.Close()

	var data svgRegistryResponse

	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", false
	}

	if len(data.Icons) == 0 {
		return "", false
	}

	icon := data.Icons[0]

	if len(icon.Variants) == 0 {
		return "", false
	}

	if !strings.EqualFold(icon.Slug, name) {
		return "", false
	}

	/*
	   Remove wordmark variants
	*/

	var variants []string

	for _, v := range icon.Variants {
		if !strings.Contains(strings.ToLower(v), "wordmark") {
			variants = append(variants, v)
		}
	}

	if len(variants) == 0 {
		variants = icon.Variants
	}

	/*
	   Variant priority
	*/

	priority := []string{"color", "light", "dark", "default"}

	for _, p := range priority {
		for _, v := range variants {
			if strings.EqualFold(v, p) {
				return fmt.Sprintf("%s/%s/%s.svg", SvgBase, icon.Slug, v), true
			}
		}
	}

	/*
	   fallback
	*/

	return fmt.Sprintf("%s/%s/%s.svg", SvgBase, icon.Slug, variants[0]), true
}

/*
Brand resolver
*/

type svgRegistryResponse struct {
	Icons []struct {
		Slug     string   `json:"slug"`
		Variants []string `json:"variants"`
	} `json:"icons"`
}

func init() {
	err := loadTablerIcons()
	if err != nil {
		panic(fmt.Errorf("icon resolver: failed to load tabler icons: %v", err))
	}
}
