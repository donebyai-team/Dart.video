package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/cache"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"io"
	"strings"
	"time"

	"github.com/streamingfast/dstore"
	"go.uber.org/zap"
	run "google.golang.org/api/run/v2"
)

const (
	defaultRenderRegion  = "asia-east1"
	defaultRenderJobName = "remotion-renderer"
	defaultJobIDTTL      = 30 * time.Minute
	defaultOutputBucket  = "redora-coasterai-videos"

	projectName = "redora"
)

type RenderVideoService interface {
	SubmitJob(ctx context.Context, input *SubmitRenderJobInput) (jobID string, err error)
	PollJob(ctx context.Context, input *PollRenderJobInput) (*PollRenderJobOutput, error)
	DownloadFile(ctx context.Context, filePath string) (io.ReadCloser, error)
}

type SubmitRenderJobInput struct {
	Props *pbcore.Video
}

type PollRenderJobInput struct {
	JobID   string `json:"job_id"`
	VideoID string `json:"video_id"`
	Version string `json:"version"`
}

func (r PollRenderJobInput) Validate() error {
	if r.JobID == "" {
		return errors.New("jobId is required")
	}

	if r.VideoID == "" {
		return errors.New("videoid is required")
	}

	if r.Version == "" {
		return errors.New("version is required")
	}

	return nil
}

type PollRenderJobOutput struct {
	Completed        bool    `json:"completed"`
	RenderPhase      string  `json:"render_phase,omitempty"`
	RenderCurrent    int64   `json:"render_current,omitempty"`
	RenderTotal      int64   `json:"render_total,omitempty"`
	RenderPercent    float64 `json:"render_percent,omitempty"`
	RenderETASeconds int64   `json:"render_eta_seconds,omitempty"`
	FileBaseURL      string  `json:"file_base_url,omitempty"`
}

type renderVideoService struct {
	logger      *zap.Logger
	runService  *run.Service
	outputStore dstore.Store
	cache       cache.Cache
}

func NewRenderVideoService(ctx context.Context, cache cache.Cache, logger *zap.Logger) (RenderVideoService, error) {
	runService, err := run.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("create cloud run service client: %w", err)
	}

	debugStore, err := dstore.NewStore(fmt.Sprintf("gs://%s", defaultOutputBucket), "", "", false)
	if err != nil {
		return nil, fmt.Errorf("create cloud video store: %w", err)
	}

	return &renderVideoService{
		logger:      logger,
		runService:  runService,
		outputStore: debugStore,
		cache:       cache,
	}, nil
}

func (s *renderVideoService) DownloadFile(
	ctx context.Context,
	filePath string,
) (io.ReadCloser, error) {
	reader, err := s.outputStore.OpenObject(ctx, filePath)
	if err != nil {
		return nil, fmt.Errorf("open object %q: %w", filePath, err)
	}

	return reader, nil
}

func (s *renderVideoService) SubmitJob(ctx context.Context, input *SubmitRenderJobInput) (string, error) {
	if input == nil {
		return "", fmt.Errorf("input is required")
	}

	cacheKey := fmt.Sprintf("%s:version:%d", input.Props.Id, input.Props.Version)

	// ---- STRICT CACHE GET ----
	cachedJobID, err := s.cache.GetKey(ctx, cacheKey)
	if err == nil && cachedJobID != "" {
		s.logger.Info("render job cache hit",
			zap.String("cache_key", cacheKey),
			zap.String("job_id", cachedJobID),
		)
		return cachedJobID, nil
	}

	if err != nil && !errors.Is(err, cache.ErrCacheMiss) {
		return "", fmt.Errorf("cache get failed for key %s: %w", cacheKey, err)
	}

	// ---- PREPARE PAYLOAD ----
	proto, err := utils.MarshalProto(input.Props)
	if err != nil {
		return "", fmt.Errorf("marshal proto: %w", err)
	}

	propsB64 := base64.StdEncoding.EncodeToString(proto)

	request := &run.GoogleCloudRunV2RunJobRequest{
		Overrides: &run.GoogleCloudRunV2Overrides{
			ContainerOverrides: []*run.GoogleCloudRunV2ContainerOverride{
				{
					Env: []*run.GoogleCloudRunV2EnvVar{
						{Name: "RENDER_INPUT_PROPS_B64", Value: propsB64},
					},
				},
			},
		},
	}

	jobPath := fmt.Sprintf(
		"projects/%s/locations/%s/jobs/%s",
		projectName,
		defaultRenderRegion,
		defaultRenderJobName,
	)

	op, err := s.runService.
		Projects.
		Locations.
		Jobs.
		Run(jobPath, request).
		Context(ctx).
		Do()

	if err != nil {
		return "", fmt.Errorf("submit cloud run job: %w", err)
	}
	if op.Name == "" {
		return "", fmt.Errorf("submit response missing operation name")
	}

	// ---- EXTRACT EXECUTION ID ----
	var execution struct {
		Name string `json:"name"`
	}

	if err := json.Unmarshal(op.Metadata, &execution); err != nil {
		return "", fmt.Errorf("parse execution metadata: %w", err)
	}

	executionID := execution.Name
	if idx := strings.LastIndex(executionID, "/"); idx >= 0 {
		executionID = executionID[idx+1:]
	}

	if executionID == "" {
		return "", fmt.Errorf("execution id missing in metadata")
	}

	// ---- STRICT CACHE SET ----
	if err := s.cache.SetKey(ctx, cacheKey, executionID, defaultJobIDTTL); err != nil {
		return "", fmt.Errorf("cache set failed for key %s: %w", cacheKey, err)
	}

	s.logger.Info("submitted render job",
		zap.String("job_id", executionID),
		zap.String("video_id", input.Props.Id),
		zap.Int("version", int(input.Props.Version)),
	)

	return executionID, nil
}

