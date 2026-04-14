package field_resolvers

import "github.com/shank318/coasterai/services"

type MediaAssetUrlResolver struct{}

type MediaAssetFields struct {
	Url       string
	Width     int
	Height    int
	Duration  float64
	MediaType string
}

func (r MediaAssetUrlResolver) Forward(value any, fieldValueMapper *services.MediaAssetRegistry) (any, error) {
	// single image
	if url, ok := value.(string); ok {
		if fieldValueMapper != nil {
			resolvedMediaAsset := fieldValueMapper.GetAssetFromHandle(url)
			if resolvedMediaAsset != nil {
				return &MediaAssetFields{
					Url:       resolvedMediaAsset.Path,
					Width:     resolvedMediaAsset.Metadata.Width,
					Height:    resolvedMediaAsset.Metadata.Height,
					Duration:  resolvedMediaAsset.Metadata.Duration * 30, // set it in frames
					MediaType: resolvedMediaAsset.MediaType.String(),
				}, nil
			}
		}
		return url, nil
	}

	// multiple urls
	// TODO: for array of urls, we don't return metadata for now
	urls, ok := toStringSlice(value)
	if !ok {
		return value, nil
	}

	result := make([]string, 0, len(urls))

	for _, url := range urls {
		if fieldValueMapper != nil {
			resolvedMediaAsset := fieldValueMapper.GetAssetFromHandle(url)
			if resolvedMediaAsset != nil {
				result = append(result, resolvedMediaAsset.Path)
			}
		}
	}

	return result, nil
}

func (r MediaAssetUrlResolver) Reverse(value any, fieldValueMapper *services.MediaAssetRegistry) (any, error) {
	return value, nil
}
