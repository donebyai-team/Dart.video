package field_resolvers

import (
	"github.com/shank318/coasterai/agent/scenes/types"
	"github.com/shank318/coasterai/services"
)

type FieldResolverDirection int

const (
	FieldResolverForward FieldResolverDirection = iota
	FieldResolverReverse
)

type FieldResolver[T any] interface {
	Forward(value T, fieldValueMapper *services.MediaAssetRegistry) (T, error) // LLM → internal
	Reverse(value T, fieldValueMapper *services.MediaAssetRegistry) (T, error) // internal → LLM
}

type ResolverRegistry struct {
	resolvers map[types.FieldDataType]FieldResolver[any]
}

func NewResolverRegistry() *ResolverRegistry {
	return &ResolverRegistry{
		resolvers: make(map[types.FieldDataType]FieldResolver[any]),
	}
}

func (r *ResolverRegistry) Register(name types.FieldDataType, resolver FieldResolver[any]) {
	r.resolvers[name] = resolver
}

func (r *ResolverRegistry) ResolveForward(name types.FieldDataType, value any, fieldValueMapper *services.MediaAssetRegistry) (any, error) {
	if fieldValueMapper == nil {
		return value, nil
	}

	resolver, ok := r.resolvers[name]
	if !ok {
		return value, nil
	}

	return resolver.Forward(value, fieldValueMapper)
}

func (r *ResolverRegistry) ResolveReverse(name types.FieldDataType, value any, fieldValueMapper *services.MediaAssetRegistry) (any, error) {
	if fieldValueMapper == nil {
		return value, nil
	}

	resolver, ok := r.resolvers[name]
	if !ok {
		return value, nil
	}

	return resolver.Reverse(value, fieldValueMapper)
}

var FieldMappings = NewResolverRegistry()

func init() {
	FieldMappings.Register(types.DataTypeIcon, IconArrayResolver{})
	FieldMappings.Register("icons", IconArrayResolver{})
	FieldMappings.Register(types.DataTypeMedia, MediaAssetUrlResolver{})
	FieldMappings.Register(types.DataTypeColor, ColorResolver{}) // TODO: Make datatype color_primary, secondary etc
}
