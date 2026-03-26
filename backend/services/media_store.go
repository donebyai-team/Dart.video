package services

import (
	"bytes"
	"cloud.google.com/go/storage"
	"context"
	"encoding/xml"
	"fmt"
	"github.com/abema/go-mp4"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/streamingfast/dstore"
	"go.uber.org/zap"
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
	"strconv"
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
	DownloadCode(ctx context.Context, url string) (string, error)
}

type gcpMediaStore struct {
	dStore dstore.Store
	client *storage.Client
	bucket *storage.BucketHandle
	db     datastore.Repository
	logger *zap.Logger
}

func NewGcpMediaStore(db datastore.Repository, logger *zap.Logger) MediaStore {
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
		db:     db,
		logger: logger,
	}
}

const (
	publicBucket     = "coasterai-public"
	assertFolder     = "assets"
	codeFolder       = "templates"
	baseGCPBucketURL = "https://storage.googleapis.com"
)

func GetPublicBucketURL() string {
	return fmt.Sprintf("%s/%s", baseGCPBucketURL, publicBucket)
}

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

func (g gcpMediaStore) DownloadCode(ctx context.Context, url string) (string, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download code: status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
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
		Url:       fmt.Sprintf("%s/%s", GetPublicBucketURL(), filePath),
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

	width, height, duration := g.extractMediaDimensions(reader, mediaType, contentType)

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

	// Save in DB
	asset, err := g.db.CreateMediaAsset(ctx, &models.MediaAsset{
		OrganizationID: orgId,
		Path:           objectPath,
		MimeType:       contentType,
		MediaType:      mediaType,
		Metadata: models.AssetMetadata{
			Width:    int(width),
			Height:   int(height),
			FileName: safeFileName,
			Size:     size,
			Duration: duration,
		},
	})
	if err != nil {
		return nil, err
	}

	return &pbcore.MediaAsset{
		Url:       fmt.Sprintf("%s/%s", GetPublicBucketURL(), objectPath),
		FileName:  safeFileName,
		MimeType:  contentType,
		Size:      float32(size),
		Width:     width,
		Height:    height,
		MediaType: mediaType,
		Id:        asset.ID,
	}, nil
}

func (g gcpMediaStore) extractMediaDimensions(reader io.ReadSeeker, mediaType pbcore.MediaType, contentType string) (float32, float32, float64) {
	defer func(reader io.ReadSeeker, offset int64, whence int) {
		_, err := reader.Seek(offset, whence)
		if err != nil {
			g.logger.Error("seek failed", zap.Error(err))
		}
	}(reader, 0, io.SeekStart)

	switch mediaType {
	case pbcore.MediaType_MEDIA_TYPE_IMAGE:
		cfg, _, err := image.DecodeConfig(reader)
		if err != nil {
			return 0, 0, 0
		}
		return float32(cfg.Width), float32(cfg.Height), 0
	case pbcore.MediaType_MEDIA_TYPE_SVG:
		if !strings.Contains(contentType, "svg") {
			return 0, 0, 0
		}
		w, h := extractSVGDimensions(reader)
		return w, h, 0
	case pbcore.MediaType_MEDIA_TYPE_VIDEO:
		w, h, duration, err := extractMP4Metadata(reader)
		if err != nil {
			return 0, 0, 0
		}
		return float32(w), float32(h), duration
	default:
		return 0, 0, 0
	}
}

