package handlers

import (
	"encoding/json"
	"github.com/shank318/coasterai/auth"
	"github.com/shank318/coasterai/services"
	"net/http"
)

type UploadHandler struct {
	service            services.MediaStore
	renderVideoService services.RenderVideoService
}

func NewUploadHandler(service services.MediaStore, renderService services.RenderVideoService) *UploadHandler {
	return &UploadHandler{service: service, renderVideoService: renderService}
}

const maxUploadSize = 25 << 20 // 25MB

func (h *UploadHandler) UploadMedia(w http.ResponseWriter, r *http.Request) {
	actor, ok := auth.FromContext(r.Context())
	if !ok {
		http.Error(w, "unauthenticated user access", http.StatusUnauthorized)
		return
	}

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
		actor.OrganizationID,
		header.Filename,
	)
	if err != nil {
		http.Error(w, "Upload failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
