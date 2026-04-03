package field_resolvers

import "github.com/shank318/coasterai/services"

const fallbackIcon = "https://cdn.jsdelivr.net/npm/@tabler/icons/icons/outline/mood-confuzed.svg"

type IconArrayResolver struct{}

func (r IconArrayResolver) Forward(value any) (any, error) {

	// single icon
	if name, ok := value.(string); ok {

		url := services.ResolveIconFromName(name)
		if url == "" {
			url = fallbackIcon
		}

		return url, nil
	}

	// multiple icons
	names, ok := toStringSlice(value)
	if !ok {
		return value, nil
	}

	result := make([]string, 0, len(names))

	for _, name := range names {
		url := services.ResolveIconFromName(name)
		if url == "" {
			url = fallbackIcon
		}
		result = append(result, url)
	}

	return result, nil
}

func (r IconArrayResolver) Reverse(value any) (any, error) {

	// single icon
	if url, ok := value.(string); ok {

		name := services.ResolveIconNameFromURL(url)
		if name != "" {
			return name, nil
		}

		return value, nil
	}

	// multiple icons
	urls, ok := toStringSlice(value)
	if !ok {
		return value, nil
	}

	names := make([]string, 0, len(urls))

	for _, u := range urls {
		name := services.ResolveIconNameFromURL(u)
		if name != "" {
			names = append(names, name)
		}
	}

	return names, nil
}

func toStringSlice(value any) ([]string, bool) {

	arr, ok := value.([]any)
	if !ok {
		return nil, false
	}

	result := make([]string, 0, len(arr))

	for _, v := range arr {
		s, ok := v.(string)
		if !ok {
			continue
		}
		result = append(result, s)
	}

	return result, true
}
