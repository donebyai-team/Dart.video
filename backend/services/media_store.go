package services

import (
	"bytes"
	"cloud.google.com/go/storage"
	"context"
	"fmt"
	"github.com/imagekit-developer/imagekit-go/v2"
	"github.com/pkg/errors"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/utils"
	"github.com/streamingfast/dstore"
	"io"
	"mime"
	"net/http"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"
)

type MediaStore interface {
	Upload(ctx context.Context, file io.Reader, orgId, fileName string) (*pbcore.UploadedMedia, error)
	UploadCode(
		ctx context.Context,
		code string,
		fileName string,
	) (*pbcore.UploadedMedia, error)
}

type gcpMediaStore struct {
	dStore dstore.Store
	client *storage.Client
	bucket *storage.BucketHandle
}

func NewGcpMediaStore() MediaStore {
	ctx := context.Background()

	debugStore, err := dstore.NewStore(fmt.Sprintf("gs://%s", publicBucket), "", "", false)
	if err != nil {
		panic(fmt.Errorf("create gcp media store: %w", err))
	}

	client, err := storage.NewClient(ctx)
	if err != nil {
		panic(fmt.Errorf("create storage client: %w", err))
	}

	return &gcpMediaStore{
		dStore: debugStore,
		client: client,
		bucket: client.Bucket(publicBucket),
	}
}

const (
	publicBucket     = "coasterai-public"
	assertFolder     = "assets"
	codeFolder       = "templates"
	baseGCPBucketURL = "https://storage.googleapis.com"
)

func normalizeFileName(name string) string {
	// Extract only the base name (prevents ../../ attacks)
	name = filepath.Base(name)

	// Lowercase
	name = strings.ToLower(name)

	// Remove emojis & non-ascii characters
	name = strings.Map(func(r rune) rune {
		if r > unicode.MaxASCII {
			return -1
		}
		return r
	}, name)

	// Replace spaces with dash
	name = strings.ReplaceAll(name, " ", "-")

	// Allow only a-z, 0-9, dot, dash, underscore
	reg := regexp.MustCompile(`[^a-z0-9.\-_]`)
	name = reg.ReplaceAllString(name, "")

	return name
}

func (g gcpMediaStore) UploadCode(
	ctx context.Context,
	code string,
	filePath string,
) (*pbcore.UploadedMedia, error) {

	file := bytes.NewReader([]byte(code))

	obj := g.bucket.Object(filePath)
	writer := obj.NewWriter(ctx)

	// Keep minimal metadata
	writer.ContentDisposition = "inline"
	writer.CacheControl = "public, max-age=31536000"

	if _, err := io.Copy(writer, file); err != nil {
		return nil, fmt.Errorf("upload copy failed: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("writer close failed: %w", err)
	}

	return &pbcore.UploadedMedia{
		Url:      fmt.Sprintf("%s/%s/%s", baseGCPBucketURL, publicBucket, filePath),
		FileName: filePath,
		MimeType: "",
	}, nil
}

func (g gcpMediaStore) Upload(
	ctx context.Context,
	file io.Reader,
	orgId,
	fileName string,
) (*pbcore.UploadedMedia, error) {

	safeFileName := normalizeFileName(fileName)

	objectPath := fmt.Sprintf("%s/%s/%d-%s",
		assertFolder,
		orgId,
		time.Now().Unix(),
		safeFileName,
	)

	// ---- Detect MIME ----
	buffer := make([]byte, 512)
	n, _ := file.Read(buffer)
	contentType := http.DetectContentType(buffer[:n])

	if contentType == "application/octet-stream" {
		extType := mime.TypeByExtension(filepath.Ext(safeFileName))
		if extType != "" {
			contentType = extType
		}
	}

	// After DetectContentType
	if strings.HasSuffix(strings.ToLower(safeFileName), ".svg") {
		contentType = "image/svg+xml"
	}

	file = io.MultiReader(bytes.NewReader(buffer[:n]), file)

	// ---- Upload using storage client ----
	obj := g.bucket.Object(objectPath)
	writer := obj.NewWriter(ctx)

	writer.ContentType = contentType
	writer.ContentDisposition = "inline"
	writer.CacheControl = "public, max-age=31536000"

	if _, err := io.Copy(writer, file); err != nil {
		return nil, fmt.Errorf("upload copy failed: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("writer close failed: %w", err)
	}

	return &pbcore.UploadedMedia{
		Url:      fmt.Sprintf("%s/%s/%s", baseGCPBucketURL, publicBucket, objectPath),
		FileName: safeFileName,
		MimeType: contentType,
	}, nil
}

type imagekitMediaStore struct {
	ik *imagekit.Client
}

func (g *imagekitMediaStore) UploadCode(ctx context.Context, code string, fileName string) (*pbcore.UploadedMedia, error) {
	//TODO implement me
	panic("implement me")
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
