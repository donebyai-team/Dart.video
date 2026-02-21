package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/services"
	"io"
	"net/http"
)

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]any{
		"error": message,
	})
}

func (h *UploadHandler) PollVideoProgress(w http.ResponseWriter, r *http.Request) {
	if h.renderVideoService == nil {
		writeJSONError(w, http.StatusServiceUnavailable, "render service unavailable")
		return
	}

	req, err := decodePollVideoProgressRequest(r)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	pollResult, err := h.renderVideoService.PollJob(r.Context(), &services.PollRenderJobInput{
		JobID:   req.JobID,
		VideoID: req.VideoID,
		Version: req.Version,
	})
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "poll render job failed: "+err.Error())
		return
	}

	// If video exists, stream it
	if pollResult.FileBaseURL != "" {
		reader, err := h.renderVideoService.DownloadFile(r.Context(), pollResult.FileBaseURL)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "download rendered video failed: "+err.Error())
			return
		}
		defer reader.Close()

		w.Header().Set("Content-Type", "video/mp4")
		w.Header().Set(
			"Content-Disposition",
			fmt.Sprintf("attachment; filename=\"%s\"", pollResult.FileBaseURL),
		)

		if _, err := io.Copy(w, reader); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "stream video failed: "+err.Error())
			return
		}
		return
	}

	// Otherwise return structured progress JSON
	writeJSON(w, http.StatusOK, pollResult)
}

func decodePollVideoProgressRequest(r *http.Request) (*services.PollRenderJobInput, error) {
	if r.Method != http.MethodGet && r.Method != http.MethodPost {
		return nil, errors.New("method not allowed")
	}

	if r.Method == http.MethodGet {
		q := r.URL.Query()
		req := &services.PollRenderJobInput{
			JobID:   firstNonEmpty(q.Get("jobId"), q.Get("job_id")),
			VideoID: firstNonEmpty(q.Get("videoId"), q.Get("video_id")),
			Version: q.Get("version"),
		}
		return req, req.Validate()
	}

	defer r.Body.Close()
	req := &services.PollRenderJobInput{}
	if err := json.NewDecoder(r.Body).Decode(req); err != nil {
		return nil, errors.New("invalid JSON body")
	}
	return req, req.Validate()
}
