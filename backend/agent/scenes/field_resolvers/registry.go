package field_resolvers

import "github.com/shank318/coasterai/services"

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
	resolvers map[string]FieldResolver[any]
}

func NewResolverRegistry() *ResolverRegistry {
	return &ResolverRegistry{
		resolvers: make(map[string]FieldResolver[any]),
	}
}

func (r *ResolverRegistry) Register(name string, resolver FieldResolver[any]) {
	r.resolvers[name] = resolver
}

func (r *ResolverRegistry) ResolveForward(name string, value any, fieldValueMapper *services.MediaAssetRegistry) (any, error) {

	resolver, ok := r.resolvers[name]
	if !ok {
		return value, nil
	}

	return resolver.Forward(value, fieldValueMapper)
}

func (r *ResolverRegistry) ResolveReverse(name string, value any, fieldValueMapper *services.MediaAssetRegistry) (any, error) {

	resolver, ok := r.resolvers[name]
	if !ok {
		return value, nil
	}

	return resolver.Reverse(value, fieldValueMapper)
}

var FieldMappings = NewResolverRegistry()

func init() {
	FieldMappings.Register("icon", IconArrayResolver{})
	FieldMappings.Register("icons", IconArrayResolver{})
}
