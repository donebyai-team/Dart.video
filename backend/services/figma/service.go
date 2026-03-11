package figma

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"path/filepath"
	"strings"

	figmaoauth "github.com/shank318/coasterai/integrations/figma"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
)

type Service interface {
	ParseFileKey(input string) (string, error)
	ListFrames(ctx context.Context, accessToken string, req *pbportal.ListFigmaFramesRequest) (*pbportal.ListFigmaFramesResponse, error)
	ImportFrame(ctx context.Context, accessToken string, fileKey, nodeID, orgID string) (*pbportal.ImportFigmaFrameResponse, error)
}

type service struct {
	oauth      *figmaoauth.OauthClient
	mediaStore services.MediaStore
}

func NewService(oauth *figmaoauth.OauthClient, mediaStore services.MediaStore) Service {
	return &service{
		oauth:      oauth,
		mediaStore: mediaStore,
	}
}

func (s *service) ParseFileKey(input string) (string, error) {
	trimmed := strings.TrimSpace(input)
	if trimmed == "" {
		return "", fmt.Errorf("figma file key is required")
	}

	if !strings.Contains(trimmed, "://") {
		return trimmed, nil
	}

	u, err := url.Parse(trimmed)
	if err != nil {
		return "", fmt.Errorf("invalid figma url: %w", err)
	}

	parts := strings.Split(strings.Trim(u.Path, "/"), "/")
	for i := 0; i < len(parts)-1; i++ {
		if parts[i] == "file" {
			return parts[i+1], nil
		}
	}

	return "", fmt.Errorf("could not extract figma file key from url")
}

func (s *service) ListFrames(ctx context.Context, accessToken string, req *pbportal.ListFigmaFramesRequest) (*pbportal.ListFigmaFramesResponse, error) {
	fileKey := req.FileKey
	if fileKey == "" {
		var err error
		fileKey, err = s.ParseFileKey(req.FileUrl)
		if err != nil {
			return nil, err
		}
	}

	fileResp, err := s.getFile(ctx, accessToken, fileKey)
	if err != nil {
		return nil, err
	}

	query := strings.TrimSpace(strings.ToLower(req.GetQuery()))
	frameNodes := collectFrames(fileResp.Document, query)
	imageURLs, err := s.getImages(ctx, accessToken, fileKey, frameNodes)
	if err != nil {
		return nil, err
	}

	frames := make([]*pbportal.FigmaFrame, 0, len(frameNodes))
	for _, node := range frameNodes {
		frames = append(frames, &pbportal.FigmaFrame{
			FileKey:      fileKey,
			FileName:     fileResp.Name,
			NodeId:       node.ID,
			Name:         node.Name,
			ThumbnailUrl: imageURLs[node.ID],
			Width:        node.AbsoluteBoundingBox.Width,
			Height:       node.AbsoluteBoundingBox.Height,
		})
	}

	return &pbportal.ListFigmaFramesResponse{
		FileKey:  fileKey,
		FileName: fileResp.Name,
		Frames:   frames,
	}, nil
}

func (s *service) ImportFrame(ctx context.Context, accessToken string, fileKey, nodeID, orgID string) (*pbportal.ImportFigmaFrameResponse, error) {
	images, err := s.getImages(ctx, accessToken, fileKey, []figmaNode{{ID: nodeID}})
	if err != nil {
		return nil, err
	}

	imageURL := images[nodeID]
	if imageURL == "" {
		return nil, fmt.Errorf("figma did not return an image for node %s", nodeID)
	}

	asset, err := s.mediaStore.UploadFromURL(ctx, imageURL, orgID)
	if err != nil {
		return nil, err
	}
	asset = mediaAssetFromImported(asset, fileKey, nodeID, imageURL)

	return &pbportal.ImportFigmaFrameResponse{
		Asset: asset,
		Frame: &pbportal.FigmaFrame{
			FileKey:      fileKey,
			NodeId:       nodeID,
			ThumbnailUrl: imageURL,
		},
	}, nil
}

type figmaFileResponse struct {
	Name     string    `json:"name"`
	Document figmaNode `json:"document"`
}

type figmaNode struct {
	ID                  string      `json:"id"`
	Name                string      `json:"name"`
	Type                string      `json:"type"`
	Children            []figmaNode `json:"children"`
	AbsoluteBoundingBox struct {
		Width  float32 `json:"width"`
		Height float32 `json:"height"`
	} `json:"absoluteBoundingBox"`
}

type figmaImagesResponse struct {
	Images map[string]string `json:"images"`
}

func (s *service) getFile(ctx context.Context, accessToken, fileKey string) (*figmaFileResponse, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, figmaoauth.FilesAPIURL(fileKey), nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("figma file request failed: %s", resp.Status)
	}

	var out figmaFileResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return &out, nil
}

func (s *service) getImages(ctx context.Context, accessToken, fileKey string, nodes []figmaNode) (map[string]string, error) {
	if len(nodes) == 0 {
		return map[string]string{}, nil
	}

	nodeIDs := make([]string, 0, len(nodes))
	for _, node := range nodes {
		nodeIDs = append(nodeIDs, node.ID)
	}

	req, err := http.NewRequestWithContext(
		ctx,
		http.MethodGet,
		figmaoauth.ImagesURL(fileKey, nodeIDs),
		nil,
	)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("figma images request failed: %s", resp.Status)
	}

	var out figmaImagesResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out.Images, nil
}

func collectFrames(root figmaNode, query string) []figmaNode {
	var frames []figmaNode

	var walk func(node figmaNode)
	walk = func(node figmaNode) {
		if (node.Type == "FRAME" || node.Type == "COMPONENT" || node.Type == "SECTION") &&
			(query == "" || strings.Contains(strings.ToLower(node.Name), query)) {
			frames = append(frames, node)
		}

		for _, child := range node.Children {
			walk(child)
		}
	}

	walk(root)
	return frames
}

func buildImportFileName(fileKey, nodeID, imageURL string) string {
	ext := filepath.Ext(imageURL)
	if ext == "" {
		ext = ".png"
	}
	return fmt.Sprintf("figma-%s-%s%s", fileKey, strings.ReplaceAll(nodeID, ":", "-"), ext)
}

func mediaAssetFromImported(asset *pbcore.MediaAsset, fileKey, nodeID, imageURL string) *pbcore.MediaAsset {
	if asset == nil {
		return nil
	}
	if asset.FileName == "" {
		asset.FileName = buildImportFileName(fileKey, nodeID, imageURL)
	}
	return asset
}
