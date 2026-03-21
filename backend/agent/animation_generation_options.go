package agent

import (
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/services"
)

type AnimationGenerationOptions struct {
	VideoBranding *types.VideoBranding
	assetRegistry *services.MediaAssetRegistry
}

type AnimationGenerationOptionsBuilder struct {
	options AnimationGenerationOptions
}

func NewAnimationGenerationOptionsBuilder() *AnimationGenerationOptionsBuilder {
	return &AnimationGenerationOptionsBuilder{}
}

func (b *AnimationGenerationOptionsBuilder) WithVideoBranding(videoBranding *types.VideoBranding) *AnimationGenerationOptionsBuilder {
	b.options.VideoBranding = videoBranding
	return b
}

func (b *AnimationGenerationOptionsBuilder) WithAssetRegistry(assetRegistry *services.MediaAssetRegistry) *AnimationGenerationOptionsBuilder {
	b.options.assetRegistry = assetRegistry
	return b
}

func (b *AnimationGenerationOptionsBuilder) Build() AnimationGenerationOptions {
	return b.options
}
