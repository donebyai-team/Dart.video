package agent

import (
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/services/brand_identity"
)

type AnimationGenerationOptions struct {
	VideoBranding       *types.VideoBranding
	BrandIdentityMapper *brand_identity.BrandIdentityRegistry
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

func (b *AnimationGenerationOptionsBuilder) WithBrandIdentityMapper(brandIdentityMapper *brand_identity.BrandIdentityRegistry) *AnimationGenerationOptionsBuilder {
	b.options.BrandIdentityMapper = brandIdentityMapper
	return b
}

func (b *AnimationGenerationOptionsBuilder) Build() AnimationGenerationOptions {
	return b.options
}
