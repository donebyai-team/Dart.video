package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services"
	"github.com/shank318/coasterai/template_validator"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"

	"github.com/shank318/coasterai/app"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	"github.com/spf13/cobra"
	. "github.com/streamingfast/cli"
	"github.com/streamingfast/cli/sflags"
)

var toolsTemplatesGroup = Group(
	"templates",
	"Commands related to template management",
	toolsSyncTemplates,
)

var toolsSyncTemplates = Command(
	toolsSyncTemplatesRunE,
	"sync <base-dir>",
	"Synchronize animation categories and templates from the frontend filesystem into the backend database",
)

var animationFolderToType = map[string]string{
	"text-animation": "text",
	//"visual-animation": stringVISUAL,
	//"stats-animation":  stringSTATS,
	//"chart-animation":  stringCHART,
}

var categoryFilePattern = regexp.MustCompile(`^[a-z0-9-]+\.md$`)
var templateFolderPattern = regexp.MustCompile(`^[a-z0-9-]+$`)

type syncStats struct {
	categoriesInserted int
	categoriesUpdated  int
	templatesInserted  int
	templatesUpdated   int
}

func toolsSyncTemplatesRunE(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()

	baseDir := args[0]

	db, err := app.SetupDataStore(ctx, sflags.MustGetString(cmd, "pg-dsn"), zlog, tracer)
	if err != nil {
		printSyncFail("failed to setup datastore: %v", err)
		return nil
	}

	if _, err := os.Stat(baseDir); os.IsNotExist(err) {
		printSyncFail("base directory does not exist: %s", baseDir)
		return nil
	}

	stats := &syncStats{}

	entries, err := os.ReadDir(baseDir)
	if err != nil {
		printSyncFail("failed to read base directory: %v", err)
		return nil
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		animFolderName := entry.Name()
		animType, ok := animationFolderToType[animFolderName]
		if !ok {
			//printSyncFail("unknown animation type folder: %s", animFolderName)
			//return nil
			fmt.Printf("unknown animation folder name: %s, skipping..", animFolderName)
			continue
		}

		animDir := filepath.Join(baseDir, animFolderName)

		categoriesDir := filepath.Join(animDir, "categories")
		if _, err := os.Stat(categoriesDir); os.IsNotExist(err) {
			printSyncFail("categories folder missing for animation type %s", animFolderName)
			return nil
		}

		if err := syncCategories(ctx, db, categoriesDir, animType, animFolderName, stats); err != nil {
			printSyncFail("%v", err)
			return nil
		}

		animEntries, err := os.ReadDir(animDir)
		if err != nil {
			printSyncFail("failed to read animation dir %s: %v", animFolderName, err)
			return nil
		}

		for _, animEntry := range animEntries {
			if !animEntry.IsDir() {
				continue
			}
			if animEntry.Name() == "categories" {
				continue
			}

			templateName := animEntry.Name()
			if !templateFolderPattern.MatchString(templateName) {
				printSyncFail("invalid template folder name: %s in %s", templateName, animFolderName)
				return nil
			}

			templateDir := filepath.Join(animDir, templateName)
			if err := syncTemplate(ctx, db, templateDir, templateName, animType, animFolderName, stats); err != nil {
				printSyncFail("%v", err)
				return nil
			}
		}
	}

	fmt.Println("SYNC COMPLETED")
	fmt.Println()
	fmt.Println("Categories:")
	fmt.Printf("  Inserted: %d\n", stats.categoriesInserted)
	fmt.Printf("  Updated: %d\n", stats.categoriesUpdated)
	fmt.Println()
	fmt.Println("Templates:")
	fmt.Printf("  Inserted: %d\n", stats.templatesInserted)
	fmt.Printf("  Updated: %d\n", stats.templatesUpdated)

	return nil
}

