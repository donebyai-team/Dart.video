package llm

import "context"

type contextKey string

const (
	VideoIDKey    contextKey = "video_id"
	TemplateIDKey contextKey = "template_id"
	SceneIDKey    contextKey = "scene_id"
)

func getTags(ctx context.Context) map[string]string {
	tags := make(map[string]string)

	if traceID, ok := ctx.Value(VideoIDKey).(string); ok {
		tags[string(VideoIDKey)] = traceID
	}

	if traceID, ok := ctx.Value(SceneIDKey).(string); ok {
		tags[string(SceneIDKey)] = traceID
	}

	if traceID, ok := ctx.Value(TemplateIDKey).(string); ok {
		tags[string(TemplateIDKey)] = traceID
	}

	return tags
}
