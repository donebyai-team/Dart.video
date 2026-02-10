package services

import (
	"context"
	"github.com/imagekit-developer/imagekit-go/v2"
	"github.com/pkg/errors"
	"io"
)

type Media struct {
	URL          string  `json:"url"`
	FileID       string  `json:"fileId"`
	FileName     string  `json:"fileName"`
	Size         float64 `json:"size"`
	Height       float64 `json:"height,omitempty"`
	Width        float64 `json:"width,omitempty"`
	MimeType     string  `json:"mimeType,omitempty"`
	ThumbnailURL string  `json:"thumbnailUrl,omitempty"`
}

type MediaStore interface {
	Upload(ctx context.Context, file io.Reader, fileName string) (*Media, error)
}

type imagekitMediaStore struct {
	ik *imagekit.Client
}

func NewImagekitMediaStore(ik *imagekit.Client) MediaStore {
	return &imagekitMediaStore{ik: ik}
}

func (g *imagekitMediaStore) Upload(
	ctx context.Context,
	file io.Reader,
	fileName string,
) (*Media, error) {

	response, err := g.ik.Files.Upload(context.TODO(), imagekit.FileUploadParams{
		File:     file,
		FileName: fileName,
	})

	if err != nil {
		return nil, errors.Wrap(err, "Upload failed")
	}

	result := &Media{
		URL:          response.URL,
		FileID:       response.FileID,
		FileName:     response.Name,
		Size:         response.Size,
		Height:       response.Height,
		Width:        response.Width,
		MimeType:     response.FileType,
		ThumbnailURL: response.ThumbnailURL,
	}

	return result, nil
}
