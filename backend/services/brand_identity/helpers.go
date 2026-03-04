package brand_identity

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"mime"
	"net/url"
	"strings"
)

func (a *brandIdentity) processImageURL(
	ctx context.Context,
	rawURL string,
	orgId string,
) (*pbcore.MediaAsset, error) {
	if !services.IsImageTypeSupported(rawURL) {
		return nil, fmt.Errorf("image mime type not supported: %s", rawURL)
	}

	// Upload only if it's a Data URI
	if strings.HasPrefix(rawURL, "data:") {
		return a.processDataURI(ctx, rawURL, orgId)
	}

	// Otherwise return original URL as-is
	return a.mediaStore.UploadFromURL(ctx, rawURL, orgId)
}

func (a *brandIdentity) processDataURI(
	ctx context.Context,
	dataURI string,
	orgId string,
) (*pbcore.MediaAsset, error) {

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
