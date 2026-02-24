package services

import (
	"context"
	"fmt"
	"github.com/imagekit-developer/imagekit-go/v2"
	"github.com/pkg/errors"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"github.com/streamingfast/dstore"
	"io"
	"time"
)

type MediaStore interface {
	Upload(ctx context.Context, file io.Reader, orgId, fileName string) (*pbcore.UploadedMedia, error)
}

type gcpMediaStore struct {
	dStore dstore.Store
}

func NewGcpMediaStore() MediaStore {
	debugStore, err := dstore.NewStore(fmt.Sprintf("gs://%s", publicBucket), "", "", false)
	if err != nil {
		panic(fmt.Errorf("create gcp media store: %w", err))
	}
	return &gcpMediaStore{dStore: debugStore}
}

const (
	publicBucket     = "coasterai-public"
	assertFolder     = "assets"
	baseGCPBucketURL = "https://storage.googleapis.com"
)

func (g gcpMediaStore) Upload(ctx context.Context, file io.Reader, orgId, fileName string) (*pbcore.UploadedMedia, error) {

	fileBase := fmt.Sprintf("%s/%s/%s", assertFolder, orgId, fmt.Sprintf("%d-%s", time.Now().Unix(), fileName))
	err := g.dStore.WriteObject(ctx, fileBase, file)
	if err != nil {
		return nil, fmt.Errorf("unable to upload file %s: %w", fileName, err)
	}

	return &pbcore.UploadedMedia{
		Url:      fmt.Sprintf("%s/%s/%s", baseGCPBucketURL, publicBucket, fileBase),
		Width:    0,
		Height:   0,
		MimeType: "",
		Size:     0,
		FileId:   "",
		FileName: fileName,
	}, nil
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
	orgId string,
	fileName string,
) (*pbcore.UploadedMedia, error) {

	response, err := g.ik.Files.Upload(context.TODO(), imagekit.FileUploadParams{
		File:     file,
		FileName: fileName,
	})

	if err != nil {
		return nil, errors.Wrap(err, "Upload failed")
	}

	// create video thumbnail
	// right now, we allow only image and video
	//if response.FileType != "image" {
	//	response.ThumbnailURL = fmt.Sprintf("%s/ik-thumbnail.jpg", response.URL)
	//}

	result := &pbcore.UploadedMedia{
		Url:          response.URL,
		FileId:       response.FileID,
		FileName:     response.Name,
		Size:         float32(response.Size),
		Height:       float32(response.Height),
		Width:        float32(response.Width),
		MimeType:     response.FileType,
		ThumbnailUrl: response.ThumbnailURL,
		Duration:     utils.Ptr(float32(response.Duration)),
	}

	return result, nil
}
