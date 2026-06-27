"use client"

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Filter, MoreHorizontal, Play, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClientsContext } from "@coasterai/ui-core/context/ClientContext";
import { AnimationTemplate } from "@coasterai/pb/coasterai/core/v1/template_pb";
import toast from "react-hot-toast";
import { getConnectError } from "@/utils/error";
import SlideThumbnail from "@/components/editor/SlideThumbnail";
import { getFormattedDate, getSlideCount } from "@/utils/format";
import { AuthLoading } from "@/components/Loader/loader";
import { TEMPLATE_PREFIX } from "@/utils/constants";
import { categories as templateCategories } from "@/components/editor/settings/reimagine/constants";

const RecentTemplates = () => {
  const router = useRouter();
  const { portalClient } = useClientsContext();

  const [templates, setTemplates] = useState<AnimationTemplate[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  const selectedCategoryItems = useMemo(
    () => templateCategories.filter(({ value }) => selectedCategories.includes(value)),
    [selectedCategories]
  );

  const templatesCountLabel = `${templates.length} template${templates.length === 1 ? "" : "s"}`;

  const categoryFilterLabel =
    selectedCategoryItems.length === 0
      ? "All categories"
      : selectedCategoryItems.length === 1
        ? selectedCategoryItems[0].label
        : `${selectedCategoryItems.length} categories`;

  const isInitialLoading = isLoading && templates.length === 0;

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        const res = await portalClient.getTemplates({
          categories: selectedCategories,
        });
        setTemplates(res.templates);
      } catch (err) {
        console.error("Failed to fetch templates", err);
        toast.error(getConnectError(err));
      } finally {
        setIsLoading(false);
      }
    };

    if (portalClient) {
      void fetchTemplates();
    }
  }, [portalClient, selectedCategories]);

  const toggleCategory = (categoryValue: string) => {
    setSelectedCategories((currentCategories) =>
      currentCategories.includes(categoryValue)
        ? currentCategories.filter((value) => value !== categoryValue)
        : [...currentCategories, categoryValue]
    );
  };

  const openTemplateEditor = (templateId: string) => {
    router.push(`/editor/${TEMPLATE_PREFIX}${templateId}`);
  };

  const handleCreateTemplate = async () => {
    try {
      setCreatingTemplate(true);
      const template = await portalClient.createTemplate({});

      if (!template.id) {
        toast.error("Unable to open created template");
        return;
      }

      openTemplateEditor(template.id);
    } catch (err) {
      console.error("Failed to create template", err);
      toast.error(getConnectError(err));
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (template: AnimationTemplate) => {
    try {
      setDeletingTemplateId(template.id);
      await portalClient.deleteTemplate({ id: template.id });
      setTemplates((currentTemplates) =>
        currentTemplates.filter(({ id }) => id !== template.id)
      );
    } catch (err) {
      console.error("Failed to delete template", err);
      toast.error(getConnectError(err));
    } finally {
      setDeletingTemplateId(null);
    }
  };

  if (isInitialLoading) {
    return <AuthLoading />;
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <div>
            <h2 className="text-xl font-semibold">Templates</h2>
            <p className="text-sm text-muted-foreground">
              {templatesCountLabel}
              {selectedCategoryItems.length > 0 ? " after filtering" : " total"}
            </p>
          </div>

          {selectedCategoryItems.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCategoryItems.map((category) => (
                <Badge key={category.value} variant="secondary">
                  {category.label}
                </Badge>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline">
                <Filter className="mr-2 h-4 w-4" />
                {categoryFilterLabel}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by categories</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {templateCategories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category.value}
                  checked={selectedCategories.includes(category.value)}
                  onCheckedChange={() => toggleCategory(category.value)}
                >
                  {category.label}
                </DropdownMenuCheckboxItem>
              ))}
              {selectedCategories.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setSelectedCategories([])}>
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            onClick={() => void handleCreateTemplate()}
            disabled={creatingTemplate}
          >
            <Plus className="mr-2 h-4 w-4" />
            {creatingTemplate ? "Creating..." : "Create template"}
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No templates found{selectedCategoryItems.length > 0 ? " for the selected categories." : "."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const firstSlide = template.config?.sections?.[0]?.slides?.[0];
            const isGenerating = !firstSlide;
            const thumbnailSlide = firstSlide
              ? {
                  ...firstSlide,
                  backgroundStyle: firstSlide.backgroundStyle ?? template.metadata?.backgroundStyle,
                }
              : null;
            const thumbnailResolution = template.metadata?.resolution ?? { width: 1280, height: 720 };
            const thumbnailFps = template.metadata?.fps ?? 30;

            return (
              <motion.div key={template.id} whileHover={{ y: -4 }}>
                <Card
                  className="card-elevated overflow-hidden cursor-pointer group"
                  onClick={() => openTemplateEditor(template.id)}
                >
                  <div className="relative aspect-video bg-muted">
                    {isGenerating ? (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <div className="animate-pulse text-sm font-medium">
                          {template.status || "Generating..."}
                        </div>
                      </div>
                    ) : (
                      <>
                        <SlideThumbnail
                          slide={thumbnailSlide!}
                          resolution={thumbnailResolution}
                          fps={thumbnailFps}
                          generatedBranding={template.metadata?.generatedBranding}
                        />

                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90">
                            <Play className="ml-0.5 h-5 w-5 text-foreground" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-medium truncate">{template.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open template actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuItem
                            disabled={deletingTemplateId === template.id}
                            onSelect={() => void handleDeleteTemplate(template)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {deletingTemplateId === template.id ? "Deleting..." : "Delete"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{getSlideCount({ config: template.config })} slides</span>
                      <span>•</span>
                      <span>{template.status || "Unknown"}</span>
                    </div>

                    <div className="mt-2 text-xs text-muted-foreground">
                      {getFormattedDate(template.createdAt)}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecentTemplates;
