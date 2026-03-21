package figma

import (
	"context"
	"encoding/json"
	"fmt"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	"go.uber.org/zap"
	"io"
	"net/http"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	figmaoauth "github.com/shank318/coasterai/integrations/figma"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	pbportal "github.com/shank318/coasterai/pb/coasterai/portal/v1"
	"github.com/shank318/coasterai/services"
)

var ignoredTopLevelNameMarkers = []string{"old", "archive", "wip", "copy", "draft", "ignore"}

const (
	maxFigmaRetries        = 3
	defaultRetryAfterDelay = 2 * time.Second
)

type Service interface {
	ParseFileKey(input string) (string, error)
	ListFrames(ctx context.Context, orgID string, req *pbportal.ListFigmaFramesRequest) (*pbportal.ListFigmaFramesResponse, error)
	ImportFrame(ctx context.Context, fileKey, nodeID, orgID string) (*pbportal.ImportFigmaFrameResponse, error)
}

func (p *service) getActiveFigmaIntegration(ctx context.Context, organizationID string) (*models.FigmaConfig, error) {
	integrations, err := p.db.GetIntegrationByOrgAndType(ctx, organizationID, models.IntegrationTypeFIGMA)
	if err != nil {
		return nil, err
	}
	for _, integration := range integrations {
		if integration.State == models.IntegrationStateACTIVE {
			return integration.GetFigmaConfig(), nil
		}
	}
	return nil, fmt.Errorf("figma integration is not connected")
}

type service struct {
	db         datastore.Repository
	oauth      *figmaoauth.OauthClient
	mediaStore services.MediaStore
	logger     *zap.Logger
}

