package services

import (
	"bytes"
	"cloud.google.com/go/storage"
	"context"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/streamingfast/dstore"
	_ "golang.org/x/image/webp"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime"
	"net/http"
	"net/url"
	"path/filepath"
	"regexp"
	"strings"
	"time"
	"unicode"
)

type MediaStore interface {
	UploadFromURL(
		ctx context.Context,
		fileURL string,
		orgId string,
	) (*pbcore.MediaAsset, error)
	Upload(ctx context.Context, file io.Reader, orgId, fileName string) (*pbcore.MediaAsset, error)
	UploadCode(
		ctx context.Context,
		code string,
		fileName string,
	) (*pbcore.MediaAsset, error)
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

func IsImageTypeSupported(imageURL string) bool {
	if strings.HasPrefix(imageURL, "data:image/") {
		// For data URIs, check the MIME type in the header
		commaIdx := strings.Index(imageURL, ",")
		if commaIdx == -1 {
			return false
		}
		header := strings.ToLower(imageURL[:commaIdx])
		// Support PNG, JPEG, WebP, and SVG (SVG will be converted to PNG)
		return strings.Contains(header, "image/png") ||
			strings.Contains(header, "image/jpeg") ||
			strings.Contains(header, "image/webp") ||
			strings.Contains(header, "image/svg")
	}

	// For regular URLs, parse the URL to get the path component (ignoring query parameters)
	parsedURL, err := url.Parse(imageURL)
	if err != nil {
		// If parsing fails, fallback to checking the full URL string
		urlLower := strings.ToLower(imageURL)
		return strings.HasSuffix(urlLower, ".png") ||
			strings.HasSuffix(urlLower, ".jpeg") ||
			strings.HasSuffix(urlLower, ".jpg") ||
			strings.HasSuffix(urlLower, ".webp") ||
			strings.HasSuffix(urlLower, ".svg")
	}

	// Check the extension from the path component
	pathLower := strings.ToLower(parsedURL.Path)
	return strings.HasSuffix(pathLower, ".png") ||
		strings.HasSuffix(pathLower, ".jpeg") ||
		strings.HasSuffix(pathLower, ".jpg") ||
		strings.HasSuffix(pathLower, ".webp") ||
		strings.HasSuffix(pathLower, ".svg")
}

func DetectMediaType(contentType string) pbcore.MediaType {
	switch {
	case strings.HasPrefix(contentType, "image/svg"):
		return pbcore.MediaType_MEDIA_TYPE_SVG
	case strings.HasPrefix(contentType, "image/"):
		return pbcore.MediaType_MEDIA_TYPE_IMAGE
	case strings.HasPrefix(contentType, "video/"):
		return pbcore.MediaType_MEDIA_TYPE_VIDEO
	case strings.Contains(contentType, "text"):
		return pbcore.MediaType_MEDIA_TYPE_CODE
	default:
		return pbcore.MediaType_MEDIA_TYPE_UNDEFINED
	}
}

func (g gcpMediaStore) UploadFromURL(
	ctx context.Context,
	fileURL string,
	orgId string,
) (*pbcore.MediaAsset, error) {

	// ---- Download file ----
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, fileURL, nil)
	if err != nil {
		return nil, err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("download failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to download file: %s", resp.Status)
	}

	// ---- Determine filename ----
	fileName := ""

	// Try Content-Disposition
	if cd := resp.Header.Get("Content-Disposition"); cd != "" {
		_, params, _ := mime.ParseMediaType(cd)
		fileName = params["filename"]
	}

	// Fallback to URL path
	if fileName == "" {
		u, err := url.Parse(fileURL)
		if err == nil {
			fileName = filepath.Base(u.Path)
		}
	}

	if fileName == "" || fileName == "." || fileName == "/" {
		fileName = fmt.Sprintf("file-%d", time.Now().Unix())
	}

	// ---- Upload using existing upload logic ----
	return g.Upload(ctx, resp.Body, orgId, fileName)
}

