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
	JobID                string  `json:"job_id"`
	Completed            bool    `json:"completed"`
	Succeeded            bool    `json:"succeeded"`
	VideoURL             string  `json:"video_url"`
	VideoBaseURL         string  `json:"video_base_url"`
	VideoExists          bool    `json:"video_exists"`
	FailureCode          int     `json:"failure_code"`
	FailureError         string  `json:"failure_error"`
	ExecutionName        string  `json:"execution_name"`
	ExecutionLogURL      string  `json:"execution_log_url"`
	RunningCount         int64   `json:"running_count"`
	SucceededCount       int64   `json:"succeeded_count"`
	FailedCount          int64   `json:"failed_count"`
	CancelledCount       int64   `json:"cancelled_count"`
	RetriedCount         int64   `json:"retried_count"`
	Progress             string  `json:"progress"`
	RenderPhase          string  `json:"render_phase"`
	RenderCurrent        int64   `json:"render_current"`
	RenderTotal          int64   `json:"render_total"`
	RenderPercent        float64 `json:"render_percent"`
	RenderETASeconds     int64   `json:"render_eta_seconds"`
	RenderHasETA         bool    `json:"render_has_eta"`
	RenderProgressSource string  `json:"render_progress_source"`
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

func (s *renderVideoService) PollJob(ctx context.Context, input *PollRenderJobInput) (*PollRenderJobOutput, error) {
	if input == nil {
		return nil, fmt.Errorf("input is required")
	}
	if input.JobID == "" {
		return nil, fmt.Errorf("job id is required")
	}
	if input.VideoID == "" {
		return nil, fmt.Errorf("video id is required")
	}
	if input.Version == "" {
		return nil, fmt.Errorf("version is required")
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

	out := &PollRenderJobOutput{
		JobID:          input.JobID,
		ExecutionName:  exec.Name,
		RunningCount:   exec.RunningCount,
		SucceededCount: exec.SucceededCount,
		FailedCount:    exec.FailedCount,
		CancelledCount: exec.CancelledCount,
		RetriedCount:   exec.RetriedCount,
	}

	// Execution is complete when completionTime is set
	out.Completed = exec.CompletionTime != ""

	// Apply log-based render progress
	if out.ExecutionName != "" {
		s.applyRenderLogsProgress(ctx, out)
	}

	// If not completed yet, return early
	if !out.Completed {
		return out, nil
	}

	// Determine success/failure
	if exec.SucceededCount > 0 {
		out.Succeeded = true
	} else if exec.FailedCount > 0 {
		out.Succeeded = false
		out.FailureCode = 1
		out.FailureError = "execution failed"
	}

	// Check output file in GCS
	fileBase := fmt.Sprintf("%s/%s.mp4", input.VideoID, input.Version)

	exists, err := s.outputStore.FileExists(ctx, fileBase)
	if err != nil {
		return nil, fmt.Errorf("check rendered file existence: %w", err)
	}

	out.VideoExists = exists
	if exists {
		out.VideoURL = fmt.Sprintf(
			"https://storage.googleapis.com/%s/%s",
			defaultOutputBucket,
			fileBase,
		)
		out.VideoBaseURL = fileBase
	}

	return out, nil
}

func applyExecutionProgress(out *PollRenderJobOutput, metadata []byte) {
	if len(metadata) == 0 {
		return
	}

	var execution struct {
		Name           string `json:"name"`
		LogURI         string `json:"logUri"`
		RunningCount   int64  `json:"runningCount"`
		SucceededCount int64  `json:"succeededCount"`
		FailedCount    int64  `json:"failedCount"`
		CancelledCount int64  `json:"cancelledCount"`
		RetriedCount   int64  `json:"retriedCount"`
	}

	if err := json.Unmarshal(metadata, &execution); err != nil {
		return
	}

	out.ExecutionName = execution.Name
	out.ExecutionLogURL = execution.LogURI
	out.RunningCount = execution.RunningCount
	out.SucceededCount = execution.SucceededCount
	out.FailedCount = execution.FailedCount
	out.CancelledCount = execution.CancelledCount
	out.RetriedCount = execution.RetriedCount
	out.Progress = fmt.Sprintf(
		"running=%d succeeded=%d failed=%d cancelled=%d retried=%d",
		execution.RunningCount,
		execution.SucceededCount,
		execution.FailedCount,
		execution.CancelledCount,
		execution.RetriedCount,
	)
}

func (s *renderVideoService) applyRenderLogsProgress(ctx context.Context, out *PollRenderJobOutput) {
	execID := out.ExecutionName
	if idx := strings.LastIndex(execID, "/"); idx >= 0 {
		execID = execID[idx+1:]
	}
	if execID == "" {
		return
	}

	filter := fmt.Sprintf(
		`resource.type="cloud_run_job" resource.labels.job_name="%s" resource.labels.location="%s" labels."run.googleapis.com/execution_name"="%s" (textPayload:"Rendered " OR textPayload:"Encoded ")`,
		defaultRenderJobName,
		defaultRenderRegion,
		execID,
	)

	resp, err := s.loggingService.Entries.List(&loggingapi.ListLogEntriesRequest{
		ResourceNames: []string{"projects/" + projectName},
		Filter:        filter,
		OrderBy:       "timestamp desc",
		PageSize:      50,
	}).Context(ctx).Do()
	if err != nil {
		s.logger.Debug("list log entries failed", zap.Error(err), zap.String("execution_id", execID))
		return
	}

	for _, entry := range resp.Entries {
		line := strings.TrimSpace(entry.TextPayload)
		if line == "" {
			continue
		}

		if s.tryApplyEncodedLine(out, line) {
			out.RenderProgressSource = "cloud_logging"
			return
		}
		if s.tryApplyRenderedLine(out, line) {
			out.RenderProgressSource = "cloud_logging"
			return
		}
	}
}

func (s *renderVideoService) tryApplyRenderedLine(out *PollRenderJobOutput, line string) bool {
	parts := renderLineRegex.FindStringSubmatch(line)
	if len(parts) == 0 {
		return false
	}

	current, err1 := strconv.ParseInt(parts[1], 10, 64)
	total, err2 := strconv.ParseInt(parts[2], 10, 64)
	if err1 != nil || err2 != nil || total <= 0 {
		return false
	}

	out.RenderPhase = "rendering"
	out.RenderCurrent = current
	out.RenderTotal = total
	out.RenderPercent = (float64(current) / float64(total)) * 100

	if len(parts) >= 4 && parts[3] != "" {
		eta, err := strconv.ParseInt(parts[3], 10, 64)
		if err == nil {
			out.RenderETASeconds = eta
			out.RenderHasETA = true
		}
	}

	return true
}

func (s *renderVideoService) tryApplyEncodedLine(out *PollRenderJobOutput, line string) bool {
	parts := encodeLineRegex.FindStringSubmatch(line)
	if len(parts) == 0 {
		return false
	}

	current, err1 := strconv.ParseInt(parts[1], 10, 64)
	total, err2 := strconv.ParseInt(parts[2], 10, 64)
	if err1 != nil || err2 != nil || total <= 0 {
		return false
	}

	out.RenderPhase = "encoding"
	out.RenderCurrent = current
	out.RenderTotal = total
	out.RenderPercent = (float64(current) / float64(total)) * 100
	out.RenderHasETA = false
	out.RenderETASeconds = 0

	return true
}