func NewService(db datastore.Repository, oauth *figmaoauth.OauthClient, mediaStore services.MediaStore, logger *zap.Logger) Service {
	return &service{
		db:         db,
		oauth:      oauth,
		mediaStore: mediaStore,
		logger:     logger,
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

func (s *service) ListFrames(ctx context.Context, orgID string, req *pbportal.ListFigmaFramesRequest) (*pbportal.ListFigmaFramesResponse, error) {
	integration, err := s.getActiveFigmaIntegration(ctx, orgID)
	if err != nil {
		return nil, err
	}

	fileKey := req.FileKey
	if fileKey == "" {
		var err error
		fileKey, err = s.ParseFileKey(req.FileUrl)
		if err != nil {
			return nil, err
		}
	}

	s.logger.Info("List frames for org",
		zap.String("file", fileKey),
		zap.String("orgID", orgID))

	fileResp, err := s.getFile(ctx, integration.AccessToken, fileKey)
	if err != nil {
		return nil, err
	}

	query := strings.TrimSpace(strings.ToLower(req.GetQuery()))
	pages := collectPages(fileResp.Document)
	selectedPageID := req.GetPageId()
	if selectedPageID == "" && len(pages) > 0 {
		selectedPageID = pages[0].ID
	}

	frameNodes := collectFrames(fileResp.Document, selectedPageID, query)
	imageURLs, err := s.getImages(ctx, integration.AccessToken, fileKey, frameNodes)
	if err != nil {
		return nil, err
	}

	frames := make([]*pbcore.FigmaFrame, 0, len(frameNodes))
	for _, node := range frameNodes {
		frames = append(frames, &pbcore.FigmaFrame{
			FileKey:      fileKey,
			FileName:     fileResp.Name,
			NodeId:       node.ID,
			Name:         node.Name,
			ThumbnailUrl: imageURLs[node.ID],
			Width:        node.AbsoluteBoundingBox.Width,
			Height:       node.AbsoluteBoundingBox.Height,
			PageId:       node.PageID,
			PageName:     node.PageName,
		})
	}

	respPages := make([]*pbcore.FigmaPage, 0, len(pages))
	for _, page := range pages {
		respPages = append(respPages, &pbcore.FigmaPage{
			Id:   page.ID,
			Name: page.Name,
		})
	}

	s.logger.Info("found frames for org",
		zap.Int("frames", len(frames)),
		zap.Int("pages", len(pages)))

	return &pbportal.ListFigmaFramesResponse{
		FileKey:  fileKey,
		FileName: fileResp.Name,
		Frames:   frames,
		Pages:    respPages,
	}, nil
}

func (s *service) ImportFrame(ctx context.Context, fileKey, nodeID, orgID string) (*pbportal.ImportFigmaFrameResponse, error) {
	integration, err := s.getActiveFigmaIntegration(ctx, orgID)
	if err != nil {
		return nil, err
	}

	s.logger.Info("Import frame for org",
		zap.String("orgId", orgID),
		zap.String("nodeID", nodeID),
		zap.String("file", fileKey))

	images, err := s.getImages(ctx, integration.AccessToken, fileKey, []figmaNode{{ID: nodeID}})
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
		Frame: &pbcore.FigmaFrame{
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

type figmaPage struct {
	ID   string
	Name string
}

type figmaNode struct {
	ID                  string      `json:"id"`
	Name                string      `json:"name"`
	Type                string      `json:"type"`
	PageID              string      `json:"-"`
	PageName            string      `json:"-"`
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

	resp, err := doFigmaRequestWithRetry(ctx, req)
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

	resp, err := doFigmaRequestWithRetry(ctx, req)
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

func doFigmaRequestWithRetry(ctx context.Context, req *http.Request) (*http.Response, error) {
	for attempt := 0; attempt < maxFigmaRetries; attempt++ {
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			return nil, err
		}

		if resp.StatusCode != http.StatusTooManyRequests {
			return resp, nil
		}

		retryDelay := retryAfterDelay(resp.Header.Get("Retry-After"))
		if retryDelay > time.Minute {
			return nil, fmt.Errorf("retry delay too long: %v", retryDelay)
		}

		io.Copy(io.Discard, resp.Body)
		resp.Body.Close()

		if attempt == maxFigmaRetries-1 {
			return nil, fmt.Errorf("figma request failed after retries: %s", http.StatusText(http.StatusTooManyRequests))
		}

		timer := time.NewTimer(retryDelay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil, ctx.Err()
		case <-timer.C:
		}
	}

	return nil, fmt.Errorf("figma request retry loop exited unexpectedly")
}

func retryAfterDelay(value string) time.Duration {
	if value == "" {
		return defaultRetryAfterDelay
	}

	if seconds, err := strconv.Atoi(strings.TrimSpace(value)); err == nil && seconds > 0 {
		return time.Duration(seconds) * time.Second
	}

	if retryAt, err := http.ParseTime(value); err == nil {
		delay := time.Until(retryAt)
		if delay > 0 {
			return delay
		}
	}

	return defaultRetryAfterDelay
}

func collectPages(root figmaNode) []figmaPage {
	pages := make([]figmaPage, 0, len(root.Children))

	for _, page := range root.Children {
		if page.Type != "CANVAS" {
			continue
		}

		pages = append(pages, figmaPage{
			ID:   page.ID,
			Name: page.Name,
		})
	}

	return pages
}

func collectFrames(root figmaNode, pageID, query string) []figmaNode {
	var frames []figmaNode

	for _, page := range root.Children {
		if page.Type != "CANVAS" {
			continue
		}
		if pageID != "" && page.ID != pageID {
			continue
		}

		for _, child := range expandTopLevelCandidates(page, query) {
			frames = append(frames, child)
		}
	}

	return frames
}

func expandTopLevelCandidates(page figmaNode, query string) []figmaNode {
	var candidates []figmaNode

	for _, node := range page.Children {
		for _, candidate := range normalizeTopLevelNode(node) {
			candidate.PageID = page.ID
			candidate.PageName = page.Name
			if isRelevantTopLevelNode(candidate) && matchesFrameQuery(candidate, query) {
				candidates = append(candidates, candidate)
			}
		}
	}

	return candidates
}

func normalizeTopLevelNode(node figmaNode) []figmaNode {
	if node.Type == "FRAME" && len(node.Children) > 0 && hasOnlyFrameChildren(node.Children) {
		return node.Children
	}

	return []figmaNode{node}
}

func hasOnlyFrameChildren(children []figmaNode) bool {
	if len(children) == 0 {
		return false
	}

	for _, child := range children {
		if child.Type != "FRAME" {
			return false
		}
	}

	return true
}

func isRelevantTopLevelNode(node figmaNode) bool {
	switch node.Type {
	case "FRAME":
		return true
	case "GROUP":
		return isRelevantGroup(node)
	default:
		return false
	}
}

func isRelevantGroup(node figmaNode) bool {
	if node.AbsoluteBoundingBox.Width < 200 || node.AbsoluteBoundingBox.Height < 200 {
		return false
	}

	if hasIgnoredTopLevelName(node.Name) {
		return false
	}

	return hasNonTextNonVectorChild(node.Children)
}

func hasIgnoredTopLevelName(name string) bool {
	normalized := strings.TrimSpace(strings.ToLower(name))
	if normalized == "" {
		return false
	}

	if strings.HasPrefix(normalized, "_") || strings.HasPrefix(normalized, ".") {
		return true
	}

	for _, marker := range ignoredTopLevelNameMarkers {
		if strings.Contains(normalized, marker) {
			return true
		}
	}

	return false
}

func hasNonTextNonVectorChild(children []figmaNode) bool {
	for _, child := range children {
		if child.Type != "TEXT" && child.Type != "VECTOR" {
			return true
		}
	}
	return false
}

func matchesFrameQuery(node figmaNode, query string) bool {
	return query == "" || strings.Contains(strings.ToLower(node.Name), query)
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
