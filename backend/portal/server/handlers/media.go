package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path"

	"github.com/shank318/coasterai/services"
	"github.com/streamingfast/dstore"
)

type UploadHandler struct {
	service            services.MediaStore
	renderVideoService services.RenderVideoService
}

func NewUploadHandler(service services.MediaStore) *UploadHandler {
	return &UploadHandler{service: service}
}

const maxUploadSize = 10 << 20 // 10MB

func (h *UploadHandler) PollVideoProgress(w http.ResponseWriter, r *http.Request) {
	if h.renderVideoService == nil {
		http.Error(w, "render service unavailable", http.StatusServiceUnavailable)
		return
	}

	req, err := decodePollVideoProgressRequest(r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	pollResult, err := h.renderVideoService.PollJob(r.Context(), &services.PollRenderJobInput{
		JobID:   req.JobID,
		VideoID: req.VideoID,
		Version: req.Version,
	})
	if err != nil {
		http.Error(w, "poll render job failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	if pollResult.VideoExists {
		if err := streamRenderedVideoFromDStore(w, r, req.VideoID, req.Version); err != nil {
			http.Error(w, "download rendered video failed: "+err.Error(), http.StatusInternalServerError)
			return
		}
		return
	}

	resp := map[string]any{
		"jobId":                pollResult.JobID,
		"completed":            pollResult.Completed,
		"succeeded":            pollResult.Succeeded,
		"videoExists":          pollResult.VideoExists,
		"failureCode":          pollResult.FailureCode,
		"failureError":         pollResult.FailureError,
		"executionName":        pollResult.ExecutionName,
		"executionLogUrl":      pollResult.ExecutionLogURL,
		"runningCount":         pollResult.RunningCount,
		"succeededCount":       pollResult.SucceededCount,
		"failedCount":          pollResult.FailedCount,
		"cancelledCount":       pollResult.CancelledCount,
		"retriedCount":         pollResult.RetriedCount,
		"progress":             pollResult.Progress,
		"renderPhase":          pollResult.RenderPhase,
		"renderCurrent":        pollResult.RenderCurrent,
		"renderTotal":          pollResult.RenderTotal,
		"renderPercent":        pollResult.RenderPercent,
		"renderEtaSeconds":     pollResult.RenderETASeconds,
		"renderHasEta":         pollResult.RenderHasETA,
		"renderProgressSource": pollResult.RenderProgressSource,
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(resp)
}

func (h *UploadHandler) UploadMedia(w http.ResponseWriter, r *http.Request) {

	// Hard limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	file, header, err := r.FormFile("file")
	if err != nil {

		// Detect if file too large
		if err.Error() == "http: request body too large" {
			http.Error(w, "File too large. Max size is 10MB", http.StatusRequestEntityTooLarge)
			return
		}

		http.Error(w, "Invalid file upload", http.StatusBadRequest)
		return
	}
	defer file.Close()

	result, err := h.service.Upload(
		r.Context(),
		file,
		header.Filename,
	)
	if err != nil {
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

type pollVideoProgressRequest struct {
	JobID   string `json:"jobId"`
	VideoID string `json:"videoId"`
	Version string `json:"version"`
}

func decodePollVideoProgressRequest(r *http.Request) (*pollVideoProgressRequest, error) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		return nil, errors.New("method not allowed")
	}

	if r.Method == http.MethodGet {
		q := r.URL.Query()
		req := &pollVideoProgressRequest{
			JobID:   firstNonEmpty(q.Get("jobId"), q.Get("job_id")),
			VideoID: firstNonEmpty(q.Get("videoId"), q.Get("video_id")),
			Version: q.Get("version"),
		}
		return req, req.validate()
	}

	defer r.Body.Close()
	req := &pollVideoProgressRequest{}
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		return nil, errors.New("invalid JSON body")
	}
	return req, req.validate()
}

func (r *pollVideoProgressRequest) validate() error {
	if r.JobID == "" {
		return errors.New("jobId is required")
	}
	if r.VideoID == "" {
		return errors.New("videoId is required")
	}
	if r.Version == "" {
		return errors.New("version is required")
	}
	return nil
}

func streamRenderedVideoFromDStore(w http.ResponseWriter, r *http.Request, videoID, version string) error {
	bucket, err := getStorageBucketFromFirebaseConfig()
	if err != nil {
		return err
	}

	store, err := dstore.NewStore("gs://"+bucket, "", "", false)
	if err != nil {
		return fmt.Errorf("create bucket store: %w", err)
	}

	objectBase := path.Join(videoID, version+".mp4")
	reader, err := store.OpenObject(r.Context(), objectBase)
	if err != nil {
		return fmt.Errorf("open object %q: %w", objectBase, err)
	}
	defer reader.Close()

	w.Header().Set("Content-Type", "video/mp4")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s-%s.mp4\"", videoID, version))

	if _, err := io.Copy(w, reader); err != nil {
		return fmt.Errorf("stream object bytes: %w", err)
	}
	return nil
}

func getStorageBucketFromFirebaseConfig() (string, error) {
	paths := []string{"/app/firebase-config.json", "firebase-config.json"}

	for _, filePath := range paths {
		content, err := os.ReadFile(filePath)
		if err != nil {
			continue
		}

		var cfg struct {
			StorageBucketSnake string `json:"storage_bucket"`
			StorageBucketCamel string `json:"storageBucket"`
		}
		if err := json.Unmarshal(content, &cfg); err != nil {
			return "", fmt.Errorf("parse %s: %w", filePath, err)
		}

		bucket := firstNonEmpty(cfg.StorageBucketSnake, cfg.StorageBucketCamel)
		if bucket == "" {
			return "", fmt.Errorf("storage bucket missing in %s", filePath)
		}
		return bucket, nil
	}

	return "", errors.New("firebase-config.json not found")
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
