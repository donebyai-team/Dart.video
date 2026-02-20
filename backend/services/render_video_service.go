package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"os"
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
	defaultJobIDTTL      = 6 * time.Hour
)

var (
	renderLineRegex = regexp.MustCompile(`Rendered\s+(\d+)\/(\d+)(?:,\s*time remaining:\s*(\d+)s)?`)
	encodeLineRegex = regexp.MustCompile(`Encoded\s+(\d+)\/(\d+)`)
)

type RenderVideoService interface {
	SubmitJob(ctx context.Context, input *SubmitRenderJobInput) (jobID string, err error)
	PollJob(ctx context.Context, input *PollRenderJobInput) (*PollRenderJobOutput, error)
}

type RenderVideoServiceConfig struct {
	// Optional. If empty, loaded from firebase-config.json project_id.
	ProjectID string
	// Optional. Defaults to asia-east1.
	Region string
	// Optional. Defaults to remotion-renderer.
	JobName string
	// Optional. If empty, loaded from firebase-config.json storage_bucket/storageBucket.
	OutputBucket string

	// Optional. If nil, a gs:// store is created from OutputBucket.
	OutputStore dstore.Store

	// Optional. If set, used to dedupe submissions by videoId:version.
	Cache Cache
	// Optional. TTL for cached job IDs. Defaults to 6 hours.
	JobIDTTL time.Duration
}

type SubmitRenderJobInput struct {
	Props *pbcore.Video
}

type PollRenderJobInput struct {
	JobID   string
	VideoID string
	Version string
}

type PollRenderJobOutput struct {
	JobID        string
	Completed    bool
	Succeeded    bool
	VideoURL     string
	VideoExists  bool
	FailureCode  int
	FailureError string

	ExecutionName   string
	ExecutionLogURL string
	RunningCount    int64
	SucceededCount  int64
	FailedCount     int64
	CancelledCount  int64
	RetriedCount    int64
	Progress        string

	RenderPhase          string
	RenderCurrent        int64
	RenderTotal          int64
	RenderPercent        float64
	RenderETASeconds     int64
	RenderHasETA         bool
	RenderProgressSource string
}

type renderVideoService struct {
	cfg            RenderVideoServiceConfig
	logger         *zap.Logger
	runService     *run.Service
	loggingService *loggingapi.Service
	outputStore    dstore.Store
	cache          Cache
	jobIDTTL       time.Duration
}

type firebaseConfig struct {
	ProjectID      string `json:"project_id"`
	StorageBucket  string `json:"storage_bucket"`
	StorageBucket2 string `json:"storageBucket"`
}

func NewRenderVideoService(ctx context.Context, cfg RenderVideoServiceConfig, logger *zap.Logger) (RenderVideoService, error) {
	if logger == nil {
		logger = zap.NewNop()
	}

	resolvedProjectID := cfg.ProjectID
	resolvedOutputBucket := cfg.OutputBucket

	if resolvedProjectID == "" || resolvedOutputBucket == "" {
		fbCfg, err := loadFirebaseConfig()
		if err != nil {
			return nil, fmt.Errorf("load firebase-config.json: %w", err)
		}

		if resolvedProjectID == "" {
			resolvedProjectID = fbCfg.ProjectID
		}
		if resolvedOutputBucket == "" {
			if fbCfg.StorageBucket != "" {
				resolvedOutputBucket = fbCfg.StorageBucket
			} else {
				resolvedOutputBucket = fbCfg.StorageBucket2
			}
		}
	}

	if resolvedProjectID == "" {
		return nil, fmt.Errorf("project id is required (set in config or firebase-config.json)")
	}
	if resolvedOutputBucket == "" {
		return nil, fmt.Errorf("output bucket is required (set in config or firebase-config.json)")
	}

	if cfg.Region == "" {
		cfg.Region = defaultRenderRegion
	}
	if cfg.JobName == "" {
		cfg.JobName = defaultRenderJobName
	}
	if cfg.JobIDTTL <= 0 {
		cfg.JobIDTTL = defaultJobIDTTL
	}

	cfg.ProjectID = resolvedProjectID
	cfg.OutputBucket = resolvedOutputBucket

	runService, err := run.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("create cloud run service client: %w", err)
	}

	loggingService, err := loggingapi.NewService(ctx)
	if err != nil {
		return nil, fmt.Errorf("create cloud logging service client: %w", err)
	}

	store := cfg.OutputStore
	if store == nil {
		bucketStore, err := dstore.NewStore("gs://"+cfg.OutputBucket, "", "", false)
		if err != nil {
			return nil, fmt.Errorf("create output store: %w", err)
		}
		store = bucketStore
	}

	return &renderVideoService{
		cfg:            cfg,
		logger:         logger,
		runService:     runService,
		loggingService: loggingService,
		outputStore:    store,
		cache:          cfg.Cache,
		jobIDTTL:       cfg.JobIDTTL,
	}, nil
}