func extractMP4Metadata(reader io.ReadSeeker) (width, height, duration float64, err error) {
	mvhdBoxes, err := mp4.ExtractBoxWithPayload(reader, nil, mp4.BoxPath{mp4.BoxTypeMoov(), mp4.BoxTypeMvhd()})
	if err != nil {
		return 0, 0, 0, err
	}

	if len(mvhdBoxes) > 0 {
		mvhd := mvhdBoxes[0].Payload.(*mp4.Mvhd)
		if mvhd.Timescale > 0 {
			movieDuration := mvhd.DurationV1
			if mvhd.Version == 0 {
				movieDuration = uint64(mvhd.DurationV0)
			}
			duration = float64(movieDuration) / float64(mvhd.Timescale)
		}
	}

	trakBoxes, err := mp4.ExtractBox(reader, nil, mp4.BoxPath{mp4.BoxTypeMoov(), mp4.BoxTypeTrak()})
	if err != nil {
		return 0, 0, duration, err
	}

	for _, trak := range trakBoxes {
		trackBoxes, err := mp4.ExtractBoxesWithPayload(reader, trak, []mp4.BoxPath{
			{mp4.BoxTypeTkhd()},
			{mp4.BoxTypeMdia(), mp4.BoxTypeHdlr()},
			{mp4.BoxTypeMdia(), mp4.BoxTypeMdhd()},
		})
		if err != nil {
			continue
		}

		var tkhd *mp4.Tkhd
		var hdlr *mp4.Hdlr
		var mdhd *mp4.Mdhd

		for _, box := range trackBoxes {
			switch box.Info.Type {
			case mp4.BoxTypeTkhd():
				tkhd = box.Payload.(*mp4.Tkhd)
			case mp4.BoxTypeHdlr():
				hdlr = box.Payload.(*mp4.Hdlr)
			case mp4.BoxTypeMdhd():
				mdhd = box.Payload.(*mp4.Mdhd)
			}
		}

		if hdlr == nil || string(hdlr.HandlerType[:]) != "vide" {
			continue
		}

		if tkhd != nil {
			// Width/height are stored as 16.16 fixed-point values.
			width = float64(tkhd.Width) / 65536
			height = float64(tkhd.Height) / 65536
		}

		if duration == 0 && mdhd != nil && mdhd.Timescale > 0 {
			duration = float64(mdhd.GetDuration()) / float64(mdhd.Timescale)
		}

		return width, height, duration, nil
	}

	return width, height, duration, nil
}

func extractSVGDimensions(reader io.Reader) (float32, float32) {
	decoder := xml.NewDecoder(reader)

	for {
		token, err := decoder.Token()
		if err != nil {
			return 0, 0
		}

		start, ok := token.(xml.StartElement)
		if !ok || start.Name.Local != "svg" {
			continue
		}

		var width, height float32
		var okWidth, okHeight bool
		var viewBox string

		for _, attr := range start.Attr {
			switch attr.Name.Local {
			case "width":
				width, okWidth = parseSVGLength(attr.Value)
			case "height":
				height, okHeight = parseSVGLength(attr.Value)
			case "viewBox":
				viewBox = attr.Value
			}
		}

		if okWidth && okHeight {
			return width, height
		}

		if viewBox != "" {
			viewBoxWidth, viewBoxHeight, ok := parseSVGViewBox(viewBox)
			if ok {
				if !okWidth {
					width = viewBoxWidth
				}
				if !okHeight {
					height = viewBoxHeight
				}
			}
		}

		if width > 0 && height > 0 {
			return width, height
		}

		return 0, 0
	}
}

var svgLengthPattern = regexp.MustCompile(`^[+-]?(?:\d+(?:\.\d+)?|\.\d+)`)

func parseSVGLength(raw string) (float32, bool) {
	match := svgLengthPattern.FindString(strings.TrimSpace(raw))
	if match == "" {
		return 0, false
	}

	value, err := strconv.ParseFloat(match, 32)
	if err != nil || value <= 0 {
		return 0, false
	}

	return float32(value), true
}

func parseSVGViewBox(raw string) (float32, float32, bool) {
	parts := strings.FieldsFunc(strings.TrimSpace(raw), func(r rune) bool {
		return r == ',' || unicode.IsSpace(r)
	})
	if len(parts) != 4 {
		return 0, 0, false
	}

	width, err := strconv.ParseFloat(parts[2], 32)
	if err != nil || width <= 0 {
		return 0, 0, false
	}

	height, err := strconv.ParseFloat(parts[3], 32)
	if err != nil || height <= 0 {
		return 0, 0, false
	}

	return float32(width), float32(height), true
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
