package llm

import (
	"context"
	"github.com/shank318/coasterai/auth"
)

func getTagsForBamlStudio(ctx context.Context) map[string]string {
	tags := make(map[string]string)

	if traceID, ok := ctx.Value(auth.VideoIDKey).(string); ok {
		tags[string(auth.VideoIDKey)] = traceID
	}

	if traceID, ok := ctx.Value(auth.SceneIDKey).(string); ok {
		tags[string(auth.SceneIDKey)] = traceID
	}

	return tags
}
