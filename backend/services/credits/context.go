package credits

import "context"

type availableCreditsContextKey struct{}

func WithAvailableCredits(ctx context.Context, available int) context.Context {
	return context.WithValue(ctx, availableCreditsContextKey{}, available)
}

func AvailableCreditsFromContext(ctx context.Context) (int, bool) {
	available, ok := ctx.Value(availableCreditsContextKey{}).(int)
	return available, ok
}
