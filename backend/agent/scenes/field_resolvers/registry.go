package field_resolvers

type FieldResolver[T any] interface {
	Forward(value T) (T, error) // LLM → internal
	Reverse(value T) (T, error) // internal → LLM
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

func (r *ResolverRegistry) ResolveForward(name string, value any) (any, error) {

	resolver, ok := r.resolvers[name]
	if !ok {
		return value, nil
	}

	return resolver.Forward(value)
}

func (r *ResolverRegistry) ResolveReverse(name string, value any) (any, error) {

	resolver, ok := r.resolvers[name]
	if !ok {
		return value, nil
	}

	return resolver.Reverse(value)
}

var FieldMappings = NewResolverRegistry()

func init() {
	FieldMappings.Register("icon", IconArrayResolver{})
	FieldMappings.Register("icons", IconArrayResolver{})
}
