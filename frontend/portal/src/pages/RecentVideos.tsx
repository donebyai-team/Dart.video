"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Copy, Play } from "lucide-react";
import { toJsonString } from "@bufbuild/protobuf";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
                backgroundStyle: video.metadata?.backgroundStyle ?? firstSlide.backgroundStyle,
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
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 shrink-0 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyPrompt(video);
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy prompt
                    </Button>
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
