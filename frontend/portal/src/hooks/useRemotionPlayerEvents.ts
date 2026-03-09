import { useEffect } from "react";
import { PlayerRef } from "@remotion/player";
import { getSlideAbsoluteEndFrame, getRealSlideStartFrame } from "@/components/editor/frame_calculations";
import { TimelineSlide } from "@/components/editor/timeline/types";

interface UseRemotionPlayerEventsProps {
  playerRef: React.RefObject<PlayerRef | null>;
  allSlides: TimelineSlide[];
  selectedSlideId: string;
  previewingSlideId: string | null;
  onSlideChange?: (slideId: string) => void;
  onFrameChange?: (frame: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setCurrentFrame: (frame: number) => void;
  setPreviewingSlideId: (id: string | null) => void;
  isDragging?: boolean; // NEW: To prevent interference during scrubbing
  fps: number;
}

export function useRemotionPlayerEvents({
  playerRef,
  allSlides,
  selectedSlideId,
  previewingSlideId,
  onSlideChange,
  onFrameChange,
  setIsPlaying,
  setCurrentFrame,
  setPreviewingSlideId,
  isDragging = false,
  fps,
}: UseRemotionPlayerEventsProps) {

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const handlePlay = () => {
      console.debug(`[RemotionPlayer] Play event fired`);
      setIsPlaying(true);
    };

    const handlePause = () => {
      console.debug(`[RemotionPlayer] Pause event fired`);
      setIsPlaying(false);
      // Don't clear previewingSlideId here - let the controls handle it
    };

    const handleFrameUpdate = (data: { detail: { frame: number } }) => {
      setCurrentFrame(data.detail.frame);
      onFrameChange?.(data.detail.frame);

      // Skip slide detection logic during dragging to prevent jumping
      if (isDragging) {
        console.debug(`[RemotionPlayer] Skipping slide detection during drag`);
        return;
      }

      // Check if we've reached the end of the video and pause
      if (allSlides.length > 0) {
        const lastSlide = allSlides[allSlides.length - 1];
        const lastSlideEndFrame = getSlideAbsoluteEndFrame(allSlides, lastSlide.id, fps);

        if (data.detail.frame >= lastSlideEndFrame) {
          player.pause();
          // Seek back to the last valid frame to avoid blank screen
          player.seekTo(lastSlideEndFrame);
          return;
        }
      }

      // Handle overlapping transitions correctly
      // During overlap periods, both slides render - determine which is more prominent
      let currentSlide = null;
      let overlappingSlides = [];

      // Find all slides that are rendering at this frame (using internal rendering positions)
      for (const slide of allSlides) {
        const slideStartFrame = getRealSlideStartFrame(allSlides, slide.id, fps);
        const slideEndFrame = getSlideAbsoluteEndFrame(allSlides, slide.id, fps);

        // Check if frame is within this slide's range
        if (data.detail.frame >= slideStartFrame && data.detail.frame <= slideEndFrame) {
          overlappingSlides.push({ slide, startFrame: slideStartFrame, endFrame: slideEndFrame });
        }
      }

      if (overlappingSlides.length === 1) {
        // Only one slide is rendering - simple case
        currentSlide = overlappingSlides[0].slide;
        console.debug(`[RemotionPlayer] Frame ${data.detail.frame} is in slide ${currentSlide.id} (${overlappingSlides[0].startFrame}-${overlappingSlides[0].endFrame})`);
      } else if (overlappingSlides.length > 1) {
        // Multiple slides are rendering - choose the one that started later (incoming slide)
        const latestSlide = overlappingSlides.reduce((latest, current) =>
          current.startFrame > latest.startFrame ? current : latest
        );
        currentSlide = latestSlide.slide;

        const slideNames = overlappingSlides.map(s => s.slide.id).join(' + ');
        console.debug(`[RemotionPlayer] Frame ${data.detail.frame} - Overlapping slides: ${slideNames}, choosing ${currentSlide.id}`);
      }

      if (currentSlide) {
        // Update selected slide if changed
        if (currentSlide.id !== selectedSlideId) {
          console.debug(`[RemotionPlayer] Auto slide change to: ${currentSlide.id} at frame ${data.detail.frame}`);
          onSlideChange?.(currentSlide.id);
        }      

        // Handle preview slide end detection
        if (previewingSlideId === currentSlide.id) {
          const slideEndFrame = getSlideAbsoluteEndFrame(allSlides, currentSlide.id, fps);
          if (data.detail.frame >= slideEndFrame) {
            console.debug(`[RemotionPlayer] Preview reached end of slide ${currentSlide.id}, pausing at frame ${data.detail.frame}`);
            player.pause();
            setPreviewingSlideId(null);
          }
        }
      }
    };

    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("frameupdate", handleFrameUpdate as never);

    return () => {
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("frameupdate", handleFrameUpdate as never);
    };
  }, [
    playerRef,
    allSlides,
    selectedSlideId,
    previewingSlideId,
    onSlideChange,
    onFrameChange,
    setIsPlaying,
    setCurrentFrame,
    setPreviewingSlideId,
    isDragging
  ]);
}