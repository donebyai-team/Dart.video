package brand_identity

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"mime"
	"net/url"
	"strings"
)

func isImageTypeSupported(imageURL string) bool {
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

func (a *brandIdentity) processImageURL(
	ctx context.Context,
	rawURL string,
	orgId string,
) (*pbcore.UploadedMedia, error) {
	if !isImageTypeSupported(rawURL) {
		return nil, fmt.Errorf("image mime type not supported: %s", rawURL)
	}

	// Upload only if it's a Data URI
	if strings.HasPrefix(rawURL, "data:") {
		return a.processDataURI(ctx, rawURL, orgId)
	}

	// Otherwise return original URL as-is
	return &pbcore.UploadedMedia{
		Url: rawURL,
	}, nil
}

func (a *brandIdentity) processDataURI(
	ctx context.Context,
	dataURI string,
	orgId string,
) (*pbcore.UploadedMedia, error) {

	parts := strings.SplitN(dataURI, ",", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid data uri")
	}

	meta := parts[0]
	data := parts[1]

	// Extract MIME
	mimeType := "application/octet-stream"
	if strings.HasPrefix(meta, "data:") {
		mimeType = strings.TrimPrefix(strings.Split(meta, ";")[0], "data:")
	}

	var fileBytes []byte
	var err error

	if strings.Contains(meta, ";base64") {
		fileBytes, err = base64.StdEncoding.DecodeString(data)
		if err != nil {
			return nil, fmt.Errorf("base64 decode failed: %w", err)
		}
	} else {
		// URL decode in case of utf8-encoded SVG
		decoded, err := url.QueryUnescape(data)
		if err != nil {
			fileBytes = []byte(data)
		} else {
			fileBytes = []byte(decoded)
		}
	}

	// Determine extension
	fileName := "inline"
	if exts, _ := mime.ExtensionsByType(mimeType); len(exts) > 0 {
		fileName += exts[0]
	}

	reader := bytes.NewReader(fileBytes)

	return a.mediaStore.Upload(ctx, reader, orgId, fileName)
}
