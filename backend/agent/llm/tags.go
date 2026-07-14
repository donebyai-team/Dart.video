package llm

import (
	"context"
	"github.com/shank318/coasterai/agent/common"
)

func getTagsForBamlStudio(ctx context.Context) map[string]string {
	tags := make(map[string]string)

	if traceID, ok := ctx.Value(common.VideoIDKey).(string); ok {
		tags[string(common.VideoIDKey)] = traceID
	}

	if traceID, ok := ctx.Value(common.SceneIDKey).(string); ok {
		tags[string(common.SceneIDKey)] = traceID
	}

	return tags
}