func (g gcpMediaStore) UploadCode(
	ctx context.Context,
	code string,
	filePath string,
) (*pbcore.MediaAsset, error) {

	data := []byte(code)
	file := bytes.NewReader(data)

	obj := g.bucket.Object(filePath)
	writer := obj.NewWriter(ctx)

	writer.ContentType = "text/plain"
	writer.ContentDisposition = "inline"
	writer.CacheControl = "public, max-age=31536000"

	if _, err := io.Copy(writer, file); err != nil {
		return nil, fmt.Errorf("upload copy failed: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("writer close failed: %w", err)
	}

	return &pbcore.MediaAsset{
		Url:       fmt.Sprintf("%s/%s/%s", baseGCPBucketURL, publicBucket, filePath),
		FileName:  filepath.Base(filePath),
		MimeType:  "text/plain",
		Size:      float32(len(data)),
		MediaType: pbcore.MediaType_MEDIA_TYPE_CODE,
	}, nil
}

func (g gcpMediaStore) Upload(
	ctx context.Context,
	file io.Reader,
	orgId,
	fileName string,
) (*pbcore.MediaAsset, error) {

	safeFileName := normalizeFileName(fileName)

	objectPath := fmt.Sprintf("%s/%s/%d-%s",
		assertFolder,
		orgId,
		time.Now().Unix(),
		safeFileName,
	)

	// Read first 512 bytes
	buffer := make([]byte, 512)
	n, _ := file.Read(buffer)

	contentType := http.DetectContentType(buffer[:n])

	if contentType == "application/octet-stream" {
		extType := mime.TypeByExtension(filepath.Ext(safeFileName))
		if extType != "" {
			contentType = extType
		}
	}

	if strings.HasSuffix(strings.ToLower(safeFileName), ".svg") {
		contentType = "image/svg+xml"
	}

	// Restore reader
	file = io.MultiReader(bytes.NewReader(buffer[:n]), file)

	// Buffer file so we can compute metadata
	var buf bytes.Buffer
	size, err := io.Copy(&buf, file)
	if err != nil {
		return nil, err
	}

	reader := bytes.NewReader(buf.Bytes())

	mediaType := DetectMediaType(contentType)

	var width, height float32

	// Only extract dimensions for images
	if mediaType == pbcore.MediaType_MEDIA_TYPE_IMAGE &&
		!strings.Contains(contentType, "svg") {
		cfg, _, err := image.DecodeConfig(reader)
		if err == nil {
			width = float32(cfg.Width)
			height = float32(cfg.Height)
		}

		reader.Seek(0, io.SeekStart)
	}

	obj := g.bucket.Object(objectPath)
	writer := obj.NewWriter(ctx)

	writer.ContentType = contentType
	writer.ContentDisposition = "inline"
	writer.CacheControl = "public, max-age=31536000"

	if _, err := io.Copy(writer, reader); err != nil {
		return nil, fmt.Errorf("upload copy failed: %w", err)
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("writer close failed: %w", err)
	}

	return &pbcore.MediaAsset{
		Url:       fmt.Sprintf("%s/%s/%s", baseGCPBucketURL, publicBucket, objectPath),
		FileName:  safeFileName,
		MimeType:  contentType,
		Size:      float32(size),
		Width:     width,
		Height:    height,
		MediaType: mediaType,
	}, nil
}

//type imagekitMediaStore struct {
//	ik *imagekit.Client
//}
//
//func (g *imagekitMediaStore) UploadCode(ctx context.Context, code string, fileName string) (*pbcore.MediaAsset, error) {
//	//TODO implement me
//	panic("implement me")
//}
//
//func NewImagekitMediaStore(ik *imagekit.Client) MediaStore {
//	return &imagekitMediaStore{ik: ik}
//}
//
//func (g *imagekitMediaStore) Upload(
//	ctx context.Context,
//	file io.Reader,
//	orgId string,
//	fileName string,
//) (*pbcore.MediaAsset, error) {
//
//	response, err := g.ik.Files.Upload(context.TODO(), imagekit.FileUploadParams{
//		File:     file,
//		FileName: fileName,
//	})
//
//	if err != nil {
//		return nil, errors.Wrap(err, "Upload failed")
//	}
//
//	// create video thumbnail
//	// right now, we allow only image and video
//	//if response.FileType != "image" {
//	//	response.ThumbnailURL = fmt.Sprintf("%s/ik-thumbnail.jpg", response.URL)
//	//}
//
//	result := &pbcore.MediaAsset{
//		Url:          response.URL,
//		FileId:       response.FileID,
//		FileName:     response.Name,
//		Size:         float32(response.Size),
//		Height:       float32(response.Height),
//		Width:        float32(response.Width),
//		MimeType:     response.FileType,
//		ThumbnailUrl: response.ThumbnailURL,
//		Duration:     utils.Ptr(float32(response.Duration)),
//	}
//
//	return result, nil
//}