func syncCategories(ctx context.Context, db datastore.TemplateRepository, categoriesDir string, animType string, animFolderName string, stats *syncStats) error {
	entries, err := os.ReadDir(categoriesDir)
	if err != nil {
		return fmt.Errorf("failed to read categories dir in %s: %w", animFolderName, err)
	}

	for _, entry := range entries {
		if entry.IsDir() {
			return fmt.Errorf("unexpected directory inside categories folder in %s", animFolderName)
		}

		fileName := entry.Name()
		if !categoryFilePattern.MatchString(fileName) {
			return fmt.Errorf("invalid category filename %q in %s (must match ^[a-z0-9-]+\\.md$)", fileName, animFolderName)
		}

		categoryName := strings.TrimSuffix(fileName, ".md")
		filePath := filepath.Join(categoriesDir, fileName)

		contentBytes, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read category file %s in %s: %w", fileName, animFolderName, err)
		}

		description := strings.TrimSpace(string(contentBytes))
		if description == "" {
			return fmt.Errorf("category file is empty: %s in %s", fileName, animFolderName)
		}

		existing, err := db.GetTemplateCategoryByName(ctx, animType, categoryName)
		if err != nil && !errors.Is(err, datastore.NotFound) {
			return fmt.Errorf("failed to fetch category %s: %w", categoryName, err)
		}

		if existing == nil {
			_, err = db.CreateTemplateCategory(ctx, &models.TemplateCategory{
				AnimationType: animType,
				Name:          categoryName,
				Description:   description,
			})
			if err != nil {
				return fmt.Errorf("failed to create category %s: %w", categoryName, err)
			}
			stats.categoriesInserted++
		} else if existing.Description != description {
			existing.Description = description
			if err = db.UpdateTemplateCategory(ctx, existing); err != nil {
				return fmt.Errorf("failed to update category %s: %w", categoryName, err)
			}
			stats.categoriesUpdated++
		}
	}

	return nil
}

func syncTemplate(ctx context.Context, db datastore.TemplateRepository, templateDir, templateName string, animType string, animFolderName string, stats *syncStats) error {
	metadataPath := filepath.Join(templateDir, "metadata.json")
	schemaPath := filepath.Join(templateDir, "schema.json")
	embeddingPath := filepath.Join(templateDir, "embedding.md")

	for _, path := range []string{metadataPath, schemaPath, embeddingPath} {
		if _, err := os.Stat(path); os.IsNotExist(err) {
			return fmt.Errorf("required file missing in template %s: %s", templateName, filepath.Base(path))
		}
	}

	embeddingBytes, err := os.ReadFile(embeddingPath)
	if err != nil {
		return fmt.Errorf("failed to read embedding.md in template %s: %w", templateName, err)
	}
	description := strings.TrimSpace(string(embeddingBytes))
	if description == "" {
		return fmt.Errorf("embedding.md empty in template %s", templateName)
	}

	schemaBytes, err := os.ReadFile(schemaPath)
	if err != nil {
		return fmt.Errorf("failed to read schema.json in template %s: %w", templateName, err)
	}
	if !json.Valid(schemaBytes) {
		return fmt.Errorf("schema.json invalid JSON in template %s", templateName)
	}

	// validate schema
	_, err = template_validator.ValidateUserSchema(schemaBytes)
	if err != nil {
		return fmt.Errorf("failed to validate schema in template %s: %w", templateName, err)
	}

	metadataBytes, err := os.ReadFile(metadataPath)
	if err != nil {
		return fmt.Errorf("failed to read metadata.json in template %s: %w", templateName, err)
	}
	if !json.Valid(metadataBytes) {
		return fmt.Errorf("metadata.json invalid JSON in template %s", templateName)
	}

	var config models.TemplateConfig
	if err := json.Unmarshal(metadataBytes, &config); err != nil {
		return fmt.Errorf("metadata.json malformed in template %s: %w", templateName, err)
	}

	// validations
	if config.TotalDurationInFrames <= 0 || config.VisibleDurationInFrames <= 0 {
		return fmt.Errorf("metadata.json invalid duration in template %s", templateName)
	}

	categories := config.Categories
	if categories == nil {
		categories = []string{}
	}

	for _, catName := range categories {
		_, err := db.GetTemplateCategoryByName(ctx, animType, catName)
		if err != nil {
			if errors.Is(err, datastore.NotFound) {
				return fmt.Errorf("unknown category %q referenced in template %s (not found for animation type %s)", catName, templateName, animFolderName)
			}
			return fmt.Errorf("failed to validate category %s in template %s: %w", catName, templateName, err)
		}
	}

	tURL := fmt.Sprintf("%s/templates/%s/%s/Transformed2.tsx", services.GetPublicBucketURL(), animFolderName, templateName)
	mURL := fmt.Sprintf("%s/templates/%s/%s/Index2.tsx", services.GetPublicBucketURL(), animFolderName, templateName)

	existing, err := db.GetTemplateByName(ctx, animType, templateName)
	if err != nil && !errors.Is(err, datastore.NotFound) {
		return fmt.Errorf("failed to fetch template %s: %w", templateName, err)
	}

	config.CodeRegistry = &pbcore.CodeRegistry{
		TUrl: tURL,
		MUrl: mURL,
	}

	if config.CodeRegistry == nil || config.CodeRegistry.MUrl == "" || config.CodeRegistry.TUrl == "" {
		return fmt.Errorf("metadata.json missing code_registry in template %s", templateName)
	}

	if existing == nil {
		_, err = db.CreateTemplate(ctx, &models.Template{
			Name:          templateName,
			AnimationType: animType,
			Categories:    categories,
			Description:   description,
			Repeatable:    config.Repeatable,
			Schema:        schemaBytes,
			PreviewUrl:    "",
			Config:        &config,
		})
		if err != nil {
			return fmt.Errorf("failed to create template %s: %w", templateName, err)
		}
		stats.templatesInserted++
	} else if templateNeedsUpdate(existing, categories, description, schemaBytes, config) {
		existing.Categories = categories
		existing.Description = description
		existing.Schema = schemaBytes
		existing.Config = &config
		existing.Repeatable = config.Repeatable
		if err = db.UpdateTemplate(ctx, existing); err != nil {
			return fmt.Errorf("failed to update template %s: %w", templateName, err)
		}
		stats.templatesUpdated++
	}

	return nil
}

