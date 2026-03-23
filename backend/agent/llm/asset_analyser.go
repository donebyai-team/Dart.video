package llm

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/agenterrors"
	"github.com/shank318/coasterai/baml_client"
	"github.com/shank318/coasterai/baml_client/types"
	"github.com/shank318/coasterai/cache"
	"github.com/shank318/coasterai/models"
	"github.com/shank318/coasterai/utils"
	"go.uber.org/zap"
	"time"
)

const assetAnalysisKeyPrefix = "asset_analyser"
const assetAnalysisCacheTTL = 2 * time.Hour

func assetCacheKey(assetID string) string {
	return fmt.Sprintf("%s:%s", assetAnalysisKeyPrefix, assetID)
}

func (l *llmService) AnalyzeImage(ctx context.Context, asset *models.MediaAsset) (*types.AssetAnalysis, error) {
	cacheKey := assetCacheKey(asset.ID)
	analysedAsset, err := l.cache.GetKey(ctx, cacheKey)
	if err != nil {
		if !errors.Is(err, cache.ErrCacheMiss) {
			l.logger.Error("cache get failed for key", zap.String("key", cacheKey), zap.Error(err))
		}
	}

	if analysedAsset != "" {
		cachedAsset := &types.AssetAnalysis{}
		if err := json.Unmarshal([]byte(analysedAsset), cachedAsset); err != nil {
			l.logger.Error("unmarshal failed for key", zap.String("key", cacheKey), zap.Error(err))
		} else {
			return cachedAsset, nil
		}
	}

	// Create image from URL
	img, err := baml_client.NewImageFromUrl(asset.Path, utils.Ptr(asset.MimeType))
	if err != nil {
		return nil, agenterrors.AssetAnalysisFailed("failed to parse asset image", err)
	}

	// Call the BAML function
	result, err := baml_client.AnalyzeImage(ctx, img, baml_client.WithTags(getTags(ctx)))
	if err != nil {
		return nil, agenterrors.AssetAnalysisFailed("failed to analyze asset image", err)
	}

	analyisObj, err := json.Marshal(result)
	if err != nil {
		l.logger.Error("failed to marshal analysis result", zap.Error(err))
		return &result, nil
	}

	if err := l.cache.SetKey(ctx, cacheKey, string(analyisObj), assetAnalysisCacheTTL); err != nil {
		l.logger.Error("failed to cache analysis result", zap.Error(err))
	}

	return &result, nil
}
