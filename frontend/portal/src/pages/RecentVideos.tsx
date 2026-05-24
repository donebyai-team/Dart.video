"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, MoreHorizontal, Play, Trash2 } from "lucide-react";
import { toJsonString } from "@bufbuild/protobuf";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClientsContext } from "@coasterai/ui-core/context/ClientContext";
import { Video as VideoConfig, VideoMetadataSchema } from "@coasterai/pb/coasterai/core/v1/video_pb";
import toast from "react-hot-toast";
import { getConnectError } from "@/utils/error";
import SlideThumbnail from "@/components/editor/SlideThumbnail";
import { getFormattedDate, getSlideCount } from "@/utils/format";
import { AuthLoading } from "@/components/Loader/loader";

const VIDEO_COMPOSER_PREFILL_STORAGE_KEY = "video-composer-prefill-metadata";

const RecentVideos = () => {
  const router = useRouter();
  const { portalClient } = useClientsContext();

  const [videos, setVideos] = useState<VideoConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [duplicatingVideoId, setDuplicatingVideoId] = useState<string | null>(null);
  const [deletingVideoId, setDeletingVideoId] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoading(true);
        const res = await portalClient.getVideos({});
        setVideos(res.videos);
      } catch (err) {
        console.error("Failed to fetch videos", err);
        toast.error(getConnectError(err));
      } finally {
        setIsLoading(false);
      }
    };

    if (portalClient) fetchVideos();
  }, [portalClient]);

  if (isLoading) {
    return <AuthLoading />;
  }

  const handleCopyPrompt = (video: VideoConfig) => {
    if (!video.metadata) {
      toast.error("No video metadata found for this video");
      return;
    }

    try {
      window.sessionStorage.setItem(
        VIDEO_COMPOSER_PREFILL_STORAGE_KEY,
        toJsonString(VideoMetadataSchema, video.metadata)
      );
      router.push("/dashboard");
    } catch (err) {
      console.error("Failed to prefill composer from video metadata", err);
      toast.error("Unable to copy prompt to composer");
    }
  };

  const handleDuplicateVideo = async (video: VideoConfig) => {
    try {
      setDuplicatingVideoId(video.id);
      const res = await portalClient.duplicateVideo({ videoId: video.id });
      const duplicatedVideoId = res.video?.id;

      if (!duplicatedVideoId) {
        toast.error("Unable to open duplicated video");
        return;
      }

      router.push(`/editor/${duplicatedVideoId}`);
    } catch (err) {
      console.error("Failed to duplicate video", err);
      toast.error(getConnectError(err));
    } finally {
      setDuplicatingVideoId(null);
    }
  };

  const handleDeleteVideo = async (video: VideoConfig) => {
    try {
      setDeletingVideoId(video.id);
      await portalClient.deleteVideo({ videoId: video.id });
      setVideos((currentVideos) => currentVideos.filter(({ id }) => id !== video.id));
    } catch (err) {
      console.error("Failed to delete video", err);
      toast.error(getConnectError(err));
    } finally {
      setDeletingVideoId(null);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-xl font-semibold mb-4">Recent Videos</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const firstSlide = video.config?.sections?.[0]?.slides?.[0];
          const isGenerating = !firstSlide;
          const thumbnailSlide = firstSlide
            ? {
                ...firstSlide,
                backgroundStyle: firstSlide.backgroundStyle ?? video.metadata?.backgroundStyle,
              }
            : null;
          const thumbnailResolution = video.metadata?.resolution ?? { width: 1280, height: 720 };
          const thumbnailFps = video.metadata?.fps ?? 30;

          return (
            <motion.div key={video.id} whileHover={{ y: -4 }}>
              <Card
                className="card-elevated overflow-hidden cursor-pointer group"
                onClick={() => router.push(`/editor/${video.id}`)}
              >
                <div className="relative aspect-video bg-muted">
                  {isGenerating ? (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <div className="animate-pulse text-sm font-medium">
                        Generating...
                      </div>
                    </div>
                  ) : (
                    <>
                      <SlideThumbnail
                        slide={thumbnailSlide!}
                        resolution={thumbnailResolution}
                        fps={thumbnailFps}
                        generatedBranding={video.metadata?.generatedBranding}
                      />

                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-5 h-5 text-foreground ml-0.5" />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium truncate">{video.name}</h3>
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
                          <span className="sr-only">Open video actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem onSelect={() => handleCopyPrompt(video)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy prompt
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={duplicatingVideoId === video.id || deletingVideoId === video.id}
                          onSelect={() => void handleDuplicateVideo(video)}
                        >
                          {duplicatingVideoId === video.id ? "Duplicating..." : "Duplicate video"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={deletingVideoId === video.id || duplicatingVideoId === video.id}
                          onSelect={() => void handleDeleteVideo(video)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {deletingVideoId === video.id ? "Deleting..." : "Delete"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{getSlideCount(video)} slides</span>
                    <span>•</span>
                    <span>{video.metadata?.durationInFrames ? (video.metadata.durationInFrames/30).toFixed(2) : '0.00'}s</span>
                  </div>

                  <div className="mt-2 text-xs text-muted-foreground">
                    {getFormattedDate(video.createdAt)}
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

export default RecentVideos;