func templateNeedsUpdate(existing *models.Template, categories []string, description string, schema json.RawMessage, config models.TemplateConfig) bool {
	if existing.Description != description {
		return true
	}
	if existing.Config.CodeRegistry.MUrl != config.CodeRegistry.MUrl {
		return true
	}

	if existing.Config.CodeRegistry.TUrl != config.CodeRegistry.TUrl {
		return true
	}

	if existing.Config.TotalDurationInFrames != config.TotalDurationInFrames {
		return true
	}

	if existing.Config.VisibleDurationInFrames != config.VisibleDurationInFrames {
		return true
	}

	if existing.Repeatable != config.Repeatable {
		return true
	}

	if !jsonRawEqual(existing.Schema, schema) {
		return true
	}

	existingSorted := make([]string, len(existing.Categories))
	copy(existingSorted, existing.Categories)
	sort.Strings(existingSorted)

	newSorted := make([]string, len(categories))
	copy(newSorted, categories)
	sort.Strings(newSorted)

	if len(existingSorted) != len(newSorted) {
		return true
	}
	for i := range existingSorted {
		if existingSorted[i] != newSorted[i] {
			return true
		}
	}

	return false
}

func jsonRawEqual(a json.RawMessage, b []byte) bool {
	var ai, bi interface{}
	if err := json.Unmarshal(a, &ai); err != nil {
		return false
	}
	if err := json.Unmarshal(b, &bi); err != nil {
		return false
	}
	aBytes, _ := json.Marshal(ai)
	bBytes, _ := json.Marshal(bi)
	return string(aBytes) == string(bBytes)
}

func printSyncFail(format string, args ...interface{}) {
	fmt.Println("\n\nSYNC FAILED")
	fmt.Printf("Reason: "+format+"\n", args...)
}