func (s *renderVideoService) PollJob(
	ctx context.Context,
	input *PollRenderJobInput,
) (*PollRenderJobOutput, error) {

	if input == nil {
		return nil, fmt.Errorf("input is required")
	}
	if input.JobID == "" {
		return nil, fmt.Errorf("job id is required")
	}

	out := &PollRenderJobOutput{}

	// --- Read progress from Redis ---
	// The Cloud Run job writes to this key (with the coasterai: prefix baked in).
	// s.cache.GetKey automatically prepends "coasterai:" so we pass the bare key.
	progressKey := fmt.Sprintf("render:progress:%s:%s", input.VideoID, input.Version)
	progressJSON, progressErr := s.cache.GetKey(ctx, progressKey)

	if progressErr != nil && !errors.Is(progressErr, cache.ErrCacheMiss) {
		return nil, fmt.Errorf("get render progress: %w", progressErr)
	}

	if progressErr == nil && progressJSON != "" {
		var p struct {
			Completed        bool    `json:"completed"`
			RenderPhase      string  `json:"render_phase"`
			RenderCurrent    int64   `json:"render_current"`
			RenderTotal      int64   `json:"render_total"`
			RenderPercent    float64 `json:"render_percent"`
			RenderETASeconds int64   `json:"render_eta_seconds"`
			Error            string  `json:"error"`
		}
		if err := json.Unmarshal([]byte(progressJSON), &p); err != nil {
			return nil, fmt.Errorf("parse render progress: %w", err)
		}

		if p.Error != "" {
			s.logger.Error("render progress", zap.String("error", p.Error))
			return nil, fmt.Errorf("failed to render video")
		}

		out.Completed = p.Completed
		out.RenderPhase = p.RenderPhase
		out.RenderCurrent = p.RenderCurrent
		out.RenderTotal = p.RenderTotal
		out.RenderPercent = p.RenderPercent
		out.RenderETASeconds = p.RenderETASeconds
	}

	// --- Check execution status (safety net for container crashes) ---
	executionPath := fmt.Sprintf(
		"projects/%s/locations/%s/jobs/%s/executions/%s",
		projectName,
		defaultRenderRegion,
		defaultRenderJobName,
		input.JobID,
	)

	exec, err := s.runService.
		Projects.
		Locations.
		Jobs.
		Executions.
		Get(executionPath).
		Context(ctx).
		Do()
	if err != nil {
		return nil, fmt.Errorf("poll execution: %w", err)
	}

	if exec.FailedCount > 0 {
		return nil, fmt.Errorf("render job failed")
	}
	if exec.CancelledCount > 0 {
		return nil, fmt.Errorf("render job cancelled")
	}

	// --- Check output file (belt-and-suspenders: handles expired Redis TTL) ---
	fileBase := fmt.Sprintf("%s/%s.mp4", input.VideoID, input.Version)
	exists, err := s.outputStore.FileExists(ctx, fileBase)
	if err != nil {
		return nil, fmt.Errorf("check rendered file existence: %w", err)
	}
	if exists {
		out.FileBaseURL = fileBase
		// Force completion if file is present even if Redis key expired
		if !out.Completed {
			out.Completed = true
			out.RenderPhase = "encoding"
			out.RenderPercent = 100
		}
		s.logger.Info("render file confirmed in GCS", zap.String("path", fileBase))
	}

	return out, nil
}