func (s *renderVideoService) SubmitJob(ctx context.Context, input *SubmitRenderJobInput) (string, error) {
	if input == nil {
		return "", fmt.Errorf("input is required")
	}

	cacheKey := fmt.Sprintf("%s:%s", input.Props.Id, input.Props.Version)
	if s.cache != nil {
		cachedJobID, err := s.cache.GetKey(ctx, cacheKey)
		switch {
		case err == nil && cachedJobID != "":
			s.logger.Info("render job cache hit", zap.String("cache_key", cacheKey), zap.String("job_id", cachedJobID))
			return cachedJobID, nil
		case errors.Is(err, ErrCacheMiss):
			// no-op
		case err != nil:
			s.logger.Warn("render job cache get failed", zap.String("cache_key", cacheKey), zap.Error(err))
		}
	}

	proto, err := utils.MarshalProto(input.Props)
	if err != nil {
		return "", errors.New(fmt.Sprintf("marshal proto: %w", err))
	}
	propsB64 := base64.StdEncoding.EncodeToString(proto)

	request := &run.GoogleCloudRunV2RunJobRequest{
		Overrides: &run.GoogleCloudRunV2Overrides{
			ContainerOverrides: []*run.GoogleCloudRunV2ContainerOverride{
				{
					Env: []*run.GoogleCloudRunV2EnvVar{{Name: "RENDER_INPUT_PROPS_B64", Value: propsB64}},
				},
			},
		},
	}

	jobName := fmt.Sprintf("projects/%s/locations/%s/jobs/%s", s.cfg.ProjectID, s.cfg.Region, s.cfg.JobName)
	op, err := s.runService.Projects.Locations.Jobs.Run(jobName, request).Context(ctx).Do()
	if err != nil {
		return "", fmt.Errorf("submit cloud run job: %w", err)
	}
	if op.Name == "" {
		return "", fmt.Errorf("submit response missing operation name")
	}

	if s.cache != nil {
		if err := s.cache.SetKey(ctx, cacheKey, op.Name, s.jobIDTTL); err != nil {
			s.logger.Warn("render job cache set failed", zap.String("cache_key", cacheKey), zap.Error(err))
		}
	}

	s.logger.Info("submitted render job",
		zap.String("operation_name", op.Name),
		zap.String("video_id", input.Props.Id),
		zap.Int("version", int(input.Props.Version)),
	)
	return op.Name, nil
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

	opName := input.JobID
	const opPrefix = "https://run.googleapis.com/v2/"
	if strings.HasPrefix(opName, opPrefix) {
		opName = strings.TrimPrefix(opName, opPrefix)
	}

	op, err := s.runService.Projects.Locations.Operations.Get(opName).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("poll cloud run job: %w", err)
	}

	out := &PollRenderJobOutput{
		JobID:     input.JobID,
		Completed: op.Done,
	}

	applyExecutionProgress(out, op.Metadata)
	if out.ExecutionName != "" {
		s.applyRenderLogsProgress(ctx, out)
	}

	if !op.Done {
		return out, nil
	}

	if op.Error != nil {
		out.FailureCode = int(op.Error.Code)
		out.FailureError = op.Error.Message
		return out, nil
	}

	fileBase := fmt.Sprintf("%s/%s.mp4", input.VideoID, input.Version)
	exists, err := s.outputStore.FileExists(ctx, fileBase)
	if err != nil {
		return nil, fmt.Errorf("check rendered file existence: %w", err)
	}

	out.Succeeded = exists
	out.VideoExists = exists
	if exists {
		out.VideoURL = fmt.Sprintf("https://storage.googleapis.com/%s/%s", s.cfg.OutputBucket, fileBase)
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
		s.cfg.JobName,
		s.cfg.Region,
		execID,
	)

	resp, err := s.loggingService.Entries.List(&loggingapi.ListLogEntriesRequest{
		ResourceNames: []string{"projects/" + s.cfg.ProjectID},
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

func loadFirebaseConfig() (*firebaseConfig, error) {
	paths := []string{
		"/app/firebase-config.json",
		"firebase-config.json",
	}

	var lastErr error
	for _, path := range paths {
		content, err := os.ReadFile(path)
		if err != nil {
			lastErr = err
			continue
		}

		cfg := &firebaseConfig{}
		if err := json.Unmarshal(content, cfg); err != nil {
			return nil, fmt.Errorf("parse %s: %w", path, err)
		}
		return cfg, nil
	}

	if lastErr != nil {
		return nil, lastErr
	}
	return nil, fmt.Errorf("firebase-config.json not found")
}
