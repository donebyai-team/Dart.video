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
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/streamingfast/dstore"
	"go.uber.org/zap"
	loggingapi "google.golang.org/api/logging/v2"
	run "google.golang.org/api/run/v2"
)

const (
	defaultRenderRegion  = "asia-east1"
	defaultRenderJobName = "remotion-renderer"
	defaultJobIDTTL      = 30 * time.Minute
	defaultOutputBucket  = "redora-coasterai-videos"

	projectName = "redora"
)

var (
	renderLineRegex = regexp.MustCompile(`Rendered\s+(\d+)\/(\d+)(?:,\s*time remaining:\s*(\d+)s)?`)
	encodeLineRegex = regexp.MustCompile(`Encoded\s+(\d+)\/(\d+)`)
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
	logger         *zap.Logger
	runService     *run.Service
	loggingService *loggingapi.Service
	outputStore    dstore.Store
	cache          cache.Cache
}

func NewRenderVideoService(ctx context.Context, cache cache.Cache, logger *zap.Logger) (RenderVideoService, error) {
	runService, err := run.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("create cloud run service client: %w", err)
	}

	loggingService, err := loggingapi.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("create cloud logging service client: %w", err)
	}

	debugStore, err := dstore.NewStore(fmt.Sprintf("gs://%s", defaultOutputBucket), "", "", false)
	if err != nil {
		return nil, fmt.Errorf("create cloud video store: %w", err)
	}

	return &renderVideoService{
		logger:         logger,
		runService:     runService,
		loggingService: loggingService,
		outputStore:    debugStore,
		cache:          cache,
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

	// Check output file in GCS
	fileBase := fmt.Sprintf("%s/%s.mp4", input.VideoID, input.Version)
	exists, err := s.outputStore.FileExists(ctx, fileBase)
	if err != nil {
		return nil, fmt.Errorf("check rendered file existence: %w", err)
	}
	if exists {
		out.FileBaseURL = fileBase
		s.logger.Info("downloading rendered video", zap.String("url", fileBase))
	}

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

	out.Completed = exec.CompletionTime != ""

	// 🔥 If execution failed → return error immediately
	if exec.FailedCount > 0 {
		return nil, fmt.Errorf("render job failed")
	}
	if exec.CancelledCount > 0 {
		return nil, fmt.Errorf("render job cancelled")
	}

	// If still running → try extract progress from logs
	if !out.Completed {
		s.applyRenderLogsProgress(ctx, exec.Name, out)
		return out, nil
	}

	// If completed successfully → force 100%
	out.RenderPhase = "encoding"
	out.RenderPercent = 100
	out.RenderCurrent = 1
	out.RenderTotal = 1
	out.RenderETASeconds = 0

	return out, nil
}

func (s *renderVideoService) applyRenderLogsProgress(
	ctx context.Context,
	executionName string,
	out *PollRenderJobOutput,
) {
	execID := executionName
	if idx := strings.LastIndex(execID, "/"); idx >= 0 {
		execID = execID[idx+1:]
	}
	if execID == "" {
		return
	}

	filter := fmt.Sprintf(
		`resource.type="cloud_run_job"
		 resource.labels.job_name="%s"
		 resource.labels.location="%s"
		 labels."run.googleapis.com/execution_name"="%s"
		 (textPayload:"Rendered " OR textPayload:"Encoded ")`,
		defaultRenderJobName,
		defaultRenderRegion,
		execID,
	)

	resp, err := s.loggingService.Entries.List(&loggingapi.ListLogEntriesRequest{
		ResourceNames: []string{"projects/" + projectName},
		Filter:        filter,
		OrderBy:       "timestamp desc",
		PageSize:      20,
	}).Context(ctx).Do()

	if err != nil {
		s.logger.Debug("log fetch failed", zap.Error(err))
		return
	}

	for _, entry := range resp.Entries {
		line := strings.TrimSpace(entry.TextPayload)
		if line == "" {
			continue
		}

		if progress, ok := parseProgressLine(line); ok {
			out.RenderPhase = progress.Phase
			out.RenderCurrent = progress.Current
			out.RenderTotal = progress.Total
			out.RenderPercent = progress.Percent
			out.RenderETASeconds = progress.ETASeconds
			return
		}
	}
}

type progressInfo struct {
	Phase      string
	Current    int64
	Total      int64
	Percent    float64
	ETASeconds int64
}

func parseProgressLine(line string) (*progressInfo, bool) {

	if parts := renderLineRegex.FindStringSubmatch(line); len(parts) > 0 {
		return buildProgress("rendering", parts)
	}

	if parts := encodeLineRegex.FindStringSubmatch(line); len(parts) > 0 {
		return buildProgress("encoding", parts)
	}

	return nil, false
}

func buildProgress(phase string, parts []string) (*progressInfo, bool) {
	current, err1 := strconv.ParseInt(parts[1], 10, 64)
	total, err2 := strconv.ParseInt(parts[2], 10, 64)
	if err1 != nil || err2 != nil || total <= 0 {
		return nil, false
	}

	info := &progressInfo{
		Phase:   phase,
		Current: current,
		Total:   total,
		Percent: (float64(current) / float64(total)) * 100,
	}

	if len(parts) >= 4 && parts[3] != "" {
		if eta, err := strconv.ParseInt(parts[3], 10, 64); err == nil {
			info.ETASeconds = eta
		}
	}

	return info, true
}
