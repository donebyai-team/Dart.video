# AI Video Generator — Pipeline Spec

> **Stack:** Go  
> **Architecture:** Sequential agent flow with swappable service interfaces  
> **LLM calls:** Declared as interfaces, not implemented  
> **Retrieval:** Interface-based — current impl passes full list, future impl uses semantic search  
> **Tool shape:** All pipeline functions are designed as standalone tool-callable units

---

## Table of Contents

1. [Overview](#overview)
2. [Domain Types](#domain-types)
3. [Service Interfaces](#service-interfaces)
4. [Tool Functions](#tool-functions)
5. [Agent Orchestrator](#agent-orchestrator)
6. [Current Implementations](#current-implementations)
7. [Pipeline Flow Diagram](#pipeline-flow-diagram)

---

## Overview

The pipeline takes a script as input and produces a list of fully resolved slides, each with a selected template and a populated config. It is structured as a sequential agent where each step is a discrete, tool-shaped function that can later be exposed directly to an LLM as a callable tool.

```
Script
  │
  ▼
[Tool] PlanSlides          → []SlidePlan
  │
  ▼ (for each slide, in order)
[Tool] SelectCategory      → MatchedCategory
  │
  ▼
[Tool] GenerateTemplateQuery  → TemplateSearchQuery
  │
  ▼
[Tool] FetchTemplateCandidates → []TemplateCandidate
  │
  ▼
[Tool] SelectTemplate      → SelectedTemplate
  │
  ▼
[Tool] ExtractConfig       → TemplateConfig
  │
  ▼
FinalizedSlide appended to []FinalizedSlide
  │
  ▼
Video render input ready
```

---

## Domain Types

```go
// types.go

package videogen

// AnimationType defines the class of animation for a slide
type AnimationType string

const (
    AnimationTypeText   AnimationType = "text_animation"
    AnimationTypeVisual AnimationType = "visual_animation"
)

// RepetitionIntent signals whether Stage 1 explicitly wants to reuse a style
type RepetitionIntent string

const (
    RepetitionIntentNone        RepetitionIntent = ""
    RepetitionIntentIntentional RepetitionIntent = "intentional"
)

// FieldType defines the type of a config schema field
type FieldType string

const (
    FieldTypeString      FieldType = "string"
    FieldTypeNumber      FieldType = "number"
    FieldTypeStringSlice FieldType = "string[]"
    FieldTypeBool        FieldType = "boolean"
)

// ConfigSchemaField describes a single field in a template's config schema
type ConfigSchemaField struct {
    Type        FieldType `json:"type"`
    Description string    `json:"description"`
    Required    bool      `json:"required"`
    Default     any       `json:"default,omitempty"`
}

// Category represents an animation category
type Category struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    Description string `json:"description"` // concept-level: themes, synonyms, use cases
}

// Template represents a single animation template
type Template struct {
    ID           string                        `json:"id"`
    Name         string                        `json:"name"`
    CategoryID   string                        `json:"category_id"`
    Description  string                        `json:"description"` // motion, style, feel, pace
    Repeatable   bool                          `json:"repeatable"`
    ConfigSchema map[string]ConfigSchemaField  `json:"config_schema"`
}

// SlidePlan is the output of Stage 1 — one planned slide from the script
type SlidePlan struct {
    SlideIndex          int              `json:"slide_index"`
    BeatDescription     string           `json:"beat_description"`
    AnimationType       AnimationType    `json:"animation_type"`
    CategorySearchQuery string           `json:"category_search_query"`
    DisplayText         *string          `json:"display_text,omitempty"`
    DurationSeconds     float64          `json:"duration_seconds"`
    Notes               *string          `json:"notes,omitempty"`
    RepetitionIntent    RepetitionIntent `json:"repetition_intent,omitempty"`
}

// MatchedCategory is the output of Stage 2 — ranked category matches
type MatchedCategory struct {
    CategoryID   string  `json:"category_id"`
    CategoryName string  `json:"category_name"`
    Score        float64 `json:"score"` // cosine similarity or rank score
}

// TemplateSearchQuery is the output of Stage 3a — the LLM-generated query
type TemplateSearchQuery struct {
    Query     string `json:"template_search_query"`
    Reasoning string `json:"reasoning"`
}

// TemplateCandidate is one result from template retrieval
type TemplateCandidate struct {
    Template Template `json:"template"`
    Score    float64  `json:"score"`
}

// PreviousSlideContext carries summarized info about already-finalized slides
// used to guide template query generation and selection
type PreviousSlideContext struct {
    SlideIndex    int           `json:"slide_index"`
    TemplateID    string        `json:"template_id"`
    TemplateName  string        `json:"template_name"`
    CategoryName  string        `json:"category_name"`
    AnimationType AnimationType `json:"animation_type"`
    StyleNote     string        `json:"style_note"` // accumulated from each SelectTemplate call
}

// SelectedTemplate is the output of Stage 3b
type SelectedTemplate struct {
    TemplateID   string   `json:"selected_template_id"`
    TemplateName string   `json:"selected_template_name"`
    Justification string  `json:"justification"`
    StyleNote    string   `json:"style_note"` // stored and passed forward to next slides
}

// TemplateConfig holds the extracted config values for a selected template
type TemplateConfig struct {
    TemplateID string         `json:"template_id"`
    Config     map[string]any `json:"config"`
}

// FinalizedSlide is a fully resolved slide ready for the Remotion renderer
type FinalizedSlide struct {
    SlideIndex      int              `json:"slide_index"`
    BeatDescription string           `json:"beat_description"`
    AnimationType   AnimationType    `json:"animation_type"`
    DurationSeconds float64          `json:"duration_seconds"`
    DisplayText     *string          `json:"display_text,omitempty"`
    Notes           *string          `json:"notes,omitempty"`
    CategoryID      string           `json:"category_id"`
    CategoryName    string           `json:"category_name"`
    TemplateID      string           `json:"template_id"`
    TemplateName    string           `json:"template_name"`
    StyleNote       string           `json:"style_note"`
    Config          map[string]any   `json:"config"`
}

// VideoOutput is the final pipeline output
type VideoOutput struct {
    VideoTitle                   string           `json:"video_title"`
    TotalEstimatedDurationSeconds float64         `json:"total_estimated_duration_seconds"`
    Slides                       []FinalizedSlide `json:"slides"`
}
```

---

## Service Interfaces

### Retrieval Service

Abstracts category and template lookup. Current implementation passes full lists and does in-process ranking. Future implementation will call a vector database.

```go
// retrieval.go

package videogen

// RetrievalService handles category and template lookup.
// Implementations:
//   - FullListRetrievalService  (current)  — receives full list, ranks in-process
//   - SemanticRetrievalService  (future)   — calls vector DB with embeddings
type RetrievalService interface {
    // MatchCategories takes a semantic query and returns ranked category matches.
    // topK controls how many to return (e.g. 3 for fallback chain).
    MatchCategories(ctx context.Context, query string, topK int) ([]MatchedCategory, error)

    // FetchTemplates returns templates for a given category, applying filters.
    // usedTemplateIDs: non-repeatable templates with these IDs are excluded.
    FetchTemplates(ctx context.Context, categoryID string, usedTemplateIDs []string) ([]Template, error)

    // MatchTemplates takes a query and a pre-filtered pool, returns ranked candidates.
    // topK controls shortlist size for the LLM selector.
    MatchTemplates(ctx context.Context, query string, pool []Template, topK int) ([]TemplateCandidate, error)
}
```

### LLM Service

All LLM calls are declared here. Not implemented — callers receive structured responses.

```go
// llm.go

package videogen

// SlidePlanRequest is the input to the slide planning LLM call
type SlidePlanRequest struct {
    Script string `json:"script"`
}

// SlidePlanResponse is the output of the slide planning LLM call
type SlidePlanResponse struct {
    VideoTitle string      `json:"video_title"`
    Slides     []SlidePlan `json:"slides"`
}

// TemplateQueryRequest is the input to the template query generation LLM call
type TemplateQueryRequest struct {
    CurrentSlide      SlidePlan              `json:"current_slide"`
    MatchedCategory   MatchedCategory        `json:"matched_category"`
    PreviousSlides    []PreviousSlideContext  `json:"previous_slides"`
}

// TemplateSelectRequest is the input to the template selection LLM call
type TemplateSelectRequest struct {
    CurrentSlide    SlidePlan             `json:"current_slide"`
    MatchedCategory MatchedCategory       `json:"matched_category"`
    Candidates      []TemplateCandidate   `json:"candidates"`
    PreviousSlides  []PreviousSlideContext `json:"previous_slides"`
}

// ConfigExtractRequest is the input to the config extraction LLM call
type ConfigExtractRequest struct {
    Script           string            `json:"script"`
    Slide            SlidePlan         `json:"slide"`
    SelectedTemplate Template          `json:"selected_template"`
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
```

### Animation Code Service

Reserved for on-the-fly Remotion component generation. Not implemented.

```go
// animation_codegen.go

package videogen

// GeneratedComponent holds a dynamically generated Remotion component
type GeneratedComponent struct {
    ComponentCode string                       `json:"component_code"`
    ComponentName string                       `json:"component_name"`
    ConfigSchema  map[string]ConfigSchemaField `json:"config_schema"`
    Description   string                       `json:"description"`
    StyleNote     string                       `json:"style_note"`
}

// AnimationCodeService generates, validates, and stores new Remotion components
// on the fly when no suitable template exists in the library.
// TODO: implement
type AnimationCodeService interface {
    // Generate produces a new Remotion component for the given slide context.
    // Model: claude-opus-4-6 or gpt-4o
    // Temperature: 0.4
    Generate(ctx context.Context, slide SlidePlan, category MatchedCategory) (GeneratedComponent, error)

    // Validate runs static analysis and esbuild transpile check on generated code.
    Validate(ctx context.Context, code string) error

    // RenderTest renders a single frame (frame 0) with dummy props to confirm
    // the component runs without runtime errors.
    RenderTest(ctx context.Context, component GeneratedComponent) error

    // Store saves a validated generated component as a new template entry.
    // Sets repeatable=false and promote_candidate=true by default.
    Store(ctx context.Context, component GeneratedComponent, categoryID string) (Template, error)
}
```

---

## Tool Functions

Each function is a standalone unit. They accept only what they need and return only what they produce. This makes them directly exposable as LLM tool calls without refactoring.

```go
// tools.go

package videogen

import "context"

const (
    DefaultCategoryTopK  = 3   // number of categories returned for fallback chain
    DefaultTemplateTopK  = 5   // number of template candidates sent to LLM selector
    ScoreThreshold       = 0.65 // minimum similarity score to accept a template match
)

// ToolPlanSlides — Stage 1
// Input:  script string
// Output: SlidePlanResponse
// LLM:    yes (PlanSlides)
// Breaks the script into a sequenced list of slide plans with category search queries.
func ToolPlanSlides(
    ctx context.Context,
    llm LLMService,
    script string,
) (SlidePlanResponse, error) {
    return llm.PlanSlides(ctx, SlidePlanRequest{Script: script})
}

// ToolSelectCategory — Stage 2
// Input:  category search query from SlidePlan
// Output: []MatchedCategory ranked by score (top DefaultCategoryTopK)
// LLM:    no
// Runs semantic/list match against all categories and returns a ranked shortlist
// for the fallback chain.
func ToolSelectCategory(
    ctx context.Context,
    retrieval RetrievalService,
    query string,
) ([]MatchedCategory, error) {
    return retrieval.MatchCategories(ctx, query, DefaultCategoryTopK)
}

// ToolGenerateTemplateQuery — Stage 3a
// Input:  current slide, matched category, previous slides context
// Output: TemplateSearchQuery
// LLM:    yes (GenerateTemplateQuery)
// Generates an informed semantic query for template retrieval, using prior
// slide style notes to ensure visual variety across the video.
func ToolGenerateTemplateQuery(
    ctx context.Context,
    llm LLMService,
    slide SlidePlan,
    category MatchedCategory,
    previousSlides []PreviousSlideContext,
) (TemplateSearchQuery, error) {
    return llm.GenerateTemplateQuery(ctx, TemplateQueryRequest{
        CurrentSlide:    slide,
        MatchedCategory: category,
        PreviousSlides:  previousSlides,
    })
}

// ToolFetchTemplateCandidates — Stage 3b retrieval
// Input:  category ID, used template IDs, template search query
// Output: []TemplateCandidate (top DefaultTemplateTopK)
// LLM:    no
// Fetches templates from the matched category, filtering out used non-repeatable
// templates, then ranks by the search query and returns a shortlist.
func ToolFetchTemplateCandidates(
    ctx context.Context,
    retrieval RetrievalService,
    categoryID string,
    usedTemplateIDs []string,
    query string,
) ([]TemplateCandidate, error) {
    pool, err := retrieval.FetchTemplates(ctx, categoryID, usedTemplateIDs)
    if err != nil {
        return nil, err
    }
    if len(pool) == 0 {
        return nil, nil // signals exhausted pool to orchestrator
    }
    return retrieval.MatchTemplates(ctx, query, pool, DefaultTemplateTopK)
}

// ToolSelectTemplate — Stage 3b selection
// Input:  current slide, matched category, candidates, previous slides
// Output: SelectedTemplate (includes style_note for forward context)
// LLM:    yes (SelectTemplate)
// Selects the best template from a retrieved candidate shortlist, reasoning
// about visual variety and narrative fit.
func ToolSelectTemplate(
    ctx context.Context,
    llm LLMService,
    slide SlidePlan,
    category MatchedCategory,
    candidates []TemplateCandidate,
    previousSlides []PreviousSlideContext,
) (SelectedTemplate, error) {
    return llm.SelectTemplate(ctx, TemplateSelectRequest{
        CurrentSlide:    slide,
        MatchedCategory: category,
        Candidates:      candidates,
        PreviousSlides:  previousSlides,
    })
}

// ToolExtractConfig — Stage 4
// Input:  script, slide plan, selected template (with config schema)
// Output: TemplateConfig (populated field values)
// LLM:    yes (ExtractConfig)
// Extracts and infers all config field values for the selected template
// from the script and slide context.
func ToolExtractConfig(
    ctx context.Context,
    llm LLMService,
    script string,
    slide SlidePlan,
    template Template,
) (TemplateConfig, error) {
    return llm.ExtractConfig(ctx, ConfigExtractRequest{
        Script:           script,
        Slide:            slide,
        SelectedTemplate: template,
    })
}
```

---

## Agent Orchestrator

The orchestrator wires all tools into the sequential agent flow. It owns the fallback chain logic, accumulates `previousSlides` context, and builds the final output.

```go
// orchestrator.go

package videogen

import (
    "context"
    "fmt"
)

// OrchestratorConfig holds tunable settings for the agent
type OrchestratorConfig struct {
    ScoreThreshold   float64 // min score to accept a template match (default 0.65)
    MaxCodeGenRetries int    // max retries for animation code generation (default 1)
}

// DefaultOrchestratorConfig returns sensible defaults
func DefaultOrchestratorConfig() OrchestratorConfig {
    return OrchestratorConfig{
        ScoreThreshold:    ScoreThreshold,
        MaxCodeGenRetries: 1,
    }
}

// FallbackLog records when and why a category fallback occurred
type FallbackLog struct {
    SlideIndex          int     `json:"slide_index"`
    IntendedCategory    string  `json:"intended_category"`
    FallbackCategory    string  `json:"fallback_category"`
    Reason              string  `json:"reason"`           // "low_score" | "pool_exhausted"
    TopScoreInIntended  float64 `json:"top_score_in_intended"`
}

// GenerateVideo is the top-level entry point.
// It runs the full sequential agent pipeline and returns a VideoOutput
// ready for the Remotion renderer.
func GenerateVideo(
    ctx context.Context,
    llm LLMService,
    retrieval RetrievalService,
    codegen AnimationCodeService, // may be nil if not implemented yet
    script string,
    cfg OrchestratorConfig,
) (*VideoOutput, []FallbackLog, error) {

    // ── Stage 1: Plan all slides ──────────────────────────────────────────
    plan, err := ToolPlanSlides(ctx, llm, script)
    if err != nil {
        return nil, nil, fmt.Errorf("stage1 PlanSlides: %w", err)
    }

    var (
        finalizedSlides []FinalizedSlide
        previousSlides  []PreviousSlideContext
        usedTemplateIDs []string
        fallbackLogs    []FallbackLog
    )

    // ── Per-slide loop ────────────────────────────────────────────────────
    for _, slidePlan := range plan.Slides {

        // Stage 2: Select category (returns ranked fallback chain)
        matchedCategories, err := ToolSelectCategory(ctx, retrieval, slidePlan.CategorySearchQuery)
        if err != nil {
            return nil, fallbackLogs, fmt.Errorf("slide %d stage2 SelectCategory: %w", slidePlan.SlideIndex, err)
        }

        // Stage 3a + 3b: Walk fallback chain until a good template is found
        finalized, fbLog, err := resolveTemplate(
            ctx, llm, retrieval, codegen,
            script, slidePlan, matchedCategories,
            usedTemplateIDs, previousSlides, cfg,
        )
        if err != nil {
            return nil, fallbackLogs, fmt.Errorf("slide %d resolveTemplate: %w", slidePlan.SlideIndex, err)
        }
        if fbLog != nil {
            fallbackLogs = append(fallbackLogs, *fbLog)
        }

        // Accumulate state for subsequent slides
        finalizedSlides = append(finalizedSlides, *finalized)
        usedTemplateIDs = appendIfNotRepeatable(usedTemplateIDs, finalized.TemplateID, retrieval, ctx, finalized.CategoryID)
        previousSlides = append(previousSlides, PreviousSlideContext{
            SlideIndex:    finalized.SlideIndex,
            TemplateID:    finalized.TemplateID,
            TemplateName:  finalized.TemplateName,
            CategoryName:  finalized.CategoryName,
            AnimationType: finalized.AnimationType,
            StyleNote:     finalized.StyleNote,
        })
    }

    total := 0.0
    for _, s := range finalizedSlides {
        total += s.DurationSeconds
    }

    return &VideoOutput{
        VideoTitle:                    plan.VideoTitle,
        TotalEstimatedDurationSeconds: total,
        Slides:                        finalizedSlides,
    }, fallbackLogs, nil
}

// resolveTemplate runs the fallback chain for a single slide.
// It tries each matched category in score order until it finds a valid
// template match above the score threshold.
// Fallback order:
//   1. Category 1 pool → low score → try next category
//   2. Category 2 pool → pool exhausted → try next category
//   3. Category 3 pool → success
//   4. All categories exhausted → attempt code generation (if available)
//   5. Code generation fails → use global default template
func resolveTemplate(
    ctx context.Context,
    llm LLMService,
    retrieval RetrievalService,
    codegen AnimationCodeService,
    script string,
    slide SlidePlan,
    matchedCategories []MatchedCategory,
    usedTemplateIDs []string,
    previousSlides []PreviousSlideContext,
    cfg OrchestratorConfig,
) (*FinalizedSlide, *FallbackLog, error) {

    var (
        fallbackLog     *FallbackLog
        primaryCategory = matchedCategories[0]
    )

    for i, category := range matchedCategories {

        // Stage 3a: Generate informed template query
        tq, err := ToolGenerateTemplateQuery(ctx, llm, slide, category, previousSlides)
        if err != nil {
            return nil, nil, fmt.Errorf("GenerateTemplateQuery category %s: %w", category.CategoryID, err)
        }

        // Stage 3b retrieval: Fetch and rank candidates
        candidates, err := ToolFetchTemplateCandidates(ctx, retrieval, category.CategoryID, usedTemplateIDs, tq.Query)
        if err != nil {
            return nil, nil, fmt.Errorf("FetchTemplateCandidates category %s: %w", category.CategoryID, err)
        }

        // Pool exhausted for this category
        if len(candidates) == 0 {
            if i == 0 {
                fallbackLog = &FallbackLog{
                    SlideIndex:       slide.SlideIndex,
                    IntendedCategory: primaryCategory.CategoryName,
                    Reason:           "pool_exhausted",
                }
            }
            continue
        }

        // Score too low for this category
        if candidates[0].Score < cfg.ScoreThreshold {
            if i == 0 {
                fallbackLog = &FallbackLog{
                    SlideIndex:         slide.SlideIndex,
                    IntendedCategory:   primaryCategory.CategoryName,
                    Reason:             "low_score",
                    TopScoreInIntended: candidates[0].Score,
                }
            }
            continue
        }

        // Good candidates found — record fallback category if we moved
        if fallbackLog != nil {
            fallbackLog.FallbackCategory = category.CategoryName
        }

        // Stage 3b selection: LLM picks the best candidate
        selected, err := ToolSelectTemplate(ctx, llm, slide, category, candidates, previousSlides)
        if err != nil {
            return nil, nil, fmt.Errorf("SelectTemplate: %w", err)
        }

        // Find the full template object for config extraction
        template, err := findTemplate(candidates, selected.TemplateID)
        if err != nil {
            return nil, nil, err
        }

        // Stage 4: Extract config
        templateConfig, err := ToolExtractConfig(ctx, llm, script, slide, template)
        if err != nil {
            return nil, nil, fmt.Errorf("ExtractConfig: %w", err)
        }

        finalized := buildFinalizedSlide(slide, category, template, selected, templateConfig)
        return &finalized, fallbackLog, nil
    }

    // All categories exhausted — attempt code generation
    if codegen != nil {
        finalized, err := resolveWithCodeGen(ctx, llm, codegen, script, slide, matchedCategories[0], previousSlides, cfg)
        if err == nil {
            fallbackLog = &FallbackLog{
                SlideIndex:       slide.SlideIndex,
                IntendedCategory: primaryCategory.CategoryName,
                FallbackCategory: "generated",
                Reason:           "all_categories_exhausted",
            }
            return finalized, fallbackLog, nil
        }
        // code gen failed — fall through to global default
    }

    // Global default — guaranteed safe fallback
    finalized := buildDefaultSlide(slide)
    fallbackLog = &FallbackLog{
        SlideIndex:       slide.SlideIndex,
        IntendedCategory: primaryCategory.CategoryName,
        FallbackCategory: "global_default",
        Reason:           "all_categories_exhausted",
    }
    return &finalized, fallbackLog, nil
}

// resolveWithCodeGen attempts to generate a new Remotion component on the fly.
// Retries once on failure before giving up.
// TODO: implement AnimationCodeService before enabling
func resolveWithCodeGen(
    ctx context.Context,
    llm LLMService,
    codegen AnimationCodeService,
    script string,
    slide SlidePlan,
    category MatchedCategory,
    previousSlides []PreviousSlideContext,
    cfg OrchestratorConfig,
) (*FinalizedSlide, error) {
    var lastErr error

    for attempt := 0; attempt <= cfg.MaxCodeGenRetries; attempt++ {
        component, err := codegen.Generate(ctx, slide, category)
        if err != nil {
            lastErr = err
            continue
        }
        if err := codegen.Validate(ctx, component.ComponentCode); err != nil {
            lastErr = err
            continue
        }
        if err := codegen.RenderTest(ctx, component); err != nil {
            lastErr = err
            continue
        }
        stored, err := codegen.Store(ctx, component, category.CategoryID)
        if err != nil {
            return nil, err
        }
        // Extract config for the generated template
        config, err := llm.ExtractConfig(ctx, ConfigExtractRequest{
            Script:           script,
            Slide:            slide,
            SelectedTemplate: stored,
        })
        if err != nil {
            return nil, err
        }
        finalized := buildFinalizedSlide(
            slide,
            category,
            stored,
            SelectedTemplate{
                TemplateID:    stored.ID,
                TemplateName:  stored.Name,
                Justification: "generated on the fly",
                StyleNote:     component.StyleNote,
            },
            config,
        )
        return &finalized, nil
    }
    return nil, fmt.Errorf("code generation failed after retries: %w", lastErr)
}

// ── Helpers ───────────────────────────────────────────────────────────────

func buildFinalizedSlide(
    slide SlidePlan,
    category MatchedCategory,
    template Template,
    selected SelectedTemplate,
    config TemplateConfig,
) FinalizedSlide {
    return FinalizedSlide{
        SlideIndex:      slide.SlideIndex,
        BeatDescription: slide.BeatDescription,
        AnimationType:   slide.AnimationType,
        DurationSeconds: slide.DurationSeconds,
        DisplayText:     slide.DisplayText,
        Notes:           slide.Notes,
        CategoryID:      category.CategoryID,
        CategoryName:    category.CategoryName,
        TemplateID:      selected.TemplateID,
        TemplateName:    selected.TemplateName,
        StyleNote:       selected.StyleNote,
        Config:          config.Config,
    }
}

func buildDefaultSlide(slide SlidePlan) FinalizedSlide {
    text := "..."
    if slide.DisplayText != nil {
        text = *slide.DisplayText
    } else if slide.BeatDescription != "" {
        text = slide.BeatDescription
    }
    return FinalizedSlide{
        SlideIndex:      slide.SlideIndex,
        BeatDescription: slide.BeatDescription,
        AnimationType:   AnimationTypeText,
        DurationSeconds: slide.DurationSeconds,
        DisplayText:     &text,
        Notes:           slide.Notes,
        CategoryID:      "default",
        CategoryName:    "Default",
        TemplateID:      "tmpl_default_centered_text",
        TemplateName:    "CenteredText",
        StyleNote:       "Plain centered text, safe fallback",
        Config: map[string]any{
            "text": text,
        },
    }
}

func findTemplate(candidates []TemplateCandidate, templateID string) (Template, error) {
    for _, c := range candidates {
        if c.Template.ID == templateID {
            return c.Template, nil
        }
    }
    return Template{}, fmt.Errorf("selected template %s not found in candidates", templateID)
}

// appendIfNotRepeatable adds a template ID to the used list only if it is non-repeatable.
// This ensures repeatable templates are never excluded from future retrieval.
// NOTE: This requires a lookup — in the full list implementation this is a local map lookup.
// Signature is simplified here; wire to your template store as needed.
func appendIfNotRepeatable(usedIDs []string, templateID string, retrieval RetrievalService, ctx context.Context, categoryID string) []string {
    // TODO: wire to a lightweight template lookup by ID
    // For now, always append — full list impl can filter on the repeatable field directly
    return append(usedIDs, templateID)
}
```

---

## Current Implementations

### FullListRetrievalService

Receives all categories and templates at construction time. Ranks by simple string similarity (or embedding cosine if you pre-compute embeddings locally). Swap out for a vector DB implementation later with no changes to calling code.

```go
// retrieval_fulllist.go

package videogen

import (
    "context"
    "sort"
    "strings"
)

// FullListRetrievalService implements RetrievalService using in-memory lists.
// All categories and templates are passed at construction.
// Ranking is done by naive keyword overlap — replace with embedding cosine
// similarity or any other ranking function without changing the interface.
type FullListRetrievalService struct {
    categories []Category
    templates  []Template
}

func NewFullListRetrievalService(categories []Category, templates []Template) *FullListRetrievalService {
    return &FullListRetrievalService{
        categories: categories,
        templates:  templates,
    }
}

func (s *FullListRetrievalService) MatchCategories(ctx context.Context, query string, topK int) ([]MatchedCategory, error) {
    type scored struct {
        cat   Category
        score float64
    }
    var results []scored
    for _, cat := range s.categories {
        score := naiveScore(query, cat.Name+" "+cat.Description)
        results = append(results, scored{cat, score})
    }
    sort.Slice(results, func(i, j int) bool { return results[i].score > results[j].score })

    out := make([]MatchedCategory, 0, topK)
    for i := 0; i < topK && i < len(results); i++ {
        out = append(out, MatchedCategory{
            CategoryID:   results[i].cat.ID,
            CategoryName: results[i].cat.Name,
            Score:        results[i].score,
        })
    }
    return out, nil
}

func (s *FullListRetrievalService) FetchTemplates(ctx context.Context, categoryID string, usedTemplateIDs []string) ([]Template, error) {
    usedSet := make(map[string]bool, len(usedTemplateIDs))
    for _, id := range usedTemplateIDs {
        usedSet[id] = true
    }
    var out []Template
    for _, t := range s.templates {
        if t.CategoryID != categoryID {
            continue
        }
        // Include if repeatable OR not yet used
        if t.Repeatable || !usedSet[t.ID] {
            out = append(out, t)
        }
    }
    return out, nil
}

func (s *FullListRetrievalService) MatchTemplates(ctx context.Context, query string, pool []Template, topK int) ([]TemplateCandidate, error) {
    type scored struct {
        t     Template
        score float64
    }
    var results []scored
    for _, t := range pool {
        score := naiveScore(query, t.Name+" "+t.Description)
        results = append(results, scored{t, score})
    }
    sort.Slice(results, func(i, j int) bool { return results[i].score > results[j].score })

    out := make([]TemplateCandidate, 0, topK)
    for i := 0; i < topK && i < len(results); i++ {
        out = append(out, TemplateCandidate{
            Template: results[i].t,
            Score:    results[i].score,
        })
    }
    return out, nil
}

// naiveScore computes a simple word overlap score between query and text.
// Replace with embedding cosine similarity for better semantic matching.
func naiveScore(query, text string) float64 {
    queryWords := strings.Fields(strings.ToLower(query))
    textLower := strings.ToLower(text)
    matches := 0
    for _, w := range queryWords {
        if strings.Contains(textLower, w) {
            matches++
        }
    }
    if len(queryWords) == 0 {
        return 0
    }
    return float64(matches) / float64(len(queryWords))
}
```

---

## Pipeline Flow Diagram

```
INPUT: script
        │
        ▼
┌──────────────────────────────┐
│  ToolPlanSlides              │  LLM (temp 0.7)
│  → []SlidePlan               │  All slides planned upfront
└──────────────┬───────────────┘
               │
               │  for each SlidePlan (in order):
               │  state: usedTemplateIDs[], previousSlides[]
               ▼
┌──────────────────────────────┐
│  ToolSelectCategory          │  RetrievalService.MatchCategories
│  → []MatchedCategory (top 3) │  No LLM — ranked by similarity
└──────────────┬───────────────┘
               │
               │  fallback chain: try each category in score order
               ▼
┌──────────────────────────────┐
│  ToolGenerateTemplateQuery   │  LLM (temp 0.5)
│  → TemplateSearchQuery       │  Uses previousSlides style notes
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  ToolFetchTemplateCandidates │  RetrievalService
│  → []TemplateCandidate       │  Filtered: repeatable=true OR not in usedIDs
└──────────────┬───────────────┘
               │
               │  score < threshold OR pool empty?
               │  → try next category in fallback chain
               │  → all exhausted? → AnimationCodeService (TODO)
               │  → code gen fails? → global default template
               ▼
┌──────────────────────────────┐
│  ToolSelectTemplate          │  LLM (temp 0.5)
│  → SelectedTemplate          │  Picks best from candidates
│    + style_note              │  style_note accumulated for next slides
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│  ToolExtractConfig           │  LLM (temp 0.2)
│  → TemplateConfig            │  Extracts/infers all schema field values
└──────────────┬───────────────┘
               │
               ▼
        FinalizedSlide
        appended to []FinalizedSlide
        usedTemplateIDs updated
        previousSlides updated
               │
               │  (next slide)
               ▼
OUTPUT: VideoOutput { title, duration, []FinalizedSlide }
        + []FallbackLog (gap detection)
```

---

## Future: Semantic Retrieval Implementation

To swap in vector search, implement `RetrievalService` with your chosen vector DB:

```go
// retrieval_semantic.go (future)

package videogen

// SemanticRetrievalService implements RetrievalService using vector embeddings.
// Drop-in replacement for FullListRetrievalService — no changes to tools or orchestrator.
type SemanticRetrievalService struct {
    // vectorDB  VectorDBClient
    // embedder  EmbeddingService
}

func (s *SemanticRetrievalService) MatchCategories(ctx context.Context, query string, topK int) ([]MatchedCategory, error) {
    // TODO: embed query → cosine search over category embeddings
    panic("not implemented")
}

func (s *SemanticRetrievalService) FetchTemplates(ctx context.Context, categoryID string, usedTemplateIDs []string) ([]Template, error) {
    // TODO: fetch from DB with SQL filter:
    // WHERE category_id = ? AND (repeatable = true OR id NOT IN (?))
    panic("not implemented")
}

func (s *SemanticRetrievalService) MatchTemplates(ctx context.Context, query string, pool []Template, topK int) ([]TemplateCandidate, error) {
    // TODO: embed query → cosine search over pool template embeddings
    panic("not implemented")
}
```

No changes needed anywhere else in the pipeline.