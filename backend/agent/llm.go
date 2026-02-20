package agent

import (
	"context"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
)

type SlidePlanRequest struct {
	Script              *pbcore.Script `json:"script"`
	DurationSeconds     float32        `json:"duration_seconds"`
	Prompt              string         `json:"prompt"`
	Language            string         `json:"language"`
	Resolution          string         `json:"resolution"`
	SupportedAnimations []string       `json:"supported_animations"`
}

// SlidePlan is the output of Stage 1 — one planned slide from the script
type SlidePlan struct {
	SlideIndex          int                  `json:"slide_index"`
	BeatDescription     string               `json:"beat_description"`
	AnimationType       models.AnimationType `json:"animation_type"`
	CategorySearchQuery string               `json:"category_search_query"`
	DisplayText         *string              `json:"display_text,omitempty"`
	DurationSeconds     float64              `json:"duration_seconds"`
	Notes               *string              `json:"notes,omitempty"`
}

// SlidePlanResponse is the output of the slide planning LLM call
type SlidePlanResponse struct {
	VideoTitle string    `json:"video_title"`
	Sections   []Section `json:"sections"`
}

type Section struct {
	Name   string      `json:"name"`
	Slides []SlidePlan `json:"slides"`
}

// LLMService declares all LLM interactions in the pipeline.
// Not implemented — wire in your preferred provider (Anthropic, OpenAI, etc.)
type LLMService interface {
	// PlanSlides is Stage 1.
	// Model: claude-sonnet-4-6 or gpt-4o
	// Temperature: 0.7
	// Breaks the script into a structured slide plan with category search queries.
	PlanSlides(ctx context.Context, req SlidePlanRequest) (SlidePlanResponse, error)

	// GenerateTemplateQuery is Stage 3a (LLM portion).
	// Model: claude-sonnet-4-6 or gpt-4o-mini
	// Temperature: 0.5
	// Generates a precise semantic query for template retrieval,
	// informed by prior slide style notes to ensure visual variety.
	GenerateTemplateQuery(ctx context.Context, req TemplateQueryRequest) (TemplateSearchQuery, error)

	// SelectTemplate is Stage 3b.
	// Model: claude-sonnet-4-6 or gpt-4o-mini
	// Temperature: 0.5
	// Selects the best template from a retrieved candidate shortlist.
	SelectTemplate(ctx context.Context, req TemplateSelectRequest) (SelectedTemplate, error)

	// ExtractConfig is Stage 4.
	// Model: claude-haiku-4-5 or gpt-4o-mini
	// Temperature: 0.2
	// Extracts and infers config field values from the script and slide context.
	ExtractConfig(ctx context.Context, req ConfigExtractRequest) (TemplateConfig, error)
}
