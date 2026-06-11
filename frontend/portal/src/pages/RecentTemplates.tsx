"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MoreHorizontal, Play, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClientsContext } from "@coasterai/ui-core/context/ClientContext";
import { AnimationTemplate } from "@coasterai/pb/coasterai/core/v1/template_pb";
import toast from "react-hot-toast";
import { getConnectError } from "@/utils/error";
import SlideThumbnail from "@/components/editor/SlideThumbnail";
import { getFormattedDate, getSlideCount } from "@/utils/format";
import { AuthLoading } from "@/components/Loader/loader";

const TEMPLATE_PREFIX = "template:";

const RecentTemplates = () => {
  const router = useRouter();
  const { portalClient } = useClientsContext();

  const [templates, setTemplates] = useState<AnimationTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setIsLoading(true);
        const res = await portalClient.getTemplates({});
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
  }, [portalClient]);

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

  if (isLoading) {
    return <AuthLoading />;
  }

  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Templates</h2>

        <Button
          type="button"
          onClick={() => void handleCreateTemplate()}
          disabled={creatingTemplate}
        >
          <Plus className="mr-2 h-4 w-4" />
          {creatingTemplate ? "Creating..." : "Create template"}
        </Button>
      </div>

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
    </div>
  );
};

export default RecentTemplates;
