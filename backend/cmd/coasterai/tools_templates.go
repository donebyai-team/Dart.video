package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/shank318/coasterai/agent/scenes"
	"github.com/shank318/coasterai/app"
	"github.com/shank318/coasterai/datastore"
	"github.com/shank318/coasterai/models"
	pbcore "github.com/shank318/coasterai/pb/coasterai/core/v1"
	"github.com/shank318/coasterai/services/llm"
	"github.com/spf13/cobra"
	. "github.com/streamingfast/cli"
	"github.com/streamingfast/cli/sflags"
	"strings"
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

type syncStats struct {
	templatesInserted int
	templatesUpdated  int
}

func toolsSyncTemplatesRunE(cmd *cobra.Command, args []string) error {
	ctx := cmd.Context()

	db, err := app.SetupDataStore(ctx, sflags.MustGetString(cmd, "pg-dsn"), zlog, tracer)
	if err != nil {
		printSyncFail("failed to setup datastore: %v", err)
		return nil
	}

	embeddingService := llm.NewOpenAIService(zlog, sflags.MustGetString(cmd, "openai-api-key"))

	stats := &syncStats{}

	allTemplates := scenes.GetAllTemplates()

	for _, template := range allTemplates {
		existingTemplate, err := db.GetTemplateByName(ctx, template.Name)
		if err != nil && !errors.Is(err, datastore.NotFound) {
			printSyncFail("%v", err)
			return nil
		}

		templateToUpdate := models.Template{
			Name:        template.Name,
			Categories:  template.Tags,
			Description: template.Description,
			Repeatable:  false,
			Schema:      json.RawMessage(`[]`),
			Config:      &pbcore.VideoConfig{},
			Metadata:    &pbcore.VideoMetadata{},
			Status:      models.TemplateStatusAVAILABLE,
		}

		// If an animation is not tagged, we tag it with
		if len(template.Tags) == 0 {
			templateToUpdate.Categories = []string{scenes.CATEGORY_TEXT, scenes.CATEGORY_FILLER}
		}

		instructions := strings.TrimSpace(template.Instructions)
		if instructions != "" {
			templateToUpdate.Description += models.UsageSeparator + instructions

			if existingTemplate != nil && instructions == existingTemplate.GetUsageDescription() {
				templateToUpdate.DescriptionEmbedding = existingTemplate.DescriptionEmbedding
			} else {
				vectorEm, err := embeddingService.CreateEmbedding(ctx, instructions)
				if err != nil {
					printSyncFail("failed to create embedding: %v", err)
					return nil
				}

				templateToUpdate.DescriptionEmbedding = vectorEm
			}
		}

		if existingTemplate != nil {
			stats.templatesUpdated++
			templateToUpdate.ID = existingTemplate.ID
			err = db.UpdateTemplate(ctx, &templateToUpdate)
			if err != nil {
				printSyncFail("%v", err)
				return nil
			}

		} else {
			_, err = db.CreateTemplate(ctx, &templateToUpdate)
			if err != nil {
				printSyncFail("%v", err)
				return nil
			}
			stats.templatesInserted++
		}
	}

	fmt.Println("SYNC COMPLETED")
	fmt.Println()
	fmt.Println("Templates:")
	fmt.Printf("  Inserted: %d\n", stats.templatesInserted)
	fmt.Printf("  Updated: %d\n", stats.templatesUpdated)

	return nil
}

func printSyncFail(format string, args ...interface{}) {
	fmt.Println("\n\nSYNC FAILED")
	fmt.Printf("Reason: "+format+"\n", args...)
}
